import { NextResponse } from "next/server";
import { commitUserTurn } from "@/lib/voice/service";
import {
  appendTranscriptReceipt,
  parseJsonBody,
  persistInterimTranscript,
  requireSession,
  requireString,
  voiceErrorResponse,
} from "@/lib/voice/api";

export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: { id: string } }) {
  try {
    requireSession(context.params.id);
    const body = await parseJsonBody(request);
    const text = requireString(body.text, "text");
    const isFinal = body.isFinal === true;
    const metadata = body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)
      ? (body.metadata as Record<string, unknown>)
      : undefined;

    appendTranscriptReceipt(context.params.id, text, isFinal, metadata);

    if (isFinal) {
      const committed = await commitUserTurn({
        sessionId: context.params.id,
        text,
        source: typeof body.source === "string" && body.source.trim() ? body.source.trim() : "transcript-final",
        metadata,
      });

      return NextResponse.json({
        session: committed.session,
        committedTurn: committed.turn,
      });
    }

    const session = persistInterimTranscript(context.params.id, text);
    return NextResponse.json({
      session,
      committedTurn: null,
    });
  } catch (error) {
    return voiceErrorResponse(error);
  }
}
