export const VOICE_PROFILE_SLUGS = ["main", "sales_support", "luma", "fitness"] as const;
export type VoiceProfileSlug = typeof VOICE_PROFILE_SLUGS[number];

export const VOICE_SESSION_STATES = [
  "idle",
  "booting",
  "hydrating_context",
  "ready",
  "listening",
  "thinking",
  "speaking",
  "awaiting_user",
  "switching_context",
  "paused",
  "ending",
  "completed",
  "failed",
] as const;
export type VoiceSessionState = typeof VOICE_SESSION_STATES[number];

export const VOICE_EVENT_TYPES = [
  "voice.session_created",
  "voice.state_changed",
  "voice.hydration_started",
  "voice.hydration_completed",
  "voice.hydration_failed",
  "voice.transcript_received",
  "voice.user_turn_committed",
  "voice.assistant_turn_generated",
  "voice.context_switch_requested",
  "voice.context_switch_applied",
  "voice.provider_error",
  "voice.session_ended",
  "voice.invalid_transition",
] as const;
export type VoiceEventType = typeof VOICE_EVENT_TYPES[number];

export const VOICE_BINDING_TYPES = [
  "account",
  "project",
  "deal",
  "topic",
  "telegram_chat",
  "telegram_thread",
  "custom",
] as const;
export type VoiceBindingType = typeof VOICE_BINDING_TYPES[number];

export const VOICE_TURN_SPEAKERS = ["user", "assistant", "system"] as const;
export type VoiceTurnSpeaker = typeof VOICE_TURN_SPEAKERS[number];

export const VOICE_TRANSPORTS = ["web", "telegram", "internal"] as const;
export type VoiceTransport = typeof VOICE_TRANSPORTS[number];

export type VoiceProfile = {
  id: string;
  slug: VoiceProfileSlug;
  label: string;
  description?: string;
  status: string;
  color?: string;
  icon?: string;
  baseSessionKey: string;
  defaultPrompt?: string;
  contextBinding: Record<string, unknown>;
  contextSources: string[];
  allowedSwitchTargets: VoiceProfileSlug[];
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type ResolvedVoiceContext = {
  profile: {
    id: string;
    slug: VoiceProfileSlug;
    label: string;
  };
  bindings: Record<string, unknown>;
  sources: Array<{ type: string; count?: number; label?: string }>;
  contextSummary?: string;
  switchTargets: VoiceProfileSlug[];
  metadata?: Record<string, unknown>;
};

export type VoiceSession = {
  id: string;
  profileId: string;
  state: VoiceSessionState;
  transport: VoiceTransport;
  baseSessionKey: string;
  resolvedContext: ResolvedVoiceContext | Record<string, unknown>;
  lastUserTranscript?: string;
  lastAssistantText?: string;
  lastError?: string;
  startedAt: string;
  endedAt?: string;
  updatedAt: string;
};

export type VoiceSessionEvent = {
  id: string;
  sessionId: string;
  eventType: VoiceEventType | string;
  fromState?: VoiceSessionState;
  toState?: VoiceSessionState;
  payload: Record<string, unknown>;
  createdAt: string;
};

export type VoiceTurn = {
  id: string;
  sessionId: string;
  speaker: VoiceTurnSpeaker;
  text: string;
  source: string;
  sequenceNo: number;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type VoiceProfileBinding = {
  id: string;
  profileId: string;
  bindingType: VoiceBindingType;
  bindingValue: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type CreateVoiceSessionInput = {
  profileId: string;
  transport?: VoiceTransport;
  baseSessionKey?: string;
  resolvedContext?: Record<string, unknown>;
};

export type UpdateVoiceSessionStateInput = {
  sessionId: string;
  state: VoiceSessionState;
  lastError?: string | null;
  endedAt?: string | null;
};

export type AppendVoiceEventInput = {
  sessionId: string;
  eventType: VoiceEventType | string;
  fromState?: VoiceSessionState;
  toState?: VoiceSessionState;
  payload?: Record<string, unknown>;
};

export type AppendVoiceTurnInput = {
  sessionId: string;
  speaker: VoiceTurnSpeaker;
  text: string;
  source?: string;
  metadata?: Record<string, unknown>;
  sequenceNo?: number;
};

export type UpsertVoiceProfileBindingInput = {
  id?: string;
  profileId: string;
  bindingType: VoiceBindingType;
  bindingValue: string;
  metadata?: Record<string, unknown>;
};
