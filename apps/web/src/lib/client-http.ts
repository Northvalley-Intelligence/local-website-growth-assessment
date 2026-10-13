import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { DAYS } from "./client-record";

export function isJsonRequest(request: Request): boolean {
  return (request.headers.get("content-type") ?? "").includes("application/json");
}

const split = (v: string) =>
  v
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);

const TEXT_KEYS = [
  "legalName",
  "primaryCategory",
  "phone",
  "website",
  "socialWebsite",
  "description",
  "logoUrl",
  "coverPhotoUrl",
  "notes"
];

/** Converts a submitted HTML form into a partial client patch. Only keys present are returned. */
export function formDataToPatch(form: FormData): Record<string, unknown> {
  const get = (k: string) => {
    const v = form.get(k);
    return typeof v === "string" ? v.trim() : undefined;
  };
  const patch: Record<string, unknown> = {};
  const name = get("displayName");
  if (name) patch.displayName = name;
  for (const key of TEXT_KEYS) {
    const v = get(key);
    if (v !== undefined) patch[key] = v;
  }
  for (const key of ["addressPublication", "storefrontStatus"]) {
    const v = get(key);
    if (v) patch[key] = v;
  }
  const googleUrl = get("googleProfileUrl");
  if (googleUrl) patch.googleProfileUrl = googleUrl;
  for (const key of ["additionalCategories", "serviceAreas"]) {
    const v = get(key);
    if (v !== undefined) patch[key] = split(v);
  }
  const address: Record<string, string> = {};
  for (const k of ["line1", "line2", "city", "region", "postalCode"]) {
    const v = get(`address.${k}`);
    if (v !== undefined) address[k] = v;
  }
  if (Object.keys(address).length) patch.address = address;
  const lat = get("lat");
  const lng = get("lng");
  if (lat && lng && Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))) {
    patch.coordinates = { lat: Number(lat), lng: Number(lng) };
  }
  const hours: Record<string, unknown> = {};
  for (const d of DAYS) {
    const kind = get(`hours.${d}.kind`);
    if (!kind) continue;
    const open = get(`hours.${d}.open`);
    const close = get(`hours.${d}.close`);
    hours[d] =
      kind === "ranges"
        ? { kind, ranges: open && close ? [{ open, close }] : [] }
        : { kind, ranges: [] };
  }
  if (Object.keys(hours).length) patch.hours = hours;
  return patch;
}

export async function readBody(
  request: Request
): Promise<{ data: Record<string, unknown>; form: FormData | null }> {
  if (isJsonRequest(request)) {
    const json = (await request.json()) as unknown;
    return {
      data: (json && typeof json === "object" ? json : {}) as Record<string, unknown>,
      form: null
    };
  }
  const form = await request.formData();
  return { data: formDataToPatch(form), form };
}

export function safeNext(form: FormData | null, fallback: string): string {
  const next = form?.get("_next");
  return typeof next === "string" && /^\/admin\/[\w\-/]*$/.test(next) ? next : fallback;
}

export function redirectTo(request: Request, path: string): Response {
  return new Response(null, {
    status: 303,
    headers: { location: new URL(path, request.url).href }
  });
}

export function errorResponse(error: unknown): NextResponse {
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: "Invalid client data",
        issues: error.issues.map((i) => `${i.path.join(".")}: ${i.message}`)
      },
      { status: 400 }
    );
  }
  if (error instanceof SyntaxError) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  console.error("Client API failure", {
    name: error instanceof Error ? error.name : "unknown"
  });
  return NextResponse.json({ error: "Client request failed" }, { status: 500 });
}
