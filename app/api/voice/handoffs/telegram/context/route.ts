import { NextResponse } from "next/server";

import { parseJsonBody, requireString, voiceErrorResponse } from "@/lib/voice/api";
import { upsertVoiceTelegramRecentContext, type VoiceTelegramRecentContextMessage } from "@/lib/voice/telegram-bridge";
import { VOICE_PROFILE_SLUGS, type VoiceProfileSlug } from "@/lib/voice/types";

export const dynamic = "force-dynamic";

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function optionalProfileSlug(value: unknown): VoiceProfileSlug | undefined {
  if (typeof value !== "string") return undefined;
  return VOICE_PROFILE_SLUGS.includes(value as VoiceProfileSlug) ? (value as VoiceProfileSlug) : undefined;
}

function parseMessages(value: unknown): VoiceTelegramRecentContextMessage[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((message) => message && typeof message === "object" && !Array.isArray(message)
      ? (message as Record<string, unknown>)
      : null)
    .filter((message): message is Record<string, unknown> => !!message)
    .map((message) => ({
      ...(typeof message.role === "string" ? { role: message.role } : {}),
      ...(typeof message.author === "string" ? { author: message.author } : {}),
      text: typeof message.text === "string" ? message.text.trim() : "",
      ...(typeof message.createdAt === "string" ? { createdAt: message.createdAt } : {}),
    }))
    .filter((message) => message.text);
}

export async function POST(request: Request) {
  try {
    const body = await parseJsonBody(request);
    const telegramChatId = requireString(body.telegramChatId, "telegramChatId");
    const summary = requireString(body.summary, "summary");
    const context = upsertVoiceTelegramRecentContext({
      telegramChatId,
      telegramThreadId: optionalString(body.telegramThreadId),
      profileSlug: optionalProfileSlug(body.profileSlug),
      label: optionalString(body.label),
      summary,
      messages: parseMessages(body.messages),
      metadata: body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)
        ? (body.metadata as Record<string, unknown>)
        : undefined,
      observedFrom: optionalString(body.observedFrom),
      observedTo: optionalString(body.observedTo),
    });

    return NextResponse.json({ context }, { status: 201 });
  } catch (error) {
    return voiceErrorResponse(error);
  }
}
