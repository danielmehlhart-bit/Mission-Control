import test from "node:test";
import assert from "node:assert/strict";

import { generateDefaultVoiceReply, getDefaultVoiceReplyStrategy, getVoiceReplyFallbackStrategy } from "../../lib/voice/providers";
import { pickPreferredSpeechSynthesisVoice } from "../../lib/voice/browser-voice";
import { getPreferredVoiceTtsProvider, hasElevenLabsTtsConfig } from "../../lib/voice/tts";

test("getDefaultVoiceReplyStrategy defaults to hermes-cli in production mode", () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousStrategy = process.env.MC_VOICE_REPLY_STRATEGY;

  process.env.NODE_ENV = "production";
  delete process.env.MC_VOICE_REPLY_STRATEGY;

  assert.equal(getDefaultVoiceReplyStrategy(), "hermes-cli");

  process.env.NODE_ENV = previousNodeEnv;
  if (previousStrategy === undefined) {
    delete process.env.MC_VOICE_REPLY_STRATEGY;
  } else {
    process.env.MC_VOICE_REPLY_STRATEGY = previousStrategy;
  }
});

test("getVoiceReplyFallbackStrategy defaults to stub", () => {
  const previousFallback = process.env.MC_VOICE_REPLY_FALLBACK;
  delete process.env.MC_VOICE_REPLY_FALLBACK;

  assert.equal(getVoiceReplyFallbackStrategy(), "stub");

  process.env.MC_VOICE_REPLY_FALLBACK = "none";
  assert.equal(getVoiceReplyFallbackStrategy(), "none");

  if (previousFallback === undefined) {
    delete process.env.MC_VOICE_REPLY_FALLBACK;
  } else {
    process.env.MC_VOICE_REPLY_FALLBACK = previousFallback;
  }
});

test("generateDefaultVoiceReply falls back when hermes-cli is unavailable", async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousStrategy = process.env.MC_VOICE_REPLY_STRATEGY;
  const previousCommand = process.env.MC_VOICE_HERMES_COMMAND;
  const previousFallback = process.env.MC_VOICE_REPLY_FALLBACK;

  process.env.NODE_ENV = "production";
  process.env.MC_VOICE_REPLY_STRATEGY = "hermes-cli";
  process.env.MC_VOICE_HERMES_COMMAND = "mission-control-missing-hermes-command";
  process.env.MC_VOICE_REPLY_FALLBACK = "stub";

  const reply = await generateDefaultVoiceReply({
    session: {
      id: "vs_test",
      profileId: "vp_main",
      state: "ready",
      transport: "web",
      baseSessionKey: "voice.main",
      resolvedContext: { contextSummary: "Hermes Test" },
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    profile: {
      id: "vp_main",
      slug: "main",
      label: "Call Hermes",
      status: "active",
      baseSessionKey: "voice.main",
      contextBinding: {},
      contextSources: [],
      allowedSwitchTargets: [],
      sortOrder: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    resolvedContext: { contextSummary: "Hermes Test" },
    recentTurns: [{ id: "vt_1", sessionId: "vs_test", speaker: "user", text: "Hallo", source: "test", sequenceNo: 1, metadata: {}, createdAt: new Date().toISOString() }],
  });

  assert.equal(reply.metadata?.provider, "stub");
  assert.equal(reply.metadata?.fallbackFrom, "hermes-cli");
  assert.match(reply.text, /Hallo/);

  process.env.NODE_ENV = previousNodeEnv;
  if (previousStrategy === undefined) {
    delete process.env.MC_VOICE_REPLY_STRATEGY;
  } else {
    process.env.MC_VOICE_REPLY_STRATEGY = previousStrategy;
  }
  if (previousCommand === undefined) {
    delete process.env.MC_VOICE_HERMES_COMMAND;
  } else {
    process.env.MC_VOICE_HERMES_COMMAND = previousCommand;
  }
  if (previousFallback === undefined) {
    delete process.env.MC_VOICE_REPLY_FALLBACK;
  } else {
    process.env.MC_VOICE_REPLY_FALLBACK = previousFallback;
  }
});

test("pickPreferredSpeechSynthesisVoice prefers a natural German voice over robotic desktop fallbacks", () => {
  const selected = pickPreferredSpeechSynthesisVoice([
    { name: "Microsoft Stefan - German (Germany)", lang: "de-DE", localService: true, voiceURI: "ms-stefan" },
    { name: "Google Deutsch", lang: "de-DE", localService: false, voiceURI: "google-de" },
    { name: "Microsoft Hedda Desktop", lang: "de-DE", localService: true, voiceURI: "ms-hedda" },
  ]);

  assert.equal(selected?.name, "Google Deutsch");
});

test("getPreferredVoiceTtsProvider falls back to browser unless ElevenLabs is explicitly configured", () => {
  assert.equal(hasElevenLabsTtsConfig({}), false);
  assert.equal(getPreferredVoiceTtsProvider({}), "browser");
  assert.equal(
    getPreferredVoiceTtsProvider({
      MC_VOICE_TTS_PROVIDER: "elevenlabs",
      ELEVENLABS_API_KEY: "test-key",
      MC_VOICE_ELEVENLABS_VOICE_ID: "voice-123",
    }),
    "elevenlabs",
  );
});
