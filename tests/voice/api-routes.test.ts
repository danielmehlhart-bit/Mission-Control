import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as fsp from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "mc-voice-phase5-"));
process.env.DB_PATH = path.join(tempRoot, "mission-control.db");
process.env.BRIEFINGS_DIR = path.join(tempRoot, "briefings");
process.env.MEMORY_DIR = tempRoot;

async function loadModules() {
  const dbModule = await import("../../lib/db.ts");
  const sessionStoreModule = await import("../../lib/voice/session-store.ts");
  const hooksModule = await import("../../lib/voice/hooks.ts");
  const profilesRouteModule = await import("../../app/api/voice/profiles/route.ts");
  const sessionsRouteModule = await import("../../app/api/voice/sessions/route.ts");
  const sessionRouteModule = await import("../../app/api/voice/sessions/[id]/route.ts");
  const transcriptRouteModule = await import("../../app/api/voice/sessions/[id]/transcript/route.ts");
  const completeTurnRouteModule = await import("../../app/api/voice/sessions/[id]/complete-turn/route.ts");
  const contextSwitchRouteModule = await import("../../app/api/voice/sessions/[id]/context-switch/route.ts");
  const eventsRouteModule = await import("../../app/api/voice/sessions/[id]/events/route.ts");
  const muteRouteModule = await import("../../app/api/voice/sessions/[id]/mute/route.ts");
  const endRouteModule = await import("../../app/api/voice/sessions/[id]/end/route.ts");
  const telegramHandoffRouteModule = await import("../../app/api/voice/handoffs/telegram/route.ts");
  const telegramContextRouteModule = await import("../../app/api/voice/handoffs/telegram/context/route.ts");
  const toolsExecuteRouteModule = await import("../../app/api/voice/sessions/[id]/tools/execute/route.ts");
  const workOrdersRouteModule = await import("../../app/api/voice/sessions/[id]/work-orders/route.ts");
  const handoffRouteModule = await import("../../app/api/voice/sessions/[id]/handoff/route.ts");
  const memorySummaryRouteModule = await import("../../app/api/voice/sessions/[id]/memory-summary/route.ts");

  return {
    dbModule,
    sessionStoreModule,
    hooksModule,
    profilesRouteModule,
    sessionsRouteModule,
    sessionRouteModule,
    transcriptRouteModule,
    completeTurnRouteModule,
    contextSwitchRouteModule,
    eventsRouteModule,
    muteRouteModule,
    endRouteModule,
    telegramHandoffRouteModule,
    telegramContextRouteModule,
    toolsExecuteRouteModule,
    workOrdersRouteModule,
    handoffRouteModule,
    memorySummaryRouteModule,
  };
}

async function seedVoiceFixtures() {
  const { dbModule, sessionStoreModule } = await loadModules();
  const { getDb } = dbModule;
  const { getVoiceProfileBySlug, upsertVoiceProfileBinding } = sessionStoreModule;
  const db = getDb();

  await fsp.mkdir(process.env.BRIEFINGS_DIR!, { recursive: true });
  await fsp.mkdir(path.join(process.env.MEMORY_DIR!, "core"), { recursive: true });
  await fsp.writeFile(path.join(process.env.MEMORY_DIR!, "2026-04-29.md"), "# Voice Memory\nMission Control voice session.", "utf8");
  await fsp.writeFile(
    path.join(process.env.MEMORY_DIR!, "2026-05-05.md"),
    [
      "# 2026-05-05",
      "",
      "<!-- VOICE_CALL_MEMORY_V1 -->",
      "type: voice_call",
      "channel: luma",
      "channel_label: Call LUMA",
      "",
      "Daniel fragte, ob Microsoft Authentication Postmark ersetzen kann.",
      "Antwort-Kontext: Microsoft Auth ersetzt nicht automatisch Postmark fuer transaktionale E-Mails; Postmark bleibt fuer Versand und Zustellbarkeit relevant.",
      "",
      "Fitness-Notiz: Die letzte Ratawo wurde nicht eindeutig dokumentiert.",
    ].join("\n"),
    "utf8",
  );
  await fsp.writeFile(path.join(process.env.BRIEFINGS_DIR!, "2026-04-29-luma-voice.html"), "<html><body>LUMA voice briefing</body></html>", "utf8");

  db.prepare("INSERT OR REPLACE INTO accounts (id, name, domain, status, color, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))")
    .run("acc_luma", "LUMA GmbH", "luma-app.io", "active", "#10b981", "Important account");
  db.prepare("INSERT OR REPLACE INTO deals (id, account_id, title, value, stage, probability, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))")
    .run("deal_luma", "acc_luma", "LUMA Pilot", 12000, "proposal", 80, "Pilot deal");
  db.prepare("INSERT OR REPLACE INTO projects (id, name, client, status, description, repo, color, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))")
    .run("proj_luma", "LUMA", "LUMA GmbH", "active", "Voice project", "daniel/luma", "#10b981");
  db.prepare("INSERT OR REPLACE INTO people (id, name, company, email, project, account_id, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))")
    .run("person_luma", "Lisa Luma", "LUMA GmbH", "lisa@luma-app.io", "LUMA", "acc_luma");
  db.prepare("INSERT OR REPLACE INTO activities (id, type, title, summary, account_id, deal_id, project_id, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))")
    .run("act_luma_1", "call", "Kickoff", "Discussed onboarding", "acc_luma", "deal_luma", "proj_luma", JSON.stringify({ source: "seed" }));
  db.prepare("INSERT OR REPLACE INTO tasks (id, title, project, status, notes, created_at, done_at) VALUES (?, ?, ?, ?, ?, datetime('now'), NULL)")
    .run("task_luma_1", "Prepare onboarding", "LUMA", "todo", "Coordinate next steps");
  db.prepare("INSERT OR REPLACE INTO discovery_notes (id, account_id, title, call_date, contact_id, status, pain_kernpain, test_naechster_schritt, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))")
    .run("dn_luma_1", "acc_luma", "Discovery LUMA", "2026-04-28", "person_luma", "open", "Manual handoffs", "Pilot vorbereiten");
  db.prepare("INSERT OR REPLACE INTO account_notes (account_id, content, updated_at) VALUES (?, ?, datetime('now'))")
    .run("acc_luma", "{\"summary\":\"Account note for LUMA\"}");

  db.prepare("UPDATE voice_profiles SET status = 'active' WHERE slug IN ('main', 'sales_support', 'luma', 'fitness')").run();

  const salesProfile = getVoiceProfileBySlug("sales_support");
  const lumaProfile = getVoiceProfileBySlug("luma");
  assert.ok(salesProfile);
  assert.ok(lumaProfile);

  upsertVoiceProfileBinding({ profileId: salesProfile!.id, bindingType: "account", bindingValue: "acc_luma" });
  upsertVoiceProfileBinding({ profileId: salesProfile!.id, bindingType: "deal", bindingValue: "deal_luma" });
  upsertVoiceProfileBinding({ profileId: lumaProfile!.id, bindingType: "project", bindingValue: "proj_luma" });
  upsertVoiceProfileBinding({ profileId: lumaProfile!.id, bindingType: "account", bindingValue: "acc_luma" });
}

