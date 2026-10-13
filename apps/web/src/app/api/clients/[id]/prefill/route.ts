import { NextResponse } from "next/server";
import {
  getClient,
  setPrefillMarker,
  updateClient
} from "../../../../../lib/client-store";
import { isJsonRequest, redirectTo } from "../../../../../lib/client-http";
import {
  UpstreamError,
  prefillFromGoogle,
  resolveGoogleMapsApiKey
} from "../../../../../lib/google-prefill";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Ctx) {
  const { id } = await params;
  const json = isJsonRequest(request);
  const fail = (status: number, error: string, code: string) =>
    json
      ? NextResponse.json({ error }, { status })
      : redirectTo(request, `/admin/clients/${id}?prefill=${code}`);

  const client = await getClient(id);
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  const apiKey = resolveGoogleMapsApiKey();
  if (!apiKey) return fail(503, "GOOGLE_MAPS_API_KEY is not configured", "nokey");

  let overwrite = false;
  try {
    if (json)
      overwrite =
        ((await request.json()) as { overwrite?: unknown }).overwrite === true;
    else overwrite = (await request.formData()).get("overwrite") === "1";
  } catch {
    overwrite = false;
  }

  try {
    const result = await prefillFromGoogle(client, apiKey, { overwrite });
    const updated = await updateClient(id, {
      ...result.patch,
      googlePlaceId: result.placeId
    });
    if (updated) await setPrefillMarker(id, result.fieldsFilled);
    return json
      ? NextResponse.json({ fieldsFilled: result.fieldsFilled })
      : redirectTo(request, `/admin/clients/${id}?prefill=ok`);
  } catch (error) {
    if (error instanceof UpstreamError)
      return fail(502, `Google returned ${error.status}`, `upstream${error.status}`);
    return fail(
      404,
      error instanceof Error ? error.message : "Prefill failed",
      "notfound"
    );
  }
}
