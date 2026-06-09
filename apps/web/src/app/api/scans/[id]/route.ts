import { NextResponse } from "next/server";
import { getAssessmentJob } from "../../../../lib/scan-store";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const job = await getAssessmentJob(id);

  if (!job) {
    return NextResponse.json({ error: "Assessment not found." }, { status: 404 });
  }

  return NextResponse.json({ scan: job });
}
