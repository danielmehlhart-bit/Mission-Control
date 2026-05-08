import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "mc-voice-realtime-"));
process.env.DB_PATH = path.join(tempRoot, "mission-control.db");
process.env.BRIEFINGS_DIR = path.join(tempRoot, "briefings");
process.env.MEMORY_DIR = tempRoot;
fs.mkdirSync(process.env.BRIEFINGS_DIR, { recursive: true });
fs.mkdirSync(path.join(process.env.MEMORY_DIR, "core"), { recursive: true });

async function loadModules() {
  const sessionStoreModule = await import("../../lib/voice/session-store.ts");
  const serviceModule = await import("../../lib/voice/service.ts");
  const realtimeModule = await import("../../lib/voice/realtime.ts");

  return { sessionStoreModule, serviceModule, realtimeModule };
}

test("buildRealtimeSessionConfig creates German speech-to-speech config with profile context", async () => {
  const { serviceModule, realtimeModule } = await loadModules();
  const { createSessionForProfile } = serviceModule;
  const { buildRealtimeSessionConfig, requireRealtimeSessionContext } = realtimeModule;

  const session = await createSessionForProfile({ profileSlug: "main", transport: "web" });
  const config = buildRealtimeSessionConfig(requireRealtimeSessionContext(session.id));

  assert.equal(config.type, "realtime");
  assert.equal(config.model, "gpt-realtime");
  assert.equal(config.audio.input.turn_detection.type, "semantic_vad");
  assert.equal(config.audio.input.turn_detection.create_response, false);
  assert.equal(config.audio.output.voice, "cedar");
  assert.equal(config.tool_choice, "auto");
  assert.equal(config.tools.some((tool) => tool.name === "hermes_memory_search"), true);
  assert.equal(config.tools.some((tool) => tool.name === "voice_create_work_order"), true);
  assert.match(config.instructions, /Call Hermes|Hermes/i);
  assert.match(config.instructions, /Mission Control/i);
  assert.match(config.instructions, /maennlich|Hermes-Charakter/i);
  assert.match(config.instructions, /hermes_memory_search/);
  assert.match(config.instructions, /voice_create_work_order/);
  assert.match(config.instructions, /Capability truth rule/);
  assert.match(config.instructions, /never claim/i);
  assert.match(config.instructions, /Do not say a final document/i);
  assert.match(config.instructions, /live_web_research/);
  assert.match(config.instructions, /not_implemented/);
  assert.match(config.instructions, /Live-Chat-History/);
});

test("createRealtimeSdpAnswer posts multipart SDP and session config to OpenAI", async () => {
  const previousApiKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "test-key";

  const { serviceModule, realtimeModule, sessionStoreModule } = await loadModules();
  const { createSessionForProfile } = serviceModule;
  const { createRealtimeSdpAnswer } = realtimeModule;
  const { listVoiceSessionEvents } = sessionStoreModule;
  const session = await createSessionForProfile({ profileSlug: "main", transport: "web" });

  let capturedUrl = "";
  let capturedAuthorization = "";
  let capturedBody: FormData | null = null;
  const answer = await createRealtimeSdpAnswer({
    sessionId: session.id,
    sdp: "v=0\r\n",
    fetchImpl: async (url, init) => {
      capturedUrl = String(url);
      capturedAuthorization = String((init?.headers as Record<string, string>).Authorization);
      capturedBody = init?.body as FormData;
      return new Response("answer-sdp", { status: 200 });
    },
  });

  assert.equal(answer, "answer-sdp");
  assert.equal(capturedUrl, "https://api.openai.com/v1/realtime/calls");
  assert.equal(capturedAuthorization, "Bearer test-key");
  assert.equal(capturedBody?.get("sdp"), "v=0");
  assert.match(String(capturedBody?.get("session")), /gpt-realtime/);
  assert.equal(listVoiceSessionEvents(session.id).some((event) => event.eventType === "voice.realtime_sdp_created"), true);

  if (previousApiKey === undefined) {
    delete process.env.OPENAI_API_KEY;
  } else {
    process.env.OPENAI_API_KEY = previousApiKey;
  }
});

test("createRealtimeClientSecret posts session config to the client secrets endpoint", async () => {
  const previousApiKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "test-key";

  const { serviceModule, realtimeModule, sessionStoreModule } = await loadModules();
  const { createSessionForProfile } = serviceModule;
  const { createRealtimeClientSecret } = realtimeModule;
  const { listVoiceSessionEvents } = sessionStoreModule;
  const session = await createSessionForProfile({ profileSlug: "main", transport: "web" });

  let capturedUrl = "";
  let capturedBody = "";
  const token = await createRealtimeClientSecret({
    sessionId: session.id,
    fetchImpl: async (url, init) => {
      capturedUrl = String(url);
      capturedBody = String(init?.body);
      return Response.json({ value: "ek_test" }, { status: 200 });
    },
  });

  assert.equal(token.value, "ek_test");
  assert.equal(capturedUrl, "https://api.openai.com/v1/realtime/client_secrets");
  assert.match(capturedBody, /"session"/);
  assert.match(capturedBody, /"gpt-realtime"/);
  assert.equal(listVoiceSessionEvents(session.id).some((event) => event.eventType === "voice.realtime_client_secret_created"), true);

  if (previousApiKey === undefined) {
    delete process.env.OPENAI_API_KEY;
  } else {
    process.env.OPENAI_API_KEY = previousApiKey;
  }
});
