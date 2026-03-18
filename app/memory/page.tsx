"use client";

import { useEffect, useState, useCallback } from "react";

type MemFile = {
  name: string;
  path: string;
  modified: string;
  category: string;
  desc?: string;
};

type Category = {
  id: string;
  label: string;
  emoji: string;
  desc: string;
};

type CategoryFiles = {
  category: string;
  files: MemFile[];
};

function formatFileName(file: MemFile): string {
  // Daily log: 2026-03-18.md → "18. Mär 2026"
  const dateMatch = file.name.match(/^(\d{4}-\d{2}-\d{2})(.*?)\.md$/);
  if (dateMatch && file.category === "daily") {
    const d = new Date(dateMatch[1]);
    const suffix = dateMatch[2] ? ` · ${dateMatch[2].replace(/^[-_]/, "")}` : "";
    return d.toLocaleDateString("de-DE", { day: "numeric", month: "short", year: "numeric" }) + suffix;
  }
  return file.name.replace(/\.md$/, "");
}

function formatModified(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("de-DE", { day: "numeric", month: "short" });
}

// Minimal markdown renderer
function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code block
    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      elements.push(
        <pre key={i} style={{
          background: "#0d0f14", border: "1px solid #1e2535", borderRadius: 6,
          padding: "12px 14px", overflowX: "auto", margin: "10px 0",
          fontSize: 11.5, lineHeight: 1.6, color: "#a5b4fc",
          fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
        }}>
          {lang && <span style={{ color: "#4a5568", display: "block", marginBottom: 4, fontSize: 10, textTransform: "uppercase" }}>{lang}</span>}
          {codeLines.join("\n")}
        </pre>
      );
      i++;
      continue;
    }

    if (line.startsWith("# ")) {
      elements.push(<h1 key={i} style={{ fontSize: 19, fontWeight: 700, color: "#f0f2f5", marginBottom: 10, lineHeight: 1.3 }}>{inlineMarkdown(line.slice(2))}</h1>);
    } else if (line.startsWith("## ")) {
      elements.push(<h2 key={i} style={{ fontSize: 14, fontWeight: 600, color: "#c8d0e0", marginTop: 22, marginBottom: 8, paddingBottom: 5, borderBottom: "1px solid #1e2535" }}>{inlineMarkdown(line.slice(3))}</h2>);
    } else if (line.startsWith("### ")) {
      elements.push(<h3 key={i} style={{ fontSize: 13, fontWeight: 600, color: "#a0aec0", marginTop: 14, marginBottom: 4 }}>{inlineMarkdown(line.slice(4))}</h3>);
    } else if (line.startsWith("#### ")) {
      elements.push(<h4 key={i} style={{ fontSize: 12, fontWeight: 600, color: "#8892a4", marginTop: 10, marginBottom: 3 }}>{inlineMarkdown(line.slice(5))}</h4>);
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      elements.push(
        <div key={i} style={{ display: "flex", gap: 8, fontSize: 13, color: "#8892a4", lineHeight: 1.65, paddingLeft: 4, marginBottom: 1 }}>
          <span style={{ color: "#4a5568", flexShrink: 0, marginTop: 2 }}>·</span>
          <span>{inlineMarkdown(line.slice(2))}</span>
        </div>
      );
    } else if (/^\s{2,4}[-*] /.test(line)) {
      elements.push(
        <div key={i} style={{ display: "flex", gap: 8, fontSize: 12.5, color: "#6b7280", lineHeight: 1.65, paddingLeft: 20, marginBottom: 1 }}>
          <span style={{ color: "#374151", flexShrink: 0 }}>›</span>
          <span>{inlineMarkdown(line.replace(/^\s+[-*] /, ""))}</span>
        </div>
      );
    } else if (line.startsWith("> ")) {
      elements.push(
        <div key={i} style={{ borderLeft: "3px solid #2d3748", paddingLeft: 12, marginLeft: 4, marginBottom: 4, color: "#6b7280", fontSize: 13, fontStyle: "italic" }}>
          {inlineMarkdown(line.slice(2))}
        </div>
      );
    } else if (line.startsWith("---") || line.startsWith("***")) {
      elements.push(<hr key={i} style={{ border: "none", borderTop: "1px solid #1e2535", margin: "16px 0" }} />);
    } else if (line.startsWith("| ") || line.startsWith("|--")) {
      // table — skip separator rows, render data rows
      if (!line.startsWith("|--") && !line.match(/^\|[-| :]+\|$/)) {
        const cells = line.split("|").filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
        const isHeader = lines[i + 1]?.match(/^\|[-| :]+\|$/);
        elements.push(
          <div key={i} style={{ display: "flex", gap: 0, fontSize: 12, borderBottom: `1px solid ${isHeader ? "#2d3748" : "#16191f"}`, padding: "5px 0" }}>
            {cells.map((cell, ci) => (
              <div key={ci} style={{ flex: 1, color: isHeader ? "#c8d0e0" : "#8892a4", fontWeight: isHeader ? 600 : 400, paddingRight: 8 }}>
                {inlineMarkdown(cell.trim())}
              </div>
            ))}
          </div>
        );
      }
    } else if (line.trim() === "") {
      elements.push(<div key={i} style={{ height: 5 }} />);
    } else {
      elements.push(<p key={i} style={{ fontSize: 13, color: "#8892a4", lineHeight: 1.7, marginBottom: 2 }}>{inlineMarkdown(line)}</p>);
    }
    i++;
  }

  return elements;
}

