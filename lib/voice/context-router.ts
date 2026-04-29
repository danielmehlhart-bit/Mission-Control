import { getVoiceProfileBySlug, listVoiceProfileBindings } from "./session-store";
import type { ResolvedVoiceContext, VoiceProfileSlug } from "./types";
import { inferBindingNames, loadVoiceContextSources, type VoiceContextBindings } from "./context-sources";
import type { CalendarEvent } from "@/lib/google-calendar";

export type ResolveVoiceProfileContextOptions = {
  calendarProvider?: (days?: number) => Promise<CalendarEvent[]>;
  extraBindings?: Partial<VoiceContextBindings>;
};

function normalizeBindings(profileId: string, profileContextBinding: Record<string, unknown>): VoiceContextBindings {
  const normalized: VoiceContextBindings = {};
  const bindings = listVoiceProfileBindings(profileId);

  for (const binding of bindings) {
    if (binding.bindingType === "account") normalized.accountId = binding.bindingValue;
    if (binding.bindingType === "deal") normalized.dealId = binding.bindingValue;
    if (binding.bindingType === "project") normalized.projectId = binding.bindingValue;
  }

  if (typeof profileContextBinding.accountId === "string") normalized.accountId = profileContextBinding.accountId;
  if (typeof profileContextBinding.accountName === "string") normalized.accountName = profileContextBinding.accountName;
  if (typeof profileContextBinding.dealId === "string") normalized.dealId = profileContextBinding.dealId;
  if (typeof profileContextBinding.projectId === "string") normalized.projectId = profileContextBinding.projectId;
  if (typeof profileContextBinding.projectName === "string") normalized.projectName = profileContextBinding.projectName;
  if (typeof profileContextBinding.projectSlug === "string") normalized.projectSlug = profileContextBinding.projectSlug;

  return normalized;
}

function buildSourceCounts(loaded: Awaited<ReturnType<typeof loadVoiceContextSources>>) {
  return [
    { type: "accounts", count: loaded.accounts.length, label: "Accounts" },
    { type: "deals", count: loaded.deals.length, label: "Deals" },
    { type: "projects", count: loaded.projects.length, label: "Projects" },
    { type: "activities", count: loaded.activities.length, label: "Activities" },
    { type: "discovery_notes", count: loaded.discoveryNotes.length, label: "Discovery Notes" },
    { type: "tasks", count: loaded.tasks.length, label: "Tasks" },
    { type: "briefings", count: loaded.briefings.length, label: "Briefings" },
    { type: "calendar", count: loaded.calendar.length, label: "Calendar" },
    { type: "global_memory", count: loaded.globalMemory.length, label: "Global Memory" },
    { type: "notes", count: loaded.notes.content ? 1 : 0, label: "Notes" },
  ].filter((source) => source.count > 0);
}

function buildContextSummary(
  profileLabel: string,
  bindings: VoiceContextBindings,
  loaded: Awaited<ReturnType<typeof loadVoiceContextSources>>,
): string {
  const parts = [profileLabel];
  if (bindings.accountName) parts.push(`Account: ${bindings.accountName}`);
  if (bindings.projectName) parts.push(`Projekt: ${bindings.projectName}`);
  if (loaded.activities.length) parts.push(`${loaded.activities.length} Aktivitäten`);
  if (loaded.discoveryNotes.length) parts.push(`${loaded.discoveryNotes.length} Discovery Notes`);
  if (loaded.tasks.length) parts.push(`${loaded.tasks.length} Tasks`);
  if (loaded.briefings.length) parts.push(`${loaded.briefings.length} Briefings`);
  if (loaded.calendar.length) parts.push(`${loaded.calendar.length} Kalenderevents`);
  return parts.join(" · ");
}

export async function resolveVoiceProfileContext(
  profileSlug: VoiceProfileSlug,
  options: ResolveVoiceProfileContextOptions = {},
): Promise<ResolvedVoiceContext> {
  const profile = getVoiceProfileBySlug(profileSlug);
  if (!profile) {
    throw new Error(`Voice profile not found: ${profileSlug}`);
  }

  const mergedBindings = {
    ...normalizeBindings(profile.id, profile.contextBinding),
    ...(options.extraBindings ?? {}),
  };
  const hydratedBindings = await inferBindingNames(mergedBindings);
  const loaded = await loadVoiceContextSources(profile.contextSources, {
    bindings: hydratedBindings,
    calendarProvider: options.calendarProvider,
  });

  return {
    profile: {
      id: profile.id,
      slug: profile.slug,
      label: profile.label,
    },
    bindings: hydratedBindings,
    sources: buildSourceCounts(loaded),
    contextSummary: buildContextSummary(profile.label, hydratedBindings, loaded),
    switchTargets: profile.allowedSwitchTargets,
    metadata: {
      accountName: hydratedBindings.accountName,
      projectName: hydratedBindings.projectName,
      sourceData: loaded,
    },
  };
}

export async function resolveVoiceContextSwitch(
  current: { profileSlug: VoiceProfileSlug },
  targetProfileSlug: VoiceProfileSlug,
  options: ResolveVoiceProfileContextOptions = {},
): Promise<ResolvedVoiceContext> {
  const currentProfile = getVoiceProfileBySlug(current.profileSlug);
  if (!currentProfile) {
    throw new Error(`Voice profile not found: ${current.profileSlug}`);
  }

  if (!currentProfile.allowedSwitchTargets.includes(targetProfileSlug)) {
    throw new Error(`Voice profile switch not allowed: ${current.profileSlug} -> ${targetProfileSlug}`);
  }

  return resolveVoiceProfileContext(targetProfileSlug, options);
}
