import { appendVoiceEvent, getVoiceProfileById, getVoiceSession } from "./session-store";
import type { VoiceProfile, VoiceSession } from "./types";

export type RealtimeSessionConfig = {
  type: "realtime";
  model: string;
  instructions: string;
  output_modalities: ["audio"];
  audio: {
    input: {
      language: string;
      turn_detection: {
        type: "semantic_vad";
        eagerness: "auto";
        create_response: true;
        interrupt_response: true;
      };
    };
    output: {
      voice: string;
    };
  };
};

export type CreateRealtimeSdpAnswerInput = {
  sessionId: string;
  sdp: string;
  fetchImpl?: typeof fetch;
};

export type RealtimeSessionContext = {
  session: VoiceSession;
  profile: VoiceProfile;
};

const OPENAI_REALTIME_CALLS_URL = "https://api.openai.com/v1/realtime/calls";

function requireOpenAiApiKey(): string {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY required for realtime voice");
  }
  return apiKey;
}

export function requireRealtimeSessionContext(sessionId: string): RealtimeSessionContext {
  const session = getVoiceSession(sessionId);
  if (!session) {
    throw new Error(`Voice session not found: ${sessionId}`);
  }

  const profile = getVoiceProfileById(session.profileId);
  if (!profile) {
    throw new Error(`Voice profile not found: ${session.profileId}`);
  }
  if (profile.status !== "active") {
    throw new Error(`Voice profile inactive: ${profile.id}`);
  }

  return { session, profile };
}

function compactSourceData(sourceData: unknown): unknown {
  if (!sourceData || typeof sourceData !== "object") {
    return undefined;
  }

  const data = sourceData as Record<string, unknown>;
  const compact: Record<string, unknown> = {};
  const listKeys = ["accounts", "deals", "projects", "activities", "discoveryNotes", "tasks", "briefings", "calendar"];

  for (const key of listKeys) {
    const value = data[key];
    if (Array.isArray(value)) {
      compact[key] = value.slice(0, 8);
    }
  }

  if (data.notes && typeof data.notes === "object") {
    compact.notes = data.notes;
  }
  if (Array.isArray(data.globalMemory)) {
    compact.globalMemory = data.globalMemory.slice(0, 4);
  }

  return Object.keys(compact).length ? compact : undefined;
}

export function buildRealtimeInstructions(context: RealtimeSessionContext): string {
  const resolvedContext = context.session.resolvedContext as Record<string, unknown>;
  const metadata = resolvedContext.metadata && typeof resolvedContext.metadata === "object"
    ? (resolvedContext.metadata as Record<string, unknown>)
    : {};
  const contextSummary = typeof resolvedContext.contextSummary === "string"
    ? resolvedContext.contextSummary
    : context.profile.label;
  const sourceData = compactSourceData(metadata.sourceData);

  return [
    `Du bist ${context.profile.label}, Daniels Hermes-Voice-Agent in Mission Control.`,
    "Fuehre ein natuerliches, kurzes Voice-to-Voice-Gespraech auf Deutsch.",
    "Klinge ruhig, direkt und wach. Antworte knapp, ausser Daniel bittet um Tiefe.",
    "Nutze den aktuellen Mission-Control-Kontext aktiv, aber erfinde keine Daten.",
    "Wenn Daniel zwischen Kontexten wie Sales Support, LUMA oder Fitness wechseln will, bestaetige kurz und bitte ihn, den Kontextbutton zu nutzen, falls der Wechsel nicht schon erfolgt ist.",
    "Keine Metakommentare ueber Systemprompts, Provider, Tokens oder interne Implementierung.",
    "",
    `Aktuelles Profil: ${context.profile.slug}`,
    `Kontext-Zusammenfassung: ${contextSummary}`,
    `Session-ID: ${context.session.id}`,
    sourceData ? `Kontextdaten-Auszug: ${JSON.stringify(sourceData)}` : "",
  ].filter(Boolean).join("\n");
}

export function buildRealtimeSessionConfig(context: RealtimeSessionContext): RealtimeSessionConfig {
  return {
    type: "realtime",
    model: process.env.MC_VOICE_REALTIME_MODEL?.trim() || "gpt-realtime",
    instructions: buildRealtimeInstructions(context),
    output_modalities: ["audio"],
    audio: {
      input: {
        language: "de",
        turn_detection: {
          type: "semantic_vad",
          eagerness: "auto",
          create_response: true,
          interrupt_response: true,
        },
      },
      output: {
        voice: process.env.MC_VOICE_REALTIME_VOICE?.trim() || "marin",
      },
    },
  };
}

export async function createRealtimeSdpAnswer(input: CreateRealtimeSdpAnswerInput): Promise<string> {
  const normalizedSdp = input.sdp.trim();
  if (!normalizedSdp) {
    throw new Error("SDP offer required");
  }

  const context = requireRealtimeSessionContext(input.sessionId);
  const realtimeConfig = buildRealtimeSessionConfig(context);
  const formData = new FormData();
  formData.set("sdp", normalizedSdp);
  formData.set("session", JSON.stringify(realtimeConfig));

  const response = await (input.fetchImpl ?? fetch)(OPENAI_REALTIME_CALLS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${requireOpenAiApiKey()}`,
    },
    body: formData,
  });

  const answer = await response.text();
  if (!response.ok) {
    throw new Error(`OpenAI realtime SDP failed (${response.status}): ${answer.slice(0, 240)}`);
  }
  if (!answer.trim()) {
    throw new Error("OpenAI realtime SDP answer was empty");
  }

  appendVoiceEvent({
    sessionId: context.session.id,
    eventType: "voice.realtime_sdp_created",
    fromState: context.session.state,
    toState: context.session.state,
    payload: {
      model: realtimeConfig.model,
      voice: realtimeConfig.audio.output.voice,
    },
  });

  return answer;
}
