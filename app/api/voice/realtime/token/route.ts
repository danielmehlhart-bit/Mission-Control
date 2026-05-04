import { NextResponse } from "next/server";

import { requireString, voiceErrorResponse } from "@/lib/voice/api";
import { createRealtimeClientSecret } from "@/lib/voice/realtime";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = requireString(searchParams.get("sessionId"), "sessionId");
    const token = await createRealtimeClientSecret({ sessionId });

    return NextResponse.json(token, {
      status: 200,
      headers: {
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    return voiceErrorResponse(error);
  }
}
