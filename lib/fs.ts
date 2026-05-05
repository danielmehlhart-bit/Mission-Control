import fs from "node:fs/promises";
import path from "node:path";

const DEFAULT_WORKSPACE = "/home/hartner/.openclaw/workspace";

const ROOTS = {
  briefings: process.env.BRIEFINGS_DIR ?? DEFAULT_WORKSPACE,
  memory: process.env.MEMORY_DIR ?? DEFAULT_WORKSPACE,
};

// Memory sync layout on Hetzner:
//   MEMORY_DIR/          → daily logs + subfolders (projects/, etc.)
//   MEMORY_DIR/core/     → core workspace files (MEMORY.md, SOUL.md, ...)
// Pi dev layout:
//   MEMORY_DIR = /home/hartner/.openclaw/workspace
//   MEMORY_DIR/memory/   → daily logs + subfolders
//   MEMORY_DIR/*.md      → core workspace files
//
// Detection: if MEMORY_DIR/core/ exists → Hetzner layout, else → Pi layout


const MAX_DEPTH = 2;

function isWithinRoot(root: string, target: string) {
  const resolvedRoot = path.resolve(root);
  const resolvedTarget = path.resolve(target);
  return resolvedTarget.startsWith(resolvedRoot + path.sep) || resolvedTarget === resolvedRoot;
}

function safeResolve(root: string, target: string) {
  const resolved = path.resolve(root, target);
  if (!isWithinRoot(root, resolved)) {
    throw new Error("Invalid path");
  }
  return resolved;
}

async function walkDir(root: string, depth = 0): Promise<string[]> {
  if (depth > MAX_DEPTH) return [];
  const entries = await fs.readdir(root, { withFileTypes: true });
  const results: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await walkDir(fullPath, depth + 1)));
    } else {
      results.push(fullPath);
    }
  }
  return results;
}

async function formatFileList(files: string[], root: string, extFilter: RegExp) {
  const filtered = files.filter((file) => extFilter.test(file));
  const enriched = await Promise.all(
    filtered.map(async (file) => {
      const stat = await fs.stat(file);
      return {
        name: path.basename(file),
        path: path.relative(root, file),
        modified: stat.mtime.toISOString(),
      };
    })
  );
  return enriched;
}

export async function listBriefings() {
  const root = ROOTS.briefings;
  const files = await walkDir(root);
  return { root, files: await formatFileList(files, root, /\.html?$/i) };
}

export async function readBriefing(filePath: string) {
  const root = ROOTS.briefings;
  const fullPath = safeResolve(root, filePath);
  return fs.readFile(fullPath, "utf8");
}

// Memory: Zugriff auf workspace root (core files) + memory/ subdir
const MEMORY_SUBDIR = "memory";

// Kategorien-Mapping
export const MEMORY_CATEGORIES = [
  {
    id: "core",
    label: "Core Identity",
    emoji: "🧠",
    desc: "Wer ist Hatti",
    files: ["MEMORY.md", "SOUL.md", "USER.md", "IDENTITY.md", "AGENTS.md", "TOOLS.md", "HEARTBEAT.md"],
    source: "workspace-root",
  },
  {
    id: "operative",
    label: "Operative",
    emoji: "⚙️",
    desc: "Regeln & Projekte",
    files: ["RULES.md", "PROJECTS.md"],
    source: "workspace-root",
  },
  {
    id: "daily",
    label: "Daily Logs",
    emoji: "📝",
    desc: "Session-Tagebuch",
    files: [], // dynamisch aus memory/ root
    source: "memory-root",
    pattern: /^\d{4}-\d{2}-\d{2}/,
  },
  {
    id: "projects",
    label: "Project Memory",
    emoji: "🏗️",
    desc: "Projekt-Notizen",
    files: [], // dynamisch aus memory/projects/
    source: "memory-projects",
  },
  {
    id: "fitness",
    label: "Fitness & Sport",
    emoji: "💪",
    desc: "Bike, Training",
    files: ["fitness-bike.md"],
    source: "memory-subdir",
  },
  {
    id: "changelog",
    label: "Changelog",
    emoji: "📋",
    desc: "Entscheidungs-Log",
    files: ["changelog.md"],
    source: "memory-subdir",
  },
] as const;

export type MemCategory = typeof MEMORY_CATEGORIES[number];

