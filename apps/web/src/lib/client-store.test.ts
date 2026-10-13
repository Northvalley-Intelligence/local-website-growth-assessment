import { beforeEach, describe, expect, it } from "vitest";
import { clientInputSchema } from "./client-record";
import {
  clearClientsForTest,
  createClient,
  getClient,
  listClients,
  setListingStatus,
  updateClient
} from "./client-store";

describe("client-store", () => {
  beforeEach(async () => {
    await clearClientsForTest();
  });

  it("creates with defaults and reads back", async () => {
    const c = await createClient(clientInputSchema.parse({ displayName: "Test Co" }));
    expect(c.id).toMatch(/^client-/);
    expect(c.addressPublication).toBe("publish");
    expect(c.storefrontStatus).toBe("physical");
    expect(c.phoneCountry).toBe("US");
    expect(c.address.country).toBe("US");
    expect((await getClient(c.id))?.displayName).toBe("Test Co");
  });

  it("rejects an empty display name and non-Google profile URLs", () => {
    expect(clientInputSchema.safeParse({ displayName: "" }).success).toBe(false);
    expect(
      clientInputSchema.safeParse({
        displayName: "x",
        googleProfileUrl: "http://share.google/a"
      }).success
    ).toBe(false);
    expect(
      clientInputSchema.safeParse({
        displayName: "x",
        googleProfileUrl: "https://evil.example/a"
      }).success
    ).toBe(false);
    expect(
      clientInputSchema.safeParse({
        displayName: "x",
        googleProfileUrl: "https://share.google/abc"
      }).success
    ).toBe(true);
  });

  it("merges patches without resetting omitted fields", async () => {
    const c = await createClient(
      clientInputSchema.parse({ displayName: "A", address: { city: "Marietta" } })
    );
    const u = await updateClient(c.id, {
      primaryCategory: "Pet waste removal service",
      address: { line1: "1 Main" }
    });
    expect(u?.primaryCategory).toBe("Pet waste removal service");
    expect(u?.address.city).toBe("Marietta");
    expect(u?.address.line1).toBe("1 Main");
    expect(await updateClient("nope", {})).toBeNull();
  });

  it("lists newest first and tracks listing status", async () => {
    const a = await createClient(
      clientInputSchema.parse({ displayName: "A" }),
      new Date("2026-01-01")
    );
    const b = await createClient(
      clientInputSchema.parse({ displayName: "B" }),
      new Date("2026-02-01")
    );
    expect((await listClients()).map((c) => c.id)).toEqual([b.id, a.id]);
    const s = await setListingStatus(a.id, "apple", "submitted", {
      missingAtSubmit: ["x"]
    });
    expect(s?.listings.apple?.status).toBe("submitted");
    expect(s?.listings.apple?.submittedAt).toBeTruthy();
    expect(s?.listings.apple?.missingAtSubmit).toEqual(["x"]);
  });
});
