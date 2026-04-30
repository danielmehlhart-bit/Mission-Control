import test from "node:test";
import assert from "node:assert/strict";

import { getDefaultVoiceReplyStrategy } from "../../lib/voice/providers";
import { pickPreferredSpeechSynthesisVoice } from "../../lib/voice/browser-voice";

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

test("pickPreferredSpeechSynthesisVoice prefers a natural German voice over robotic desktop fallbacks", () => {
  const selected = pickPreferredSpeechSynthesisVoice([
    { name: "Microsoft Stefan - German (Germany)", lang: "de-DE", localService: true, voiceURI: "ms-stefan" },
    { name: "Google Deutsch", lang: "de-DE", localService: false, voiceURI: "google-de" },
    { name: "Microsoft Hedda Desktop", lang: "de-DE", localService: true, voiceURI: "ms-hedda" },
  ]);

  assert.equal(selected?.name, "Google Deutsch");
});