function makeRequest(url: string, init?: RequestInit): Request {
  return new Request(url, {
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
}

test("GET /api/voice/profiles returns active button-ready profiles ordered by sortOrder", async () => {
  await seedVoiceFixtures();
  const { profilesRouteModule } = await loadModules();

  const response = await profilesRouteModule.GET();
  assert.equal(response.status, 200);

  const payload = await response.json();
  assert.equal(Array.isArray(payload.profiles), true);
  assert.deepEqual(payload.profiles.map((profile: { slug: string }) => profile.slug), [
    "main",
    "sales_support",
    "luma",
  ]);
  assert.deepEqual(Object.keys(payload.profiles[0]).sort(), ["color", "description", "icon", "id", "label", "slug", "status", "telegramBinding"]);
  assert.equal(payload.profiles[0].telegramBinding.chatId, "485318478");
  assert.equal(payload.profiles[1].telegramBinding.chatId, "-1003998265477");
  assert.equal(payload.profiles[1].telegramBinding.threadId, "23");
  assert.equal(payload.profiles[2].telegramBinding.threadId, "24");
});

test("POST /api/voice/sessions validates transport and creates a hydrated session envelope with auto greeting", async () => {
  await seedVoiceFixtures();
  const { sessionsRouteModule, sessionStoreModule } = await loadModules();
  const { getVoiceProfileBySlug } = sessionStoreModule;
  const salesProfile = getVoiceProfileBySlug("sales_support");
  assert.ok(salesProfile);

  const invalidResponse = await sessionsRouteModule.POST(
    makeRequest("http://localhost/api/voice/sessions", {
      method: "POST",
      body: JSON.stringify({ profileId: salesProfile!.id, transport: "carrier-pigeon" }),
    }),
  );
  assert.equal(invalidResponse.status, 400);

  const response = await sessionsRouteModule.POST(
    makeRequest("http://localhost/api/voice/sessions", {
      method: "POST",
      body: JSON.stringify({ profileId: salesProfile!.id, transport: "web" }),
    }),
  );
  assert.equal(response.status, 201);

  const payload = await response.json();
  assert.equal(payload.session.state, "awaiting_user");
  assert.equal(payload.profile.slug, "sales_support");
  assert.equal(typeof payload.contextSummary, "string");
  assert.equal(payload.session.transport, "web");
  assert.equal(payload.turns[0]?.speaker, "assistant");
  assert.match(payload.turns[0]?.text ?? "", /was kann ich für dich tun|wobei ich helfen kann/i);
  assert.equal("baseSessionKey" in payload.profile, false);
  assert.equal("baseSessionKey" in payload.session, false);
  assert.equal("resolvedContext" in payload.session, false);
});

test("POST /api/voice/sessions allows disabling the auto greeting", async () => {
  await seedVoiceFixtures();
  const { sessionsRouteModule, sessionStoreModule } = await loadModules();
  const { getVoiceProfileBySlug } = sessionStoreModule;
  const salesProfile = getVoiceProfileBySlug("sales_support");
  assert.ok(salesProfile);

  const response = await sessionsRouteModule.POST(
    makeRequest("http://localhost/api/voice/sessions", {
      method: "POST",
      body: JSON.stringify({ profileId: salesProfile!.id, transport: "web", autoGreeting: false }),
    }),
  );

  assert.equal(response.status, 201);
  const payload = await response.json();
  assert.equal(payload.session.state, "ready");
  assert.equal(payload.session.isMuted, false);
  assert.deepEqual(payload.turns, []);
});

test("POST /api/voice/sessions/[id]/mute persists mute as an overlay flag", async () => {
  await seedVoiceFixtures();
  const { sessionsRouteModule, muteRouteModule, eventsRouteModule, sessionStoreModule } = await loadModules();
  const { getVoiceProfileBySlug } = sessionStoreModule;
  const mainProfile = getVoiceProfileBySlug("main");
  assert.ok(mainProfile);

  const createdResponse = await sessionsRouteModule.POST(
    makeRequest("http://localhost/api/voice/sessions", {
      method: "POST",
      body: JSON.stringify({ profileId: mainProfile!.id, transport: "web", autoGreeting: false }),
    }),
  );
  const created = await createdResponse.json();

  const muteResponse = await muteRouteModule.POST(
    makeRequest(`http://localhost/api/voice/sessions/${created.session.id}/mute`, {
      method: "POST",
      body: JSON.stringify({ isMuted: true }),
    }),
    { params: { id: created.session.id } },
  );

  assert.equal(muteResponse.status, 200);
  const mutePayload = await muteResponse.json();
  assert.equal(mutePayload.session.isMuted, true);
  assert.equal(mutePayload.session.state, "ready");

  const eventsResponse = await eventsRouteModule.GET(
    makeRequest(`http://localhost/api/voice/sessions/${created.session.id}/events`),
    { params: { id: created.session.id } },
  );
  const eventsPayload = await eventsResponse.json();
  assert.equal(eventsPayload.events.some((event: { eventType: string }) => event.eventType === "audio.mute_enabled"), true);
});

test("POST /api/voice/sessions/[id]/end completes the session for handoff preparation", async () => {
  await seedVoiceFixtures();
  const { sessionsRouteModule, endRouteModule, sessionStoreModule } = await loadModules();
  const { getVoiceProfileBySlug } = sessionStoreModule;
  const lumaProfile = getVoiceProfileBySlug("luma");
  assert.ok(lumaProfile);

  const createdResponse = await sessionsRouteModule.POST(
    makeRequest("http://localhost/api/voice/sessions", {
      method: "POST",
      body: JSON.stringify({ profileId: lumaProfile!.id, transport: "web", autoGreeting: false }),
    }),
  );
  const created = await createdResponse.json();

  const endResponse = await endRouteModule.POST(
    makeRequest(`http://localhost/api/voice/sessions/${created.session.id}/end`, {
      method: "POST",
      body: JSON.stringify({ reason: "test-end" }),
    }),
    { params: { id: created.session.id } },
  );

  assert.equal(endResponse.status, 200);
  const endPayload = await endResponse.json();
  assert.equal(endPayload.session.state, "completed");
  assert.ok(endPayload.session.endedAt);
});

test("POST /api/voice/sessions rejects inactive profiles", async () => {
  await seedVoiceFixtures();
  const { dbModule, sessionsRouteModule, sessionStoreModule } = await loadModules();
  const { getDb } = dbModule;
  const { getVoiceProfileBySlug } = sessionStoreModule;
  const salesProfile = getVoiceProfileBySlug("sales_support");
  assert.ok(salesProfile);

  getDb().prepare("UPDATE voice_profiles SET status = 'inactive' WHERE id = ?").run(salesProfile!.id);

  const response = await sessionsRouteModule.POST(
    makeRequest("http://localhost/api/voice/sessions", {
      method: "POST",
      body: JSON.stringify({ profileId: salesProfile!.id, transport: "web" }),
    }),
  );

  assert.equal(response.status, 400);
  const payload = await response.json();
  assert.match(payload.error, /inactive/i);
});

test("GET /api/voice/sessions/[id] returns session envelope with recent turns", async () => {
  await seedVoiceFixtures();
  const { sessionsRouteModule, sessionRouteModule, sessionStoreModule } = await loadModules();
  const { getVoiceProfileBySlug } = sessionStoreModule;
  const salesProfile = getVoiceProfileBySlug("sales_support");
  assert.ok(salesProfile);

  const createdResponse = await sessionsRouteModule.POST(
    makeRequest("http://localhost/api/voice/sessions", {
      method: "POST",
      body: JSON.stringify({ profileId: salesProfile!.id, transport: "web" }),
    }),
  );
  const created = await createdResponse.json();

  const response = await sessionRouteModule.GET(
    makeRequest(`http://localhost/api/voice/sessions/${created.session.id}`),
    { params: { id: created.session.id } },
  );

  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.session.id, created.session.id);
  assert.equal(payload.profile.slug, "sales_support");
  assert.equal(payload.turns.length >= 1, true);
  assert.equal(payload.turns[0]?.speaker, "assistant");
  assert.equal(typeof payload.contextSummary, "string");
  assert.equal("baseSessionKey" in payload.profile, false);
  assert.equal("baseSessionKey" in payload.session, false);
  assert.equal("resolvedContext" in payload.session, false);
});

test("POST /api/voice/sessions/[id]/transcript persists interim transcript and emits transcript_received", async () => {
  await seedVoiceFixtures();
  const { sessionsRouteModule, transcriptRouteModule, sessionStoreModule } = await loadModules();
  const { listVoiceSessionEvents, getVoiceProfileBySlug } = sessionStoreModule;
  const salesProfile = getVoiceProfileBySlug("sales_support");
  assert.ok(salesProfile);

  const createdResponse = await sessionsRouteModule.POST(
    makeRequest("http://localhost/api/voice/sessions", {
      method: "POST",
      body: JSON.stringify({ profileId: salesProfile!.id, transport: "web" }),
    }),
  );
  const created = await createdResponse.json();

  const response = await transcriptRouteModule.POST(
    makeRequest(`http://localhost/api/voice/sessions/${created.session.id}/transcript`, {
      method: "POST",
      body: JSON.stringify({ text: "LUMA Status bitte", isFinal: false, metadata: { provider: "test" } }),
    }),
    { params: { id: created.session.id } },
  );

  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.session.lastUserTranscript, "LUMA Status bitte");
  assert.equal(payload.committedTurn, null);
  assert.equal(listVoiceSessionEvents(created.session.id).some((event: { eventType: string }) => event.eventType === "voice.transcript_received"), true);
});

