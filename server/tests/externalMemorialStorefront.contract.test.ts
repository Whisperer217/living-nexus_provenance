import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { RANDALL_MEMORIAL_STOREFRONT } from "../../client/src/lib/externalStorefront";
import { LAUNCHER_ITEMS } from "../../client/src/components/layout/launcherDestinations";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

const PRODUCT_URL = "https://livingnexus.printful.me/product/forever-our-brother-randall-memorial-hoodie";

describe("external Randall memorial storefront contract", () => {
  it("centralizes one public Printful product link without presenting a native checkout", () => {
    expect(RANDALL_MEMORIAL_STOREFRONT.href).toBe(PRODUCT_URL);
    expect(RANDALL_MEMORIAL_STOREFRONT.productName).toBe("Forever Our Brother | Randall Memorial Hoodie");

    const contract = source("client/src/lib/externalStorefront.ts");
    expect(contract).toContain("link-outs only");
    expect(contract).not.toContain("process.env");
    expect(contract).not.toContain("fetch(");
    expect(contract).not.toContain("trpc.");
  });

  it("keeps the Avatar Registry store destination and adds a separate external memorial destination", () => {
    expect(LAUNCHER_ITEMS.find(item => item.id === "store")).toMatchObject({
      destination: "route",
      path: "/avatar-registry",
    });
    expect(LAUNCHER_ITEMS.find(item => item.id === "randall-memorial")).toMatchObject({
      label: "Randall Memorial",
      destination: "external",
      path: PRODUCT_URL,
    });
  });

  it("renders the Home product entry as an honest new-tab external storefront link", () => {
    const card = source("client/src/components/ExternalMemorialProductCard.tsx");
    const home = source("client/src/pages/HomePage.tsx");

    expect(home).toContain("ExternalMemorialProductCard");
    expect(card).toContain('data-testid="external-memorial-storefront"');
    expect(card).toContain('target="_blank"');
    expect(card).toContain('rel="noopener noreferrer"');
    expect(card).toContain("Product choice, payment, fulfillment, and delivery happen in that external storefront.");
    expect(card).not.toContain("<iframe");
    expect(card).not.toContain("trpc.");
    expect(card).not.toContain("fetch(");
  });
});
