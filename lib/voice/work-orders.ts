import { getDb } from "@/lib/db";
import { appendVoiceEvent, getVoiceProfileById, getVoiceSession, listVoiceTurns } from "./session-store";
import type { VoiceProfileSlug } from "./types";
import { getCallModeTelegramBinding } from "./call-mode";

export const VOICE_WORK_ORDER_OUTPUTS = ["review_document", "telegram_draft", "email_draft", "task", "summary", "other"] as const;
export type VoiceWorkOrderRequestedOutput = typeof VOICE_WORK_ORDER_OUTPUTS[number];

export const VOICE_WORK_ORDER_PRIORITIES = ["low", "normal", "high"] as const;
export type VoiceWorkOrderPriority = typeof VOICE_WORK_ORDER_PRIORITIES[number];

export const VOICE_WORK_ORDER_STATUSES = ["created", "queued", "running", "done", "failed", "cancelled"] as const;
export type VoiceWorkOrderStatus = typeof VOICE_WORK_ORDER_STATUSES[number];

export type VoiceWorkOrder = {
  id: string;
  sessionId: string;
  profileSlug: VoiceProfileSlug;
  title: string;
  goal: string;
  requestedOutput: VoiceWorkOrderRequestedOutput;
  status: VoiceWorkOrderStatus;
  priority: VoiceWorkOrderPriority;
  sourceTurnId?: string;
  context: Record<string, unknown>;
  result: Record<string, unknown>;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
};

export type CreateVoiceWorkOrderInput = {
  sessionId: string;
  title: string;
  goal: string;
  requestedOutput: VoiceWorkOrderRequestedOutput;
  priority?: VoiceWorkOrderPriority;
  sourceTurnId?: string;
  sourceUserText?: string;
};

