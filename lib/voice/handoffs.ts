import { getDb } from "@/lib/db";
import { appendVoiceEvent, getVoiceProfileById, getVoiceSession, listVoiceTurns } from "./session-store";
import type { VoiceProfileSlug } from "./types";
import { getCallModeTelegramBinding } from "./call-mode";
import { listVoiceWorkOrdersForSession, serializeVoiceWorkOrder } from "./work-orders";

export type VoiceHandoffStatus = "prepared" | "failed" | "not_supported" | "sent";

export type VoiceHandoff = {
  id: string;
  sessionId: string;
  profileSlug: VoiceProfileSlug;
  status: VoiceHandoffStatus;
  title: string;
  summary: string;
  memoryPath?: string;
  telegramChatId?: string;
  telegramThreadId?: string;
  telegramUrl?: string;
  decisions: string[];
  produces: string[];
  workOrderIds: string[];
  tags: string[];
  payload: Record<string, unknown>;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
  sentAt?: string;
};

export type PrepareVoiceHandoffInput = {
  sessionId: string;
  memoryPath?: string | null;
  summary?: string | null;
};

type VoiceHandoffRow = {
  id: string;
  session_id: string;
  profile_slug: string;
  status: string;
  title: string;
  summary: string;
  memory_path: string | null;
  telegram_chat_id: string | null;
  telegram_thread_id: string | null;
  telegram_url: string | null;
  decisions_json: string;
  produces_json: string;
  work_order_ids_json: string;
  tags_json: string;
  payload_json: string;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  sent_at: string | null;
};

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function parseJsonObject(value: string | null | undefined): Record<string, unknown> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function parseJsonStringArray(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function mapVoiceHandoff(row: VoiceHandoffRow): VoiceHandoff {
  return {
    id: row.id,
    sessionId: row.session_id,
    profileSlug: row.profile_slug as VoiceProfileSlug,
    status: row.status as VoiceHandoffStatus,
    title: row.title,
    summary: row.summary,
    ...(row.memory_path ? { memoryPath: row.memory_path } : {}),
    ...(row.telegram_chat_id ? { telegramChatId: row.telegram_chat_id } : {}),
    ...(row.telegram_thread_id ? { telegramThreadId: row.telegram_thread_id } : {}),
    ...(row.telegram_url ? { telegramUrl: row.telegram_url } : {}),
    decisions: parseJsonStringArray(row.decisions_json),
    produces: parseJsonStringArray(row.produces_json),
    workOrderIds: parseJsonStringArray(row.work_order_ids_json),
    tags: parseJsonStringArray(row.tags_json),
    payload: parseJsonObject(row.payload_json),
    ...(row.error_message ? { errorMessage: row.error_message } : {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(row.sent_at ? { sentAt: row.sent_at } : {}),
  };
}

function buildTranscriptExcerpt(sessionId: string) {
  return listVoiceTurns(sessionId, 20)
    .filter((turn) => turn.speaker === "user" || turn.speaker === "assistant")
    .slice(-8)
    .map((turn) => ({
      speaker: turn.speaker,
      text: turn.text.slice(0, 500),
      turnId: turn.id,
      sequenceNo: turn.sequenceNo,
    }));
}

function buildSummary(input: PrepareVoiceHandoffInput): string {
  const normalized = input.summary?.trim();
  if (!normalized) return "Voice call handoff prepared. Review the transcript and work orders for details.";
  const summaryMatch = normalized.match(/### Kurzfassung\s+([\s\S]*?)(?:\n### |\n$)/);
  const summary = summaryMatch?.[1]?.replace(/\s+/g, " ").trim();
  return (summary || normalized.replace(/\s+/g, " ").trim()).slice(0, 1200);
}

function inferTags(profileSlug: VoiceProfileSlug, workOrderCount: number): string[] {
  return [
    "voice_call",
    profileSlug,
    ...(workOrderCount > 0 ? ["work_order"] : []),
  ].slice(0, 5);
}

export function serializeVoiceHandoff(handoff: VoiceHandoff) {
  return {
    id: handoff.id,
    sessionId: handoff.sessionId,
    profileSlug: handoff.profileSlug,
    status: handoff.status,
    title: handoff.title,
    summary: handoff.summary,
    memoryPath: handoff.memoryPath ?? null,
    telegramTarget: handoff.telegramChatId
      ? {
          chatId: handoff.telegramChatId,
          threadId: handoff.telegramThreadId ?? null,
          url: handoff.telegramUrl ?? null,
        }
      : null,
    telegramSendStatus: handoff.status === "sent" ? "sent" : "not_supported",
    decisions: handoff.decisions,
    produces: handoff.produces,
    workOrderIds: handoff.workOrderIds,
    tags: handoff.tags,
    errorMessage: handoff.errorMessage ?? null,
    createdAt: handoff.createdAt,
    updatedAt: handoff.updatedAt,
    sentAt: handoff.sentAt ?? null,
  };
}

export function getVoiceHandoffForSession(sessionId: string): VoiceHandoff | null {
  const session = getVoiceSession(sessionId);
  if (!session) throw new Error(`Voice session not found: ${sessionId}`);
  const row = getDb()
    .prepare("SELECT * FROM voice_handoffs WHERE session_id = ? ORDER BY created_at DESC LIMIT 1")
    .get(sessionId) as VoiceHandoffRow | undefined;
  return row ? mapVoiceHandoff(row) : null;
}

export function prepareVoiceHandoff(input: PrepareVoiceHandoffInput): VoiceHandoff {
  const session = getVoiceSession(input.sessionId);
  if (!session) throw new Error(`Voice session not found: ${input.sessionId}`);
  const profile = getVoiceProfileById(session.profileId);
  if (!profile) throw new Error(`Voice profile not found: ${session.profileId}`);

  appendVoiceEvent({
    sessionId: session.id,
    eventType: "voice.handoff_prepare_started",
    fromState: session.state,
    toState: session.state,
    payload: {
      memoryPath: input.memoryPath ?? null,
    },
  });

  try {
    const workOrders = listVoiceWorkOrdersForSession(session.id);
    const telegramBinding = getCallModeTelegramBinding(profile.slug);
    const title = `${profile.label} Handoff`;
    const summary = buildSummary(input);
    const workOrderIds = workOrders.map((order) => order.id);
    const produces = workOrders.map((order) => `${order.requestedOutput}: ${order.title}`);
    const tags = inferTags(profile.slug, workOrders.length);
    const payload = {
      transcriptExcerpt: buildTranscriptExcerpt(session.id),
      workOrders: workOrders.map(serializeVoiceWorkOrder),
      telegramSendAvailable: false,
      telegramSendReason: "not_supported",
    };

    const id = generateId("vh");
    getDb().prepare(`
      INSERT INTO voice_handoffs (
        id, session_id, profile_slug, status, title, summary, memory_path,
        telegram_chat_id, telegram_thread_id, telegram_url,
        decisions_json, produces_json, work_order_ids_json, tags_json, payload_json,
        error_message, created_at, updated_at, sent_at
      ) VALUES (?, ?, ?, 'prepared', ?, ?, ?, ?, ?, ?, '[]', ?, ?, ?, ?, NULL, datetime('now'), datetime('now'), NULL)
    `).run(
      id,
      session.id,
      profile.slug,
      title,
      summary,
      input.memoryPath ?? null,
      telegramBinding?.chatId ?? null,
      telegramBinding?.threadId ?? null,
      telegramBinding?.handoffUrl ?? null,
      JSON.stringify(produces),
      JSON.stringify(workOrderIds),
      JSON.stringify(tags),
      JSON.stringify(payload),
    );

    const row = getDb().prepare("SELECT * FROM voice_handoffs WHERE id = ?").get(id) as VoiceHandoffRow;
    const handoff = mapVoiceHandoff(row);
    appendVoiceEvent({
      sessionId: session.id,
      eventType: "voice.handoff_prepared",
      fromState: session.state,
      toState: session.state,
      payload: {
        handoffId: handoff.id,
        status: handoff.status,
        memoryPath: handoff.memoryPath ?? null,
        workOrderCount: handoff.workOrderIds.length,
        telegramSendStatus: "not_supported",
      },
    });
    return handoff;
  } catch (error) {
    appendVoiceEvent({
      sessionId: session.id,
      eventType: "voice.handoff_prepare_failed",
      fromState: session.state,
      toState: session.state,
      payload: {
        message: error instanceof Error ? error.message : String(error),
      },
    });
    throw error;
  }
}
