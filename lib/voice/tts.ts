export type VoiceTtsProvider = "browser" | "elevenlabs";

export type VoiceTtsFallback = {
  provider: "browser";
};

export type VoiceTtsAudioResult = {
  provider: "elevenlabs";
  audio: ArrayBuffer;
  contentType: string;
};

export type VoiceTtsResult = VoiceTtsFallback | VoiceTtsAudioResult;

const ELEVENLABS_API_BASE = "https://api.elevenlabs.io/v1/text-to-speech";

export function hasElevenLabsTtsConfig(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(
    env.ELEVENLABS_API_KEY?.trim()
      && env.MC_VOICE_ELEVENLABS_VOICE_ID?.trim(),
  );
}

export function getPreferredVoiceTtsProvider(env: NodeJS.ProcessEnv = process.env): VoiceTtsProvider {
  const configured = env.MC_VOICE_TTS_PROVIDER?.trim().toLowerCase();
  if (configured === "elevenlabs" && hasElevenLabsTtsConfig(env)) {
    return "elevenlabs";
  }
  return "browser";
}

function getElevenLabsRequestInit(text: string, env: NodeJS.ProcessEnv = process.env): RequestInit {
  const apiKey = env.ELEVENLABS_API_KEY?.trim();
  const voiceId = env.MC_VOICE_ELEVENLABS_VOICE_ID?.trim();
  if (!apiKey || !voiceId) {
    throw new Error("ElevenLabs TTS is not configured");
  }

  const modelId = env.MC_VOICE_ELEVENLABS_MODEL_ID?.trim() || "eleven_multilingual_v2";
  const stability = Number(env.MC_VOICE_ELEVENLABS_STABILITY ?? "0.35");
  const similarityBoost = Number(env.MC_VOICE_ELEVENLABS_SIMILARITY_BOOST ?? "0.7");
  const style = Number(env.MC_VOICE_ELEVENLABS_STYLE ?? "0.15");
  const useSpeakerBoost = env.MC_VOICE_ELEVENLABS_SPEAKER_BOOST?.trim() === "false" ? false : true;

  return {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "xi-api-key": apiKey,
      accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: modelId,
      voice_settings: {
        stability,
        similarity_boost: similarityBoost,
        style,
        use_speaker_boost: useSpeakerBoost,
      },
    }),
  };
}

export async function synthesizeVoiceTts(text: string, env: NodeJS.ProcessEnv = process.env): Promise<VoiceTtsResult> {
  const normalized = text.trim();
  if (!normalized) {
    throw new Error("text required");
  }

  const provider = getPreferredVoiceTtsProvider(env);
  if (provider === "browser") {
    return { provider: "browser" };
  }

  const voiceId = env.MC_VOICE_ELEVENLABS_VOICE_ID!.trim();
  const response = await fetch(`${ELEVENLABS_API_BASE}/${voiceId}/stream?output_format=mp3_44100_128`, getElevenLabsRequestInit(normalized, env));
  if (!response.ok) {
    throw new Error(`ElevenLabs TTS failed (${response.status})`);
  }

  const audio = await response.arrayBuffer();
  if (!audio.byteLength) {
    throw new Error("ElevenLabs TTS returned empty audio");
  }

  return {
    provider: "elevenlabs",
    audio,
    contentType: response.headers.get("content-type") || "audio/mpeg",
  };
}