test("POST /api/voice/sessions/[id]/complete-turn stores user+assistant turns and returns awaiting_user state", async () => {
  await seedVoiceFixtures();
  const { sessionsRouteModule, completeTurnRouteModule, sessionStoreModule } = await loadModules();
  const { getVoiceProfileBySlug } = sessionStoreModule;
  const salesProfile = getVoiceProfileBySlug("sales_support");
  assert.ok(salesProfile);

  const createdResponse = await sessionsRouteModule.POST(
    makeRequest("http://localhost/api/voice/sessions", {
      method: "POST",
      body: JSON.stringify({ profileId: salesProfile!.id, transport: "web" }),
    }),
  );
  const created = await createdResponse.json();

  const response = await completeTurnRouteModule.POST(
    makeRequest(`http://localhost/api/voice/sessions/${created.session.id}/complete-turn`, {
      method: "POST",
      body: JSON.stringify({ userText: "Was ist der Stand bei LUMA?" }),
    }),
    { params: { id: created.session.id } },
  );

  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.session.state, "awaiting_user");
  assert.equal(payload.userTurn.text, "Was ist der Stand bei LUMA?");
  assert.equal(payload.assistantTurn.speaker, "assistant");
  assert.equal(typeof payload.assistantText, "string");
  assert.equal("baseSessionKey" in payload.session, false);
  assert.equal("resolvedContext" in payload.session, false);
});

