import { getCloudflareContext } from "@opennextjs/cloudflare";
import {
  DAYS,
  isAllowedGoogleUrl,
  type ClientPatch,
  type ClientRecord,
  type DayHours,
  type Hours
} from "./client-record";

type FetchImpl = (input: string, init?: RequestInit) => Promise<Response>;

const PLACES_HOST = "https://places.googleapis.com/v1";
// $0 IDs-only SKU (stream standing cost rule). NEVER widen this mask.
export const SEARCH_ID_ONLY_FIELD_MASK = "places.id";
export const PLACE_DETAILS_FIELD_MASK =
  "id,displayName,formattedAddress,addressComponents,nationalPhoneNumber,internationalPhoneNumber,websiteUri,regularOpeningHours,primaryTypeDisplayName,location,googleMapsUri";

export class UpstreamError extends Error {
  constructor(public readonly status: number) {
    super(`Google upstream returned ${status}`);
  }
}

export type ResolvedShare = {
  url: string;
  name?: string;
  lat?: number;
  lng?: number;
  placeId?: string;
};

export async function resolveGoogleShareUrl(
  url: string,
  fetchImpl: FetchImpl = fetch
): Promise<ResolvedShare> {
  let current = url;
  for (let hop = 0; hop <= 5; hop += 1) {
    if (!isAllowedGoogleUrl(current))
      throw new Error("URL host is not on the Google allow-list");
    const parsed = new URL(current);
    if (parsed.hostname !== "share.google" && /\/maps\//.test(parsed.pathname)) {
      return { url: current, ...parseMapsUrl(parsed) };
    }
    const response = await fetchImpl(current, {
      method: "GET",
      redirect: "manual",
      signal: AbortSignal.timeout(10_000)
    });
    const location = response.headers.get("location");
    if (response.status >= 300 && response.status < 400 && location) {
      current = new URL(location, current).href;
      continue;
    }
    if (parsed.hostname !== "share.google")
      return { url: current, ...parseMapsUrl(parsed) };
    throw new Error("Share URL did not redirect to a Google Maps URL");
  }
  throw new Error("Too many redirects resolving the Google share URL");
}

export function parseMapsUrl(parsed: URL): Omit<ResolvedShare, "url"> {
  const out: Omit<ResolvedShare, "url"> = {};
  const nameMatch = /\/maps\/place\/([^/]+)/.exec(parsed.pathname);
  if (nameMatch?.[1]) {
    try {
      out.name = decodeURIComponent(nameMatch[1].replace(/\+/g, " "));
    } catch {
      out.name = nameMatch[1].replace(/\+/g, " ");
    }
  }
  const at = /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/.exec(parsed.pathname);
  if (at) {
    out.lat = Number(at[1]);
    out.lng = Number(at[2]);
  }
  const full = decodeURIComponent(parsed.pathname + parsed.search);
  const fromParam =
    parsed.searchParams.get("place_id") ?? /!1s(ChIJ[\w-]+)/.exec(full)?.[1];
  if (fromParam) out.placeId = fromParam;
  return out;
}

export type PlaceDetails = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  addressComponents?: { longText?: string; shortText?: string; types?: string[] }[];
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  regularOpeningHours?: {
    periods?: {
      open?: { day?: number; hour?: number; minute?: number };
      close?: { day?: number; hour?: number; minute?: number };
    }[];
  };
  primaryTypeDisplayName?: { text?: string };
  location?: { latitude?: number; longitude?: number };
  googleMapsUri?: string;
};

const pad = (n: number | undefined) => String(n ?? 0).padStart(2, "0");

export function mapPlaceToRecordPatch(place: PlaceDetails): ClientPatch {
  const patch: ClientPatch = {};
  const comp = (type: string, short = false) => {
    const c = place.addressComponents?.find((x) => x.types?.includes(type));
    return short ? c?.shortText : c?.longText;
  };
  const number = comp("street_number");
  const route = comp("route");
  const line1 = [number, route].filter(Boolean).join(" ") || undefined;
  const address: NonNullable<ClientPatch["address"]> = {};
  if (line1) address.line1 = line1;
  const city = comp("locality") ?? comp("sublocality");
  if (city) address.city = city;
  const region = comp("administrative_area_level_1", true);
  if (region) address.region = region;
  const postal = comp("postal_code");
  if (postal) address.postalCode = postal;
  const country = comp("country", true);
  if (country) address.country = country;
  if (Object.keys(address).length) patch.address = address;

  const phone = place.nationalPhoneNumber ?? place.internationalPhoneNumber;
  if (phone) {
    let digits = phone.replace(/\D/g, "");
    if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
    patch.phone = digits;
  }
  if (place.websiteUri) patch.website = place.websiteUri;
  if (place.primaryTypeDisplayName?.text)
    patch.primaryCategory = place.primaryTypeDisplayName.text;
  if (
    place.location?.latitude !== undefined &&
    place.location.longitude !== undefined
  ) {
    patch.coordinates = { lat: place.location.latitude, lng: place.location.longitude };
  }
  if (place.googleMapsUri) patch.googleMapsUri = place.googleMapsUri;
  if (place.id) patch.googlePlaceId = place.id;
  if (place.displayName?.text) patch.displayName = place.displayName.text;

  const periods = place.regularOpeningHours?.periods;
  if (periods && periods.length) {
    const hours: Hours = {};
    // Google days: 0 = Sunday. A day with no period is closed.
    DAYS.forEach((d) => {
      hours[d] = { kind: "closed", ranges: [] };
    });
    for (const p of periods) {
      if (!p.open || p.open.day === undefined) continue;
      const key = DAYS[(p.open.day + 6) % 7] as (typeof DAYS)[number];
      if (!p.close) {
        hours[key] = { kind: "open24", ranges: [] };
        continue;
      }
      const entry = hours[key] as DayHours;
      const sameDay = p.close.day === p.open.day;
      entry.kind = "ranges";
      entry.ranges.push({
        open: `${pad(p.open.hour)}:${pad(p.open.minute)}`,
        close: sameDay ? `${pad(p.close.hour)}:${pad(p.close.minute)}` : "23:59"
      });
    }
    patch.hours = hours;
  }
  return patch;
}

