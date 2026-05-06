import { getDb } from "@/lib/db";
import { appendVoiceEvent, getVoiceProfileBySlug } from "./session-store";
import { createSessionForProfile } from "./service";
import type { VoiceContextBindings } from "./context-sources";
import type { VoiceProfileSlug, VoiceSession, VoiceTransport } from "./types";

type VoiceTelegramBridgeRow = {
  id: string;
  telegram_chat_id: string;
  telegram_thread_id: string | null;
  profile_slug: string;
  label: string | null;
  account_id: string | null;
  deal_id: string | null;
  project_id: string | null;
  project_slug: string | null;
  metadata_json: string;
  created_at: string;
  updated_at: string;
};

type VoiceTelegramRecentContextRow = {
  id: string;
  telegram_chat_id: string;
  telegram_thread_id: string | null;
  profile_slug: string | null;
  label: string | null;
  summary: string;
  messages_json: string;
  metadata_json: string;
  observed_from: string | null;
  observed_to: string | null;
  created_at: string;
  updated_at: string;
};

export type VoiceTelegramBridge = {
  id: string;
  telegramChatId: string;
  telegramThreadId?: string;
  profileSlug: VoiceProfileSlug;
  label?: string;
  accountId?: string;
  dealId?: string;
  projectId?: string;
  projectSlug?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type VoiceTelegramRecentContextMessage = {
  role?: string;
  author?: string;
  text: string;
  createdAt?: string;
};

export type VoiceTelegramRecentContext = {
  id: string;
  telegramChatId: string;
  telegramThreadId?: string;
  profileSlug?: VoiceProfileSlug;
  label?: string;
  summary: string;
  messages: VoiceTelegramRecentContextMessage[];
  metadata: Record<string, unknown>;
  observedFrom?: string;
  observedTo?: string;
  createdAt: string;
  updatedAt: string;
};

export type UpsertVoiceTelegramBridgeInput = {
  telegramChatId: string;
  telegramThreadId?: string;
  profileSlug: VoiceProfileSlug;
  label?: string;
  accountId?: string;
  dealId?: string;
  projectId?: string;
  projectSlug?: string;
  metadata?: Record<string, unknown>;
};

export type UpsertVoiceTelegramRecentContextInput = {
  telegramChatId: string;
  telegramThreadId?: string;
  profileSlug?: VoiceProfileSlug;
  label?: string;
  summary: string;
  messages?: VoiceTelegramRecentContextMessage[];
  metadata?: Record<string, unknown>;
  observedFrom?: string;
  observedTo?: string;
};

export type CreateTelegramVoiceHandoffInput = {
  telegramChatId: string;
  telegramThreadId?: string;
  profileSlug?: VoiceProfileSlug;
  label?: string;
  accountId?: string;
  dealId?: string;
  projectId?: string;
  projectSlug?: string;
  transport?: VoiceTransport;
  metadata?: Record<string, unknown>;
  persistBridge?: boolean;
};

export type CreateTelegramVoiceHandoffResult = {
  session: VoiceSession;
  bridge: VoiceTelegramBridge | null;
  matchedExistingBridge: boolean;
};

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

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function mapBridge(row: VoiceTelegramBridgeRow): VoiceTelegramBridge {
  return {
    id: row.id,
    telegramChatId: row.telegram_chat_id,
    ...(row.telegram_thread_id ? { telegramThreadId: row.telegram_thread_id } : {}),
    profileSlug: row.profile_slug as VoiceProfileSlug,
    ...(row.label ? { label: row.label } : {}),
    ...(row.account_id ? { accountId: row.account_id } : {}),
    ...(row.deal_id ? { dealId: row.deal_id } : {}),
    ...(row.project_id ? { projectId: row.project_id } : {}),
    ...(row.project_slug ? { projectSlug: row.project_slug } : {}),
    metadata: parseJsonObject(row.metadata_json),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function parseMessages(value: string | null | undefined): VoiceTelegramRecentContextMessage[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((message) => message && typeof message === "object" && !Array.isArray(message)
        ? (message as Record<string, unknown>)
        : null)
      .filter((message): message is Record<string, unknown> => !!message)
      .map((message) => ({
        ...(typeof message.role === "string" ? { role: message.role } : {}),
        ...(typeof message.author === "string" ? { author: message.author } : {}),
        text: typeof message.text === "string" ? message.text : "",
        ...(typeof message.createdAt === "string" ? { createdAt: message.createdAt } : {}),
      }))
      .filter((message) => message.text.trim());
  } catch {
    return [];
  }
}

function mapRecentContext(row: VoiceTelegramRecentContextRow): VoiceTelegramRecentContext {
  return {
    id: row.id,
    telegramChatId: row.telegram_chat_id,
    ...(row.telegram_thread_id ? { telegramThreadId: row.telegram_thread_id } : {}),
    ...(row.profile_slug ? { profileSlug: row.profile_slug as VoiceProfileSlug } : {}),
    ...(row.label ? { label: row.label } : {}),
    summary: row.summary,
    messages: parseMessages(row.messages_json),
    metadata: parseJsonObject(row.metadata_json),
    ...(row.observed_from ? { observedFrom: row.observed_from } : {}),
    ...(row.observed_to ? { observedTo: row.observed_to } : {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mergeBindings(base: VoiceContextBindings, override: Partial<VoiceContextBindings>): VoiceContextBindings {
  return {
    ...base,
    ...override,
  };
}

function buildBindingsFromBridge(bridge?: VoiceTelegramBridge | null): VoiceContextBindings {
  if (!bridge) return {};
  return {
    ...(bridge.accountId ? { accountId: bridge.accountId } : {}),
    ...(bridge.dealId ? { dealId: bridge.dealId } : {}),
    ...(bridge.projectId ? { projectId: bridge.projectId } : {}),
    ...(bridge.projectSlug ? { projectSlug: bridge.projectSlug } : {}),
  };
}

function inferProfileSlug(input: {
  profileSlug?: VoiceProfileSlug;
  bridge?: VoiceTelegramBridge | null;
  bindings: VoiceContextBindings;
}): VoiceProfileSlug {
  if (input.profileSlug) return input.profileSlug;
  if (input.bridge?.profileSlug) return input.bridge.profileSlug;

  const projectSlug = input.bindings.projectSlug?.toLowerCase();
  if (projectSlug === "luma") return "luma";
  if (input.bindings.accountId || input.bindings.dealId) return "sales_support";
  if (input.bindings.projectId) return "luma";
  return "main";
}

export function getVoiceTelegramBridge(params: {
  telegramChatId: string;
  telegramThreadId?: string;
}): VoiceTelegramBridge | null {
  const db = getDb();

  if (params.telegramThreadId) {
    const exact = db.prepare(
      `SELECT * FROM voice_telegram_bridges
       WHERE telegram_chat_id = ? AND telegram_thread_id = ?
       ORDER BY updated_at DESC
       LIMIT 1`,
    ).get(params.telegramChatId, params.telegramThreadId) as VoiceTelegramBridgeRow | undefined;
    if (exact) return mapBridge(exact);
  }

  const fallback = db.prepare(
    `SELECT * FROM voice_telegram_bridges
     WHERE telegram_chat_id = ? AND telegram_thread_id IS NULL
     ORDER BY updated_at DESC
     LIMIT 1`,
  ).get(params.telegramChatId) as VoiceTelegramBridgeRow | undefined;

  return fallback ? mapBridge(fallback) : null;
}

export function upsertVoiceTelegramBridge(input: UpsertVoiceTelegramBridgeInput): VoiceTelegramBridge {
  const db = getDb();
  const existing = db.prepare(
    `SELECT * FROM voice_telegram_bridges
     WHERE telegram_chat_id = ? AND COALESCE(telegram_thread_id, '') = COALESCE(?, '')
     LIMIT 1`,
  ).get(input.telegramChatId, input.telegramThreadId ?? null) as VoiceTelegramBridgeRow | undefined;

  const id = existing?.id ?? generateId("vtb");
  db.prepare(
    `INSERT INTO voice_telegram_bridges (
      id, telegram_chat_id, telegram_thread_id, profile_slug, label,
      account_id, deal_id, project_id, project_slug, metadata_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    ON CONFLICT(id) DO UPDATE SET
      telegram_chat_id = excluded.telegram_chat_id,
      telegram_thread_id = excluded.telegram_thread_id,
      profile_slug = excluded.profile_slug,
      label = excluded.label,
      account_id = excluded.account_id,
      deal_id = excluded.deal_id,
      project_id = excluded.project_id,
      project_slug = excluded.project_slug,
      metadata_json = excluded.metadata_json,
      updated_at = datetime('now')`,
  ).run(
    id,
    input.telegramChatId,
    input.telegramThreadId ?? null,
    input.profileSlug,
    input.label ?? null,
    input.accountId ?? null,
    input.dealId ?? null,
    input.projectId ?? null,
    input.projectSlug ?? null,
    JSON.stringify(input.metadata ?? {}),
  );

  const row = db.prepare("SELECT * FROM voice_telegram_bridges WHERE id = ?").get(id) as VoiceTelegramBridgeRow;
  return mapBridge(row);
}

export function upsertVoiceTelegramRecentContext(input: UpsertVoiceTelegramRecentContextInput): VoiceTelegramRecentContext {
  const db = getDb();
  const id = generateId("vtrc");
  db.prepare(
    `INSERT INTO voice_telegram_recent_contexts (
      id, telegram_chat_id, telegram_thread_id, profile_slug, label,
      summary, messages_json, metadata_json, observed_from, observed_to, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
  ).run(
    id,
    input.telegramChatId,
    input.telegramThreadId ?? null,
    input.profileSlug ?? null,
    input.label ?? null,
    input.summary.trim(),
    JSON.stringify((input.messages ?? []).slice(-80)),
    JSON.stringify(input.metadata ?? {}),
    input.observedFrom ?? null,
    input.observedTo ?? null,
  );

  const row = db.prepare("SELECT * FROM voice_telegram_recent_contexts WHERE id = ?").get(id) as VoiceTelegramRecentContextRow;
  return mapRecentContext(row);
}

export function listVoiceTelegramRecentContexts(input: {
  telegramChatId?: string;
  telegramThreadId?: string;
  profileSlug?: VoiceProfileSlug;
  limit?: number;
} = {}): VoiceTelegramRecentContext[] {
  const db = getDb();
  const limit = Math.max(1, Math.min(input.limit ?? 8, 20));
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (input.telegramChatId) {
    clauses.push("telegram_chat_id = ?");
    params.push(input.telegramChatId);
    if (input.telegramThreadId) {
      clauses.push("telegram_thread_id = ?");
      params.push(input.telegramThreadId);
    }
  }
  if (input.profileSlug) {
    clauses.push("(profile_slug = ? OR profile_slug IS NULL)");
    params.push(input.profileSlug);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const rows = db.prepare(
    `SELECT * FROM voice_telegram_recent_contexts
     ${where}
     ORDER BY updated_at DESC
     LIMIT ?`,
  ).all(...params, limit) as VoiceTelegramRecentContextRow[];

  return rows.map(mapRecentContext);
}

export async function createTelegramVoiceHandoff(
  input: CreateTelegramVoiceHandoffInput,
): Promise<CreateTelegramVoiceHandoffResult> {
  const matchedBridge = getVoiceTelegramBridge({
    telegramChatId: input.telegramChatId,
    telegramThreadId: input.telegramThreadId,
  });

  const mergedBindings = mergeBindings(buildBindingsFromBridge(matchedBridge), {
    ...(input.accountId ? { accountId: input.accountId } : {}),
    ...(input.dealId ? { dealId: input.dealId } : {}),
    ...(input.projectId ? { projectId: input.projectId } : {}),
    ...(input.projectSlug ? { projectSlug: input.projectSlug } : {}),
  });

  const profileSlug = inferProfileSlug({
    profileSlug: input.profileSlug,
    bridge: matchedBridge,
    bindings: mergedBindings,
  });

  const activeProfile = getVoiceProfileBySlug(profileSlug);
  if (!activeProfile) {
    throw new Error(`Voice profile not found: ${profileSlug}`);
  }
  if (activeProfile.status !== "active") {
    throw new Error(`Voice profile inactive: ${profileSlug}`);
  }

  const persistedBridge = input.persistBridge === false
    ? matchedBridge
    : upsertVoiceTelegramBridge({
        telegramChatId: input.telegramChatId,
        ...(input.telegramThreadId ? { telegramThreadId: input.telegramThreadId } : {}),
        profileSlug,
        ...(input.label ? { label: input.label } : matchedBridge?.label ? { label: matchedBridge.label } : {}),
        ...(mergedBindings.accountId ? { accountId: mergedBindings.accountId } : {}),
        ...(mergedBindings.dealId ? { dealId: mergedBindings.dealId } : {}),
        ...(mergedBindings.projectId ? { projectId: mergedBindings.projectId } : {}),
        ...(mergedBindings.projectSlug ? { projectSlug: mergedBindings.projectSlug } : {}),
        metadata: {
          ...(matchedBridge?.metadata ?? {}),
          ...(input.metadata ?? {}),
        },
      });

  const session = await createSessionForProfile({
    profileSlug,
    transport: input.transport ?? "web",
    extraBindings: mergedBindings,
    contextMetadata: {
      handoffSource: {
        type: "telegram",
        chatId: input.telegramChatId,
        ...(input.telegramThreadId ? { threadId: input.telegramThreadId } : {}),
        profileSlug,
        ...(persistedBridge?.id ? { bridgeId: persistedBridge.id } : {}),
        ...(persistedBridge?.label ? { label: persistedBridge.label } : {}),
      },
      ...(persistedBridge ? { telegramBridge: { id: persistedBridge.id, matchedExisting: !!matchedBridge } } : {}),
    },
  });

  appendVoiceEvent({
    sessionId: session.id,
    eventType: "voice.telegram_handoff_applied",
    payload: {
      profileSlug,
      telegramChatId: input.telegramChatId,
      telegramThreadId: input.telegramThreadId ?? null,
      bridgeId: persistedBridge?.id ?? null,
      matchedExistingBridge: !!matchedBridge,
    },
  });

  return {
    session,
    bridge: persistedBridge ?? null,
    matchedExistingBridge: !!matchedBridge,
  };
}