test("POST /api/voice/sessions/[id]/context-switch sanitizes unexpected internal errors", async () => {
  await seedVoiceFixtures();
  const { hooksModule, sessionsRouteModule, sessionRouteModule, contextSwitchRouteModule, eventsRouteModule, sessionStoreModule } = await loadModules();
  const { getVoiceProfileBySlug } = sessionStoreModule;
  const { clearVoiceHookRegistry, registerVoiceHook } = hooksModule;
  const salesProfile = getVoiceProfileBySlug("sales_support");
  assert.ok(salesProfile);

  clearVoiceHookRegistry();
  registerVoiceHook("afterContextSwitch", {
    id: "test.afterContextSwitch.fail-route",
    criticality: "required",
    run: async () => {
      throw new Error("super secret provider detail");
    },
  });

  const createdResponse = await sessionsRouteModule.POST(
    makeRequest("http://localhost/api/voice/sessions", {
      method: "POST",
      body: JSON.stringify({ profileId: salesProfile!.id, transport: "web" }),
    }),
  );
  const created = await createdResponse.json();

  const response = await contextSwitchRouteModule.POST(
    makeRequest(`http://localhost/api/voice/sessions/${created.session.id}/context-switch`, {
      method: "POST",
      body: JSON.stringify({ targetProfileSlug: "luma", reason: "user_request" }),
    }),
    { params: { id: created.session.id } },
  );

  assert.equal(response.status, 500);
  const payload = await response.json();
  assert.equal(payload.error, "Internal voice API error");

  const sessionResponse = await sessionRouteModule.GET(
    makeRequest(`http://localhost/api/voice/sessions/${created.session.id}`),
    { params: { id: created.session.id } },
  );
  assert.equal(sessionResponse.status, 200);
  const sessionPayload = await sessionResponse.json();
  assert.equal(sessionPayload.session.lastError, "Internal voice error");

  const eventsResponse = await eventsRouteModule.GET(
    makeRequest(`http://localhost/api/voice/sessions/${created.session.id}/events`),
    { params: { id: created.session.id } },
  );
  assert.equal(eventsResponse.status, 200);
  const eventsPayload = await eventsResponse.json();
  const failureEvent = eventsPayload.events.find(
    (event: { eventType: string; payload?: { message?: string } }) => event.eventType === "voice.hook_failed",
  );
  assert.ok(failureEvent);
  assert.equal(failureEvent.payload?.message, "Internal voice error");
  assert.equal(JSON.stringify(eventsPayload.events).includes("super secret provider detail"), false);
  clearVoiceHookRegistry();
});

test("POST /api/voice/sessions/[id]/context-switch and GET /events expose updated profile and chronological trace", async () => {
  await seedVoiceFixtures();
  const { sessionsRouteModule, contextSwitchRouteModule, eventsRouteModule, sessionStoreModule } = await loadModules();
  const { getVoiceProfileBySlug } = sessionStoreModule;
  const salesProfile = getVoiceProfileBySlug("sales_support");
  assert.ok(salesProfile);

  const createdResponse = await sessionsRouteModule.POST(
    makeRequest("http://localhost/api/voice/sessions", {
      method: "POST",
      body: JSON.stringify({ profileId: salesProfile!.id, transport: "web" }),
    }),
  );
  const created = await createdResponse.json();

  const switchResponse = await contextSwitchRouteModule.POST(
    makeRequest(`http://localhost/api/voice/sessions/${created.session.id}/context-switch`, {
      method: "POST",
      body: JSON.stringify({ targetProfileSlug: "luma", reason: "user_request" }),
    }),
    { params: { id: created.session.id } },
  );

  assert.equal(switchResponse.status, 200);
  const switchPayload = await switchResponse.json();
  assert.equal(switchPayload.profile.slug, "luma");
  assert.equal(switchPayload.session.state, "awaiting_user");
  assert.equal(switchPayload.systemTurn.speaker, "system");
  assert.equal(switchPayload.reason, "user_request");
  assert.equal("baseSessionKey" in switchPayload.session, false);
  assert.equal("resolvedContext" in switchPayload.session, false);

  const eventsResponse = await eventsRouteModule.GET(
    makeRequest(`http://localhost/api/voice/sessions/${created.session.id}/events`),
    { params: { id: created.session.id } },
  );
  assert.equal(eventsResponse.status, 200);

  const eventsPayload = await eventsResponse.json();
  assert.equal(Array.isArray(eventsPayload.events), true);
  assert.equal(eventsPayload.events.some((event: { eventType: string }) => event.eventType === "voice.context_switch_applied"), true);
  assert.equal(
    eventsPayload.events.some(
      (event: { eventType: string; payload?: { reason?: string } }) =>
        event.eventType === "voice.context_switch_requested" && event.payload?.reason === "user_request",
    ),
    true,
  );
  assert.equal(eventsPayload.events[0].eventType, "voice.state_changed");
});

