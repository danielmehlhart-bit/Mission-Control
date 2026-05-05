import { NextResponse } from "next/server";
import { generateAssistantTurn } from "@/lib/voice/service";
import { buildSessionEnvelope, parseJsonBody, validateTransport, voiceErrorResponse } from "@/lib/voice/api";
import { createTelegramVoiceHandoff } from "@/lib/voice/telegram-bridge";
import type { VoiceProfileSlug } from "@/lib/voice/types";

export const dynamic = "force-dynamic";

function requireTelegramId(value: unknown, field: string): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${field} required`);
  }
  return value.trim();
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
}

function optionalProfileSlug(value: unknown): VoiceProfileSlug | undefined {
  if (typeof value !== "string") return undefined;
  const slug = value.trim();
  if (slug === "main" || slug === "sales_support" || slug === "luma" || slug === "fitness") {
    return slug;
  }
  throw new Error("Invalid profileSlug");
}

function optionalRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

export async function POST(request: Request) {
  try {
    const body = await parseJsonBody(request);
    const telegramChatId = requireTelegramId(body.telegramChatId, "telegramChatId");
    const telegramThreadId = optionalString(body.telegramThreadId);
    const transport = body.transport === undefined ? "web" : validateTransport(body.transport);
    const autoGreeting = body.autoGreeting !== false;

    const handoff = await createTelegramVoiceHandoff({
      telegramChatId,
      ...(telegramThreadId ? { telegramThreadId } : {}),
      ...(optionalProfileSlug(body.profileSlug) ? { profileSlug: optionalProfileSlug(body.profileSlug) } : {}),
      ...(optionalString(body.label) ? { label: optionalString(body.label) } : {}),
      ...(optionalString(body.accountId) ? { accountId: optionalString(body.accountId) } : {}),
      ...(optionalString(body.dealId) ? { dealId: optionalString(body.dealId) } : {}),
      ...(optionalString(body.projectId) ? { projectId: optionalString(body.projectId) } : {}),
      ...(optionalString(body.projectSlug) ? { projectSlug: optionalString(body.projectSlug) } : {}),
      transport,
      ...(optionalRecord(body.metadata) ? { metadata: optionalRecord(body.metadata) } : {}),
      persistBridge: body.persistBridge !== false,
    });

    if (autoGreeting) {
      await generateAssistantTurn({ sessionId: handoff.session.id });
    }

    return NextResponse.json(
      {
        ...buildSessionEnvelope(handoff.session.id),
        handoff: {
          source: "telegram",
          bridgeId: handoff.bridge?.id ?? null,
          matchedExistingBridge: handoff.matchedExistingBridge,
          telegramChatId,
          telegramThreadId: telegramThreadId ?? null,
          profileSlug: handoff.bridge?.profileSlug ?? null,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return voiceErrorResponse(error);
  }
}
