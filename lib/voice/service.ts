import {
  appendVoiceEvent,
  appendVoiceTurn,
  createVoiceSession,
  getVoiceProfileById,
  getVoiceProfileBySlug,
  getVoiceSession,
  listVoiceTurns,
  updateVoiceSessionAssistantText,
  updateVoiceSessionContext,
  updateVoiceSessionRouting,
  updateVoiceSessionState,
  updateVoiceSessionTranscript,
} from "./session-store";
import { resolveVoiceContextSwitch, resolveVoiceProfileContext } from "./context-router";
import { assertTransition } from "./state-machine";
import { runVoiceHooks } from "./hooks";
import type { ResolvedVoiceContext, VoiceProfile, VoiceProfileSlug, VoiceSession, VoiceTurn, VoiceTransport } from "./types";
import type { CalendarEvent } from "@/lib/google-calendar";

export type VoiceServiceCalendarProvider = (days?: number) => Promise<CalendarEvent[]>;

export type CreateSessionForProfileInput = {
  profileSlug: VoiceProfileSlug;
  transport?: VoiceTransport;
  calendarProvider?: VoiceServiceCalendarProvider;
};

export type CommitUserTurnInput = {
  sessionId: string;
  text: string;
  source?: string;
  metadata?: Record<string, unknown>;
};

export type GenerateAssistantTurnInput = {
  sessionId: string;
  generateReply?: (context: {
    session: VoiceSession;
    profile: VoiceProfile;
    resolvedContext: Record<string, unknown> | ResolvedVoiceContext;
    recentTurns: VoiceTurn[];
  }) => Promise<{ text: string; metadata?: Record<string, unknown> }> | { text: string; metadata?: Record<string, unknown> };
};

export type SwitchSessionContextInput = {
  sessionId: string;
  targetProfileSlug: VoiceProfileSlug;
  reason?: string;
  calendarProvider?: VoiceServiceCalendarProvider;
};

export type EndSessionInput = {
  sessionId: string;
  reason?: string;
};

function asObject(value: Record<string, unknown> | ResolvedVoiceContext | undefined): Record<string, unknown> {
  if (!value) return {};
  return value as Record<string, unknown>;
}

function mergeContext(
  base: Record<string, unknown> | ResolvedVoiceContext | undefined,
  patch?: Record<string, unknown>,
): Record<string, unknown> {
  return {
    ...asObject(base),
    ...(patch ?? {}),
  };
}

function requireSession(sessionId: string): VoiceSession {
  const session = getVoiceSession(sessionId);
  if (!session) {
    throw new Error(`Voice session not found: ${sessionId}`);
  }
  return session;
}

function requireProfile(profileId: string): VoiceProfile {
  const profile = getVoiceProfileById(profileId);
  if (!profile) {
    throw new Error(`Voice profile not found: ${profileId}`);
  }
  return profile;
}

function ensureSessionState(session: VoiceSession, allowed: VoiceSession["state"][]): void {
  if (!allowed.includes(session.state)) {
    throw new Error(`Voice session ${session.id} is not in a valid state: ${session.state}`);
  }
}

function transitionSession(
  session: VoiceSession,
  to: VoiceSession["state"],
  reason?: string,
  options: { lastError?: string | null; endedAt?: string } = {},
): VoiceSession {
  const transition = assertTransition(session.state, to, reason);
  const next = updateVoiceSessionState({
    sessionId: session.id,
    state: to,
    ...(to === "completed" ? { endedAt: options.endedAt ?? new Date().toISOString() } : {}),
    ...(options.lastError !== undefined ? { lastError: options.lastError } : {}),
  });
  appendVoiceEvent({
    sessionId: session.id,
    eventType: "voice.state_changed",
    fromState: transition.from,
    toState: transition.to,
    payload: {
      at: transition.at,
      ...(transition.reason ? { reason: transition.reason } : {}),
      ...(options.lastError ? { lastError: options.lastError } : {}),
    },
  });
  return next;
}

