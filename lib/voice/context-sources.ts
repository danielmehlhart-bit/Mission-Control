import { getDb } from "@/lib/db";
import { listBriefings, listMemory, readBriefing, readMemory } from "@/lib/fs";
import { getUpcomingEvents, type CalendarEvent } from "@/lib/google-calendar";

export type VoiceContextBindings = {
  accountId?: string;
  dealId?: string;
  projectId?: string;
  projectName?: string;
  accountName?: string;
  projectSlug?: string;
};

export type VoiceContextSourceName =
  | "accounts"
  | "deals"
  | "activities"
  | "discovery_notes"
  | "tasks"
  | "briefings"
  | "calendar"
  | "notes"
  | "global_memory"
  | "recent_activities"
  | "recent_tasks"
  | "projects";

export type VoiceContextSourceOptions = {
  bindings: VoiceContextBindings;
  limit?: number;
  calendarProvider?: (days?: number) => Promise<CalendarEvent[]>;
};

export type LoadedVoiceContextSources = {
  accounts: Array<Record<string, unknown>>;
  deals: Array<Record<string, unknown>>;
  projects: Array<Record<string, unknown>>;
  activities: Array<Record<string, unknown>>;
  discoveryNotes: Array<Record<string, unknown>>;
  tasks: Array<Record<string, unknown>>;
  briefings: Array<Record<string, unknown>>;
  calendar: Array<Record<string, unknown>>;
  globalMemory: Array<Record<string, unknown>>;
  notes: { content: string | null; updatedAt: string | null };
};

function jsonParse(value: string | null | undefined): Record<string, unknown> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function likeTerm(term: string): string {
  return `%${term.toLowerCase()}%`;
}

async function loadAccountContext(bindings: VoiceContextBindings) {
  if (!bindings.accountId) return [];
  const db = getDb();
  return db.prepare("SELECT * FROM accounts WHERE id = ?").all(bindings.accountId) as Record<string, unknown>[];
}

async function loadDealContext(bindings: VoiceContextBindings) {
  if (!bindings.dealId) return [];
  const db = getDb();
  return db.prepare("SELECT * FROM deals WHERE id = ?").all(bindings.dealId) as Record<string, unknown>[];
}

async function loadProjectContext(bindings: VoiceContextBindings) {
  const db = getDb();
  if (bindings.projectId) {
    return db.prepare("SELECT * FROM projects WHERE id = ?").all(bindings.projectId) as Record<string, unknown>[];
  }
  if (bindings.projectName) {
    return db.prepare("SELECT * FROM projects WHERE lower(name) = lower(?)").all(bindings.projectName) as Record<string, unknown>[];
  }
  return [];
}

async function loadActivitiesContext(bindings: VoiceContextBindings, limit = 10) {
  const db = getDb();
  let sql = "SELECT * FROM activities WHERE 1=1";
  const params: unknown[] = [];
  if (bindings.accountId) {
    sql += " AND account_id = ?";
    params.push(bindings.accountId);
  }
  if (bindings.dealId) {
    sql += " AND deal_id = ?";
    params.push(bindings.dealId);
  }
  if (bindings.projectId) {
    sql += " AND project_id = ?";
    params.push(bindings.projectId);
  }
  sql += " ORDER BY created_at DESC LIMIT ?";
  params.push(limit);
  const rows = db.prepare(sql).all(...params) as Record<string, unknown>[];
  return rows.map((row) => ({ ...row, metadata: jsonParse((row.metadata as string | null | undefined) ?? "{}") }));
}

async function loadDiscoveryNotesContext(bindings: VoiceContextBindings, limit = 10) {
  if (!bindings.accountId) return [];
  const db = getDb();
  return db
    .prepare("SELECT * FROM discovery_notes WHERE account_id = ? ORDER BY created_at DESC LIMIT ?")
    .all(bindings.accountId, limit) as Record<string, unknown>[];
}

async function resolveProjectName(bindings: VoiceContextBindings): Promise<string | null> {
  if (bindings.projectName) return bindings.projectName;
  if (!bindings.projectId) return null;
  const db = getDb();
  const row = db.prepare("SELECT name FROM projects WHERE id = ?").get(bindings.projectId) as { name: string } | undefined;
  return row?.name ?? null;
}

async function loadTasksContext(bindings: VoiceContextBindings, limit = 10) {
  const projectName = await resolveProjectName(bindings);
  if (!projectName) return [];
  const db = getDb();
  return db
    .prepare("SELECT * FROM tasks WHERE lower(project) = lower(?) ORDER BY CASE status WHEN 'todo' THEN 0 ELSE 1 END, created_at DESC LIMIT ?")
    .all(projectName, limit) as Record<string, unknown>[];
}

async function loadBriefingsContext(bindings: VoiceContextBindings, limit = 5) {
  try {
    const listing = await listBriefings();
    const terms = [bindings.projectName, bindings.accountName, bindings.projectSlug]
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
      .map((value) => value.toLowerCase());

    const matched = listing.files.filter((file) => {
      if (terms.length === 0) return false;
      const haystack = `${file.name} ${file.path}`.toLowerCase();
      return terms.some((term) => haystack.includes(term));
    }).slice(0, limit);

    const hydrated = await Promise.all(matched.map(async (file) => {
      try {
        return {
          ...file,
          preview: (await readBriefing(file.path)).slice(0, 240),
        };
      } catch {
        return null;
      }
    }));

    return hydrated.filter((file): file is Record<string, unknown> => Boolean(file));
  } catch {
    return [];
  }
}

