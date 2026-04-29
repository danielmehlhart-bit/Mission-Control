import { NextResponse } from "next/server";
import { switchSessionContext } from "@/lib/voice/service";
import { parseJsonBody, requireProfileById, requireSession, requireString, voiceErrorResponse } from "@/lib/voice/api";

export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: { id: string } }) {
  try {
    const session = requireSession(context.params.id);
    requireProfileById(session.profileId);
    const body = await parseJsonBody(request);
    const targetProfileSlug = requireString(body.targetProfileSlug, "targetProfileSlug") as "main" | "sales_support" | "luma" | "fitness";
    const result = await switchSessionContext({ sessionId: context.params.id, targetProfileSlug });
    const profile = requireProfileById(result.session.profileId);

    return NextResponse.json({
      session: result.session,
      profile,
      contextSummary: typeof (result.session.resolvedContext as Record<string, unknown>).contextSummary === "string"
        ? (result.session.resolvedContext as Record<string, unknown>).contextSummary
        : profile.label,
      systemTurn: result.systemTurn,
    });
  } catch (error) {
    return voiceErrorResponse(error);
  }
}