function persistResolvedContext(sessionId: string, current: VoiceSession, patch?: Record<string, unknown>): VoiceSession {
  if (!patch || Object.keys(patch).length === 0) return current;
  return updateVoiceSessionContext(sessionId, mergeContext(current.resolvedContext, patch));
}

function normalizeAssistantText(text: string): string {
  const normalized = text.trim();
  if (!normalized) {
    throw new Error("Assistant reply must not be empty");
  }
  return normalized;
}

function normalizeUserTurnText(text: string): string {
  const normalized = text.trim();
  if (!normalized) {
    throw new Error("User turn text must not be empty");
  }
  if (normalized.length > 4000) {
    throw new Error("User turn text exceeds 4000 characters");
  }
  return normalized;
}

async function hydrateSessionContext(
  session: VoiceSession,
  profile: VoiceProfile,
  calendarProvider?: VoiceServiceCalendarProvider,
): Promise<VoiceSession> {
  let currentSession = session;

  const beforeHydration = await runVoiceHooks("beforeHydration", {
    session: currentSession,
    profile,
    resolvedContext: currentSession.resolvedContext,
  });
  currentSession = persistResolvedContext(currentSession.id, currentSession, beforeHydration.patch.resolvedContext);

  const resolvedContext = await resolveVoiceProfileContext(profile.slug, {
    calendarProvider,
  });

  const profileHydration = await runVoiceHooks("hydrateProfileContext", {
    session: currentSession,
    profile,
    resolvedContext,
  });
  const mergedProfileContext = mergeContext(resolvedContext, profileHydration.patch.resolvedContext);

  const freshHydration = await runVoiceHooks("hydrateFreshContext", {
    session: currentSession,
    profile,
    resolvedContext: mergedProfileContext,
  });
  const mergedFreshContext = mergeContext(mergedProfileContext, freshHydration.patch.resolvedContext);

  const afterHydration = await runVoiceHooks("afterHydration", {
    session: currentSession,
    profile,
    resolvedContext: mergedFreshContext,
  });
  const finalResolvedContext = mergeContext(mergedFreshContext, afterHydration.patch.resolvedContext);

  return updateVoiceSessionContext(currentSession.id, finalResolvedContext);
}

function buildDefaultAssistantReply(context: {
  session: VoiceSession;
  profile: VoiceProfile;
  resolvedContext: Record<string, unknown> | ResolvedVoiceContext;
  recentTurns: VoiceTurn[];
}): { text: string; metadata?: Record<string, unknown> } {
  const resolvedContext = context.resolvedContext as Record<string, unknown>;
  const summary = typeof resolvedContext.contextSummary === "string" ? resolvedContext.contextSummary : context.profile.label;
  const userTurn = [...context.recentTurns].reverse().find((turn) => turn.speaker === "user");
  return {
    text: `Stub reply for ${context.profile.label}: ${summary}${userTurn ? ` | Letzte Frage: ${userTurn.text}` : ""}`,
    metadata: { provider: "stub" },
  };
}