export type MemFile = {
  name: string;
  path: string; // logical path for API queries
  modified: string;
  category: string;
  desc?: string;
};

export type MemoryDiagnostics = {
  memoryDir: string;
  layout: "hetzner" | "pi";
  memRoot: string;
  coreRoot: string;
  writable: boolean;
  writeError: string | null;
  fileCount: number;
  newestFiles: MemFile[];
  recentVoiceCalls: Array<{ file: string; modified: string; preview: string }>;
};

async function detectLayout(memoryDir: string): Promise<"hetzner" | "pi"> {
  try {
    await fs.stat(path.join(memoryDir, "core"));
    return "hetzner";
  } catch {
    return "pi";
  }
}

export async function listMemoryByCategory(): Promise<{ category: string; files: MemFile[] }[]> {
  const memoryDir = ROOTS.memory;
  const layout = await detectLayout(memoryDir);

  // In Hetzner layout: MEMORY_DIR is the memory subdir itself
  // In Pi layout: MEMORY_DIR is workspace root, memory/ is a subdir
  const memRoot = layout === "hetzner" ? memoryDir : path.join(memoryDir, MEMORY_SUBDIR);
  const coreRoot = layout === "hetzner" ? path.join(memoryDir, "core") : memoryDir;

  const result: { category: string; files: MemFile[] }[] = [];

  for (const cat of MEMORY_CATEGORIES) {
    const catFiles: MemFile[] = [];

    if (cat.source === "workspace-root") {
      for (const fname of cat.files) {
        const fullPath = path.join(coreRoot, fname);
        try {
          const stat = await fs.stat(fullPath);
          catFiles.push({
            name: fname,
            path: `ws:${fname}`,
            modified: stat.mtime.toISOString(),
            category: cat.id,
          });
        } catch { /* skip missing */ }
      }
    } else if (cat.source === "memory-root") {
      // Daily logs: files directly in memory/ matching date pattern
      try {
        const entries = await fs.readdir(memRoot, { withFileTypes: true });
        const dateFiles = entries
          .filter(e => e.isFile() && /\.md$/i.test(e.name) && /^\d{4}-\d{2}-\d{2}/.test(e.name))
          .sort((a, b) => b.name.localeCompare(a.name));
        for (const entry of dateFiles) {
          const stat = await fs.stat(path.join(memRoot, entry.name));
          catFiles.push({
            name: entry.name,
            path: `mem:${entry.name}`,
            modified: stat.mtime.toISOString(),
            category: cat.id,
          });
        }
      } catch { /* skip */ }
    } else if (cat.source === "memory-projects") {
      // Project subdirs
      const projectsDir = path.join(memRoot, "projects");
      try {
        const subdirs = await fs.readdir(projectsDir, { withFileTypes: true });
        for (const subdir of subdirs.filter(e => e.isDirectory())) {
          const subdirPath = path.join(projectsDir, subdir.name);
          const files = await fs.readdir(subdirPath, { withFileTypes: true });
          const mdFiles = files.filter(e => e.isFile() && /\.md$/i.test(e.name))
            .sort((a, b) => b.name.localeCompare(a.name));
          for (const file of mdFiles) {
            const stat = await fs.stat(path.join(subdirPath, file.name));
            catFiles.push({
              name: file.name,
              path: `proj:${subdir.name}/${file.name}`,
              modified: stat.mtime.toISOString(),
              category: cat.id,
              desc: subdir.name,
            });
          }
        }
      } catch { /* skip */ }
    } else if (cat.source === "memory-subdir") {
      for (const fname of cat.files) {
        const fullPath = path.join(memRoot, fname);
        try {
          const stat = await fs.stat(fullPath);
          catFiles.push({
            name: fname,
            path: `mem:${fname}`,
            modified: stat.mtime.toISOString(),
            category: cat.id,
          });
        } catch { /* skip */ }
      }
    }

    result.push({ category: cat.id, files: catFiles });
  }

  return result;
}

