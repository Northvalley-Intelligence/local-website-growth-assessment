import { z } from "zod";

export const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type Day = (typeof DAYS)[number];

export const LISTING_STATUSES = [
  "not_started",
  "prepared",
  "submitted",
  "verification_pending",
  "live",
  "rejected"
] as const;
export type ListingStatus = (typeof LISTING_STATUSES)[number];

const GOOGLE_HOSTS = new Set([
  "share.google",
  "www.google.com",
  "google.com",
  "maps.google.com"
]);

/** Same allow-list rule as the Desk: https and a known Google host only. */
export function isAllowedGoogleUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && GOOGLE_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM");

export const dayHoursSchema = z.object({
  kind: z.enum(["closed", "open24", "ranges"]),
  ranges: z.array(z.object({ open: hhmm, close: hhmm })).default([])
});
export type DayHours = z.infer<typeof dayHoursSchema>;

const hoursShape = Object.fromEntries(
  DAYS.map((d) => [d, dayHoursSchema.optional()])
) as Record<Day, z.ZodOptional<typeof dayHoursSchema>>;
export const hoursSchema = z.object(hoursShape);
export type Hours = z.infer<typeof hoursSchema>;

const optionalText = z.string().trim().max(2000).optional();

export const addressSchema = z.object({
  line1: optionalText,
  line2: optionalText,
  city: optionalText,
  region: optionalText,
  postalCode: optionalText,
  country: z.string().trim().default("US")
});

export const listingEntrySchema = z.object({
  status: z.enum(LISTING_STATUSES),
  updatedAt: z.string(),
  submittedAt: z.string().optional(),
  listingUrl: z.string().optional(),
  notes: z.string().optional(),
  missingAtSubmit: z.array(z.string()).default([])
});
export type ListingEntry = z.infer<typeof listingEntrySchema>;

const googleUrl = z
  .string()
  .trim()
  .refine(isAllowedGoogleUrl, "Must be an https share.google or google.com/maps URL")
  .optional();

/** Editable fields (everything except id/timestamps/listings/prefill bookkeeping). */
export const clientInputSchema = z.object({
  displayName: z.string().trim().min(1, "Display name is required").max(300),
  legalName: optionalText,
  primaryCategory: optionalText,
  additionalCategories: z.array(z.string().trim().min(1)).max(19).default([]),
  phone: optionalText,
  phoneCountry: z.string().trim().default("US"),
  website: optionalText,
  socialWebsite: optionalText,
  address: addressSchema.default({ country: "US" }),
  addressPublication: z.enum(["publish", "hide"]).default("publish"),
  storefrontStatus: z.enum(["physical", "service_area"]).default("physical"),
  serviceAreas: z.array(z.string().trim().min(1)).default([]),
  coordinates: z.object({ lat: z.number(), lng: z.number() }).optional(),
  hours: hoursSchema.default({}),
  description: optionalText,
  logoUrl: optionalText,
  coverPhotoUrl: optionalText,
  googleProfileUrl: googleUrl,
  googlePlaceId: optionalText,
  googleMapsUri: optionalText,
  notes: optionalText
});
export type ClientInput = z.infer<typeof clientInputSchema>;

/** Partial update: no defaults are applied so omitted keys never reset stored values. */
export const clientPatchSchema = z.object({
  displayName: z.string().trim().min(1).max(300).optional(),
  legalName: optionalText,
  primaryCategory: optionalText,
  additionalCategories: z.array(z.string().trim().min(1)).max(19).optional(),
  phone: optionalText,
  phoneCountry: z.string().trim().optional(),
  website: optionalText,
  socialWebsite: optionalText,
  address: addressSchema.partial().optional(),
  addressPublication: z.enum(["publish", "hide"]).optional(),
  storefrontStatus: z.enum(["physical", "service_area"]).optional(),
  serviceAreas: z.array(z.string().trim().min(1)).optional(),
  coordinates: z.object({ lat: z.number(), lng: z.number() }).optional(),
  hours: hoursSchema.optional(),
  description: optionalText,
  logoUrl: optionalText,
  coverPhotoUrl: optionalText,
  googleProfileUrl: googleUrl,
  googlePlaceId: optionalText,
  googleMapsUri: optionalText,
  notes: optionalText
});
export type ClientPatch = z.infer<typeof clientPatchSchema>;

export const clientRecordSchema = clientInputSchema.extend({
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  prefill: z
    .object({
      source: z.literal("google_places"),
      at: z.string(),
      fieldsFilled: z.array(z.string())
    })
    .optional(),
  listings: z.record(z.string(), listingEntrySchema).default({})
});
export type ClientRecord = z.infer<typeof clientRecordSchema>;