export async function createSessionForProfile(input: CreateSessionForProfileInput): Promise<VoiceSession> {
  const profile = getVoiceProfileBySlug(input.profileSlug);
  if (!profile) {
    throw new Error(`Voice profile not found: ${input.profileSlug}`);
  }

  const beforeCreate = await runVoiceHooks("beforeSessionCreate", {
    profile,
    resolvedContext: {},
    payload: { transport: input.transport ?? "web" },
  });

  let session = createVoiceSession({
    profileId: profile.id,
    transport: input.transport ?? "web",
    baseSessionKey: profile.baseSessionKey,
    resolvedContext: beforeCreate.patch.resolvedContext ?? {},
  });

  session = transitionSession(session, "booting", "create-session");
  appendVoiceEvent({
    sessionId: session.id,
    eventType: "voice.session_created",
    fromState: "idle",
    toState: "booting",
    payload: {
      profileId: profile.id,
      profileSlug: profile.slug,
      transport: session.transport,
    },
  });

  const afterCreate = await runVoiceHooks("afterSessionCreate", {
    session,
    profile,
    resolvedContext: session.resolvedContext,
  });
  session = persistResolvedContext(session.id, session, afterCreate.patch.resolvedContext);

  try {
    session = transitionSession(session, "hydrating_context", "hydrate-context");
    appendVoiceEvent({
      sessionId: session.id,
      eventType: "voice.hydration_started",
      fromState: "booting",
      toState: "hydrating_context",
      payload: { profileSlug: profile.slug },
    });

    session = await hydrateSessionContext(session, profile, input.calendarProvider);
    appendVoiceEvent({
      sessionId: session.id,
      eventType: "voice.hydration_completed",
      fromState: "hydrating_context",
      toState: "ready",
      payload: {
        profileSlug: profile.slug,
        contextSummary: (session.resolvedContext as Record<string, unknown>).contextSummary,
      },
    });
    session = transitionSession(session, "ready", "context-ready", { lastError: null });
    return session;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    appendVoiceEvent({
      sessionId: session.id,
      eventType: "voice.hydration_failed",
      fromState: session.state,
      toState: "failed",
      payload: {
        message,
      },
    });
    session = transitionSession(session, "failed", "hydration-failed", { lastError: message });
    throw error;
  }
}

export async function commitUserTurn(input: CommitUserTurnInput): Promise<{ session: VoiceSession; turn: VoiceTurn }> {
  let session = requireSession(input.sessionId);
  ensureSessionState(session, ["ready", "listening", "awaiting_user"]);
  const profile = requireProfile(session.profileId);

  const normalizedInputText = normalizeUserTurnText(input.text);
  const hookRun = await runVoiceHooks("beforeTurnCommit", {
    session,
    profile,
    resolvedContext: session.resolvedContext,
    payload: {
      text: normalizedInputText,
      ...(input.metadata ? { metadata: input.metadata } : {}),
      ...(input.source ? { source: input.source } : {}),
    },
  });
  session = persistResolvedContext(session.id, session, hookRun.patch.resolvedContext);

  const turnText = typeof hookRun.patch.payload?.text === "string" ? normalizeUserTurnText(hookRun.patch.payload.text) : normalizedInputText;
  const turnMetadata = {
    ...(input.metadata ?? {}),
    ...(hookRun.patch.payload?.metadata && typeof hookRun.patch.payload.metadata === "object"
      ? (hookRun.patch.payload.metadata as Record<string, unknown>)
      : {}),
  };
  const turnSource = typeof hookRun.patch.payload?.source === "string" ? hookRun.patch.payload.source : input.source ?? "voice";

  const turn = appendVoiceTurn({
    sessionId: session.id,
    speaker: "user",
    text: turnText,
    source: turnSource,
    metadata: turnMetadata,
  });
  session = updateVoiceSessionTranscript(session.id, turn.text);
  appendVoiceEvent({
    sessionId: session.id,
    eventType: "voice.user_turn_committed",
    fromState: session.state,
    toState: session.state,
    payload: {
      turnId: turn.id,
      sequenceNo: turn.sequenceNo,
      source: turn.source,
    },
  });

  return { session, turn };
}