test("POST /api/voice/sessions/[id]/context-switch rejects inactive target profiles", async () => {
  await seedVoiceFixtures();
  const { dbModule, sessionsRouteModule, contextSwitchRouteModule, sessionStoreModule } = await loadModules();
  const { getDb } = dbModule;
  const { getVoiceProfileBySlug } = sessionStoreModule;
  const salesProfile = getVoiceProfileBySlug("sales_support");
  assert.ok(salesProfile);

  const createdResponse = await sessionsRouteModule.POST(
    makeRequest("http://localhost/api/voice/sessions", {
      method: "POST",
      body: JSON.stringify({ profileId: salesProfile!.id, transport: "web" }),
    }),
  );
  const created = await createdResponse.json();

  getDb().prepare("UPDATE voice_profiles SET status = 'inactive' WHERE slug = ?").run("luma");

  const switchResponse = await contextSwitchRouteModule.POST(
    makeRequest(`http://localhost/api/voice/sessions/${created.session.id}/context-switch`, {
      method: "POST",
      body: JSON.stringify({ targetProfileSlug: "luma", reason: "user_request" }),
    }),
    { params: { id: created.session.id } },
  );

  assert.equal(switchResponse.status, 400);
  const payload = await switchResponse.json();
  assert.equal(payload.error, "Voice profile inactive: luma");
});

test("POST /api/voice/handoffs/telegram creates a hydrated session and persists bridge routing", async () => {
  await seedVoiceFixtures();
  const { telegramHandoffRouteModule, dbModule } = await loadModules();
  const { getDb } = dbModule;

  const response = await telegramHandoffRouteModule.POST(
    makeRequest("http://localhost/api/voice/handoffs/telegram", {
      method: "POST",
      body: JSON.stringify({
        telegramChatId: "-100123",
        telegramThreadId: "23",
        profileSlug: "luma",
        projectId: "proj_luma",
        accountId: "acc_luma",
        metadata: { origin: "telegram-test" },
      }),
    }),
  );

  assert.equal(response.status, 201);
  const payload = await response.json();
  assert.equal(payload.profile.slug, "luma");
  assert.equal(payload.session.transport, "web");
  assert.equal(payload.session.state, "awaiting_user");
  assert.equal(payload.handoff.source, "telegram");
  assert.equal(payload.handoff.telegramChatId, "-100123");
  assert.equal(payload.handoff.telegramThreadId, "23");
  assert.equal(payload.handoff.matchedExistingBridge, false);
  assert.equal(payload.turns[0]?.speaker, "assistant");

  const bridge = getDb().prepare(
    "SELECT * FROM voice_telegram_bridges WHERE telegram_chat_id = ? AND telegram_thread_id = ?",
  ).get("-100123", "23") as { profile_slug: string; project_id: string | null; account_id: string | null; metadata_json: string } | undefined;
  assert.ok(bridge);
  assert.equal(bridge?.profile_slug, "luma");
  assert.equal(bridge?.project_id, "proj_luma");
  assert.equal(bridge?.account_id, "acc_luma");
  assert.equal(JSON.parse(bridge?.metadata_json ?? "{}").origin, "telegram-test");
});

