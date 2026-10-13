import { NextResponse } from "next/server";
import { clientPatchSchema } from "../../../../lib/client-record";
import { getClient, updateClient } from "../../../../lib/client-store";
import {
  errorResponse,
  isJsonRequest,
  readBody,
  redirectTo,
  safeNext
} from "../../../../lib/client-http";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  const client = await getClient((await params).id);
  return client
    ? NextResponse.json({ client })
    : NextResponse.json({ error: "Client not found" }, { status: 404 });
}

export async function PUT(request: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const { data, form } = await readBody(request);
    const client = await updateClient(id, clientPatchSchema.parse(data));
    if (!client)
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    if (isJsonRequest(request)) return NextResponse.json({ client });
    return redirectTo(request, safeNext(form, `/admin/clients/${id}`));
  } catch (error) {
    return errorResponse(error);
  }
}

// HTML forms can only POST; they send the same body and this handler treats it as PUT.
export async function POST(request: Request, ctx: Ctx) {
  return PUT(request, ctx);
}
