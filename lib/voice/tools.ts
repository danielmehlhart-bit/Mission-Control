import { listMemoryByCategory, readMemoryFile, type MemFile } from "@/lib/fs";
import { appendVoiceEvent, getVoiceProfileById, getVoiceSession } from "./session-store";
import { listVoiceTelegramRecentContexts } from "./telegram-bridge";
import type { VoiceProfileSlug, VoiceSession } from "./types";

export type VoiceRealtimeToolDefinition = {
  type: "function";
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
    additionalProperties?: boolean;
  };
};

export type VoiceToolCallInput = {
  sessionId: string;
  toolName: string;
  callId?: string | null;
  arguments: Record<string, unknown>;
};

export type VoiceToolSource = {
  path: string;
  name: string;
  category: string;
  modified: string;
  excerpt: string;
  score: number;
};

export type VoiceMemorySearchResult = {
  tool: "hermes_memory_search";
  answerable: boolean;
  summary: string;
  query: string;
  channel: VoiceProfileSlug | "auto";
  sources: VoiceToolSource[];
  searched: {
    fileCount: number;
    categories: string[];
  };
};

export type VoiceMemoryReadResult = {
  tool: "hermes_memory_read";
  answerable: boolean;
  path: string;
  summary: string;
  sources: VoiceToolSource[];
};

export type VoiceToolResult = VoiceMemorySearchResult | VoiceMemoryReadResult;

const MAX_SEARCH_FILES = 90;
const MAX_CONTENT_CHARS = 140_000;
const MAX_EXCERPT_CHARS = 520;
const QUERY_STOPWORDS = new Set([
  "aber",
  "about",
  "alles",
  "bitte",
  "chat",
  "chats",
  "dann",
  "das",
  "den",
  "der",
  "die",
  "dir",
  "doch",
  "eine",
  "einen",
  "einer",
  "etwas",
  "fuer",
  "für",
  "gehabt",
  "gesagt",
  "gerade",
  "haben",
  "hatten",
  "ich",
  "letzte",
  "letzten",
  "letzter",
  "mal",
  "mich",
  "mir",
  "mit",
  "noch",
  "schau",
  "stunden",
  "telegram",
  "ueber",
  "über",
  "und",
  "uns",
  "was",
  "wir",
  "zwei",
]);

export const VOICE_REALTIME_TOOLS: VoiceRealtimeToolDefinition[] = [
  {
    type: "function",
    name: "hermes_memory_search",
    description: "Search Daniel's Mission Control memory Markdown files for grounded facts, recent voice calls, daily logs, project notes, and channel-specific memory. Use this before answering questions about Daniel's past calls, fitness logs, deals, projects, tasks, or personal memory.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The concrete thing to search for, in Daniel's own words when possible.",
        },
        channel: {
          type: "string",
          enum: ["auto", "main", "sales_support", "luma", "fitness"],
          description: "Optional channel scope. Use auto unless Daniel explicitly names another channel.",
        },
        timeRange: {
          type: "string",
          enum: ["today", "yesterday", "last_7_days", "last_30_days", "all"],
          description: "Optional time window for dated memories.",
        },
        includeVoiceCalls: {
          type: "boolean",
          description: "Whether to include VOICE_CALL_MEMORY_V1 entries. Default true.",
        },
      },
      required: ["query"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "hermes_memory_read",
    description: "Read a specific logical memory path returned by hermes_memory_search when more detail is needed.",
    parameters: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Logical memory path, e.g. mem:2026-05-05.md, proj:sales/2026-04-28.md, or ws:MEMORY.md.",
        },
        focus: {
          type: "string",
          description: "Optional focus text to extract the most relevant part.",
        },
      },
      required: ["path"],
      additionalProperties: false,
    },
  },
];

function requireVoiceToolSession(sessionId: string): { session: VoiceSession; channel: VoiceProfileSlug } {
  const session = getVoiceSession(sessionId);
  if (!session) {
    throw new Error(`Voice session not found: ${sessionId}`);
  }
  const profile = getVoiceProfileById(session.profileId);
  if (!profile) {
    throw new Error(`Voice profile not found: ${session.profileId}`);
  }
  return { session, channel: profile.slug };
}

