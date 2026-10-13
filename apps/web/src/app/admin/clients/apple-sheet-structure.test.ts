import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { clientInputSchema, type ClientRecord } from "../../../lib/client-record";
import { prepareAppleSheet } from "../../../lib/listing-platforms/apple";

const range = { kind: "ranges" as const, ranges: [{ open: "07:30", close: "17:00" }] };
const horizon: ClientRecord = {
  ...clientInputSchema.parse({
    displayName: "Horizon Pet Waste Solutions",
    phone: "4705242882",
    address: {
      line1: "1652 Evanston Cir",
      city: "Marietta",
      region: "GA",
      postalCode: "30062"
    },
    storefrontStatus: "service_area",
    hours: { mon: range, sat: range, sun: { kind: "closed", ranges: [] } }
  }),
  id: "c1",
  createdAt: "x",
  updatedAt: "x",
  listings: {}
};

describe("Apple listing sheet page", () => {
  const source = readFileSync(
    join(process.cwd(), "apps/web/src/app/admin/clients/[id]/listings/apple/page.tsx"),
    "utf8"
  );

  it("renders every step title from the prepared Horizon sheet, in order", () => {
    const titles = prepareAppleSheet(horizon).steps.map((s) => s.title);
    expect(titles).toEqual([
      "Find or add",
      "Address and map marker",
      "Location details",
      "Hours",
      "Brand",
      "Verification",
      "After verification"
    ]);
    // The page renders step.title for each prepared step.
    expect(source).toContain("{step.title}");
    expect(source).toContain("prepareAppleSheet(client)");
  });

  it("offers copy buttons, inline inputs for missing fields and the status form", () => {
    expect(source).toContain("copy-button");
    expect(source).toContain("missing-field");
    expect(source).toContain("navigator.clipboard.writeText");
    expect(source).toContain("/listings/apple");
  });
});
