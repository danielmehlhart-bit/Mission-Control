import { execFile } from "node:child_process";
import { promisify } from "node:util";

import type { ResolvedVoiceContext, VoiceProfile, VoiceSession, VoiceTurn } from "./types";

const execFileAsync = promisify(execFile);

export type VoiceReplyInput = {
  session: VoiceSession;
  profile: VoiceProfile;
  resolvedContext: Record<string, unknown> | ResolvedVoiceContext;
  recentTurns: VoiceTurn[];
};

export type VoiceReplyOutput = {
  text: string;
  metadata?: Record<string, unknown>;
};

export type VoiceReplyStrategy = "stub" | "hermes-cli";

export function getDefaultVoiceReplyStrategy(): VoiceReplyStrategy {
  const configured = process.env.MC_VOICE_REPLY_STRATEGY?.trim().toLowerCase();
  if (configured === "stub" || configured === "hermes-cli") {
    return configured;
  }
  return process.env.NODE_ENV === "production" ? "hermes-cli" : "stub";
}

function buildGreeting(input: VoiceReplyInput): string {
  const resolvedContext = input.resolvedContext as Record<string, unknown>;
  const summary = typeof resolvedContext.contextSummary === "string" ? resolvedContext.contextSummary : input.profile.label;
  return `Hi Daniel, ich bin jetzt in ${input.profile.label}. ${summary}. Was kann ich für dich tun?`;
}

function buildStubReply(input: VoiceReplyInput): VoiceReplyOutput {
  const resolvedContext = input.resolvedContext as Record<string, unknown>;
  const summary = typeof resolvedContext.contextSummary === "string" ? resolvedContext.contextSummary : input.profile.label;
  const userTurn = [...input.recentTurns].reverse().find((turn) => turn.speaker === "user");
  return {
    text: userTurn ? `Klar — ${summary}. Meine kurze Antwort: ${userTurn.text}` : buildGreeting(input),
    metadata: { provider: "stub" },
  };
}

function summarizeRecentTurns(turns: VoiceTurn[]): string {
  return turns
    .slice(-8)
    .map((turn) => `${turn.speaker === "user" ? "User" : turn.speaker === "assistant" ? "Assistant" : "System"}: ${turn.text}`)
    .join("\n");
}

function buildHermesPrompt(input: VoiceReplyInput): string {
  const resolvedContext = input.resolvedContext as Record<string, unknown>;
  const contextSummary = typeof resolvedContext.contextSummary === "string" ? resolvedContext.contextSummary : input.profile.label;
  const recentTurns = summarizeRecentTurns(input.recentTurns);
  const hasUserTurn = input.recentTurns.some((turn) => turn.speaker === "user");

  return [
    `Du bist ${input.profile.label} in Mission Control und antwortest Daniel direkt.`,
    "Antworte auf Deutsch, natürlich, hilfreich und knapp.",
    "Keine Metakommentare, keine Erwähnung von Stub/Test/Prompt/System, keine Listen außer wenn nötig.",
    hasUserTurn
      ? "Wenn etwas unklar ist, stelle höchstens eine kurze Rückfrage."
      : "Es gibt noch keine Nutzerfrage. Begrüße Daniel kurz natürlich und frage, wobei du helfen kannst.",
    "",
    `Profil: ${input.profile.slug}`,
    `Kontext: ${contextSummary}`,
    `Session-ID: ${input.session.id}`,
    "",
    "Letzte Turns:",
    recentTurns || "Keine bisherigen Turns.",
    "",
    "Gib jetzt nur die eigentliche Assistant-Antwort aus.",
  ].join("\n");
}

async function generateHermesCliReply(input: VoiceReplyInput): Promise<VoiceReplyOutput> {
  const command = process.env.MC_VOICE_HERMES_COMMAND?.trim() || "hermes";
  const prompt = buildHermesPrompt(input);
  const { stdout } = await execFileAsync(command, ["chat", "-q", prompt, "--quiet"], {
    timeout: Number(process.env.MC_VOICE_HERMES_TIMEOUT_MS || 45000),
    maxBuffer: 1024 * 1024,
    env: process.env,
  });

  const text = stdout.trim();
  if (!text) {
    throw new Error("Hermes voice reply was empty");
  }

  return {
    text,
    metadata: { provider: "hermes-cli" },
  };
}

export async function generateDefaultVoiceReply(input: VoiceReplyInput): Promise<VoiceReplyOutput> {
  const strategy = getDefaultVoiceReplyStrategy();
  if (strategy === "stub") {
    return buildStubReply(input);
  }
  return generateHermesCliReply(input);
}