test("POST /api/voice/handoffs/telegram reuses a stored bridge when only chat/thread is provided", async () => {
  await seedVoiceFixtures();
  const { telegramHandoffRouteModule, dbModule } = await loadModules();
  const { getDb } = dbModule;

  getDb().prepare(
    `INSERT INTO voice_telegram_bridges (
      id, telegram_chat_id, telegram_thread_id, profile_slug, label, account_id, deal_id, project_id, project_slug, metadata_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
  ).run("vtb_seed", "-100999", "42", "sales_support", "Sales Topic", "acc_luma", "deal_luma", null, null, JSON.stringify({ seeded: true }));

  const response = await telegramHandoffRouteModule.POST(
    makeRequest("http://localhost/api/voice/handoffs/telegram", {
      method: "POST",
      body: JSON.stringify({
        telegramChatId: "-100999",
        telegramThreadId: "42",
        autoGreeting: false,
      }),
    }),
  );

  assert.equal(response.status, 201);
  const payload = await response.json();
  assert.equal(payload.profile.slug, "sales_support");
  assert.equal(payload.session.state, "ready");
  assert.equal(payload.handoff.matchedExistingBridge, true);
  assert.equal(payload.handoff.bridgeId, "vtb_seed");
  assert.deepEqual(payload.turns, []);
});

test("POST /api/voice/handoffs/telegram/context stores recent chat context for voice search", async () => {
  await seedVoiceFixtures();
  const { telegramContextRouteModule, sessionsRouteModule, toolsExecuteRouteModule, sessionStoreModule } = await loadModules();
  const { getVoiceProfileBySlug } = sessionStoreModule;

  const contextResponse = await telegramContextRouteModule.POST(
    makeRequest("http://localhost/api/voice/handoffs/telegram/context", {
      method: "POST",
      body: JSON.stringify({
        telegramChatId: "-100az",
        profileSlug: "sales_support",
        label: "A bis Z Architekten",
        summary: "In den letzten 30 Minuten ging es um den Kunden A bis Z Architekten, Sales Support, naechste Schritte und Einordnung des Kundenkontexts.",
        messages: [
          { author: "Daniel", text: "Wir sprechen gerade ueber A bis Z Architekten." },
          { author: "Hermes", text: "Sales-Kontext: A bis Z Architekten ist der konkrete Kunde." },
        ],
      }),
    }),
  );
  assert.equal(contextResponse.status, 201);

  const salesProfile = getVoiceProfileBySlug("sales_support");
  assert.ok(salesProfile);
  const createdResponse = await sessionsRouteModule.POST(
    makeRequest("http://localhost/api/voice/sessions", {
      method: "POST",
      body: JSON.stringify({ profileId: salesProfile!.id, transport: "web", autoGreeting: false }),
    }),
  );
  const created = await createdResponse.json();

  const searchResponse = await toolsExecuteRouteModule.POST(
    makeRequest(`http://localhost/api/voice/sessions/${created.session.id}/tools/execute`, {
      method: "POST",
      body: JSON.stringify({
        toolName: "hermes_memory_search",
        arguments: {
          query: "Was haben wir gerade eben in der letzten halben Stunde im Chat besprochen?",
          channel: "sales_support",
          timeRange: "today",
        },
      }),
    }),
    { params: { id: created.session.id } },
  );

  assert.equal(searchResponse.status, 200);
  const payload = await searchResponse.json();
  assert.equal(payload.result.answerable, true);
  assert.equal(payload.result.sources[0].category, "telegram_recent");
  assert.match(payload.output, /A bis Z Architekten/);
});

test("POST /api/voice/sessions/[id]/tools/execute searches memories with sources", async () => {
  await seedVoiceFixtures();
  const { sessionsRouteModule, toolsExecuteRouteModule, sessionStoreModule } = await loadModules();
  const { getVoiceProfileBySlug, listVoiceSessionEvents } = sessionStoreModule;
  const lumaProfile = getVoiceProfileBySlug("luma");
  assert.ok(lumaProfile);

  const createdResponse = await sessionsRouteModule.POST(
    makeRequest("http://localhost/api/voice/sessions", {
      method: "POST",
      body: JSON.stringify({ profileId: lumaProfile!.id, transport: "web", autoGreeting: false }),
    }),
  );
  const created = await createdResponse.json();

  const response = await toolsExecuteRouteModule.POST(
    makeRequest(`http://localhost/api/voice/sessions/${created.session.id}/tools/execute`, {
      method: "POST",
      body: JSON.stringify({
        toolName: "hermes_memory_search",
        callId: "call_test",
        arguments: JSON.stringify({
          query: "Microsoft Auth Postmark",
          channel: "luma",
          timeRange: "all",
        }),
      }),
    }),
    { params: { id: created.session.id } },
  );

  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.toolName, "hermes_memory_search");
  assert.equal(payload.callId, "call_test");
  assert.equal(payload.result.answerable, true);
  assert.equal(payload.result.sources[0].path, "mem:2026-05-05.md");
  assert.match(payload.output, /Postmark/);
  assert.equal(
    listVoiceSessionEvents(created.session.id).some((event: { eventType: string }) => event.eventType === "voice.tool_call_completed"),
    true,
  );
});

test("POST and GET /api/voice/sessions/[id]/work-orders persist safe work order summaries", async () => {
  await seedVoiceFixtures();
  const { sessionsRouteModule, workOrdersRouteModule, eventsRouteModule, sessionStoreModule } = await loadModules();
  const { getVoiceProfileBySlug } = sessionStoreModule;
  const lumaProfile = getVoiceProfileBySlug("luma");
  assert.ok(lumaProfile);

  const createdResponse = await sessionsRouteModule.POST(
    makeRequest("http://localhost/api/voice/sessions", {
      method: "POST",
      body: JSON.stringify({ profileId: lumaProfile!.id, transport: "web", autoGreeting: false }),
    }),
  );
  const created = await createdResponse.json();

  const createResponse = await workOrdersRouteModule.POST(
    makeRequest(`http://localhost/api/voice/sessions/${created.session.id}/work-orders`, {
      method: "POST",
      body: JSON.stringify({
        title: "LUMA Review-Dokument",
        goal: "Erstelle spaeter ein Review-Dokument aus dem Voice-Kontext.",
        requestedOutput: "review_document",
        priority: "normal",
        sourceUserText: "Mach mir daraus bitte ein Review-Dokument.",
      }),
    }),
    { params: { id: created.session.id } },
  );

  assert.equal(createResponse.status, 201);
  const createPayload = await createResponse.json();
  assert.equal(createPayload.workOrder.title, "LUMA Review-Dokument");
  assert.equal(createPayload.workOrder.status, "created");
  assert.equal(createPayload.workOrder.requestedOutput, "review_document");
  assert.equal("context" in createPayload.workOrder, false);
  assert.equal("result" in createPayload.workOrder, false);
  assert.equal(JSON.stringify(createPayload).includes("baseSessionKey"), false);
  assert.equal(JSON.stringify(createPayload).includes("resolvedContext"), false);

  const listResponse = await workOrdersRouteModule.GET(
    makeRequest(`http://localhost/api/voice/sessions/${created.session.id}/work-orders`),
    { params: { id: created.session.id } },
  );
  assert.equal(listResponse.status, 200);
  const listPayload = await listResponse.json();
  assert.equal(listPayload.workOrders.length, 1);
  assert.equal(listPayload.workOrders[0].id, createPayload.workOrder.id);
  assert.equal(JSON.stringify(listPayload).includes("baseSessionKey"), false);
  assert.equal(JSON.stringify(listPayload).includes("resolvedContext"), false);

  const eventsResponse = await eventsRouteModule.GET(
    makeRequest(`http://localhost/api/voice/sessions/${created.session.id}/events`),
    { params: { id: created.session.id } },
  );
  const eventsPayload = await eventsResponse.json();
  assert.equal(eventsPayload.events.some((event: { eventType: string }) => event.eventType === "voice.work_order_created"), true);
});

