import { NextResponse } from "next/server";

import { createRealtimeSdpAnswer } from "@/lib/voice/realtime";
import { requireString, voiceErrorResponse } from "@/lib/voice/api";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = requireString(searchParams.get("sessionId"), "sessionId");
    const sdp = await request.text();
    const answer = await createRealtimeSdpAnswer({ sessionId, sdp });

    return new NextResponse(answer, {
      status: 200,
      headers: {
        "content-type": "application/sdp",
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    return voiceErrorResponse(error);
  }
}
