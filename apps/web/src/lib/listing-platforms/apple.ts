// Apple Business Connect field sheet. Field order follows Apple's own flow:
//  - https://support.apple.com/guide/business/add-a-single-location-abmc1c1ef8e8/web  ("Add a single location")
//  - https://support.apple.com/guide/business/configure-location-attributes-abm3ed5c3a5a/web ("Configure location attributes")
// (read 2026-10-12). This module only PREPARES values; it never contacts Apple.
import { DAYS, type ClientRecord, type Day, type DayHours } from "../client-record";
import type { PlatformSheet, PlatformFieldSpec, PreparedField } from "./types";

const DAY_LABELS: Record<Day, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday"
};

export const APPLE_STEP_TITLES = [
  "Find or add",
  "Address and map marker",
  "Location details",
  "Hours",
  "Brand",
  "Verification",
  "After verification"
] as const;

export function formatPhoneUs(raw: string | undefined): {
  value: string | null;
  extension: boolean;
} {
  if (!raw) return { value: null, extension: false };
  const extension = /x|ext/i.test(raw);
  const base = extension ? (raw.split(/x|ext/i)[0] ?? "") : raw;
  let digits = base.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
  if (digits.length !== 10) return { value: raw, extension };
  return {
    value: `+1 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`,
    extension
  };
}

function to12h(hhmm: string): string {
  const [h = "0", m = "00"] = hhmm.split(":");
  const hour = Number(h);
  const suffix = hour >= 12 ? "PM" : "AM";
  return `${hour % 12 === 0 ? 12 : hour % 12}:${m} ${suffix}`;
}

export function formatDayHours(h: DayHours | undefined): string | null {
  if (!h) return null;
  if (h.kind === "closed") return "Closed";
  if (h.kind === "open24") return "Open 24 hours";
  if (!h.ranges.length) return null;
  return h.ranges.map((r) => `${to12h(r.open)} – ${to12h(r.close)}`).join(", ");
}

function field(
  spec: Omit<PlatformFieldSpec, "step" | "stepTitle">,
  step: number,
  value: string | null | undefined,
  warnings: string[] = []
): PreparedField {
  const empty = value === undefined || value === null || String(value).trim() === "";
  return {
    ...spec,
    step,
    stepTitle: APPLE_STEP_TITLES[step - 1] as string,
    value: empty ? null : String(value),
    missing: spec.required && empty,
    warnings
  };
}

