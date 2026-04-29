import { NextResponse } from "next/server";
import { buildSessionEnvelope, parseLimit, voiceErrorResponse } from "@/lib/voice/api";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: { id: string } }) {
  try {
    const turnLimit = parseLimit(request.url, 50, 200);
    return NextResponse.json(buildSessionEnvelope(context.params.id, turnLimit));
  } catch (error) {
    return voiceErrorResponse(error);
  }
}
