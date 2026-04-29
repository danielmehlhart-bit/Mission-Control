import { appendVoiceEvent } from "./session-store";
import type { ResolvedVoiceContext, VoiceProfile, VoiceSession } from "./types";

export const VOICE_HOOK_NAMES = [
  "beforeSessionCreate",
  "afterSessionCreate",
  "beforeHydration",
  "hydrateProfileContext",
  "hydrateFreshContext",
  "afterHydration",
  "beforeTurnCommit",
  "beforeAssistantGenerate",
  "afterAssistantGenerate",
  "beforeContextSwitch",
  "afterContextSwitch",
  "beforeSessionEnd",
  "afterSessionEnd",
  "onProviderError",
] as const;

export type VoiceHookName = typeof VOICE_HOOK_NAMES[number];
export type VoiceHookCriticality = "required" | "best_effort";

export type VoiceHookPatch = {
  session?: Partial<VoiceSession>;
  resolvedContext?: Record<string, unknown>;
  payload?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};

export type VoiceHookContext = {
  session?: VoiceSession;
  profile?: VoiceProfile;
  resolvedContext: Record<string, unknown> | ResolvedVoiceContext;
  payload?: Record<string, unknown>;
  store?: {
    appendEvent?: typeof appendVoiceEvent;
  };
};

export type VoiceHookDefinition = {
  id: string;
  criticality: VoiceHookCriticality;
  run: (context: VoiceHookContext) => Promise<VoiceHookPatch | void> | VoiceHookPatch | void;
};

export type VoiceHookRunResult = {
  hookId: string;
  hookName: VoiceHookName;
  criticality: VoiceHookCriticality;
  status: "fulfilled" | "failed";
  message?: string;
};

const voiceHookRegistry = new Map<VoiceHookName, VoiceHookDefinition[]>();

function mergeRecord(
  base: Record<string, unknown> | undefined,
  next: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!base && !next) return undefined;
  return {
    ...(base ?? {}),
    ...(next ?? {}),
  };
}

function mergeVoiceHookPatch(base: VoiceHookPatch, next?: VoiceHookPatch | void): VoiceHookPatch {
  if (!next) return base;

  return {
    session: mergeRecord(base.session as Record<string, unknown> | undefined, next.session as Record<string, unknown> | undefined) as Partial<VoiceSession> | undefined,
    resolvedContext: mergeRecord(base.resolvedContext, next.resolvedContext),
    payload: mergeRecord(base.payload, next.payload),
    metadata: mergeRecord(base.metadata, next.metadata),
  };
}

function getVoiceHookEntries(name: VoiceHookName): VoiceHookDefinition[] {
  return voiceHookRegistry.get(name) ?? [];
}

async function emitHookFailureEvent(
  hookName: VoiceHookName,
  hook: VoiceHookDefinition,
  context: VoiceHookContext,
  error: unknown,
): Promise<void> {
  if (!context.session?.id) return;

  const appendEvent = context.store?.appendEvent ?? appendVoiceEvent;
  const message = error instanceof Error ? error.message : String(error);

  appendEvent({
    sessionId: context.session.id,
    eventType: "voice.hook_failed",
    fromState: context.session.state,
    toState: context.session.state,
    payload: {
      hookId: hook.id,
      hookName,
      criticality: hook.criticality,
      message,
    },
  });
}

export function registerVoiceHook(name: VoiceHookName, hook: VoiceHookDefinition): () => void {
  const existing = getVoiceHookEntries(name);
  voiceHookRegistry.set(name, [...existing, hook]);

  return () => {
    const current = getVoiceHookEntries(name).filter((entry) => entry !== hook);
    if (current.length === 0) {
      voiceHookRegistry.delete(name);
      return;
    }
    voiceHookRegistry.set(name, current);
  };
}

export function clearVoiceHookRegistry(): void {
  voiceHookRegistry.clear();
}

export async function runVoiceHooks(
  name: VoiceHookName,
  context: VoiceHookContext,
): Promise<{
  patch: VoiceHookPatch;
  results: VoiceHookRunResult[];
}> {
  let patch: VoiceHookPatch = {};
  const results: VoiceHookRunResult[] = [];

  for (const hook of getVoiceHookEntries(name)) {
    try {
      const nextPatch = await hook.run(context);
      patch = mergeVoiceHookPatch(patch, nextPatch);
      results.push({
        hookId: hook.id,
        hookName: name,
        criticality: hook.criticality,
        status: "fulfilled",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await emitHookFailureEvent(name, hook, context, error);
      results.push({
        hookId: hook.id,
        hookName: name,
        criticality: hook.criticality,
        status: "failed",
        message,
      });

      if (hook.criticality === "required") {
        throw error;
      }
    }
  }

  return { patch, results };
}
