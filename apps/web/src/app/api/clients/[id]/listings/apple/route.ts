import { NextResponse } from "next/server";
import { z } from "zod";
import { LISTING_STATUSES } from "../../../../../../lib/client-record";
import { getClient, setListingStatus } from "../../../../../../lib/client-store";
import {
  errorResponse,
  isJsonRequest,
  redirectTo
} from "../../../../../../lib/client-http";
import { prepareAppleSheet } from "../../../../../../lib/listing-platforms/apple";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  status: z.enum(LISTING_STATUSES),
  listingUrl: z
    .string()
    .trim()
    .refine((v) => v === "" || /^https?:\/\//i.test(v), "Must be an http(s) URL")
    .optional(),
  notes: z.string().trim().max(4000).optional()
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const json = isJsonRequest(request);
    let raw: Record<string, unknown>;
    if (json) raw = (await request.json()) as Record<string, unknown>;
    else {
      const form = await request.formData();
      raw = {};
      for (const key of ["status", "listingUrl", "notes"]) {
        const v = form.get(key);
        if (typeof v === "string") raw[key] = v;
      }
    }
    const body = bodySchema.parse(raw);
    const client = await getClient(id);
    if (!client)
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    const extra: { listingUrl?: string; notes?: string; missingAtSubmit?: string[] } =
      {};
    if (body.listingUrl !== undefined) extra.listingUrl = body.listingUrl;
    if (body.notes !== undefined) extra.notes = body.notes;
    if (body.status === "submitted")
      extra.missingAtSubmit = prepareAppleSheet(client).missingRequired;
    const updated = await setListingStatus(id, "apple", body.status, extra);
    return json
      ? NextResponse.json({ listing: updated?.listings.apple })
      : redirectTo(request, `/admin/clients/${id}/listings/apple`);
  } catch (error) {
    return errorResponse(error);
  }
}
