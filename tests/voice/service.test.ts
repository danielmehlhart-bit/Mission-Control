import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as fsp from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "mc-voice-phase4-"));
process.env.DB_PATH = path.join(tempRoot, "mission-control.db");
process.env.BRIEFINGS_DIR = path.join(tempRoot, "briefings");
process.env.MEMORY_DIR = tempRoot;

async function loadModules() {
  const dbModule = await import("../../lib/db.ts");
  const sessionStoreModule = await import("../../lib/voice/session-store.ts");
  const serviceModule = await import("../../lib/voice/service.ts");
  const hooksModule = await import("../../lib/voice/hooks.ts");

  return {
    dbModule,
    sessionStoreModule,
    serviceModule,
    hooksModule,
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

  const salesProfile = getVoiceProfileBySlug("sales_support");
  const lumaProfile = getVoiceProfileBySlug("luma");
  assert.ok(salesProfile);
  assert.ok(lumaProfile);

  upsertVoiceProfileBinding({ profileId: salesProfile!.id, bindingType: "account", bindingValue: "acc_luma" });
  upsertVoiceProfileBinding({ profileId: salesProfile!.id, bindingType: "deal", bindingValue: "deal_luma" });
  upsertVoiceProfileBinding({ profileId: lumaProfile!.id, bindingType: "project", bindingValue: "proj_luma" });
  upsertVoiceProfileBinding({ profileId: lumaProfile!.id, bindingType: "account", bindingValue: "acc_luma" });
}

test("createSessionForProfile creates, hydrates, and readies a new voice session", async () => {
  await seedVoiceFixtures();
  const { serviceModule, sessionStoreModule, hooksModule } = await loadModules();
  const { createSessionForProfile } = serviceModule;
  const { listVoiceSessionEvents } = sessionStoreModule;
  const { clearVoiceHookRegistry, registerVoiceHook } = hooksModule;

  clearVoiceHookRegistry();
  registerVoiceHook("afterHydration", {
    id: "test.afterHydration",
    criticality: "required",
    run: async () => ({ resolvedContext: { hookStamp: "after-hydration" } }),
  });

  const session = await createSessionForProfile({
    profileSlug: "sales_support",
    transport: "web",
    calendarProvider: async () => [
      {
        id: "evt_sales_1",
        summary: "Sales Support Call",
        start: "2026-04-30T10:00:00.000Z",
        end: "2026-04-30T10:30:00.000Z",
        attendees: ["lisa@luma-app.io"],
      },
    ],
  });

  assert.equal(session.state, "ready");
  assert.equal((session.resolvedContext as Record<string, unknown>).hookStamp, "after-hydration");
  assert.equal(((session.resolvedContext as Record<string, unknown>).profile as Record<string, unknown>).slug, "sales_support");

  const events = listVoiceSessionEvents(session.id);
  assert.equal(events.some((event) => event.eventType === "voice.session_created"), true);
  assert.equal(events.some((event) => event.eventType === "voice.hydration_started"), true);
  assert.equal(events.some((event) => event.eventType === "voice.hydration_completed"), true);
  assert.equal(events.some((event) => event.eventType === "voice.state_changed" && event.toState === "hydrating_context"), true);
  assert.equal(events.some((event) => event.eventType === "voice.state_changed" && event.toState === "ready"), true);
});

test("commitUserTurn stores transcript and emits user-turn event", async () => {
  await seedVoiceFixtures();
  const { serviceModule, sessionStoreModule, hooksModule } = await loadModules();
  const { createSessionForProfile, commitUserTurn } = serviceModule;
  const { getVoiceSession, listVoiceSessionEvents, listVoiceTurns } = sessionStoreModule;
  const { clearVoiceHookRegistry } = hooksModule;

  clearVoiceHookRegistry();
  const session = await createSessionForProfile({ profileSlug: "sales_support", calendarProvider: async () => [] });
  const result = await commitUserTurn({ sessionId: session.id, text: "Was ist der Stand bei LUMA?", source: "transcript-final" });

  assert.equal(result.turn.speaker, "user");
  assert.equal(result.turn.text, "Was ist der Stand bei LUMA?");
  assert.equal(result.session.lastUserTranscript, "Was ist der Stand bei LUMA?");

  const persisted = getVoiceSession(session.id);
  assert.equal(persisted?.lastUserTranscript, "Was ist der Stand bei LUMA?");
  assert.equal(listVoiceTurns(session.id).filter((turn) => turn.speaker === "user").length, 1);
  assert.equal(listVoiceSessionEvents(session.id).some((event) => event.eventType === "voice.user_turn_committed"), true);
});

test("commitUserTurn rejects empty or whitespace-only user text", async () => {
  await seedVoiceFixtures();
  const { serviceModule, sessionStoreModule, hooksModule } = await loadModules();
  const { createSessionForProfile, commitUserTurn } = serviceModule;
  const { getVoiceSession, listVoiceTurns } = sessionStoreModule;
  const { clearVoiceHookRegistry } = hooksModule;

  clearVoiceHookRegistry();
  const session = await createSessionForProfile({ profileSlug: "sales_support", calendarProvider: async () => [] });

  await assert.rejects(
    commitUserTurn({ sessionId: session.id, text: "   \n  " }),
    /User turn text must not be empty/,
  );

  assert.equal(getVoiceSession(session.id)?.lastUserTranscript, undefined);
  assert.equal(listVoiceTurns(session.id).length, 0);
});

test("generateAssistantTurn transitions through thinking and stores assistant output", async () => {
  await seedVoiceFixtures();
  const { serviceModule, sessionStoreModule, hooksModule } = await loadModules();
  const { createSessionForProfile, commitUserTurn, generateAssistantTurn } = serviceModule;
  const { getVoiceSession, listVoiceSessionEvents, listVoiceTurns } = sessionStoreModule;
  const { clearVoiceHookRegistry } = hooksModule;

  clearVoiceHookRegistry();
  const session = await createSessionForProfile({ profileSlug: "sales_support", calendarProvider: async () => [] });
  await commitUserTurn({ sessionId: session.id, text: "Bitte gib mir ein Update." });

  const result = await generateAssistantTurn({
    sessionId: session.id,
    generateReply: async ({ session, recentTurns }) => ({
      text: `Antwort für ${session.id} mit ${recentTurns.length} Turns`,
      metadata: { provider: "test-stub" },
    }),
  });

  assert.equal(result.session.state, "awaiting_user");
  assert.equal(result.turn.speaker, "assistant");
  assert.equal(result.turn.metadata.provider, "test-stub");
  assert.equal(result.session.lastAssistantText?.includes("Antwort für"), true);
  assert.equal(getVoiceSession(session.id)?.state, "awaiting_user");
  assert.equal(listVoiceTurns(session.id).filter((turn) => turn.speaker === "assistant").length, 1);

  const events = listVoiceSessionEvents(session.id);
  assert.equal(events.some((event) => event.eventType === "voice.state_changed" && event.toState === "thinking"), true);
  assert.equal(events.some((event) => event.eventType === "voice.assistant_turn_generated"), true);
  assert.equal(events.some((event) => event.eventType === "voice.state_changed" && event.toState === "awaiting_user"), true);
});

test("generateAssistantTurn does not misclassify post-generation hook failures as provider errors", async () => {
  await seedVoiceFixtures();
  const { serviceModule, sessionStoreModule, hooksModule } = await loadModules();
  const { createSessionForProfile, commitUserTurn, generateAssistantTurn } = serviceModule;
  const { getVoiceSession, listVoiceSessionEvents } = sessionStoreModule;
  const { clearVoiceHookRegistry, registerVoiceHook } = hooksModule;

  clearVoiceHookRegistry();
  registerVoiceHook("afterAssistantGenerate", {
    id: "test.afterAssistantGenerate.fail",
    criticality: "required",
    run: async () => {
      throw new Error("after-generate boom");
    },
  });

  const session = await createSessionForProfile({ profileSlug: "sales_support", calendarProvider: async () => [] });
  await commitUserTurn({ sessionId: session.id, text: "Bitte gib mir ein Update." });

  await assert.rejects(
    generateAssistantTurn({
      sessionId: session.id,
      generateReply: async () => ({ text: "Kurze Antwort", metadata: { provider: "test-stub" } }),
    }),
    /after-generate boom/,
  );

  const persisted = getVoiceSession(session.id);
  assert.equal(persisted?.state, "failed");
  assert.equal(persisted?.lastError, "after-generate boom");
  const events = listVoiceSessionEvents(session.id);
  assert.equal(events.some((event) => event.eventType === "voice.provider_error"), false);
  assert.equal(events.some((event) => event.eventType === "voice.hook_failed"), true);
});

test("switchSessionContext rehydrates target profile and appends a system note", async () => {
  await seedVoiceFixtures();
  const { serviceModule, sessionStoreModule, hooksModule } = await loadModules();
  const { createSessionForProfile, switchSessionContext } = serviceModule;
  const { getVoiceProfileBySlug, listVoiceSessionEvents, listVoiceTurns } = sessionStoreModule;
  const { clearVoiceHookRegistry } = hooksModule;

  clearVoiceHookRegistry();
  const session = await createSessionForProfile({ profileSlug: "sales_support", calendarProvider: async () => [] });
  const lumaProfile = getVoiceProfileBySlug("luma");
  assert.ok(lumaProfile);
  const switched = await switchSessionContext({ sessionId: session.id, targetProfileSlug: "luma", calendarProvider: async () => [] });

  assert.equal(switched.session.profileId, lumaProfile!.id);
  assert.equal(switched.session.baseSessionKey, lumaProfile!.baseSessionKey);
  assert.equal(((switched.session.resolvedContext as Record<string, unknown>).profile as Record<string, unknown>).slug, "luma");
  assert.equal(switched.session.state, "awaiting_user");
  assert.equal(switched.systemTurn.speaker, "system");
  assert.equal(switched.systemTurn.text.includes("Call LUMA"), true);

  const events = listVoiceSessionEvents(session.id);
  assert.equal(events.some((event) => event.eventType === "voice.context_switch_requested"), true);
  assert.equal(events.some((event) => event.eventType === "voice.hydration_started" && event.payload.reason === "context-switch"), true);
  assert.equal(events.some((event) => event.eventType === "voice.hydration_completed" && event.payload.reason === "context-switch"), true);
  assert.equal(events.some((event) => event.eventType === "voice.state_changed" && event.toState === "hydrating_context"), true);
  assert.equal(events.some((event) => event.eventType === "voice.context_switch_applied"), true);
  assert.equal(listVoiceTurns(session.id).some((turn) => turn.speaker === "system" && turn.text.includes("Call LUMA")), true);
});

test("switchSessionContext rejects invalid targets without failing the active session", async () => {
  await seedVoiceFixtures();
  const { serviceModule, sessionStoreModule, hooksModule } = await loadModules();
  const { createSessionForProfile, switchSessionContext } = serviceModule;
  const { getVoiceSession, listVoiceSessionEvents } = sessionStoreModule;
  const { clearVoiceHookRegistry } = hooksModule;

  clearVoiceHookRegistry();
  const session = await createSessionForProfile({ profileSlug: "sales_support", calendarProvider: async () => [] });

  await assert.rejects(
    switchSessionContext({ sessionId: session.id, targetProfileSlug: "fitness", calendarProvider: async () => [] }),
    /Voice profile switch not allowed/,
  );

  const persisted = getVoiceSession(session.id);
  assert.equal(persisted?.state, "ready");
  assert.equal(persisted?.lastError, undefined);
  assert.equal(listVoiceSessionEvents(session.id).some((event) => event.eventType === "voice.context_switch_requested"), false);
});

test("endSession runs end hooks, transitions to completed, and emits end event", async () => {
  await seedVoiceFixtures();
  const { serviceModule, sessionStoreModule, hooksModule } = await loadModules();
  const { createSessionForProfile, endSession } = serviceModule;
  const { listVoiceSessionEvents } = sessionStoreModule;
  const { clearVoiceHookRegistry, registerVoiceHook } = hooksModule;

  clearVoiceHookRegistry();
  registerVoiceHook("beforeSessionEnd", {
    id: "test.beforeSessionEnd",
    criticality: "required",
    run: async () => ({ resolvedContext: { endedViaHook: true } }),
  });

  const session = await createSessionForProfile({ profileSlug: "sales_support", calendarProvider: async () => [] });
  const ended = await endSession({ sessionId: session.id, reason: "user-requested" });

  assert.equal(ended.state, "completed");
  assert.equal(ended.endedAt ? true : false, true);
  assert.equal((ended.resolvedContext as Record<string, unknown>).endedViaHook, true);

  const events = listVoiceSessionEvents(session.id);
  assert.equal(events.some((event) => event.eventType === "voice.session_ended"), true);
  assert.equal(events.some((event) => event.eventType === "voice.state_changed" && event.toState === "ending"), true);
  assert.equal(events.some((event) => event.eventType === "voice.state_changed" && event.toState === "completed"), true);
});