function inlineMarkdown(text: string): React.ReactNode {
  // Bold, italic, inline code
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} style={{ color: "#c8d0e0", fontWeight: 600 }}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={i} style={{ background: "#1a1f2e", color: "#a78bfa", padding: "1px 5px", borderRadius: 3, fontSize: "0.9em", fontFamily: "monospace" }}>{part.slice(1, -1)}</code>;
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={i} style={{ color: "#6b7280" }}>{part.slice(1, -1)}</em>;
    }
    return part;
  });
}

// ─────────────────────────────────────────────────────────────
export default function MemoryPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [filesByCategory, setFilesByCategory] = useState<CategoryFiles[]>([]);
  const [activeCat, setActiveCat] = useState<string>("core");
  const [selectedFile, setSelectedFile] = useState<MemFile | null>(null);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(false);

  useEffect(() => {
    fetch("/api/memory/categories")
      .then(r => r.json())
      .then(d => {
        setCategories(d.categories ?? []);
        setFilesByCategory(d.files ?? []);
        setLoading(false);
        // Auto-select MEMORY.md
        const coreFiles = (d.files ?? []).find((c: CategoryFiles) => c.category === "core")?.files ?? [];
        const mem = coreFiles.find((f: MemFile) => f.name === "MEMORY.md");
        if (mem) setSelectedFile(mem);
      });
  }, []);

  const loadFile = useCallback((file: MemFile) => {
    setSelectedFile(file);
    setContentLoading(true);
    fetch(`/api/memory/categories?file=${encodeURIComponent(file.path)}`)
      .then(r => r.json())
      .then(d => {
        setContent(d.content ?? "");
        setContentLoading(false);
      });
  }, []);

  useEffect(() => {
    if (selectedFile) loadFile(selectedFile);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentCatFiles = filesByCategory.find(c => c.category === activeCat)?.files ?? [];
  const currentCat = categories.find(c => c.id === activeCat);

  // Group project files by subdir (desc field)
  const projectGroups = activeCat === "projects"
    ? currentCatFiles.reduce((acc: Record<string, MemFile[]>, f) => {
        const key = f.desc ?? "other";
        if (!acc[key]) acc[key] = [];
        acc[key].push(f);
        return acc;
      }, {})
    : null;

  return (
    <div style={{
      display: "flex",
      height: "calc(100vh - 52px)",
      background: "#141720",
      overflow: "hidden",
    }}>

      {/* ── Pane 1: Kategorien ── */}
      <div style={{
        width: 200,
        flexShrink: 0,
        background: "#10131b",
        borderRight: "1px solid #1e2535",
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
      }}>
        <div style={{ padding: "14px 16px 8px", fontSize: 10, fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.12em" }}>
          Memory
        </div>

        {loading
          ? <div style={{ padding: "12px 16px", fontSize: 13, color: "#4a5568" }}>Lade…</div>
          : categories.map(cat => {
            const catFiles = filesByCategory.find(c => c.category === cat.id)?.files ?? [];
            const active = activeCat === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  setActiveCat(cat.id);
                  // auto-select first file
                  if (catFiles.length > 0 && (!selectedFile || selectedFile.category !== cat.id)) {
                    loadFile(catFiles[0]);
                  }
                }}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  padding: "10px 16px",
                  borderLeft: `2px solid ${active ? "#6366f1" : "transparent"}`,
                  background: active ? "rgba(99,102,241,0.08)" : "transparent",
                  width: "100%",
                  textAlign: "left",
                  cursor: "pointer",
                  transition: "background 0.12s",
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
              >
                <span style={{ fontSize: 16, lineHeight: 1, marginTop: 1 }}>{cat.emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: active ? "#e2e8f0" : "#c8d0e0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {cat.label}
                  </div>
                  <div style={{ fontSize: 11, color: "#4a5568", marginTop: 2 }}>{cat.desc}</div>
                  <div style={{ fontSize: 10, color: "#374151", marginTop: 3, background: "#1a1f2e", borderRadius: 8, padding: "1px 6px", display: "inline-block" }}>
                    {catFiles.length} {catFiles.length === 1 ? "File" : "Files"}
                  </div>
                </div>
              </button>
            );
          })
        }
      </div>

      {/* ── Pane 2: Files ── */}
      <div style={{
        width: 210,
        flexShrink: 0,
        background: "#12161f",
        borderRight: "1px solid #1e2535",
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
      }}>
        <div style={{ padding: "14px 16px 8px", fontSize: 10, fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.12em", flexShrink: 0 }}>
          {currentCat ? `${currentCat.emoji} ${currentCat.label}` : "Files"}
        </div>

        {loading ? null : activeCat === "projects" && projectGroups ? (
          // Grouped by project subdir
          Object.entries(projectGroups).map(([group, files]) => (
            <div key={group}>
              <div style={{ padding: "6px 16px 2px", fontSize: 10, fontWeight: 600, color: "#374151", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                {group}
              </div>
              {files.map(file => <FileItem key={file.path} file={file} active={selectedFile?.path === file.path} onClick={() => loadFile(file)} />)}
            </div>
          ))
        ) : (
          currentCatFiles.map(file => (
            <FileItem key={file.path} file={file} active={selectedFile?.path === file.path} onClick={() => loadFile(file)} />
          ))
        )}

        {!loading && currentCatFiles.length === 0 && (
          <div style={{ padding: "12px 16px", fontSize: 12, color: "#374151" }}>Keine Files.</div>
        )}
      </div>

      {/* ── Pane 3: Content ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Header */}
        <div style={{
          padding: "10px 20px",
          borderBottom: "1px solid #1e2535",
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexShrink: 0,
          background: "#141720",
        }}>
          {selectedFile && (
            <>
              <span style={{ fontSize: 12, color: "#4a5568" }}>{currentCat?.emoji} {currentCat?.label}</span>
              <span style={{ color: "#2d3748" }}>›</span>
              <span style={{ fontSize: 12, fontWeight: 500, color: "#a0aec0" }}>{formatFileName(selectedFile)}</span>
              <span style={{ fontSize: 10, color: "#374151", marginLeft: 4 }}>
                {formatModified(selectedFile.modified)}
              </span>
            </>
          )}
          <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
            <span style={{ fontSize: 10, color: "#374151", background: "#1a1f2e", border: "1px solid #1e2535", borderRadius: 8, padding: "2px 8px" }}>
              read-only
            </span>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px", background: "#0d0f14" }}>
          {contentLoading ? (
            <div style={{ color: "#4a5568", fontSize: 13 }}>Lade…</div>
          ) : content ? (
            <div style={{ maxWidth: 740 }}>
              {renderMarkdown(content)}
            </div>
          ) : !selectedFile ? (
            <div style={{ color: "#374151", fontSize: 13 }}>← Datei auswählen</div>
          ) : null}
        </div>
      </div>

    </div>
  );
}

// ─── FileItem Sub-Component ───────────────────────────────────
function FileItem({ file, active, onClick }: { file: MemFile; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 16px",
        borderLeft: `2px solid ${active ? "#6366f1" : "transparent"}`,
        background: active ? "rgba(99,102,241,0.06)" : "transparent",
        width: "100%",
        textAlign: "left",
        cursor: "pointer",
        borderBottom: "1px solid #13161e",
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.025)"; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
    >
      <span style={{ fontSize: 11, color: "#374151" }}>📄</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: active ? "#e2e8f0" : "#8892a4", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {formatFileName(file)}
        </div>
        <div style={{ fontSize: 10, color: "#374151", marginTop: 1 }}>
          {formatModified(file.modified)}
        </div>
      </div>
    </button>
  );
}
