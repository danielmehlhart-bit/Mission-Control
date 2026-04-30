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
  assert.equal(payload.profiles.length >= 4, true);
  assert.deepEqual(payload.profiles.map((profile: { slug: string }) => profile.slug).slice(0, 4), [
    "main",
    "sales_support",
    "luma",
    "fitness",
  ]);
  assert.deepEqual(Object.keys(payload.profiles[0]).sort(), ["color", "description", "icon", "id", "label", "slug", "status"]);
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
  assert.deepEqual(payload.turns, []);
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
