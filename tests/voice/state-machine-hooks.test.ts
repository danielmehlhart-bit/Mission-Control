import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "mc-voice-phase2-"));
process.env.DB_PATH = path.join(tempRoot, "mission-control.db");

async function loadModules() {
  const stateMachineModule = await import("../../lib/voice/state-machine.ts");
  const hooksModule = await import("../../lib/voice/hooks.ts");
  const sessionStoreModule = await import("../../lib/voice/session-store.ts");

  return {
    stateMachineModule,
    hooksModule,
    sessionStoreModule,
  };
}

test("canTransition returns true for legal state changes and false otherwise", async () => {
  const { stateMachineModule } = await loadModules();
  const { ALLOWED_VOICE_STATE_TRANSITIONS, canTransition } = stateMachineModule;

  assert.equal(canTransition("idle", "booting"), true);
  assert.equal(canTransition("ready", "listening"), true);
  assert.equal(canTransition("listening", "ready"), false);
  assert.equal(canTransition("completed", "listening"), false);
  assert.deepEqual(ALLOWED_VOICE_STATE_TRANSITIONS.idle, ["booting"]);
});

test("assertTransition returns structured metadata for valid transitions", async () => {
  const { stateMachineModule } = await loadModules();
  const { assertTransition } = stateMachineModule;

  const result = assertTransition("thinking", "awaiting_user", "assistant had no tts payload");

  assert.equal(result.from, "thinking");
  assert.equal(result.to, "awaiting_user");
  assert.equal(result.reason, "assistant had no tts payload");
  assert.ok(result.at);
  assert.ok(Number.isFinite(Date.parse(result.at)));
});

test("assertTransition throws for invalid state changes", async () => {
  const { stateMachineModule } = await loadModules();
  const { assertTransition } = stateMachineModule;

  assert.throws(
    () => assertTransition("idle", "ready"),
    /Invalid voice transition: idle -> ready/,
  );
});

test("runVoiceStateMachineSelfCheck reports valid and invalid coverage", async () => {
  const { stateMachineModule } = await loadModules();
  const { runVoiceStateMachineSelfCheck } = stateMachineModule;

  const result = runVoiceStateMachineSelfCheck();

  assert.ok(result.validCount > 0);
  assert.ok(result.invalidCount > 0);
  assert.equal(result.missingStates.length, 0);
  assert.equal(result.unreachableStates.length, 0);
  assert.equal(result.invalidExamples.some((example: string) => example === "idle->ready"), true);
});

test("runVoiceHooks composes patches in registration order", async () => {
  const { hooksModule } = await loadModules();
  const {
    clearVoiceHookRegistry,
    registerVoiceHook,
    runVoiceHooks,
  } = hooksModule;

  clearVoiceHookRegistry();

  registerVoiceHook("beforeHydration", {
    id: "required-a",
    criticality: "required",
    run: async () => ({
      resolvedContext: {
        profileSummary: "main",
        sources: ["profile"],
      },
      metadata: {
        order: ["required-a"],
      },
    }),
  });

  registerVoiceHook("beforeHydration", {
    id: "required-b",
    criticality: "required",
    run: async (context: { resolvedContext: Record<string, unknown> }) => {
      assert.equal(context.resolvedContext.profileSummary, "main");
      assert.deepEqual(context.resolvedContext.sources, ["profile"]);

      return {
        resolvedContext: {
          hydrated: true,
        },
        metadata: {
          order: ["required-a", "required-b"],
        },
      };
    },
  });

  const result = await runVoiceHooks("beforeHydration", {
    payload: { profileSlug: "main" },
    resolvedContext: {},
  });

  assert.deepEqual(result.patch.resolvedContext, {
    profileSummary: "main",
    sources: ["profile"],
    hydrated: true,
  });
  assert.deepEqual(result.patch.metadata, {
    order: ["required-a", "required-b"],
  });
  assert.equal(result.results.length, 2);
  assert.equal(result.results.every((entry: { status: string }) => entry.status === "fulfilled"), true);
});

test("best-effort hook failures emit voice.hook_failed without aborting", async () => {
  const { hooksModule, sessionStoreModule } = await loadModules();
  const {
    clearVoiceHookRegistry,
    registerVoiceHook,
    runVoiceHooks,
  } = hooksModule;
  const {
    createVoiceSession,
    getVoiceProfileBySlug,
    listVoiceSessionEvents,
  } = sessionStoreModule;

  clearVoiceHookRegistry();

  const profile = getVoiceProfileBySlug("main");
  assert.ok(profile);
  const session = createVoiceSession({ profileId: profile!.id });

  registerVoiceHook("beforeHydration", {
    id: "best-effort-fail",
    criticality: "best_effort",
    run: async () => {
      throw new Error("calendar source offline");
    },
  });

  registerVoiceHook("beforeHydration", {
    id: "required-success",
    criticality: "required",
    run: async () => ({
      resolvedContext: {
        recovered: true,
      },
    }),
  });

  const result = await runVoiceHooks("beforeHydration", {
    session,
    profile: profile!,
    payload: { trigger: "hydrate" },
    resolvedContext: {},
  });

  assert.equal(result.results[0].status, "failed");
  assert.equal(result.results[1].status, "fulfilled");
  assert.deepEqual(result.patch.resolvedContext, { recovered: true });

  const events = listVoiceSessionEvents(session.id);
  const hookFailureEvent = events.find((event: { eventType: string }) => event.eventType === "voice.hook_failed");
  assert.ok(hookFailureEvent);
  assert.equal(hookFailureEvent?.payload.hookId, "best-effort-fail");
  assert.equal(hookFailureEvent?.payload.hookName, "beforeHydration");
  assert.equal(hookFailureEvent?.payload.message, "calendar source offline");
});

test("required hook failures emit voice.hook_failed and then bubble", async () => {
  const { hooksModule, sessionStoreModule } = await loadModules();
  const {
    clearVoiceHookRegistry,
    registerVoiceHook,
    runVoiceHooks,
  } = hooksModule;
  const {
    createVoiceSession,
    getVoiceProfileBySlug,
    listVoiceSessionEvents,
  } = sessionStoreModule;

  clearVoiceHookRegistry();

  const profile = getVoiceProfileBySlug("main");
  assert.ok(profile);
  const session = createVoiceSession({ profileId: profile!.id });

  registerVoiceHook("beforeSessionEnd", {
    id: "required-fail",
    criticality: "required",
    run: async () => {
      throw new Error("summary generation crashed");
    },
  });

  await assert.rejects(
    () => runVoiceHooks("beforeSessionEnd", {
      session,
      profile: profile!,
      payload: { reason: "user-ended" },
      resolvedContext: {},
    }),
    /summary generation crashed/,
  );

  const events = listVoiceSessionEvents(session.id);
  const hookFailureEvent = events.find((event: { eventType: string }) => event.eventType === "voice.hook_failed");
  assert.ok(hookFailureEvent);
  assert.equal(hookFailureEvent?.payload.hookId, "required-fail");
  assert.equal(hookFailureEvent?.payload.hookName, "beforeSessionEnd");
});
