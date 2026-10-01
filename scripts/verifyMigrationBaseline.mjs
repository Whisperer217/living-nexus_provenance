import crypto from "node:crypto";
import fs from "node:fs";
import mysql from "mysql2/promise";

const migrationPath = "drizzle/0134_reconcile_live_schema.sql";
const reportPath = "docs/audits/2026-10-01-migration-baseline-verification.json";
const migrationSql = fs.readFileSync(migrationPath, "utf8");
const blocks = migrationSql.split("--> statement-breakpoint");
const requireLedger = process.argv.includes("--require-ledger");

const tables = new Set();
const columns = new Map();
const indexes = new Map();
const addColumn = (table, column) => {
  if (!columns.has(table)) columns.set(table, new Set());
  columns.get(table).add(column);
};
const addIndex = (table, index) => {
  if (!indexes.has(table)) indexes.set(table, new Set());
  indexes.get(table).add(index);
};

for (const block of blocks) {
  const create = block.match(/^\s*CREATE TABLE `([^`]+)`/m);
  if (create) {
    const table = create[1];
    tables.add(table);
    for (const match of block.matchAll(/^\s*`([^`]+)`\s+/gm)) addColumn(table, match[1]);
    for (const match of block.matchAll(/CONSTRAINT `([^`]+)` UNIQUE\(/g)) addIndex(table, match[1]);
  }
  for (const match of block.matchAll(/ALTER TABLE `([^`]+)` ADD `([^`]+)`/g)) addColumn(match[1], match[2]);
  for (const match of block.matchAll(/ALTER TABLE `([^`]+)` RENAME COLUMN `[^`]+` TO `([^`]+)`/g)) addColumn(match[1], match[2]);
  for (const match of block.matchAll(/CREATE INDEX `([^`]+)` ON `([^`]+)`/g)) addIndex(match[2], match[1]);
}

const allTables = [...new Set([...tables, ...columns.keys(), ...indexes.keys()])].sort();
const connection = await mysql.createConnection(process.env.DATABASE_URL);
try {
  const [actualTables] = await connection.query(
    `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN (${allTables.map(() => "?").join(",")})`,
    allTables,
  );
  const actualTableSet = new Set(actualTables.map((row) => row.TABLE_NAME));
  const [actualColumns] = await connection.query(
    `SELECT TABLE_NAME, COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN (${allTables.map(() => "?").join(",")})`,
    allTables,
  );
  const actualColumnSet = new Set(actualColumns.map((row) => `${row.TABLE_NAME}.${row.COLUMN_NAME}`));
  const [actualIndexes] = await connection.query(
    `SELECT TABLE_NAME, INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN (${allTables.map(() => "?").join(",")})`,
    allTables,
  );
  const actualIndexSet = new Set(actualIndexes.map((row) => `${row.TABLE_NAME}.${row.INDEX_NAME}`));
  const migrationHash = crypto.createHash("sha256").update(migrationSql).digest("hex");
  const [ledgerRows] = await connection.query(
    "SELECT MAX(created_at) AS latestCreatedAt, COUNT(*) AS total, SUM(hash = ?) AS baselineRows FROM __drizzle_migrations",
    [migrationHash],
  );

  const missingTables = allTables.filter((table) => !actualTableSet.has(table));
  const missingColumns = [...columns.entries()].flatMap(([table, names]) => [...names]
    .filter((name) => !actualColumnSet.has(`${table}.${name}`))
    .map((name) => `${table}.${name}`));
  const missingIndexes = [...indexes.entries()].flatMap(([table, names]) => [...names]
    .filter((name) => !actualIndexSet.has(`${table}.${name}`))
    .map((name) => `${table}.${name}`));

  const journal = JSON.parse(fs.readFileSync("drizzle/meta/_journal.json", "utf8"));
  const journalEntry = journal.entries.at(-1);
  const report = {
    migrationPath,
    migrationHash,
    journalEntry,
    expected: {
      tables: allTables.length,
      columns: [...columns.values()].reduce((total, names) => total + names.size, 0),
      indexes: [...indexes.values()].reduce((total, names) => total + names.size, 0),
    },
    actual: {
      latestLedgerCreatedAt: Number(ledgerRows[0].latestCreatedAt),
      ledgerRows: Number(ledgerRows[0].total),
      baselineRows: Number(ledgerRows[0].baselineRows ?? 0),
    },
    missing: { tables: missingTables, columns: missingColumns, indexes: missingIndexes },
  };
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  if (missingTables.length || missingColumns.length || missingIndexes.length) process.exitCode = 2;
  if (!requireLedger && Number(ledgerRows[0].latestCreatedAt) >= journalEntry.when) process.exitCode = 3;
  if (requireLedger && Number(ledgerRows[0].baselineRows ?? 0) !== 1) process.exitCode = 3;
} finally {
  await connection.end();
}
