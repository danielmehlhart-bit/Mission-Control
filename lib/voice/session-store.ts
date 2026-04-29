import { getDb } from "@/lib/db";
import type {
  AppendVoiceEventInput,
  AppendVoiceTurnInput,
  CreateVoiceSessionInput,
  ResolvedVoiceContext,
  UpdateVoiceSessionStateInput,
  UpsertVoiceProfileBindingInput,
  VoiceProfile,
  VoiceProfileBinding,
  VoiceProfileSlug,
  VoiceSession,
  VoiceSessionEvent,
  VoiceSessionState,
  VoiceTransport,
  VoiceTurn,
  VoiceTurnSpeaker,
} from "./types";

function parseJsonObject(value: unknown): Record<string, unknown> {
  if (typeof value !== "string" || value.trim() === "") return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function parseJsonArray(value: unknown): unknown[] {
  if (typeof value !== "string" || value.trim() === "") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

type VoiceProfileRow = {
  id: string;
  slug: string;
  label: string;
  description: string | null;
  status: string;
  color: string | null;
  icon: string | null;
  base_session_key: string;
  default_prompt: string | null;
  context_binding_json: string;
  context_sources_json: string;
  allowed_switch_targets_json: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

type VoiceSessionRow = {
  id: string;
  profile_id: string;
  state: string;
  transport: string;
  base_session_key: string;
  resolved_context_json: string;
  last_user_transcript: string | null;
  last_assistant_text: string | null;
  last_error: string | null;
  started_at: string;
  ended_at: string | null;
  updated_at: string;
};

type VoiceSessionEventRow = {
  id: string;
  session_id: string;
  event_type: string;
  from_state: string | null;
  to_state: string | null;
  payload_json: string;
  created_at: string;
};

type VoiceTurnRow = {
  id: string;
  session_id: string;
  speaker: string;
  text: string;
  source: string;
  sequence_no: number;
  metadata_json: string;
  created_at: string;
};

type VoiceProfileBindingRow = {
  id: string;
  profile_id: string;
  binding_type: string;
  binding_value: string;
  metadata_json: string;
  created_at: string;
};

function mapVoiceProfile(row: VoiceProfileRow): VoiceProfile {
  return {
    id: row.id,
    slug: row.slug as VoiceProfileSlug,
    label: row.label,
    ...(row.description ? { description: row.description } : {}),
    status: row.status,
    ...(row.color ? { color: row.color } : {}),
    ...(row.icon ? { icon: row.icon } : {}),
    baseSessionKey: row.base_session_key,
    ...(row.default_prompt ? { defaultPrompt: row.default_prompt } : {}),
    contextBinding: parseJsonObject(row.context_binding_json),
    contextSources: parseJsonArray(row.context_sources_json).filter(
      (value): value is string => typeof value === "string",
    ),
    allowedSwitchTargets: parseJsonArray(row.allowed_switch_targets_json).filter(
      (value): value is VoiceProfileSlug => typeof value === "string",
    ) as VoiceProfileSlug[],
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapVoiceSession(row: VoiceSessionRow): VoiceSession {
  return {
    id: row.id,
    profileId: row.profile_id,
    state: row.state as VoiceSessionState,
    transport: row.transport as VoiceTransport,
    baseSessionKey: row.base_session_key,
    resolvedContext: parseJsonObject(row.resolved_context_json) as ResolvedVoiceContext,
    ...(row.last_user_transcript ? { lastUserTranscript: row.last_user_transcript } : {}),
    ...(row.last_assistant_text ? { lastAssistantText: row.last_assistant_text } : {}),
    ...(row.last_error ? { lastError: row.last_error } : {}),
    startedAt: row.started_at,
    ...(row.ended_at ? { endedAt: row.ended_at } : {}),
    updatedAt: row.updated_at,
  };
}

function mapVoiceSessionEvent(row: VoiceSessionEventRow): VoiceSessionEvent {
  return {
    id: row.id,
    sessionId: row.session_id,
    eventType: row.event_type,
    ...(row.from_state ? { fromState: row.from_state as VoiceSessionState } : {}),
    ...(row.to_state ? { toState: row.to_state as VoiceSessionState } : {}),
    payload: parseJsonObject(row.payload_json),
    createdAt: row.created_at,
  };
}

function mapVoiceTurn(row: VoiceTurnRow): VoiceTurn {
  return {
    id: row.id,
    sessionId: row.session_id,
    speaker: row.speaker as VoiceTurnSpeaker,
    text: row.text,
    source: row.source,
    sequenceNo: row.sequence_no,
    metadata: parseJsonObject(row.metadata_json),
    createdAt: row.created_at,
  };
}

function mapVoiceProfileBinding(row: VoiceProfileBindingRow): VoiceProfileBinding {
  return {
    id: row.id,
    profileId: row.profile_id,
    bindingType: row.binding_type as VoiceProfileBinding["bindingType"],
    bindingValue: row.binding_value,
    metadata: parseJsonObject(row.metadata_json),
    createdAt: row.created_at,
  };
}

export function listVoiceProfiles(): VoiceProfile[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM voice_profiles ORDER BY sort_order ASC, created_at ASC")
    .all() as VoiceProfileRow[];
  return rows.map(mapVoiceProfile);
}

export function listActiveVoiceProfiles(): VoiceProfile[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM voice_profiles WHERE status = 'active' ORDER BY sort_order ASC, created_at ASC")
    .all() as VoiceProfileRow[];
  return rows.map(mapVoiceProfile);
}

export function getVoiceProfileById(profileId: string): VoiceProfile | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM voice_profiles WHERE id = ?").get(profileId) as VoiceProfileRow | undefined;
  return row ? mapVoiceProfile(row) : null;
}

export function getVoiceProfileBySlug(slug: VoiceProfileSlug): VoiceProfile | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM voice_profiles WHERE slug = ?").get(slug) as VoiceProfileRow | undefined;
  return row ? mapVoiceProfile(row) : null;
}

export function listVoiceProfileBindings(profileId: string): VoiceProfileBinding[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM voice_profile_bindings WHERE profile_id = ? ORDER BY created_at ASC")
    .all(profileId) as VoiceProfileBindingRow[];
  return rows.map(mapVoiceProfileBinding);
}

export function upsertVoiceProfileBinding(input: UpsertVoiceProfileBindingInput): VoiceProfileBinding {
  const db = getDb();
  const id = input.id ?? generateId("vpb");
  db.prepare(`
    INSERT INTO voice_profile_bindings (id, profile_id, binding_type, binding_value, metadata_json, created_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(id) DO UPDATE SET
      profile_id = excluded.profile_id,
      binding_type = excluded.binding_type,
      binding_value = excluded.binding_value,
      metadata_json = excluded.metadata_json
  `).run(
    id,
    input.profileId,
    input.bindingType,
    input.bindingValue,
    JSON.stringify(input.metadata ?? {}),
  );

  const row = db.prepare("SELECT * FROM voice_profile_bindings WHERE id = ?").get(id) as VoiceProfileBindingRow;
  return mapVoiceProfileBinding(row);
}

export function createVoiceSession(input: CreateVoiceSessionInput): VoiceSession {
  const db = getDb();
  const profile = getVoiceProfileById(input.profileId);
  if (!profile) {
    throw new Error(`Voice profile not found: ${input.profileId}`);
  }

  const id = generateId("vs");
  const baseSessionKey = input.baseSessionKey ?? profile.baseSessionKey;
  const resolvedContext = input.resolvedContext ?? {};

  db.prepare(`
    INSERT INTO voice_sessions (
      id, profile_id, state, transport, base_session_key, resolved_context_json,
      last_user_transcript, last_assistant_text, last_error, started_at, ended_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, NULL, datetime('now'), NULL, datetime('now'))
  `).run(
    id,
    input.profileId,
    "idle",
    input.transport ?? "web",
    baseSessionKey,
    JSON.stringify(resolvedContext),
  );

  const row = db.prepare("SELECT * FROM voice_sessions WHERE id = ?").get(id) as VoiceSessionRow;
  return mapVoiceSession(row);
}

export function getVoiceSession(sessionId: string): VoiceSession | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM voice_sessions WHERE id = ?").get(sessionId) as VoiceSessionRow | undefined;
  return row ? mapVoiceSession(row) : null;
}

export function listVoiceSessions(limit = 20): VoiceSession[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM voice_sessions ORDER BY started_at DESC LIMIT ?")
    .all(limit) as VoiceSessionRow[];
  return rows.map(mapVoiceSession);
}

export function updateVoiceSessionState(input: UpdateVoiceSessionStateInput): VoiceSession {
  const db = getDb();
  db.prepare(`
    UPDATE voice_sessions
    SET state = ?,
        last_error = ?,
        ended_at = COALESCE(?, ended_at),
        updated_at = datetime('now')
    WHERE id = ?
  `).run(input.state, input.lastError ?? null, input.endedAt ?? null, input.sessionId);

  const row = db.prepare("SELECT * FROM voice_sessions WHERE id = ?").get(input.sessionId) as VoiceSessionRow | undefined;
  if (!row) {
    throw new Error(`Voice session not found: ${input.sessionId}`);
  }
  return mapVoiceSession(row);
}

export function updateVoiceSessionContext(sessionId: string, resolvedContext: Record<string, unknown>): VoiceSession {
  const db = getDb();
  db.prepare(`
    UPDATE voice_sessions
    SET resolved_context_json = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(JSON.stringify(resolvedContext), sessionId);

  const row = db.prepare("SELECT * FROM voice_sessions WHERE id = ?").get(sessionId) as VoiceSessionRow | undefined;
  if (!row) {
    throw new Error(`Voice session not found: ${sessionId}`);
  }
  return mapVoiceSession(row);
}

export function updateVoiceSessionRouting(sessionId: string, profileId: string, baseSessionKey: string): VoiceSession {
  const db = getDb();
  db.prepare(`
    UPDATE voice_sessions
    SET profile_id = ?, base_session_key = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(profileId, baseSessionKey, sessionId);

  const row = db.prepare("SELECT * FROM voice_sessions WHERE id = ?").get(sessionId) as VoiceSessionRow | undefined;
  if (!row) {
    throw new Error(`Voice session not found: ${sessionId}`);
  }
  return mapVoiceSession(row);
}

export function updateVoiceSessionTranscript(sessionId: string, transcript: string | null): VoiceSession {
  const db = getDb();
  db.prepare(`
    UPDATE voice_sessions
    SET last_user_transcript = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(transcript, sessionId);

  const row = db.prepare("SELECT * FROM voice_sessions WHERE id = ?").get(sessionId) as VoiceSessionRow | undefined;
  if (!row) {
    throw new Error(`Voice session not found: ${sessionId}`);
  }
  return mapVoiceSession(row);
}

export function updateVoiceSessionAssistantText(sessionId: string, text: string | null): VoiceSession {
  const db = getDb();
  db.prepare(`
    UPDATE voice_sessions
    SET last_assistant_text = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(text, sessionId);

  const row = db.prepare("SELECT * FROM voice_sessions WHERE id = ?").get(sessionId) as VoiceSessionRow | undefined;
  if (!row) {
    throw new Error(`Voice session not found: ${sessionId}`);
  }
  return mapVoiceSession(row);
}

export function appendVoiceEvent(input: AppendVoiceEventInput): VoiceSessionEvent {
  const db = getDb();
  const id = generateId("vse");
  db.prepare(`
    INSERT INTO voice_session_events (id, session_id, event_type, from_state, to_state, payload_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
  `).run(
    id,
    input.sessionId,
    input.eventType,
    input.fromState ?? null,
    input.toState ?? null,
    JSON.stringify(input.payload ?? {}),
  );

  const row = db.prepare("SELECT * FROM voice_session_events WHERE id = ?").get(id) as VoiceSessionEventRow;
  return mapVoiceSessionEvent(row);
}

export function listVoiceSessionEvents(sessionId: string, limit = 200): VoiceSessionEvent[] {
  const db = getDb();
  const rows = db
    .prepare(`
      SELECT * FROM voice_session_events
      WHERE session_id = ?
      ORDER BY created_at ASC
      LIMIT ?
    `)
    .all(sessionId, limit) as VoiceSessionEventRow[];
  return rows.map(mapVoiceSessionEvent);
}

export function appendVoiceTurn(input: AppendVoiceTurnInput): VoiceTurn {
  const db = getDb();
  const id = generateId("vt");
  const sequenceNo = input.sequenceNo ?? getNextVoiceTurnSequence(input.sessionId);
  db.prepare(`
    INSERT INTO voice_turns (id, session_id, speaker, text, source, sequence_no, metadata_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `).run(
    id,
    input.sessionId,
    input.speaker,
    input.text,
    input.source ?? "voice",
    sequenceNo,
    JSON.stringify(input.metadata ?? {}),
  );

  const row = db.prepare("SELECT * FROM voice_turns WHERE id = ?").get(id) as VoiceTurnRow;
  return mapVoiceTurn(row);
}

export function getNextVoiceTurnSequence(sessionId: string): number {
  const db = getDb();
  const row = db
    .prepare("SELECT COALESCE(MAX(sequence_no), 0) as max_sequence FROM voice_turns WHERE session_id = ?")
    .get(sessionId) as { max_sequence: number };
  return row.max_sequence + 1;
}

export function listVoiceTurns(sessionId: string, limit = 200): VoiceTurn[] {
  const db = getDb();
  const rows = db
    .prepare(`
      SELECT * FROM voice_turns
      WHERE session_id = ?
      ORDER BY sequence_no ASC
      LIMIT ?
    `)
    .all(sessionId, limit) as VoiceTurnRow[];
  return rows.map(mapVoiceTurn);
}