test("voice_create_work_order tool creates a persisted work order and does not claim final output", async () => {
  await seedVoiceFixtures();
  const { sessionsRouteModule, toolsExecuteRouteModule, eventsRouteModule, sessionStoreModule } = await loadModules();
  const { getVoiceProfileBySlug } = sessionStoreModule;
  const lumaProfile = getVoiceProfileBySlug("luma");
  assert.ok(lumaProfile);

  const createdResponse = await sessionsRouteModule.POST(
    makeRequest("http://localhost/api/voice/sessions", {
      method: "POST",
      body: JSON.stringify({ profileId: lumaProfile!.id, transport: "web", autoGreeting: false }),
    }),
  );
  const created = await createdResponse.json();

  const response = await toolsExecuteRouteModule.POST(
    makeRequest(`http://localhost/api/voice/sessions/${created.session.id}/tools/execute`, {
      method: "POST",
      body: JSON.stringify({
        toolName: "voice_create_work_order",
        callId: "call_work_order",
        arguments: JSON.stringify({
          title: "Follow-up Paket",
          goal: "Bereite spaeter ein Follow-up-Paket fuer LUMA vor.",
          requestedOutput: "telegram_draft",
          priority: "high",
          sourceUserText: "Bereite das als Telegram-Entwurf vor.",
        }),
      }),
    }),
    { params: { id: created.session.id } },
  );

  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.toolName, "voice_create_work_order");
  assert.equal(payload.callId, "call_work_order");
  assert.equal(payload.result.created, true);
  assert.equal(payload.result.status, "created");
  assert.equal(payload.result.requestedOutput, "telegram_draft");
  assert.match(payload.result.message, /noch kein finales Dokument/i);
  assert.match(payload.output, /Work Order angelegt/);

  const eventsResponse = await eventsRouteModule.GET(
    makeRequest(`http://localhost/api/voice/sessions/${created.session.id}/events`),
    { params: { id: created.session.id } },
  );
  const eventsPayload = await eventsResponse.json();
  assert.equal(eventsPayload.events.some((event: { eventType: string }) => event.eventType === "voice.work_order_created"), true);
  assert.equal(eventsPayload.events.some((event: { eventType: string }) => event.eventType === "voice.tool_call_completed"), true);
});

test("POST and GET /api/voice/sessions/[id]/handoff prepare a structured safe handoff", async () => {
  await seedVoiceFixtures();
  const { sessionsRouteModule, workOrdersRouteModule, handoffRouteModule, eventsRouteModule, sessionStoreModule } = await loadModules();
  const { getVoiceProfileBySlug } = sessionStoreModule;
  const lumaProfile = getVoiceProfileBySlug("luma");
  assert.ok(lumaProfile);

  const createdResponse = await sessionsRouteModule.POST(
    makeRequest("http://localhost/api/voice/sessions", {
      method: "POST",
      body: JSON.stringify({ profileId: lumaProfile!.id, transport: "web", autoGreeting: false }),
    }),
  );
  const created = await createdResponse.json();

  const workOrderResponse = await workOrdersRouteModule.POST(
    makeRequest(`http://localhost/api/voice/sessions/${created.session.id}/work-orders`, {
      method: "POST",
      body: JSON.stringify({
        title: "LUMA Review",
        goal: "Review-Unterlage fuer spaetere Ausarbeitung vorbereiten.",
        requestedOutput: "review_document",
      }),
    }),
    { params: { id: created.session.id } },
  );
  const workOrderPayload = await workOrderResponse.json();

  const createResponse = await handoffRouteModule.POST(
    makeRequest(`http://localhost/api/voice/sessions/${created.session.id}/handoff`, {
      method: "POST",
      body: JSON.stringify({
        memoryPath: "mem:2026-05-08-luma-call.md",
        summary: "### Kurzfassung\nDaniel will ein belastbares LUMA Review mit spaeterem Telegram-Handoff.\n### Details\nMehr Text.",
      }),
    }),
    { params: { id: created.session.id } },
  );

  assert.equal(createResponse.status, 201);
  const createPayload = await createResponse.json();
  assert.equal(createPayload.handoff.status, "prepared");
  assert.equal(createPayload.handoff.memoryPath, "mem:2026-05-08-luma-call.md");
  assert.equal(createPayload.handoff.telegramTarget.chatId, "-1003998265477");
  assert.equal(createPayload.handoff.telegramTarget.threadId, "24");
  assert.equal(createPayload.handoff.telegramSendStatus, "not_supported");
  assert.deepEqual(createPayload.handoff.workOrderIds, [workOrderPayload.workOrder.id]);
  assert.match(createPayload.handoff.summary, /Daniel will ein belastbares LUMA Review/);
  assert.equal(JSON.stringify(createPayload).includes("payload"), false);
  assert.equal(JSON.stringify(createPayload).includes("baseSessionKey"), false);
  assert.equal(JSON.stringify(createPayload).includes("resolvedContext"), false);

  const getResponse = await handoffRouteModule.GET(
    makeRequest(`http://localhost/api/voice/sessions/${created.session.id}/handoff`),
    { params: { id: created.session.id } },
  );
  const getPayload = await getResponse.json();
  assert.equal(getPayload.handoff.id, createPayload.handoff.id);

  const eventsResponse = await eventsRouteModule.GET(
    makeRequest(`http://localhost/api/voice/sessions/${created.session.id}/events`),
    { params: { id: created.session.id } },
  );
  const eventsPayload = await eventsResponse.json();
  assert.equal(eventsPayload.events.some((event: { eventType: string }) => event.eventType === "voice.handoff_prepared"), true);
  assert.equal(eventsPayload.events.some((event: { eventType: string }) => event.eventType === "voice.telegram_handoff_sent"), false);
  assert.equal(eventsPayload.events.some((event: { eventType: string }) => event.eventType === "voice.telegram_handoff_failed"), false);
});

