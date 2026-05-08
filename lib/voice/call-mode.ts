import type { VoiceProfileSlug } from "./types";

export const CALL_MODE_PROFILE_SLUGS = ["main", "sales_support", "luma"] as const satisfies readonly VoiceProfileSlug[];
export type CallModeProfileSlug = typeof CALL_MODE_PROFILE_SLUGS[number];

export type VoiceTelegramBinding = {
  chatId: string;
  threadId?: string;
  label: string;
  handoffUrl?: string;
};

export const CALL_MODE_TELEGRAM_BINDINGS: Record<CallModeProfileSlug, VoiceTelegramBinding> = {
  main: {
    chatId: "485318478",
    label: "Daniel Telegram DM",
  },
  sales_support: {
    chatId: "-1003998265477",
    threadId: "23",
    label: "Sales Support Telegram",
    handoffUrl: "https://t.me/c/3998265477/23",
  },
  luma: {
    chatId: "-1003998265477",
    threadId: "24",
    label: "LUMA Telegram",
    handoffUrl: "https://t.me/c/3998265477/24",
  },
};

export function isCallModeProfileSlug(slug: string): slug is CallModeProfileSlug {
  return CALL_MODE_PROFILE_SLUGS.includes(slug as CallModeProfileSlug);
}

export function getCallModeTelegramBinding(slug: VoiceProfileSlug): VoiceTelegramBinding | null {
  return isCallModeProfileSlug(slug) ? CALL_MODE_TELEGRAM_BINDINGS[slug] : null;
}