function isEmpty(value: unknown): boolean {
  if (value === undefined || value === null || value === "") return true;
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

/** Keeps only the keys of `patch` whose current record value is empty, unless overwrite. */
export function filterPatchToEmpty(
  record: ClientRecord,
  patch: ClientPatch,
  overwrite: boolean
): { patch: ClientPatch; fieldsFilled: string[] } {
  const out: ClientPatch = {};
  const filled: string[] = [];
  const target = out as Record<string, unknown>;
  for (const [key, value] of Object.entries(patch)) {
    if (key === "address") {
      const addr: Record<string, string> = {};
      for (const [k, v] of Object.entries(value as Record<string, string>)) {
        const cur = (record.address as Record<string, unknown>)[k];
        if (overwrite || isEmpty(cur)) {
          addr[k] = v;
          filled.push(`address.${k}`);
        }
      }
      if (Object.keys(addr).length) out.address = addr;
    } else if (key === "hours") {
      const hrs: Record<string, unknown> = {};
      for (const [d, v] of Object.entries(value as Record<string, unknown>)) {
        const cur = (record.hours as Record<string, unknown>)[d];
        if (overwrite || !cur) {
          hrs[d] = v;
          filled.push(`hours.${d}`);
        }
      }
      if (Object.keys(hrs).length) out.hours = hrs as Hours;
    } else {
      const cur = (record as Record<string, unknown>)[key];
      if (overwrite || isEmpty(cur)) {
        target[key] = value;
        filled.push(key);
      }
    }
  }
  return { patch: out, fieldsFilled: filled };
}

export function resolveGoogleMapsApiKey(): string | undefined {
  if (process.env.GOOGLE_MAPS_API_KEY) return process.env.GOOGLE_MAPS_API_KEY;
  try {
    const env = getCloudflareContext().env as { GOOGLE_MAPS_API_KEY?: string };
    return env.GOOGLE_MAPS_API_KEY || undefined;
  } catch {
    return undefined;
  }
}

export async function findPlaceId(
  input: { textQuery: string },
  apiKey: string,
  fetchImpl: FetchImpl = fetch
): Promise<string | null> {
  const response = await fetchImpl(`${PLACES_HOST}/places:searchText`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": SEARCH_ID_ONLY_FIELD_MASK
    },
    body: JSON.stringify({ textQuery: input.textQuery, maxResultCount: 3 })
  });
  if (!response.ok) throw new UpstreamError(response.status);
  const json = (await response.json()) as { places?: { id?: string }[] };
  return json.places?.[0]?.id ?? null;
}

export async function fetchPlaceDetails(
  placeId: string,
  apiKey: string,
  fetchImpl: FetchImpl = fetch
): Promise<PlaceDetails> {
  const response = await fetchImpl(
    `${PLACES_HOST}/places/${encodeURIComponent(placeId)}`,
    {
      method: "GET",
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": PLACE_DETAILS_FIELD_MASK
      }
    }
  );
  if (!response.ok) throw new UpstreamError(response.status);
  return (await response.json()) as PlaceDetails;
}

export type PrefillResult = {
  patch: ClientPatch;
  fieldsFilled: string[];
  placeId: string;
};

/** Full prefill: resolve share URL (if any) -> id -> ONE details call -> filtered patch. */
export async function prefillFromGoogle(
  record: ClientRecord,
  apiKey: string,
  options: { overwrite?: boolean; fetchImpl?: FetchImpl } = {}
): Promise<PrefillResult> {
  const fetchImpl = options.fetchImpl ?? fetch;
  let placeId = record.googlePlaceId;
  let resolvedName: string | undefined;
  if (!placeId && record.googleProfileUrl) {
    const resolved = await resolveGoogleShareUrl(record.googleProfileUrl, fetchImpl);
    placeId = resolved.placeId;
    resolvedName = resolved.name;
  }
  if (!placeId) {
    const place = [record.address.line1, record.address.city].filter(Boolean).join(" ");
    const textQuery = `${resolvedName ?? record.displayName} ${place}`.trim();
    placeId = (await findPlaceId({ textQuery }, apiKey, fetchImpl)) ?? undefined;
  }
  if (!placeId) throw new Error("No Google place found for this client");
  const details = await fetchPlaceDetails(placeId, apiKey, fetchImpl);
  const mapped = mapPlaceToRecordPatch({ ...details, id: details.id ?? placeId });
  // Never rename a client from Google unless asked.
  if (!options.overwrite) delete mapped.displayName;
  const { patch, fieldsFilled } = filterPatchToEmpty(
    record,
    mapped,
    Boolean(options.overwrite)
  );
  return { patch, fieldsFilled, placeId };
}
