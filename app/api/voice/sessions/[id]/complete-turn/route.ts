import { NextResponse } from "next/server";
import { commitUserTurn, generateAssistantTurn } from "@/lib/voice/service";
import { parseJsonBody, requireSession, requireString, voiceErrorResponse } from "@/lib/voice/api";

export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: { id: string } }) {
  try {
    requireSession(context.params.id);
    const body = await parseJsonBody(request);
    const userText = requireString(body.userText, "userText");
    const metadata = body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)
      ? (body.metadata as Record<string, unknown>)
      : undefined;

    const userResult = await commitUserTurn({
      sessionId: context.params.id,
      text: userText,
      source: typeof body.source === "string" && body.source.trim() ? body.source.trim() : "complete-turn",
      metadata,
    });
    const assistantResult = await generateAssistantTurn({ sessionId: context.params.id });

    return NextResponse.json({
      session: assistantResult.session,
      userTurn: userResult.turn,
      assistantTurn: assistantResult.turn,
      assistantText: assistantResult.turn.text,
    });
  } catch (error) {
    return voiceErrorResponse(error);
  }
}
