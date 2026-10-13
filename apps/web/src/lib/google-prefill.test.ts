import { describe, expect, it } from "vitest";
import { clientInputSchema } from "./client-record";
import {
  PLACE_DETAILS_FIELD_MASK,
  SEARCH_ID_ONLY_FIELD_MASK,
  filterPatchToEmpty,
  mapPlaceToRecordPatch,
  parseMapsUrl,
  prefillFromGoogle,
  resolveGoogleShareUrl,
  type PlaceDetails
} from "./google-prefill";
import type { ClientRecord } from "./client-record";

const day = (d: number, oh: number, om: number, ch: number, cm: number) => ({
  open: { day: d, hour: oh, minute: om },
  close: { day: d, hour: ch, minute: cm }
});

const place: PlaceDetails = {
  id: "ChIJabc",
  displayName: { text: "Horizon Pet Waste Solutions" },
  addressComponents: [
    { longText: "1652", types: ["street_number"] },
    { longText: "Evanston Circle", types: ["route"] },
    { longText: "Marietta", types: ["locality"] },
    { longText: "Georgia", shortText: "GA", types: ["administrative_area_level_1"] },
    { longText: "30062", types: ["postal_code"] },
    { longText: "United States", shortText: "US", types: ["country"] }
  ],
  nationalPhoneNumber: "(470) 524-2882",
  websiteUri: "https://www.horizonpetwastesolutions.com/",
  primaryTypeDisplayName: { text: "Pet waste removal service" },
  location: { latitude: 33.97, longitude: -84.45 },
  googleMapsUri: "https://maps.google.com/?cid=1",
  regularOpeningHours: {
    periods: [1, 2, 3, 4, 5, 6].map((d) => day(d, 7, 30, 17, 0))
  }
};

function record(extra: Record<string, unknown> = {}): ClientRecord {
  return {
    ...clientInputSchema.parse({ displayName: "Horizon", ...extra }),
    id: "c1",
    createdAt: "x",
    updatedAt: "x",
    listings: {}
  };
}

describe("mapPlaceToRecordPatch", () => {
  const patch = mapPlaceToRecordPatch(place);
  it("maps address, phone, site, category, coordinates", () => {
    expect(patch.address).toEqual({
      line1: "1652 Evanston Circle",
      city: "Marietta",
      region: "GA",
      postalCode: "30062",
      country: "US"
    });
    expect(patch.phone).toBe("4705242882");
    expect(patch.website).toBe("https://www.horizonpetwastesolutions.com/");
    expect(patch.primaryCategory).toBe("Pet waste removal service");
    expect(patch.coordinates).toEqual({ lat: 33.97, lng: -84.45 });
    expect(patch.googlePlaceId).toBe("ChIJabc");
  });
  it("maps hours: missing day closed (Sunday), open without close is 24h", () => {
    expect(patch.hours?.sun?.kind).toBe("closed");
    expect(patch.hours?.mon?.ranges).toEqual([{ open: "07:30", close: "17:00" }]);
    expect(patch.hours?.sat?.kind).toBe("ranges");
    const h24 = mapPlaceToRecordPatch({
      regularOpeningHours: { periods: [{ open: { day: 0, hour: 0, minute: 0 } }] }
    });
    expect(h24.hours?.sun?.kind).toBe("open24");
    expect(h24.hours?.mon?.kind).toBe("closed");
  });
});

describe("filterPatchToEmpty", () => {
  it("fills only empty fields unless overwrite", () => {
    const r = record({ phone: "1112223333", address: { city: "Atlanta" } });
    const { patch, fieldsFilled } = filterPatchToEmpty(
      r,
      mapPlaceToRecordPatch(place),
      false
    );
    expect(patch.phone).toBeUndefined();
    expect(patch.address?.city).toBeUndefined();
    expect(patch.address?.line1).toBe("1652 Evanston Circle");
    expect(fieldsFilled).toContain("website");
    const over = filterPatchToEmpty(r, mapPlaceToRecordPatch(place), true);
    expect(over.patch.phone).toBe("4705242882");
    expect(over.patch.address?.city).toBe("Marietta");
  });
});

describe("share URL resolution", () => {
  it("parses name and coordinates", () => {
    const u = new URL(
      "https://www.google.com/maps/place/Horizon+Pet+Waste/@33.97,-84.45,17z/data=!1sChIJxyz"
    );
    expect(parseMapsUrl(u)).toMatchObject({
      name: "Horizon Pet Waste",
      lat: 33.97,
      lng: -84.45,
      placeId: "ChIJxyz"
    });
  });
  it("follows redirects and rejects off-list hosts", async () => {
    const ok = async (u: string) =>
      u.startsWith("https://share.google")
        ? new Response(null, {
            status: 302,
            headers: { location: "https://www.google.com/maps/place/Foo+Bar/@1,2,3z" }
          })
        : new Response("", { status: 200 });
    const r = await resolveGoogleShareUrl("https://share.google/abc", ok);
    expect(r.name).toBe("Foo Bar");
    const evil = async () =>
      new Response(null, {
        status: 302,
        headers: { location: "https://evil.example/x" }
      });
    await expect(
      resolveGoogleShareUrl("https://share.google/abc", evil)
    ).rejects.toThrow(/allow-list/);
    await expect(
      resolveGoogleShareUrl("http://share.google/abc", ok)
    ).rejects.toThrow();
  });
});

describe("prefillFromGoogle (injected fetch, no network)", () => {
  it("uses the id-only mask for search and one details call", async () => {
    const calls: { url: string; mask: string | null }[] = [];
    const fetchImpl = async (url: string, init?: RequestInit) => {
      const mask = new Headers(init?.headers).get("x-goog-fieldmask");
      calls.push({ url, mask });
      if (url.endsWith(":searchText"))
        return Response.json({ places: [{ id: "ChIJabc" }] });
      return Response.json(place);
    };
    const res = await prefillFromGoogle(record(), "test-key", { fetchImpl });
    expect(calls).toHaveLength(2);
    expect(calls[0]?.mask).toBe("places.id");
    expect(SEARCH_ID_ONLY_FIELD_MASK).toBe("places.id");
    expect(calls[1]?.mask).toBe(PLACE_DETAILS_FIELD_MASK);
    expect(res.patch.phone).toBe("4705242882");
    expect(res.patch.displayName).toBeUndefined();
  });
  it("surfaces upstream status only", async () => {
    const fetchImpl = async () => new Response("secret body", { status: 403 });
    await expect(prefillFromGoogle(record(), "k", { fetchImpl })).rejects.toMatchObject(
      { status: 403 }
    );
  });
});