function stringArg(args: Record<string, unknown>, key: string): string | null {
  const value = args[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function boolArg(args: Record<string, unknown>, key: string, fallback: boolean): boolean {
  return typeof args[key] === "boolean" ? args[key] : fallback;
}

function normalizeChannel(value: string | null, fallback: VoiceProfileSlug): VoiceProfileSlug | "auto" {
  if (value === "auto") return "auto";
  if (value === "main" || value === "sales_support" || value === "luma" || value === "fitness") return value;
  return fallback;
}

function tokenize(text: string): string[] {
  const normalized = text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");
  const matches = normalized.match(/[a-z0-9äöüß]{3,}/gi) ?? [];
  return Array.from(new Set(matches.map((token) => token.toLowerCase())))
    .filter((token) => !QUERY_STOPWORDS.has(token))
    .slice(0, 16);
}

function fileDate(file: MemFile): Date | null {
  const match = file.name.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  return new Date(`${match[1]}-${match[2]}-${match[3]}T00:00:00.000Z`);
}

function isInTimeRange(file: MemFile, timeRange: string): boolean {
  if (timeRange === "all") return true;
  const date = fileDate(file);
  if (!date) return true;

  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const ageDays = Math.floor((today.getTime() - date.getTime()) / 86_400_000);

  if (timeRange === "today") return ageDays === 0;
  if (timeRange === "yesterday") return ageDays === 1;
  if (timeRange === "last_7_days") return ageDays >= 0 && ageDays <= 7;
  if (timeRange === "last_30_days") return ageDays >= 0 && ageDays <= 30;
  return true;
}

function channelBoost(file: MemFile, channel: VoiceProfileSlug | "auto"): number {
  if (channel === "auto" || channel === "main") return 0;
  const haystack = `${file.path} ${file.category} ${file.desc ?? ""}`.toLowerCase();
  if (channel === "sales_support" && (haystack.includes("sales") || haystack.includes("deal"))) return 8;
  if (channel === "luma" && haystack.includes("luma")) return 8;
  if (channel === "fitness" && (haystack.includes("fitness") || haystack.includes("bike"))) return 8;
  return 0;
}

function findExcerpt(content: string, tokens: string[], focus?: string | null): string {
  const normalized = content.toLowerCase();
  const focusTokens = focus ? tokenize(focus) : [];
  const allTokens = [...focusTokens, ...tokens];
  const hit = allTokens.map((token) => normalized.indexOf(token)).find((index) => index >= 0) ?? 0;
  const start = Math.max(0, hit - 180);
  const end = Math.min(content.length, hit + MAX_EXCERPT_CHARS);
  return content
    .slice(start, end)
    .replace(/\s+/g, " ")
    .trim();
}

function isFreshChatReviewQuery(query: string): boolean {
  const normalized = query.toLowerCase();
  const hasRecentWindow = /\b(gerade|eben|letzte[ nrs]?|letzten|halb(?:e|en)? stunde|halben stunde|stunde|stunden|heute)\b/.test(normalized);
  const hasChatReference = /\b(chat|telegram|verlauf|besprochen|gesprochen|diskutiert|zusammenfass|zusammenfassen)\b/.test(normalized);
  return hasRecentWindow && hasChatReference;
}

function scoreContent(file: MemFile, content: string, query: string, tokens: string[], channel: VoiceProfileSlug | "auto"): number {
  const haystack = `${file.path}\n${file.name}\n${file.desc ?? ""}\n${content}`.toLowerCase();
  let score = 0;
  const phrase = query.toLowerCase();
  let hasQueryHit = false;
  if (phrase.length >= 4 && haystack.includes(phrase)) {
    score += 20;
    hasQueryHit = true;
  }
  for (const token of tokens) {
    const matches = haystack.split(token).length - 1;
    if (matches > 0) {
      hasQueryHit = true;
      score += Math.min(matches, 6);
    }
  }
  if (!hasQueryHit) return 0;
  score += channelBoost(file, channel);
  if (content.includes("VOICE_CALL_MEMORY_V1")) score += 4;
  if (file.category === "daily") score += 1;
  return score;
}

function summarizeSearch(query: string, sources: VoiceToolSource[]): string {
  if (sources.length === 0) {
    return `Ich habe in den Memory-Dateien nach "${query}" gesucht, aber keine belastbare Quelle gefunden. Falls es um die letzten Stunden im Telegram-Chat geht: Diese Live-Chat-History ist nur verfuegbar, wenn sie bereits in Memory oder Handoff-Kontext synchronisiert wurde.`;
  }
  const top = sources[0];
  return `Ich habe ${sources.length} relevante Memory-Treffer zu "${query}" gefunden. Staerkster Treffer: ${top.path}.`;
}

function resolvedContextObject(session: VoiceSession): Record<string, unknown> {
  return session.resolvedContext && typeof session.resolvedContext === "object" && !Array.isArray(session.resolvedContext)
    ? (session.resolvedContext as Record<string, unknown>)
    : {};
}

function getHandoffSource(session: VoiceSession): { chatId?: string; threadId?: string } {
  const context = resolvedContextObject(session);
  const handoffSource = context.handoffSource && typeof context.handoffSource === "object" && !Array.isArray(context.handoffSource)
    ? (context.handoffSource as Record<string, unknown>)
    : {};
  return {
    ...(typeof handoffSource.chatId === "string" ? { chatId: handoffSource.chatId } : {}),
    ...(typeof handoffSource.threadId === "string" ? { threadId: handoffSource.threadId } : {}),
  };
}

function recentContextText(context: ReturnType<typeof listVoiceTelegramRecentContexts>[number]): string {
  const messages = context.messages
    .map((message) => `${message.author ?? message.role ?? "chat"}: ${message.text}`)
    .join("\n");
  return [
    context.label ? `Label: ${context.label}` : "",
    context.summary,
    messages,
  ].filter(Boolean).join("\n");
}

function scoreRecentContext(
  context: ReturnType<typeof listVoiceTelegramRecentContexts>[number],
  query: string,
  tokens: string[],
  channel: VoiceProfileSlug | "auto",
): VoiceToolSource | null {
  const content = recentContextText(context);
  const pseudoFile: MemFile = {
    name: context.label ?? "telegram-recent-context",
    path: `telegram:${context.id}`,
    category: "telegram_recent",
    modified: context.updatedAt,
    ...(context.label ? { desc: context.label } : {}),
  };
  if (isFreshChatReviewQuery(query)) {
    return {
      path: pseudoFile.path,
      name: pseudoFile.name,
      category: pseudoFile.category,
      modified: context.updatedAt,
      excerpt: findExcerpt(content, tokens, context.label ?? context.summary),
      score: 30,
    };
  }
  const score = scoreContent(pseudoFile, content, query, tokens, channel);
  if (score <= 0) return null;
  return {
    path: pseudoFile.path,
    name: pseudoFile.name,
    category: pseudoFile.category,
    modified: context.updatedAt,
    excerpt: findExcerpt(content, tokens, query),
    score: score + 12,
  };
}

async function searchMemory(sessionId: string, args: Record<string, unknown>): Promise<VoiceMemorySearchResult> {
  const query = stringArg(args, "query");
  if (!query) {
    throw new Error("query required");
  }
  const { session, channel: sessionChannel } = requireVoiceToolSession(sessionId);
  const channel = normalizeChannel(stringArg(args, "channel"), sessionChannel);
  const timeRange = stringArg(args, "timeRange") ?? "last_30_days";
  const includeVoiceCalls = boolArg(args, "includeVoiceCalls", true);
  const tokens = tokenize(query);
  const categories = await listMemoryByCategory();
  const files = categories
    .flatMap((category) => category.files)
    .filter((file) => isInTimeRange(file, timeRange))
    .slice(0, MAX_SEARCH_FILES);

  const hits: VoiceToolSource[] = [];
  const handoff = getHandoffSource(session);
  const recentContexts = [
    ...listVoiceTelegramRecentContexts({
      telegramChatId: handoff.chatId,
      telegramThreadId: handoff.threadId,
      profileSlug: channel === "auto" ? sessionChannel : channel,
      limit: 6,
    }),
    ...listVoiceTelegramRecentContexts({
      profileSlug: channel === "auto" ? sessionChannel : channel,
      limit: 6,
    }),
  ];
  const seenRecentContextIds = new Set<string>();
  for (const context of recentContexts) {
    if (seenRecentContextIds.has(context.id)) continue;
    seenRecentContextIds.add(context.id);
    const hit = scoreRecentContext(context, query, tokens, channel);
    if (hit) hits.push(hit);
  }

  for (const file of files) {
    try {
      const content = (await readMemoryFile(file.path)).slice(0, MAX_CONTENT_CHARS);
      if (!includeVoiceCalls && content.includes("VOICE_CALL_MEMORY_V1")) continue;
      const score = scoreContent(file, content, query, tokens, channel);
      if (score <= 0) continue;
      hits.push({
        path: file.path,
        name: file.name,
        category: file.category,
        modified: file.modified,
        excerpt: findExcerpt(content, tokens, query),
        score,
      });
    } catch {
      // Skip unreadable memory files; the route records searched totals.
    }
  }

  const sources = hits
    .sort((a, b) => b.score - a.score || b.modified.localeCompare(a.modified))
    .slice(0, 6);

  return {
    tool: "hermes_memory_search",
    answerable: sources.length > 0,
    summary: summarizeSearch(query, sources),
    query,
    channel,
    sources,
    searched: {
      fileCount: files.length + seenRecentContextIds.size,
      categories: Array.from(new Set([...files.map((file) => file.category), ...(seenRecentContextIds.size ? ["telegram_recent"] : [])])),
    },
  };
}

async function readMemoryPath(args: Record<string, unknown>): Promise<VoiceMemoryReadResult> {
  const logicalPath = stringArg(args, "path");
  if (!logicalPath) {
    throw new Error("path required");
  }
  const focus = stringArg(args, "focus");
  const content = (await readMemoryFile(logicalPath)).slice(0, MAX_CONTENT_CHARS);
  const tokens = tokenize(focus ?? logicalPath);
  const excerpt = findExcerpt(content, tokens, focus);

  return {
    tool: "hermes_memory_read",
    answerable: true,
    path: logicalPath,
    summary: `Ich habe ${logicalPath} gelesen und den relevantesten Ausschnitt extrahiert.`,
    sources: [{
      path: logicalPath,
      name: logicalPath.split("/").pop() ?? logicalPath,
      category: logicalPath.split(":", 1)[0] ?? "memory",
      modified: new Date().toISOString(),
      excerpt,
      score: 1,
    }],
  };
}

export async function executeVoiceToolCall(input: VoiceToolCallInput): Promise<VoiceToolResult> {
  const { session } = requireVoiceToolSession(input.sessionId);
  appendVoiceEvent({
    sessionId: session.id,
    eventType: "voice.tool_call_started",
    fromState: session.state,
    toState: session.state,
    payload: {
      toolName: input.toolName,
      callId: input.callId ?? null,
      arguments: input.arguments,
    },
  });

  try {
    const result = input.toolName === "hermes_memory_search"
      ? await searchMemory(input.sessionId, input.arguments)
      : input.toolName === "hermes_memory_read"
        ? await readMemoryPath(input.arguments)
        : null;

    if (!result) {
      throw new Error(`Voice tool not allowed: ${input.toolName}`);
    }

    appendVoiceEvent({
      sessionId: session.id,
      eventType: "voice.tool_call_completed",
      fromState: session.state,
      toState: session.state,
      payload: {
        toolName: input.toolName,
        callId: input.callId ?? null,
        answerable: result.answerable,
        sourceCount: result.sources.length,
        sources: result.sources.map((source) => ({
          path: source.path,
          category: source.category,
          modified: source.modified,
          score: source.score,
        })),
      },
    });
    return result;
  } catch (error) {
    appendVoiceEvent({
      sessionId: session.id,
      eventType: "voice.tool_call_failed",
      fromState: session.state,
      toState: session.state,
      payload: {
        toolName: input.toolName,
        callId: input.callId ?? null,
        message: error instanceof Error ? error.message : String(error),
      },
    });
    throw error;
  }
}