export async function generateAssistantTurn(input: GenerateAssistantTurnInput): Promise<{ session: VoiceSession; turn: VoiceTurn }> {
  let session = requireSession(input.sessionId);
  ensureSessionState(session, ["ready", "listening", "awaiting_user"]);
  const profile = requireProfile(session.profileId);

  if (session.state !== "listening") {
    session = transitionSession(session, "listening", "prepare-assistant-generate");
  }
  session = transitionSession(session, "thinking", "assistant-generate");
  const recentTurns = listVoiceTurns(session.id);

  const beforeGenerate = await runVoiceHooks("beforeAssistantGenerate", {
    session,
    profile,
    resolvedContext: session.resolvedContext,
    payload: { recentTurnCount: recentTurns.length },
  });
  session = persistResolvedContext(session.id, session, beforeGenerate.patch.resolvedContext);

  let generated: Awaited<ReturnType<NonNullable<GenerateAssistantTurnInput["generateReply"]>>>;
  try {
    generated = await (input.generateReply
      ? input.generateReply({ session, profile, resolvedContext: session.resolvedContext, recentTurns })
      : buildDefaultAssistantReply({ session, profile, resolvedContext: session.resolvedContext, recentTurns }));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    appendVoiceEvent({
      sessionId: session.id,
      eventType: "voice.provider_error",
      fromState: session.state,
      toState: "failed",
      payload: {
        message,
      },
    });
    await runVoiceHooks("onProviderError", {
      session,
      profile,
      resolvedContext: session.resolvedContext,
      payload: {
        message,
      },
    });
    session = transitionSession(session, "failed", "provider-error", { lastError: message });
    throw error;
  }

  const normalizedText = normalizeAssistantText(generated.text);
  const turn = appendVoiceTurn({
    sessionId: session.id,
    speaker: "assistant",
    text: normalizedText,
    metadata: generated.metadata ?? {},
  });
  session = updateVoiceSessionAssistantText(session.id, normalizedText);

  try {
    const afterGenerate = await runVoiceHooks("afterAssistantGenerate", {
      session,
      profile,
      resolvedContext: session.resolvedContext,
      payload: {
        assistantTurnId: turn.id,
      },
    });
    session = persistResolvedContext(session.id, session, afterGenerate.patch.resolvedContext);
    session = transitionSession(session, "awaiting_user", "assistant-generated", { lastError: null });
    appendVoiceEvent({
      sessionId: session.id,
      eventType: "voice.assistant_turn_generated",
      fromState: "thinking",
      toState: "awaiting_user",
      payload: {
        turnId: turn.id,
        sequenceNo: turn.sequenceNo,
        ...(generated.metadata ? { metadata: generated.metadata } : {}),
      },
    });
    return { session, turn };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    session = transitionSession(session, "failed", "after-assistant-generate-failed", { lastError: message });
    throw error;
  }
}

