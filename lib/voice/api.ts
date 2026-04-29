import { NextResponse } from "next/server";
import {
  getVoiceProfileById,
  getVoiceSession,
  listActiveVoiceProfiles,
  listVoiceSessionEvents,
  listVoiceTurns,
  updateVoiceSessionTranscript,
  appendVoiceEvent,
} from "./session-store";
import type { VoiceProfile, VoiceSession, VoiceTransport } from "./types";

const ALLOWED_TRANSPORTS = new Set<VoiceTransport>(["web", "telegram", "internal"]);

export type VoiceRouteParams = { params: { id: string } };

export function parseLimit(url: string, fallback: number, max = 200): number {
  const { searchParams } = new URL(url);
  const raw = searchParams.get("limit");
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
}

export async function parseJsonBody(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = await request.json();
    return body && typeof body === "object" && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : {};
  } catch {
    throw new Error("Invalid JSON body");
  }
}

export function requireString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${field} required`);
  }
  return value.trim();
}

export function validateTransport(value: unknown): VoiceTransport {
  if (typeof value !== "string" || !ALLOWED_TRANSPORTS.has(value as VoiceTransport)) {
    throw new Error("Invalid transport");
  }
  return value as VoiceTransport;
}

export function requireProfileById(profileId: string): VoiceProfile {
  const profile = getVoiceProfileById(profileId);
  if (!profile) {
    throw new Error(`Voice profile not found: ${profileId}`);
  }
  return profile;
}

export function requireSession(sessionId: string): VoiceSession {
  const session = getVoiceSession(sessionId);
  if (!session) {
    throw new Error(`Voice session not found: ${sessionId}`);
  }
  return session;
}

export function listButtonReadyProfiles() {
  return listActiveVoiceProfiles().map((profile) => ({
    id: profile.id,
    slug: profile.slug,
    label: profile.label,
    description: profile.description ?? null,
    color: profile.color ?? null,
    icon: profile.icon ?? null,
    status: profile.status,
  }));
}

export function buildSessionEnvelope(sessionId: string, turnLimit = 50) {
  const session = requireSession(sessionId);
  const profile = requireProfileById(session.profileId);
  const turns = listVoiceTurns(session.id, turnLimit);
  const resolvedContext = session.resolvedContext as Record<string, unknown>;

  return {
    session,
    profile,
    turns,
    contextSummary: typeof resolvedContext.contextSummary === "string" ? resolvedContext.contextSummary : profile.label,
    switchTargets: Array.isArray(resolvedContext.switchTargets) ? resolvedContext.switchTargets : profile.allowedSwitchTargets,
    lastError: session.lastError ?? null,
  };
}

export function appendTranscriptReceipt(sessionId: string, text: string, isFinal: boolean, metadata?: Record<string, unknown>) {
  return appendVoiceEvent({
    sessionId,
    eventType: "voice.transcript_received",
    payload: {
      isFinal,
      textLength: text.length,
      preview: text.slice(0, 120),
      ...(metadata ? { metadata } : {}),
    },
  });
}

export function persistInterimTranscript(sessionId: string, text: string) {
  return updateVoiceSessionTranscript(sessionId, text);
}

export function listEventsEnvelope(sessionId: string, limit = 200) {
  requireSession(sessionId);
  return {
    events: listVoiceSessionEvents(sessionId, limit),
  };
}

export function voiceErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const normalized = message.toLowerCase();

  if (normalized.includes("not found")) {
    return NextResponse.json({ error: message }, { status: 404 });
  }
  if (
    normalized.includes("required") ||
    normalized.includes("invalid") ||
    normalized.includes("not allowed") ||
    normalized.includes("must not be empty") ||
    normalized.includes("exceeds") ||
    normalized.includes("not in a valid state")
  ) {
    return NextResponse.json({ error: message }, { status: 400 });
  }

  return NextResponse.json({ error: message }, { status: 500 });
}