export async function readMemoryFile(logicalPath: string): Promise<string> {
  const allowedFiles = (await listMemoryByCategory()).flatMap((category) => category.files);
  const allowed = allowedFiles.find((file) => file.path === logicalPath);
  if (!allowed) {
    throw new Error("Access denied");
  }

  const memoryDir = ROOTS.memory;
  const layout = await detectLayout(memoryDir);
  const memRoot = layout === "hetzner" ? memoryDir : path.join(memoryDir, MEMORY_SUBDIR);
  const coreRoot = layout === "hetzner" ? path.join(memoryDir, "core") : memoryDir;

  if (logicalPath.startsWith("ws:")) {
    const fname = logicalPath.slice(3);
    const fullPath = safeResolve(coreRoot, fname);
    return fs.readFile(fullPath, "utf8");
  } else if (logicalPath.startsWith("mem:")) {
    const rel = logicalPath.slice(4);
    const fullPath = safeResolve(memRoot, rel);
    return fs.readFile(fullPath, "utf8");
  } else if (logicalPath.startsWith("proj:")) {
    const rel = logicalPath.slice(5);
    const projectsRoot = path.join(memRoot, "projects");
    const fullPath = safeResolve(projectsRoot, rel);
    return fs.readFile(fullPath, "utf8");
  }
  throw new Error("Invalid path prefix");
}

export async function appendDailyMemoryEntry(title: string, body: string): Promise<{ path: string; content: string }> {
  const memoryDir = ROOTS.memory;
  const layout = await detectLayout(memoryDir);
  const memRoot = layout === "hetzner" ? memoryDir : path.join(memoryDir, MEMORY_SUBDIR);
  const today = new Date().toISOString().slice(0, 10);
  const filePath = safeResolve(memRoot, `${today}.md`);
  const heading = title.trim() || "Voice Call";
  const normalizedBody = body.trim();
  const entry = [
    "",
    `## ${new Date().toISOString()} - ${heading}`,
    "",
    normalizedBody || "_Keine Details gespeichert._",
    "",
  ].join("\n");

  await fs.mkdir(memRoot, { recursive: true });
  await fs.appendFile(filePath, entry, "utf8");

  return {
    path: `mem:${today}.md`,
    content: entry,
  };
}

export async function getMemoryDiagnostics(): Promise<MemoryDiagnostics> {
  const memoryDir = ROOTS.memory;
  const layout = await detectLayout(memoryDir);
  const memRoot = layout === "hetzner" ? memoryDir : path.join(memoryDir, MEMORY_SUBDIR);
  const coreRoot = layout === "hetzner" ? path.join(memoryDir, "core") : memoryDir;
  let writable = false;
  let writeError: string | null = null;
  const probePath = path.join(memRoot, `.mc-write-probe-${Date.now()}.tmp`);

  try {
    await fs.mkdir(memRoot, { recursive: true });
    await fs.writeFile(probePath, "ok", "utf8");
    await fs.unlink(probePath);
    writable = true;
  } catch (error) {
    writeError = error instanceof Error ? error.message : String(error);
  }

  const byCategory = await listMemoryByCategory();
  const allFiles = byCategory.flatMap((category) => category.files);
  const newestFiles = [...allFiles].sort((a, b) => b.modified.localeCompare(a.modified)).slice(0, 12);
  const recentVoiceCalls: MemoryDiagnostics["recentVoiceCalls"] = [];

  for (const file of newestFiles.slice(0, 20)) {
    try {
      const content = await readMemoryFile(file.path);
      const markerIndex = content.lastIndexOf("VOICE_CALL_MEMORY_V1");
      if (markerIndex >= 0) {
        recentVoiceCalls.push({
          file: file.path,
          modified: file.modified,
          preview: content.slice(Math.max(0, markerIndex - 120), markerIndex + 700),
        });
      }
    } catch {
      // best effort diagnostics
    }
  }

  return {
    memoryDir,
    layout,
    memRoot,
    coreRoot,
    writable,
    writeError,
    fileCount: allFiles.length,
    newestFiles,
    recentVoiceCalls,
  };
}

// Legacy — kept for backward compat
export async function listMemory() {
  const byCategory = await listMemoryByCategory();
  return {
    root: ROOTS.memory,
    files: byCategory.flatMap((category) =>
      category.files.map((file) => ({
        name: file.name,
        path: file.path,
        modified: file.modified,
      })),
    ),
  };
}

export async function readMemory(filePath: string) {
  return readMemoryFile(filePath.startsWith("mem:") || filePath.startsWith("proj:") || filePath.startsWith("ws:") ? filePath : `mem:${filePath}`);
}
