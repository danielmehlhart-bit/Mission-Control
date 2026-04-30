import { NextResponse } from "next/server";
import { createSessionForProfile, generateAssistantTurn } from "@/lib/voice/service";
import { listVoiceSessions } from "@/lib/voice/session-store";
import {
  buildSessionEnvelope,
  parseJsonBody,
  parseLimit,
  requireActiveProfileById,
  requireProfileById,
  serializeVoiceProfile,
  serializeVoiceSession,
  validateTransport,
  voiceErrorResponse,
} from "@/lib/voice/api";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const limit = parseLimit(request.url, 20, 100);
    const sessions = listVoiceSessions(limit).map((session) => {
      const profile = requireProfileById(session.profileId);
      const resolvedContext = session.resolvedContext as Record<string, unknown>;
      return {
        session: serializeVoiceSession(session),
        profile: serializeVoiceProfile(profile),
        contextSummary: typeof resolvedContext.contextSummary === "string" ? resolvedContext.contextSummary : profile.label,
      };
    });
    return NextResponse.json({ sessions });
  } catch (error) {
    return voiceErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await parseJsonBody(request);
    const profileId = typeof body.profileId === "string" ? body.profileId.trim() : "";
    if (!profileId) {
      throw new Error("profileId required");
    }

    const transport = body.transport === undefined ? "web" : validateTransport(body.transport);
    const autoGreeting = body.autoGreeting !== false;
    const profile = requireActiveProfileById(profileId);
    const session = await createSessionForProfile({ profileSlug: profile.slug, transport });
    if (autoGreeting) {
      await generateAssistantTurn({ sessionId: session.id });
    }

    return NextResponse.json(buildSessionEnvelope(session.id), { status: 201 });
  } catch (error) {
    return voiceErrorResponse(error);
  }
}
