import { NextResponse } from "next/server";
import { clientInputSchema } from "../../../lib/client-record";
import { createClient, listClients } from "../../../lib/client-store";
import {
  errorResponse,
  isJsonRequest,
  readBody,
  redirectTo
} from "../../../lib/client-http";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ clients: await listClients() });
}

export async function POST(request: Request) {
  try {
    const { data } = await readBody(request);
    const client = await createClient(clientInputSchema.parse(data));
    if (isJsonRequest(request)) {
      return NextResponse.json({ id: client.id, client }, { status: 201 });
    }
    return redirectTo(request, `/admin/clients/${client.id}`);
  } catch (error) {
    return errorResponse(error);
  }
}