export async function switchSessionContext(input: SwitchSessionContextInput): Promise<{ session: VoiceSession; systemTurn: VoiceTurn }> {
  let session = requireSession(input.sessionId);
  ensureSessionState(session, ["ready", "listening", "awaiting_user"]);
  const currentProfile = requireProfile(session.profileId);
  const targetProfile = getVoiceProfileBySlug(input.targetProfileSlug);

  if (!targetProfile) {
    throw new Error(`Voice profile not found: ${input.targetProfileSlug}`);
  }

  if (!currentProfile.allowedSwitchTargets.includes(input.targetProfileSlug)) {
    throw new Error(`Voice profile switch not allowed: ${currentProfile.slug} -> ${input.targetProfileSlug}`);
  }

  const requestedFromState = session.state;
  if (session.state === "ready") {
    session = transitionSession(session, "listening", "prepare-context-switch");
  }
  session = transitionSession(session, "switching_context", `switch-to-${input.targetProfileSlug}`);
  appendVoiceEvent({
    sessionId: session.id,
    eventType: "voice.context_switch_requested",
    fromState: requestedFromState,
    toState: "switching_context",
    payload: {
      fromProfileSlug: currentProfile.slug,
      targetProfileSlug: input.targetProfileSlug,
    },
  });

  const beforeSwitch = await runVoiceHooks("beforeContextSwitch", {
    session,
    profile: currentProfile,
    resolvedContext: session.resolvedContext,
    payload: { targetProfileSlug: input.targetProfileSlug },
  });
  session = persistResolvedContext(session.id, session, beforeSwitch.patch.resolvedContext);

  try {
    session = transitionSession(session, "hydrating_context", `hydrate-switch-${targetProfile.slug}`);
    appendVoiceEvent({
      sessionId: session.id,
      eventType: "voice.hydration_started",
      fromState: "switching_context",
      toState: "hydrating_context",
      payload: {
        profileSlug: targetProfile.slug,
        reason: "context-switch",
      },
    });

    const resolvedContext = await resolveVoiceContextSwitch(
      { profileSlug: currentProfile.slug },
      input.targetProfileSlug,
      { calendarProvider: input.calendarProvider },
    );

    session = updateVoiceSessionRouting(session.id, targetProfile.id, targetProfile.baseSessionKey);
    session = updateVoiceSessionContext(session.id, resolvedContext);
    session = await hydrateSessionContext(session, targetProfile, input.calendarProvider);

    const afterSwitch = await runVoiceHooks("afterContextSwitch", {
      session,
      profile: targetProfile,
      resolvedContext: session.resolvedContext,
      payload: { fromProfileSlug: currentProfile.slug, targetProfileSlug: targetProfile.slug },
    });
    session = persistResolvedContext(session.id, session, afterSwitch.patch.resolvedContext);

    appendVoiceEvent({
      sessionId: session.id,
      eventType: "voice.hydration_completed",
      fromState: "hydrating_context",
      toState: "ready",
      payload: {
        profileSlug: targetProfile.slug,
        reason: "context-switch",
        contextSummary: (session.resolvedContext as Record<string, unknown>).contextSummary,
      },
    });
    session = transitionSession(session, "ready", `context-switch-ready-${targetProfile.slug}`, { lastError: null });
    session = transitionSession(session, "listening", `announce-switch-${targetProfile.slug}`);

    const systemTurn = appendVoiceTurn({
      sessionId: session.id,
      speaker: "system",
      text: `Context switched to ${targetProfile.label}.`,
      source: "system",
      metadata: {
        fromProfileSlug: currentProfile.slug,
        targetProfileSlug: targetProfile.slug,
      },
    });
    appendVoiceEvent({
      sessionId: session.id,
      eventType: "voice.context_switch_applied",
      fromState: "switching_context",
      toState: "awaiting_user",
      payload: {
        fromProfileSlug: currentProfile.slug,
        targetProfileSlug: targetProfile.slug,
        contextSummary: (session.resolvedContext as Record<string, unknown>).contextSummary,
      },
    });
    session = transitionSession(session, "thinking", `announce-switch-thinking-${targetProfile.slug}`);
    session = transitionSession(session, "speaking", `announce-switch-speaking-${targetProfile.slug}`);
    session = transitionSession(session, "awaiting_user", `switch-applied-${targetProfile.slug}`, { lastError: null });
    return { session, systemTurn };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    appendVoiceEvent({
      sessionId: session.id,
      eventType: "voice.hydration_failed",
      fromState: session.state,
      toState: "failed",
      payload: {
        message,
        reason: "context-switch",
      },
    });
    session = transitionSession(session, "failed", "context-switch-failed", { lastError: message });
    throw error;
  }
}

export async function endSession(input: EndSessionInput): Promise<VoiceSession> {
  let session = requireSession(input.sessionId);
  ensureSessionState(session, ["ready", "listening", "awaiting_user", "paused", "thinking", "speaking", "switching_context"]);
  const profile = requireProfile(session.profileId);

  session = transitionSession(session, "ending", input.reason ?? "session-end");
  const beforeEnd = await runVoiceHooks("beforeSessionEnd", {
    session,
    profile,
    resolvedContext: session.resolvedContext,
    payload: input.reason ? { reason: input.reason } : {},
  });
  session = persistResolvedContext(session.id, session, beforeEnd.patch.resolvedContext);

  appendVoiceEvent({
    sessionId: session.id,
    eventType: "voice.session_ended",
    fromState: "ending",
    toState: "completed",
    payload: {
      ...(input.reason ? { reason: input.reason } : {}),
    },
  });

  const afterEnd = await runVoiceHooks("afterSessionEnd", {
    session,
    profile,
    resolvedContext: session.resolvedContext,
    payload: input.reason ? { reason: input.reason } : {},
  });
  session = persistResolvedContext(session.id, session, afterEnd.patch.resolvedContext);
  session = transitionSession(session, "completed", input.reason ?? "session-completed");
  return session;
}