async function loadCalendarContext(
  bindings: VoiceContextBindings,
  calendarProvider: (days?: number) => Promise<CalendarEvent[]>,
  limit = 5,
) {
  const db = getDb();
  const people = db
    .prepare("SELECT id, name, email, project, account_id FROM people WHERE email IS NOT NULL AND email != ''")
    .all() as { id: string; name: string; email: string; project?: string; account_id?: string }[];

  const emailToPerson = new Map(people.map((person) => [person.email.toLowerCase(), person]));

  try {
    const events = await calendarProvider(60);

    return events
      .filter((event) => {
        if (!bindings.accountId && !bindings.projectName) return true;
        const attendees = event.attendees.map((email) => emailToPerson.get(email.toLowerCase())).filter(Boolean);
        return attendees.some((person) => {
          if (!person) return false;
          return (
            (!!bindings.accountId && person.account_id === bindings.accountId) ||
            (!!bindings.projectName && person.project?.toLowerCase() === bindings.projectName.toLowerCase())
          );
        });
      })
      .slice(0, limit)
      .map((event) => ({ ...event }));
  } catch {
    return [];
  }
}

async function loadGlobalMemoryContext(limit = 3) {
  try {
    const listing = await listMemory();
    const files = [...listing.files]
      .sort((a, b) => b.modified.localeCompare(a.modified))
      .slice(0, limit);

    const hydrated = await Promise.all(files.map(async (file) => {
      try {
        return {
          ...file,
          preview: (await readMemory(file.path)).slice(0, 240),
        };
      } catch {
        return null;
      }
    }));

    return hydrated.filter((file): file is Record<string, unknown> => Boolean(file));
  } catch {
    return [];
  }
}

async function loadAccountNotesContext(bindings: VoiceContextBindings) {
  if (!bindings.accountId) return { content: null, updatedAt: null };
  const db = getDb();
  const row = db
    .prepare("SELECT content, updated_at FROM account_notes WHERE account_id = ?")
    .get(bindings.accountId) as { content: string; updated_at: string } | undefined;

  return {
    content: row?.content ?? null,
    updatedAt: row?.updated_at ?? null,
  };
}

export async function loadVoiceContextSources(
  sourceNames: string[],
  options: VoiceContextSourceOptions,
): Promise<LoadedVoiceContextSources> {
  const limit = options.limit ?? 10;
  const calendarProvider = options.calendarProvider ?? getUpcomingEvents;
  const accounts = sourceNames.includes("accounts") ? await loadAccountContext(options.bindings) : [];
  const deals = sourceNames.includes("deals") ? await loadDealContext(options.bindings) : [];
  const projects = sourceNames.includes("projects") ? await loadProjectContext(options.bindings) : [];
  const activities = sourceNames.includes("activities") || sourceNames.includes("recent_activities")
    ? await loadActivitiesContext(options.bindings, limit)
    : [];
  const discoveryNotes = sourceNames.includes("discovery_notes")
    ? await loadDiscoveryNotesContext(options.bindings, limit)
    : [];
  const tasks = sourceNames.includes("tasks") || sourceNames.includes("recent_tasks")
    ? await loadTasksContext(options.bindings, limit)
    : [];
  const briefings = sourceNames.includes("briefings") ? await loadBriefingsContext(options.bindings, Math.min(limit, 5)) : [];
  const calendar = sourceNames.includes("calendar") ? await loadCalendarContext(options.bindings, calendarProvider, Math.min(limit, 5)) : [];
  const globalMemory = sourceNames.includes("global_memory") ? await loadGlobalMemoryContext(Math.min(limit, 3)) : [];
  const notes = sourceNames.includes("notes") ? await loadAccountNotesContext(options.bindings) : { content: null, updatedAt: null };

  return {
    accounts,
    deals,
    projects,
    activities,
    discoveryNotes,
    tasks,
    briefings,
    calendar,
    globalMemory,
    notes,
  };
}

export async function inferBindingNames(bindings: VoiceContextBindings): Promise<VoiceContextBindings> {
  const db = getDb();
  const nextBindings: VoiceContextBindings = { ...bindings };

  if (bindings.accountId && !bindings.accountName) {
    const account = db.prepare("SELECT name FROM accounts WHERE id = ?").get(bindings.accountId) as { name: string } | undefined;
    if (account?.name) nextBindings.accountName = account.name;
  }

  if (bindings.projectId && !bindings.projectName) {
    const project = db.prepare("SELECT name FROM projects WHERE id = ?").get(bindings.projectId) as { name: string } | undefined;
    if (project?.name) nextBindings.projectName = project.name;
  }

  if (bindings.projectSlug && !bindings.projectName) {
    const project = db
      .prepare("SELECT name FROM projects WHERE lower(name) LIKE ? OR lower(client) LIKE ? OR lower(description) LIKE ? ORDER BY created_at DESC LIMIT 1")
      .get(likeTerm(bindings.projectSlug), likeTerm(bindings.projectSlug), likeTerm(bindings.projectSlug)) as { name: string } | undefined;
    if (project?.name) nextBindings.projectName = project.name;
  }

  return nextBindings;
}
