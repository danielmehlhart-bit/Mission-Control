import { NextResponse } from "next/server";
import { listEventsEnvelope, parseLimit, voiceErrorResponse } from "@/lib/voice/api";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: { id: string } }) {
  try {
    const limit = parseLimit(request.url, 200, 500);
    return NextResponse.json(listEventsEnvelope(context.params.id, limit));
  } catch (error) {
    return voiceErrorResponse(error);
  }
}
