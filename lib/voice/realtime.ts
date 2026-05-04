import { appendVoiceEvent, getVoiceProfileById, getVoiceSession } from "./session-store";
import type { VoiceProfile, VoiceSession } from "./types";

export type RealtimeSessionConfig = {
  type: "realtime";
  model: string;
  instructions: string;
  output_modalities: ["audio"];
  audio: {
    input: {
      transcription: {
        model: string;
      };
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
  requestContentType?: string | null;
  fetchImpl?: typeof fetch;
};

export type CreateRealtimeClientSecretInput = {
  sessionId: string;
  fetchImpl?: typeof fetch;
};

export type RealtimeSessionContext = {
  session: VoiceSession;
  profile: VoiceProfile;
};

const OPENAI_REALTIME_CALLS_URL = "https://api.openai.com/v1/realtime/calls";
const OPENAI_REALTIME_CLIENT_SECRETS_URL = "https://api.openai.com/v1/realtime/client_secrets";

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
    compact.globalMemory = data.globalMemory.slice(0, 12);
  }

  return Object.keys(compact).length ? compact : undefined;
}

function buildProfileInstruction(profile: VoiceProfile): string {
  switch (profile.slug) {
    case "sales_support":
      return "Du bist im Sales-Support-Kanal: fokussiere Pipeline, Accounts, Deals, Discovery Notes, Follow-ups und naechste Sales-Aktionen.";
    case "luma":
      return "Du bist im LUMA-Kanal: fokussiere LUMA-Produkt, Kundenfeedback, Tasks, Briefings und naechste Produkt-/Sales-Schritte.";
    case "fitness":
      return "Du bist im Fitness-Kanal: fokussiere Training, Routinen, Gesundheit, Energie und umsetzbare naechste Schritte.";
    default:
      return "Du bist im allgemeinen Hermes-Kanal fuer Mission Control: fokussiere Daniels aktuelle Prioritaeten, Tasks, Memory und Orientierung.";
  }
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
    "Stimme und Sprechweise: maennlich, warm, tiefer, ruhig, mit kontrolliertem Tempo. Keine ueberdrehte Service-Hotline-Energie.",
    "Hermes-Charakter: eigenstaendig, klar, aufmerksam, pragmatisch. Sprich wie ein vertrauter Arbeitsbegleiter, nicht wie ein generischer Assistent.",
    "Du bist die Voice-Fortsetzung von Daniels Telegram-Hermes. Behandle diesen Call als denselben Arbeitsfaden: greife auf Memory-MD-Dateien, Daily Logs und Projekt-Memory zurueck, wenn sie im Kontext liegen.",
    "Wenn Daniel auf einen Telegram-Chat, eine laufende Sache oder 'das von eben' verweist, suche zuerst im Memory-Kontext nach Anschluss statt neu anzufangen.",
    "Nutze den aktuellen Mission-Control-Kontext aktiv, aber erfinde keine Daten.",
    buildProfileInstruction(context.profile),
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
        transcription: {
          model: process.env.MC_VOICE_TRANSCRIPTION_MODEL?.trim() || "gpt-4o-mini-transcribe",
        },
        turn_detection: {
          type: "semantic_vad",
          eagerness: "auto",
          create_response: true,
          interrupt_response: true,
        },
      },
      output: {
        voice: process.env.MC_VOICE_REALTIME_VOICE?.trim() || "cedar",
      },
    },
  };
}

export async function createRealtimeSdpAnswer(input: CreateRealtimeSdpAnswerInput): Promise<string> {
  const normalizedSdp = input.sdp.trim();
  if (!normalizedSdp) {
    throw new Error("SDP offer required");
  }
  if (!normalizedSdp.startsWith("v=0")) {
    throw new Error("Invalid SDP offer");
  }

  const context = requireRealtimeSessionContext(input.sessionId);
  const realtimeConfig = buildRealtimeSessionConfig(context);
  const sdpDiagnostics = {
    sdpLength: normalizedSdp.length,
    sdpFirstLine: normalizedSdp.split(/\r?\n/, 1)[0] ?? "",
    requestContentType: input.requestContentType ?? null,
  };
  appendVoiceEvent({
    sessionId: context.session.id,
    eventType: "voice.realtime_sdp_received",
    fromState: context.session.state,
    toState: context.session.state,
    payload: sdpDiagnostics,
  });

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
    throw new Error(
      `OpenAI realtime SDP failed (${response.status}, local ${sdpDiagnostics.sdpLength} chars, ${sdpDiagnostics.sdpFirstLine}): ${answer.slice(0, 240)}`,
    );
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

export async function createRealtimeClientSecret(input: CreateRealtimeClientSecretInput): Promise<Record<string, unknown>> {
  const context = requireRealtimeSessionContext(input.sessionId);
  const realtimeConfig = buildRealtimeSessionConfig(context);
  const response = await (input.fetchImpl ?? fetch)(OPENAI_REALTIME_CLIENT_SECRETS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${requireOpenAiApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      session: realtimeConfig,
    }),
  });

  const data = await response.json().catch(() => null) as Record<string, unknown> | null;
  if (!response.ok) {
    throw new Error(`OpenAI realtime token failed (${response.status}): ${JSON.stringify(data).slice(0, 240)}`);
  }
  if (!data || typeof data !== "object") {
    throw new Error("OpenAI realtime token response was empty");
  }

  appendVoiceEvent({
    sessionId: context.session.id,
    eventType: "voice.realtime_client_secret_created",
    fromState: context.session.state,
    toState: context.session.state,
    payload: {
      model: realtimeConfig.model,
      voice: realtimeConfig.audio.output.voice,
    },
  });

  return data;
}
