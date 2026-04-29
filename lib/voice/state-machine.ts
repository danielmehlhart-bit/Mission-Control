import { VOICE_SESSION_STATES, type VoiceSessionState } from "./types";

export const ALLOWED_VOICE_STATE_TRANSITIONS: Record<VoiceSessionState, VoiceSessionState[]> = {
  idle: ["booting"],
  booting: ["hydrating_context", "failed"],
  hydrating_context: ["ready", "failed"],
  ready: ["listening", "ending"],
  listening: ["thinking", "switching_context", "ending", "failed"],
  thinking: ["speaking", "awaiting_user", "failed"],
  speaking: ["awaiting_user", "listening", "ending", "failed"],
  awaiting_user: ["listening", "switching_context", "ending"],
  switching_context: ["hydrating_context", "awaiting_user", "failed"],
  paused: ["listening", "ending"],
  ending: ["completed", "failed"],
  completed: [],
  failed: [],
};

export type VoiceTransitionResult = {
  from: VoiceSessionState;
  to: VoiceSessionState;
  at: string;
  reason?: string;
};

export function canTransition(from: VoiceSessionState, to: VoiceSessionState): boolean {
  return ALLOWED_VOICE_STATE_TRANSITIONS[from].includes(to);
}

export function assertTransition(
  from: VoiceSessionState,
  to: VoiceSessionState,
  reason?: string,
): VoiceTransitionResult {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid voice transition: ${from} -> ${to}`);
  }

  return {
    from,
    to,
    at: new Date().toISOString(),
    ...(reason ? { reason } : {}),
  };
}

export function runVoiceStateMachineSelfCheck(): {
  validCount: number;
  invalidCount: number;
  missingStates: VoiceSessionState[];
  invalidExamples: string[];
} {
  const allStates = [...VOICE_SESSION_STATES];
  const missingStates = allStates.filter((state) => !(state in ALLOWED_VOICE_STATE_TRANSITIONS));
  const invalidExamples: string[] = [];

  let validCount = 0;
  let invalidCount = 0;

  for (const from of allStates) {
    for (const to of allStates) {
      if (canTransition(from, to)) {
        validCount += 1;
      } else {
        invalidCount += 1;
        if (invalidExamples.length < 20) {
          invalidExamples.push(`${from}->${to}`);
        }
      }
    }
  }

  return {
    validCount,
    invalidCount,
    missingStates,
    invalidExamples,
  };
}