export function prepareAppleSheet(record: ClientRecord): PlatformSheet {
  const a = record.address;
  const nameWarnings = /[®©™;{}[\]]/.test(record.displayName)
    ? ["Display name contains a character Apple rejects (® © ™ ; { } [ ])."]
    : [];

  const step1: PreparedField[] = [
    field(
      {
        key: "displayName",
        label: "Business name",
        required: true,
        help: "Type the name, then choose 'Add a new location with this name' — or if Apple shows an existing card for this business, select it instead (claim/transfer)."
      },
      1,
      record.displayName
    )
  ];

  const oneLine = [
    a.line1,
    [a.city, [a.region, a.postalCode].filter(Boolean).join(" ")]
      .filter(Boolean)
      .join(", ")
  ]
    .filter((x) => x && x.length)
    .join(", ");
  const poBox =
    a.line1 && /\bP\.?O\.? ?Box\b/i.test(a.line1)
      ? ["Apple does not accept PO Boxes."]
      : [];
  const step2: PreparedField[] = [
    field(
      { key: "address", label: "Address (one line)", required: false },
      2,
      oneLine,
      poBox
    ),
    field(
      { key: "address.line1", label: "Street address", required: true },
      2,
      a.line1
    ),
    field({ key: "address.city", label: "City", required: true }, 2, a.city),
    field(
      { key: "address.region", label: "State / region", required: true },
      2,
      a.region
    ),
    field(
      { key: "address.postalCode", label: "Postal code", required: true },
      2,
      a.postalCode
    ),
    field(
      {
        key: "coordinates",
        label: "Map marker (lat, lng)",
        required: false,
        help: "Drag the pin in Apple's map if it is off."
      },
      2,
      record.coordinates
        ? `${record.coordinates.lat.toFixed(6)}, ${record.coordinates.lng.toFixed(6)}`
        : null
    )
  ];

  const phone = formatPhoneUs(record.phone);
  const step3: PreparedField[] = [
    field(
      { key: "language", label: "Default language", required: false },
      3,
      "English (US)"
    ),
    field(
      { key: "displayName.apple", label: "Display name", required: false },
      3,
      record.displayName,
      nameWarnings
    ),
    field(
      {
        key: "primaryCategory",
        label: "Primary category",
        required: true,
        help: "Pick the closest Apple category; Apple's list differs from Google's"
      },
      3,
      record.primaryCategory
    ),
    field({ key: "status", label: "Status", required: false }, 3, "Open"),
    field(
      { key: "phone", label: "Phone", required: true },
      3,
      phone.value,
      phone.extension
        ? ["Phone has an extension; Apple's phone field may not accept it."]
        : []
    ),
    field(
      { key: "website", label: "Website (optional)", required: false },
      3,
      record.website ?? record.socialWebsite
    ),
    field(
      {
        key: "partnerOrgId",
        label: "Third-party partner Organization ID",
        required: false,
        help: "only when creating for another organization — we create under the client's own account"
      },
      3,
      "leave blank"
    )
  ];

  const anyHours = DAYS.some((d) => formatDayHours(record.hours[d]) !== null);
  const step4: PreparedField[] = [];
  if (!anyHours) {
    step4.push(
      field(
        {
          key: "hours",
          label: "Opening hours",
          required: true,
          help: "No hours on file — enter them on the client page (Edit client)."
        },
        4,
        null
      )
    );
  }
  for (const d of DAYS) {
    step4.push(
      field(
        { key: `hours.${d}`, label: DAY_LABELS[d], required: false },
        4,
        formatDayHours(record.hours[d]) ?? (anyHours ? "Closed" : null)
      )
    );
  }

  const step5: PreparedField[] = [
    field(
      { key: "brand.name", label: "Brand name", required: false },
      5,
      record.displayName
    ),
    field({ key: "logoUrl", label: "Logo", required: false }, 5, record.logoUrl, [
      record.logoUrl
        ? "Apple reviews the logo and cover photo before they show"
        : "no logo on file"
    ]),
    field(
      { key: "coverPhotoUrl", label: "Cover photo", required: false },
      5,
      record.coverPhotoUrl,
      [
        record.coverPhotoUrl
          ? "Apple reviews the logo and cover photo before they show"
          : "no cover photo on file"
      ]
    )
  ];

  const step6: PreparedField[] = [
    field(
      { key: "verification", label: "How to verify", required: false },
      6,
      "First location: verify the ORGANIZATION (business documents); phone verification is offered only for existing cards. Use the client's own Apple account (Isaac's for Horizon)."
    )
  ];

  const step7: PreparedField[] = [
    field(
      { key: "description", label: "About", required: false },
      7,
      record.description,
      record.description ? [] : ["No About text on file."]
    ),
    field(
      {
        key: "additionalCategories",
        label: "Additional categories (up to 19)",
        required: false
      },
      7,
      record.additionalCategories.slice(0, 19).join(", ")
    ),
    field(
      {
        key: "serviceAreas",
        label: "Service areas (informational)",
        required: false,
        help: "Apple has no service-area field; shown so you do not look for one."
      },
      7,
      record.serviceAreas.join(", ")
    )
  ];

  const stepsFields = [step1, step2, step3, step4, step5, step6, step7];
  const warnings: string[] = [];
  let ok = true;
  if (record.addressPublication === "hide") {
    ok = false;
    warnings.push(
      "Apple's Add a Location is for businesses operating a physical location; this record hides its address — confirm with the client before adding"
    );
  } else if (record.storefrontStatus === "service_area") {
    warnings.push(
      "Service-area business with a published address — Apple shows the address on the card."
    );
  }

  const steps = APPLE_STEP_TITLES.map((title, i) => ({
    title,
    fields: stepsFields[i] as PreparedField[]
  }));
  const missingRequired = steps
    .flatMap((s) => s.fields)
    .filter((f) => f.missing)
    .map((f) => f.key);
  return { platform: "apple", steps, eligibility: { ok, warnings }, missingRequired };
}