type VoiceWorkOrderRow = {
  id: string;
  session_id: string;
  profile_slug: string;
  title: string;
  goal: string;
  requested_output: string | null;
  status: string;
  priority: string;
  source_turn_id: string | null;
  context_json: string;
  result_json: string;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
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

function normalizeText(value: string, field: string, maxLength: number): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${field} required`);
  if (normalized.length > maxLength) throw new Error(`${field} exceeds ${maxLength} characters`);
  return normalized;
}

function normalizeRequestedOutput(value: string): VoiceWorkOrderRequestedOutput {
  if ((VOICE_WORK_ORDER_OUTPUTS as readonly string[]).includes(value)) {
    return value as VoiceWorkOrderRequestedOutput;
  }
  throw new Error("Invalid requestedOutput");
}

function normalizePriority(value: string | undefined): VoiceWorkOrderPriority {
  if (!value) return "normal";
  if ((VOICE_WORK_ORDER_PRIORITIES as readonly string[]).includes(value)) {
    return value as VoiceWorkOrderPriority;
  }
  throw new Error("Invalid priority");
}

function mapVoiceWorkOrder(row: VoiceWorkOrderRow): VoiceWorkOrder {
  return {
    id: row.id,
    sessionId: row.session_id,
    profileSlug: row.profile_slug as VoiceProfileSlug,
    title: row.title,
    goal: row.goal,
    requestedOutput: normalizeRequestedOutput(row.requested_output ?? "other"),
    status: row.status as VoiceWorkOrderStatus,
    priority: row.priority as VoiceWorkOrderPriority,
    ...(row.source_turn_id ? { sourceTurnId: row.source_turn_id } : {}),
    context: parseJsonObject(row.context_json),
    result: parseJsonObject(row.result_json),
    ...(row.error_message ? { errorMessage: row.error_message } : {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(row.completed_at ? { completedAt: row.completed_at } : {}),
  };
}

function buildWorkOrderContext(input: CreateVoiceWorkOrderInput, profileSlug: VoiceProfileSlug): Record<string, unknown> {
  const turns = listVoiceTurns(input.sessionId, 10)
    .filter((turn) => turn.speaker === "user" || turn.speaker === "assistant")
    .slice(-6)
    .map((turn) => ({
      speaker: turn.speaker,
      text: turn.text.slice(0, 600),
      turnId: turn.id,
      sequenceNo: turn.sequenceNo,
    }));
  const telegramBinding = getCallModeTelegramBinding(profileSlug);

  return {
    voiceSessionId: input.sessionId,
    profileSlug,
    createdFrom: "voice_call",
    ...(input.sourceUserText ? { sourceUserText: input.sourceUserText.slice(0, 1200) } : {}),
    recentTranscript: turns,
    ...(telegramBinding ? {
      handoffTarget: {
        type: "telegram",
        chatId: telegramBinding.chatId,
        ...(telegramBinding.threadId ? { threadId: telegramBinding.threadId } : {}),
        label: telegramBinding.label,
        ...(telegramBinding.handoffUrl ? { url: telegramBinding.handoffUrl } : {}),
      },
    } : {}),
  };
}

export function serializeVoiceWorkOrder(order: VoiceWorkOrder) {
  return {
    id: order.id,
    sessionId: order.sessionId,
    profileSlug: order.profileSlug,
    title: order.title,
    goal: order.goal,
    requestedOutput: order.requestedOutput,
    status: order.status,
    priority: order.priority,
    sourceTurnId: order.sourceTurnId ?? null,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    completedAt: order.completedAt ?? null,
    errorMessage: order.errorMessage ?? null,
  };
}

export function createVoiceWorkOrder(input: CreateVoiceWorkOrderInput): VoiceWorkOrder {
  const session = getVoiceSession(input.sessionId);
  if (!session) throw new Error(`Voice session not found: ${input.sessionId}`);
  const profile = getVoiceProfileById(session.profileId);
  if (!profile) throw new Error(`Voice profile not found: ${session.profileId}`);

  const normalizedTitle = normalizeText(input.title, "title", 160);
  const normalizedGoal = normalizeText(input.goal, "goal", 4000);
  const requestedOutput = normalizeRequestedOutput(input.requestedOutput);
  const priority = normalizePriority(input.priority);

  appendVoiceEvent({
    sessionId: session.id,
    eventType: "voice.work_order_create_started",
    fromState: session.state,
    toState: session.state,
    payload: {
      title: normalizedTitle,
      requestedOutput,
      priority,
    },
  });

  try {
    const db = getDb();
    const id = generateId("vwo");
    db.prepare(`
      INSERT INTO voice_work_orders (
        id, session_id, profile_slug, title, goal, requested_output, status, priority,
        source_turn_id, context_json, result_json, error_message, created_at, updated_at, completed_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'created', ?, ?, ?, '{}', NULL, datetime('now'), datetime('now'), NULL)
    `).run(
      id,
      session.id,
      profile.slug,
      normalizedTitle,
      normalizedGoal,
      requestedOutput,
      priority,
      input.sourceTurnId ?? null,
      JSON.stringify(buildWorkOrderContext(input, profile.slug)),
    );

    const row = db.prepare("SELECT * FROM voice_work_orders WHERE id = ?").get(id) as VoiceWorkOrderRow;
    const order = mapVoiceWorkOrder(row);
    appendVoiceEvent({
      sessionId: session.id,
      eventType: "voice.work_order_created",
      fromState: session.state,
      toState: session.state,
      payload: {
        workOrderId: order.id,
        title: order.title,
        status: order.status,
        requestedOutput: order.requestedOutput,
      },
    });
    return order;
  } catch (error) {
    appendVoiceEvent({
      sessionId: session.id,
      eventType: "voice.work_order_create_failed",
      fromState: session.state,
      toState: session.state,
      payload: {
        title: normalizedTitle,
        message: error instanceof Error ? error.message : String(error),
      },
    });
    throw error;
  }
}

export function listVoiceWorkOrdersForSession(sessionId: string): VoiceWorkOrder[] {
  const session = getVoiceSession(sessionId);
  if (!session) throw new Error(`Voice session not found: ${sessionId}`);
  const rows = getDb()
    .prepare("SELECT * FROM voice_work_orders WHERE session_id = ? ORDER BY created_at DESC")
    .all(sessionId) as VoiceWorkOrderRow[];
  return rows.map(mapVoiceWorkOrder);
}
