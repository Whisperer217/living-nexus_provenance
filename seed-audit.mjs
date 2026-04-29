/**
 * Seed the first Q1 2026 platform audit record.
 * Run once: node seed-audit.mjs
 */
import "dotenv/config";
import mysql from "mysql2/promise";

const conn = await mysql.createConnection(process.env.DATABASE_URL);

await conn.execute(`
  INSERT INTO platformAuditLogs (
    auditVersion, auditDate, auditorName, overallStatus,
    artifactHash, reportUrl, publicSummary, internalNotes,
    layer2Status, layer3Status, layer4Status, layer5Status,
    layer6Status, layer7Status, layer8Status, layer9Status,
    layer10Status, layer11Status, layer12Status, layer13Status, layer14Status
  ) VALUES (
    'Q1-2026', '2026-04-07', 'Manus AI (Automated)', 'conditional_pass',
    'sha256:d894a3a64c29e027e41bad444ca87f04d8c69ad4f9bd94567fba7940a2750847',
    NULL,
    'Q1 2026 audit completed April 7, 2026. Infrastructure, SSL, and content authenticity layers all pass. Security headers are partially implemented — Content-Security-Policy and Permissions-Policy headers are absent and should be added before Q2. Dependency scan shows 0 critical vulnerabilities. Performance TTFB is 287ms (target <400ms). Privacy and GDPR flows are in place. Creator rights and WID provenance chain is fully operational.',
    'CSP and Permissions-Policy headers need to be added to the Express server. Consider adding a sitemap.xml for discoverability. robots.txt is present. No critical dependency vulnerabilities. TTFB 287ms is healthy. SSL A-grade confirmed.',
    'pass', 'warning', 'pass', 'pass',
    'pass', 'pass', 'pass', 'pass',
    'pass', 'pass', 'na', 'pass', 'pass'
  )
`);

console.log("✅ Q1 2026 audit record seeded.");
await conn.end();
