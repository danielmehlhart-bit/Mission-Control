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

export function serializeVoiceProfile(profile: VoiceProfile) {
  return {
    id: profile.id,
    slug: profile.slug,
    label: profile.label,
    description: profile.description ?? null,
    color: profile.color ?? null,
    icon: profile.icon ?? null,
    status: profile.status,
  };
}

export function requireProfileById(profileId: string): VoiceProfile {
  const profile = getVoiceProfileById(profileId);
  if (!profile) {
    throw new Error(`Voice profile not found: ${profileId}`);
  }
  return profile;
}

export function requireActiveProfileById(profileId: string): VoiceProfile {
  const profile = requireProfileById(profileId);
  if (profile.status !== "active") {
    throw new Error(`Voice profile inactive: ${profileId}`);
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

function sanitizeVoiceErrorDetail(message: string | null | undefined): string | null {
  return message ? "Internal voice error" : null;
}

function sanitizeVoiceEventPayload(eventType: string, payload: unknown): unknown {
  if (!payload || typeof payload !== "object") {
    return payload;
  }

  const nextPayload = { ...(payload as Record<string, unknown>) };
  if ("lastError" in nextPayload) {
    nextPayload.lastError = sanitizeVoiceErrorDetail(
      typeof nextPayload.lastError === "string" ? nextPayload.lastError : null,
    );
  }
  if (
    eventType === "voice.hook_failed" ||
    eventType === "voice.hydration_failed" ||
    eventType === "voice.provider_error"
  ) {
    if ("message" in nextPayload) {
      nextPayload.message = "Internal voice error";
    }
  }

  return nextPayload;
}

function serializeVoiceEvent(event: ReturnType<typeof listVoiceSessionEvents>[number]) {
  return {
    ...event,
    payload: sanitizeVoiceEventPayload(event.eventType, event.payload),
  };
}

export function listButtonReadyProfiles() {
  return listActiveVoiceProfiles().map(serializeVoiceProfile);
}

export function serializeVoiceSession(session: VoiceSession) {
  return {
    id: session.id,
    profileId: session.profileId,
    state: session.state,
    transport: session.transport,
    lastUserTranscript: session.lastUserTranscript ?? null,
    lastAssistantText: session.lastAssistantText ?? null,
    lastError: sanitizeVoiceErrorDetail(session.lastError ?? null),
    startedAt: session.startedAt,
    endedAt: session.endedAt ?? null,
    updatedAt: session.updatedAt,
  };
}

export function buildSessionEnvelope(sessionId: string, turnLimit = 50) {
  const session = requireSession(sessionId);
  const profile = requireProfileById(session.profileId);
  const turns = listVoiceTurns(session.id, turnLimit);
  const resolvedContext = session.resolvedContext as Record<string, unknown>;

  return {
    session: serializeVoiceSession(session),
    profile: serializeVoiceProfile(profile),
    turns,
    contextSummary: typeof resolvedContext.contextSummary === "string" ? resolvedContext.contextSummary : profile.label,
    switchTargets: Array.isArray(resolvedContext.switchTargets) ? resolvedContext.switchTargets : profile.allowedSwitchTargets,
    lastError: sanitizeVoiceErrorDetail(session.lastError ?? null),
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
    events: listVoiceSessionEvents(sessionId, limit).map(serializeVoiceEvent),
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
    normalized.includes("inactive") ||
    normalized.includes("not allowed") ||
    normalized.includes("must not be empty") ||
    normalized.includes("exceeds") ||
    normalized.includes("not in a valid state")
  ) {
    return NextResponse.json({ error: message }, { status: 400 });
  }

  return NextResponse.json({ error: "Internal voice API error" }, { status: 500 });
}
