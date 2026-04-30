import { NextResponse } from "next/server";

import { parseJsonBody, voiceErrorResponse } from "@/lib/voice/api";
import { synthesizeVoiceTts } from "@/lib/voice/tts";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await parseJsonBody(request);
    const text = typeof body.text === "string" ? body.text.trim() : "";
    if (!text) {
      throw new Error("text required");
    }

    const result = await synthesizeVoiceTts(text);
    if (result.provider === "browser") {
      return NextResponse.json(result);
    }

    return new NextResponse(result.audio, {
      status: 200,
      headers: {
        "content-type": result.contentType,
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    return voiceErrorResponse(error);
  }
}
