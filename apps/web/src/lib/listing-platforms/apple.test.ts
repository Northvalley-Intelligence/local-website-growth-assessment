import { describe, expect, it } from "vitest";
import { clientInputSchema, type ClientRecord } from "../client-record";
import { APPLE_STEP_TITLES, prepareAppleSheet } from "./apple";

const range = { kind: "ranges" as const, ranges: [{ open: "07:30", close: "17:00" }] };

function horizon(extra: Record<string, unknown> = {}): ClientRecord {
  return {
    ...clientInputSchema.parse({
      displayName: "Horizon Pet Waste Solutions",
      phone: "4705242882",
      website: "https://www.horizonpetwastesolutions.com/",
      address: {
        line1: "1652 Evanston Cir",
        city: "Marietta",
        region: "GA",
        postalCode: "30062"
      },
      storefrontStatus: "service_area",
      addressPublication: "publish",
      hours: {
        mon: range,
        tue: range,
        wed: range,
        thu: range,
        fri: range,
        sat: range,
        sun: { kind: "closed", ranges: [] }
      },
      ...extra
    }),
    id: "c1",
    createdAt: "x",
    updatedAt: "x",
    listings: {}
  };
}

const find = (sheet: ReturnType<typeof prepareAppleSheet>, key: string) =>
  sheet.steps.flatMap((s) => s.fields).find((f) => f.key === key);

describe("prepareAppleSheet", () => {
  it("lays out Apple's seven steps in order", () => {
    expect(prepareAppleSheet(horizon()).steps.map((s) => s.title)).toEqual([
      ...APPLE_STEP_TITLES
    ]);
  });

  it("fills Horizon values and flags only the primary category", () => {
    const sheet = prepareAppleSheet(horizon());
    expect(find(sheet, "phone")?.value).toBe("+1 (470) 524-2882");
    expect(find(sheet, "hours.sat")?.value).toBe("7:30 AM – 5:00 PM");
    expect(find(sheet, "hours.sun")?.value).toBe("Closed");
    expect(find(sheet, "address")?.value).toBe("1652 Evanston Cir, Marietta, GA 30062");
    expect(sheet.missingRequired).toEqual(["primaryCategory"]);
    expect(sheet.eligibility.ok).toBe(true);
    expect(sheet.eligibility.warnings[0]).toMatch(/Service-area business/);
    expect(
      prepareAppleSheet(horizon({ primaryCategory: "Pet waste removal service" }))
        .missingRequired
    ).toEqual([]);
  });

  it("is ineligible when the address is hidden", () => {
    const sheet = prepareAppleSheet(horizon({ addressPublication: "hide" }));
    expect(sheet.eligibility.ok).toBe(false);
    expect(sheet.eligibility.warnings[0]).toMatch(/hides its address/);
  });

  it("requires hours when none are defined", () => {
    expect(prepareAppleSheet(horizon({ hours: {} })).missingRequired).toContain(
      "hours"
    );
  });

  it("warns on PO boxes, bad name characters and phone extensions", () => {
    const sheet = prepareAppleSheet(
      horizon({
        displayName: "Acme™",
        phone: "4705242882 x12",
        address: {
          line1: "PO Box 12",
          city: "Marietta",
          region: "GA",
          postalCode: "30062"
        }
      })
    );
    expect(find(sheet, "address")?.warnings).toContain(
      "Apple does not accept PO Boxes."
    );
    expect(find(sheet, "displayName.apple")?.warnings.length).toBe(1);
    expect(find(sheet, "phone")?.warnings.length).toBe(1);
  });
});
