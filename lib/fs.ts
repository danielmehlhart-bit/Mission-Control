import fs from "node:fs/promises";
import path from "node:path";

const DEFAULT_WORKSPACE = "/home/hartner/.openclaw/workspace";

const ROOTS = {
  briefings: process.env.BRIEFINGS_DIR ?? DEFAULT_WORKSPACE,
  memory: process.env.MEMORY_DIR ?? DEFAULT_WORKSPACE,
};

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

export async function listMemory() {
  const root = ROOTS.memory;
  const files = await walkDir(root);
  const filtered = files.filter((file) =>
    /memory\.md$/i.test(file) ||
    /logs\/.*\.md$/i.test(file) ||
    /daily\/.*\.md$/i.test(file) ||
    /\.md$/i.test(file)
  );
  return {
    root,
    files: await Promise.all(
      filtered.map(async (file) => {
        const stat = await fs.stat(file);
        return {
          name: path.basename(file),
          path: path.relative(root, file),
          modified: stat.mtime.toISOString(),
        };
      })
    ),
  };
}

export async function readMemory(filePath: string) {
  const root = ROOTS.memory;
  const fullPath = safeResolve(root, filePath);
  return fs.readFile(fullPath, "utf8");
}
