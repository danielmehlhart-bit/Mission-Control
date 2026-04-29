import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as fsp from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "mc-voice-phase3-"));
process.env.DB_PATH = path.join(tempRoot, "mission-control.db");
process.env.BRIEFINGS_DIR = path.join(tempRoot, "briefings");
process.env.MEMORY_DIR = tempRoot;

async function loadModules() {
  const sessionStoreModule = await import("../../lib/voice/session-store.ts");
  const contextSourcesModule = await import("../../lib/voice/context-sources.ts");
  const contextRouterModule = await import("../../lib/voice/context-router.ts");
  const dbModule = await import("../../lib/db.ts");
  const fsModule = await import("../../lib/fs.ts");

  return {
    sessionStoreModule,
    contextSourcesModule,
    contextRouterModule,
    dbModule,
    fsModule,
  };
}

async function seedVoiceFixtures() {
  const { dbModule, sessionStoreModule } = await loadModules();
  const { getDb } = dbModule;
  const { getVoiceProfileBySlug, upsertVoiceProfileBinding } = sessionStoreModule;
  const db = getDb();

  await fsp.mkdir(process.env.BRIEFINGS_DIR!, { recursive: true });
  await fsp.mkdir(path.join(process.env.MEMORY_DIR!, "core"), { recursive: true });
  await fsp.mkdir(path.join(process.env.MEMORY_DIR!, "memory"), { recursive: true });
  await fsp.writeFile(
    path.join(process.env.BRIEFINGS_DIR!, "2026-04-29-luma-onboarding.html"),
    "<html><body>LUMA onboarding briefing</body></html>",
    "utf8",
  );
  await fsp.writeFile(
    path.join(process.env.MEMORY_DIR!, "2026-04-29.md"),
    "# Daily Memory\nDaniel discussed LUMA voice workflows.",
    "utf8",
  );
  await fsp.writeFile(
    path.join(process.env.MEMORY_DIR!, "secrets.txt"),
    "should-not-be-readable",
    "utf8",
  );

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

test("loadVoiceContextSources returns filtered account, activity, discovery, task, briefing, and calendar data", async () => {
  await seedVoiceFixtures();
  const { contextSourcesModule } = await loadModules();
  const { loadVoiceContextSources } = contextSourcesModule;

  const result = await loadVoiceContextSources(
    ["accounts", "activities", "discovery_notes", "tasks", "briefings", "calendar", "notes"],
    {
      bindings: {
        accountId: "acc_luma",
        dealId: "deal_luma",
        projectId: "proj_luma",
        projectName: "LUMA",
      },
      calendarProvider: async () => [
        {
          id: "evt_1",
          summary: "LUMA Weekly",
          start: "2026-04-30T09:00:00.000Z",
          end: "2026-04-30T09:30:00.000Z",
          attendees: ["lisa@luma-app.io"],
        },
      ],
    },
  );

  assert.equal(result.accounts.length, 1);
  assert.equal(result.accounts[0].name, "LUMA GmbH");
  assert.equal(result.activities.length, 1);
  assert.equal(result.discoveryNotes.length, 1);
  assert.equal(result.tasks.length, 1);
  assert.equal(result.briefings.length, 1);
  assert.equal(result.calendar.length, 1);
  assert.equal(result.notes.content.includes("LUMA"), true);
});

test("resolveVoiceProfileContext builds a normalized resolved context with summary and source counts", async () => {
  await seedVoiceFixtures();
  const { contextRouterModule } = await loadModules();
  const { resolveVoiceProfileContext } = contextRouterModule;

  const resolved = await resolveVoiceProfileContext("sales_support", {
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

  assert.equal(resolved.profile.slug, "sales_support");
  assert.equal(resolved.bindings.accountId, "acc_luma");
  assert.equal(resolved.bindings.dealId, "deal_luma");
  assert.equal(Array.isArray(resolved.switchTargets), true);
  assert.equal(resolved.switchTargets.includes("main"), true);
  assert.equal(resolved.sources.some((source: { type: string; count?: number }) => source.type === "activities" && source.count === 1), true);
  assert.equal(resolved.sources.some((source: { type: string; count?: number }) => source.type === "calendar" && source.count === 1), true);
  assert.equal(typeof resolved.contextSummary, "string");
  assert.equal(resolved.contextSummary?.includes("LUMA GmbH"), true);
  assert.equal((resolved.metadata as Record<string, unknown>).accountName, "LUMA GmbH");

  const mainResolved = await resolveVoiceProfileContext("main", {
    calendarProvider: async () => [],
  });
  assert.equal(mainResolved.sources.some((source: { type: string; count?: number }) => source.type === "global_memory" && source.count === 1), true);
});

test("loadVoiceContextSources degrades gracefully when briefings or calendar are unavailable", async () => {
  await seedVoiceFixtures();
  await fsp.rm(process.env.BRIEFINGS_DIR!, { recursive: true, force: true });
  const { contextSourcesModule } = await loadModules();
  const { loadVoiceContextSources } = contextSourcesModule;

  const result = await loadVoiceContextSources(
    ["briefings", "calendar", "global_memory"],
    {
      bindings: {
        accountId: "acc_luma",
        projectId: "proj_luma",
        projectName: "LUMA",
      },
      calendarProvider: async () => {
        throw new Error("calendar offline");
      },
    },
  );

  assert.equal(result.briefings.length, 0);
  assert.equal(result.calendar.length, 0);
  assert.equal(result.globalMemory.length, 1);
});

test("readMemoryFile only allows enumerated memory files", async () => {
  await seedVoiceFixtures();
  const { fsModule } = await loadModules();
  const { readMemoryFile } = fsModule;

  const allowed = await readMemoryFile("mem:2026-04-29.md");
  assert.equal(allowed.includes("LUMA voice workflows"), true);

  await assert.rejects(() => readMemoryFile("mem:secrets.txt"), /Access denied/);
});

test("resolveVoiceContextSwitch enforces allowed targets and hydrates the target profile", async () => {
  await seedVoiceFixtures();
  const { contextRouterModule } = await loadModules();
  const { resolveVoiceContextSwitch } = contextRouterModule;

  const switched = await resolveVoiceContextSwitch(
    { profileSlug: "sales_support" },
    "luma",
    {
      calendarProvider: async () => [],
    },
  );

  assert.equal(switched.profile.slug, "luma");
  assert.equal(switched.switchTargets.includes("sales_support"), true);
  assert.equal(switched.sources.some((source: { type: string; count?: number }) => source.type === "briefings" && source.count === 1), true);
  assert.equal(switched.bindings.projectId, "proj_luma");

  await assert.rejects(
    () => resolveVoiceContextSwitch({ profileSlug: "fitness" }, "sales_support", { calendarProvider: async () => [] }),
    /Voice profile switch not allowed: fitness -> sales_support/,
  );
});
