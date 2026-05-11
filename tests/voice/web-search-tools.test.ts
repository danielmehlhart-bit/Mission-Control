import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "mc-voice-web-search-"));
process.env.DB_PATH = path.join(tempRoot, "mission-control.db");
process.env.BRIEFINGS_DIR = path.join(tempRoot, "briefings");
process.env.MEMORY_DIR = tempRoot;
fs.mkdirSync(process.env.BRIEFINGS_DIR, { recursive: true });
fs.mkdirSync(path.join(process.env.MEMORY_DIR, "core"), { recursive: true });

async function loadModules() {
  const serviceModule = await import("../../lib/voice/service.ts");
  const toolsModule = await import("../../lib/voice/tools.ts");
  const sessionStoreModule = await import("../../lib/voice/session-store.ts");

  return { serviceModule, toolsModule, sessionStoreModule };
}

test("voice_web_search is exposed as a realtime tool and returns sourced web results", async () => {
  const previousApiKey = process.env.OPENAI_API_KEY;
  const previousModel = process.env.MC_VOICE_WEB_SEARCH_MODEL;
  process.env.OPENAI_API_KEY = "test-key";
  process.env.MC_VOICE_WEB_SEARCH_MODEL = "gpt-5.5";

  const originalFetch = globalThis.fetch;
  let capturedUrl = "";
  let capturedAuthorization = "";
  let capturedBody = "";
  globalThis.fetch = (async (url, init) => {
    capturedUrl = String(url);
    capturedAuthorization = String((init?.headers as Record<string, string>).Authorization);
    capturedBody = String(init?.body);
    return Response.json({
      output: [
        {
          type: "message",
          content: [
            {
              type: "output_text",
              text: "Die EZB hat den Leitzins unverändert gelassen.",
              annotations: [
                {
                  type: "url_citation",
                  url: "https://www.ecb.europa.eu/press/pr/date/2026/html/example.en.html",
                  title: "ECB monetary policy decisions",
                },
              ],
            },
          ],
        },
      ],
      sources: [
        {
          url: "https://www.reuters.com/markets/europe/example",
          title: "ECB keeps rates steady",
        },
      ],
    }, { status: 200 });
  }) as typeof fetch;

  try {
    const { serviceModule, toolsModule, sessionStoreModule } = await loadModules();
    const { createSessionForProfile } = serviceModule;
    const { VOICE_REALTIME_TOOLS, executeVoiceToolCall } = toolsModule;
    const { listVoiceSessionEvents } = sessionStoreModule;

    assert.equal(VOICE_REALTIME_TOOLS.some((tool) => tool.name === "voice_web_search"), true);

    const session = await createSessionForProfile({ profileSlug: "main", transport: "web", autoGreeting: false });
    const result = await executeVoiceToolCall({
      sessionId: session.id,
      toolName: "voice_web_search",
      callId: "call_web_1",
      arguments: {
        query: "Was hat die EZB heute entschieden?",
        searchContextSize: "low",
        allowedDomains: ["reuters.com", "ecb.europa.eu"],
      },
    });

    assert.equal(result.tool, "voice_web_search");
    assert.equal(result.answerable, true);
    assert.equal(result.sources.length, 2);
    assert.match(result.summary, /EZB/);
    assert.equal(capturedUrl, "https://api.openai.com/v1/responses");
    assert.equal(capturedAuthorization, "Bearer test-key");
    assert.match(capturedBody, /"type":"web_search"/);
    assert.match(capturedBody, /"search_context_size":"low"/);
    assert.match(capturedBody, /"allowed_domains":\["reuters.com","ecb.europa.eu"\]/);
    assert.equal(
      listVoiceSessionEvents(session.id).some((event) => event.eventType === "voice.web_search_completed"),
      true,
    );
  } finally {
    globalThis.fetch = originalFetch;
    if (previousApiKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previousApiKey;
    if (previousModel === undefined) delete process.env.MC_VOICE_WEB_SEARCH_MODEL;
    else process.env.MC_VOICE_WEB_SEARCH_MODEL = previousModel;
  }
});

test("voice_web_search fails safely without OPENAI_API_KEY", async () => {
  const previousApiKey = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;

  try {
    const { serviceModule, toolsModule } = await loadModules();
    const { createSessionForProfile } = serviceModule;
    const { executeVoiceToolCall } = toolsModule;
    const session = await createSessionForProfile({ profileSlug: "main", transport: "web", autoGreeting: false });

    await assert.rejects(
      executeVoiceToolCall({
        sessionId: session.id,
        toolName: "voice_web_search",
        arguments: { query: "aktuelle Nachrichten" },
      }),
      /OPENAI_API_KEY required/,
    );
  } finally {
    if (previousApiKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previousApiKey;
  }
});