test("POST /api/voice/sessions/[id]/memory-summary prepares and exposes a persisted handoff", async () => {
  await seedVoiceFixtures();
  const { sessionsRouteModule, memorySummaryRouteModule, handoffRouteModule, sessionStoreModule } = await loadModules();
  const { getVoiceProfileBySlug } = sessionStoreModule;
  const lumaProfile = getVoiceProfileBySlug("luma");
  assert.ok(lumaProfile);

  const createdResponse = await sessionsRouteModule.POST(
    makeRequest("http://localhost/api/voice/sessions", {
      method: "POST",
      body: JSON.stringify({ profileId: lumaProfile!.id, transport: "web", autoGreeting: false }),
    }),
  );
  const created = await createdResponse.json();

  const summaryResponse = await memorySummaryRouteModule.POST(
    makeRequest(`http://localhost/api/voice/sessions/${created.session.id}/memory-summary`, {
      method: "POST",
      body: JSON.stringify({ reason: "voice-ended" }),
    }),
    { params: { id: created.session.id } },
  );

  assert.equal(summaryResponse.status, 200);
  const summaryPayload = await summaryResponse.json();
  assert.match(summaryPayload.memoryPath, /^mem:/);
  assert.equal(summaryPayload.handoff.status, "prepared");
  assert.equal(summaryPayload.handoff.memoryPath, summaryPayload.memoryPath);

  const handoffResponse = await handoffRouteModule.GET(
    makeRequest(`http://localhost/api/voice/sessions/${created.session.id}/handoff`),
    { params: { id: created.session.id } },
  );
  const handoffPayload = await handoffResponse.json();
  assert.equal(handoffPayload.handoff.id, summaryPayload.handoff.id);
});

test("POST /api/voice/sessions/[id]/tools/execute returns not found without inventing", async () => {
  await seedVoiceFixtures();
  const { sessionsRouteModule, toolsExecuteRouteModule, sessionStoreModule } = await loadModules();
  const { getVoiceProfileBySlug } = sessionStoreModule;
  const mainProfile = getVoiceProfileBySlug("main");
  assert.ok(mainProfile);

  const createdResponse = await sessionsRouteModule.POST(
    makeRequest("http://localhost/api/voice/sessions", {
      method: "POST",
      body: JSON.stringify({ profileId: mainProfile!.id, transport: "web", autoGreeting: false }),
    }),
  );
  const created = await createdResponse.json();

  const response = await toolsExecuteRouteModule.POST(
    makeRequest(`http://localhost/api/voice/sessions/${created.session.id}/tools/execute`, {
      method: "POST",
      body: JSON.stringify({
        toolName: "hermes_memory_search",
        arguments: {
          query: "phantom marathon wattage protocol",
          channel: "main",
          timeRange: "all",
        },
      }),
    }),
    { params: { id: created.session.id } },
  );

  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.result.answerable, false);
  assert.deepEqual(payload.result.sources, []);
  assert.match(payload.result.summary, /keine belastbare Quelle/i);
});

test("POST /api/voice/sessions/[id]/tools/execute does not treat generic fresh chat wording as evidence", async () => {
  await seedVoiceFixtures();
  const { sessionsRouteModule, toolsExecuteRouteModule, sessionStoreModule } = await loadModules();
  const { getVoiceProfileBySlug } = sessionStoreModule;
  const mainProfile = getVoiceProfileBySlug("main");
  assert.ok(mainProfile);

  const createdResponse = await sessionsRouteModule.POST(
    makeRequest("http://localhost/api/voice/sessions", {
      method: "POST",
      body: JSON.stringify({ profileId: mainProfile!.id, transport: "web", autoGreeting: false }),
    }),
  );
  const created = await createdResponse.json();

  const response = await toolsExecuteRouteModule.POST(
    makeRequest(`http://localhost/api/voice/sessions/${created.session.id}/tools/execute`, {
      method: "POST",
      body: JSON.stringify({
        toolName: "hermes_memory_search",
        arguments: {
          query: "Was haben wir in den letzten zwei Stunden im Chat besprochen?",
          channel: "main",
          timeRange: "today",
        },
      }),
    }),
    { params: { id: created.session.id } },
  );

  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.result.answerable, false);
  assert.deepEqual(payload.result.sources, []);
  assert.match(payload.result.summary, /Live-Chat-History/i);
});
