"use client";

import { useEffect, useRef, useState } from "react";

type MemFile = { name: string; path: string; modified: string };

function formatPath(path: string): string {
  if (path === "MEMORY.md") return "🧠 MEMORY.md";
  const match = path.match(/memory\/(\d{4}-\d{2}-\d{2})\.md$/);
  if (match) return `📅 ${new Date(match[1]).toLocaleDateString("de-DE", { day: "numeric", month: "short", year: "numeric" })}`;
  return path;
}

export default function MemoryPage() {
  const [files, setFiles] = useState<MemFile[]>([]);
  const [selected, setSelected] = useState<MemFile | null>(null);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(false);
  const [listWidth, setListWidth] = useState(240);
  const dragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("memListWidth");
    if (saved) setListWidth(parseInt(saved, 10));
    fetch("/api/memory").then(r => r.json()).then(d => {
      const sorted = (d.files ?? []).sort((a: MemFile, b: MemFile) => b.name.localeCompare(a.name));
      setFiles(sorted);
      if (sorted.length) setSelected(sorted.find((f: MemFile) => f.path === "MEMORY.md") ?? sorted[0]);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!selected) return;
    setContentLoading(true);
    fetch(`/api/memory?file=${encodeURIComponent(selected.path)}`).then(r => r.json()).then(d => {
      setContent(d.content ?? "");
      setContentLoading(false);
    });
  }, [selected]);

  const onDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    const onMove = (ev: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const w = Math.max(160, Math.min(400, ev.clientX - rect.left));
      setListWidth(w);
    };
    const onUp = () => {
      dragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      localStorage.setItem("memListWidth", String(listWidth));
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  // Simple markdown-ish rendering
  const renderMd = (text: string) => {
    const lines = text.split("\n");
    return lines.map((line, i) => {
      if (line.startsWith("## ")) return <h2 key={i} style={{ fontSize: 15, fontWeight: 700, color: "#f0f2f5", marginTop: 20, marginBottom: 6, borderBottom: "1px solid #1e2128", paddingBottom: 4 }}>{line.slice(3)}</h2>;
      if (line.startsWith("### ")) return <h3 key={i} style={{ fontSize: 13, fontWeight: 600, color: "#c8ccd6", marginTop: 14, marginBottom: 4 }}>{line.slice(4)}</h3>;
      if (line.startsWith("# ")) return <h1 key={i} style={{ fontSize: 18, fontWeight: 700, color: "#f0f2f5", marginBottom: 12 }}>{line.slice(2)}</h1>;
      if (line.startsWith("- ")) return <div key={i} style={{ fontSize: 13, color: "#8b90a0", lineHeight: 1.6, paddingLeft: 12, position: "relative" }}><span style={{ position: "absolute", left: 0, color: "#4a5068" }}>·</span>{line.slice(2)}</div>;
      if (line.startsWith("**")) return <p key={i} style={{ fontSize: 13, color: "#c8ccd6", lineHeight: 1.6, fontWeight: 600 }}>{line}</p>;
      if (line.trim() === "") return <div key={i} style={{ height: 6 }} />;
      return <p key={i} style={{ fontSize: 13, color: "#8b90a0", lineHeight: 1.6 }}>{line}</p>;
    });
  };

  return (
    <div style={{ padding: "16px 20px", height: "calc(100vh - 52px)", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.3px" }}>Memory</h1>
        <span style={{ fontSize: 11, color: "#4a5068", background: "#141720", border: "1px solid #1e2128", borderRadius: 999, padding: "3px 10px" }}>
          Pi → Dashboard sync · täglich
        </span>
      </div>

      <div ref={containerRef} style={{ flex: 1, display: "flex", minHeight: 0, borderRadius: 12, overflow: "hidden", border: "1px solid #1e2128" }}>
        {/* File list */}
        <div style={{ width: listWidth, flexShrink: 0, background: "#141720", overflowY: "auto", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "10px 14px 6px", fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: "#4a5068" }}>Dateien</div>
          {loading ? <p style={{ padding: 14, fontSize: 13, color: "#8b90a0" }}>Loading…</p> : files.map(f => {
            const active = selected?.path === f.path;
            return (
              <button key={f.path} onClick={() => setSelected(f)} style={{
                width: "100%", textAlign: "left", padding: "8px 14px",
                borderLeft: `2px solid ${active ? "#10B981" : "transparent"}`,
                background: active ? "rgba(16,185,129,0.06)" : "transparent",
                borderBottom: "1px solid #16191f", cursor: "pointer",
              }}>
                <div style={{ fontSize: 12.5, fontWeight: 500, color: active ? "#f0f2f5" : "#8b90a0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {formatPath(f.path)}
                </div>
                <div style={{ fontSize: 10, color: "#4a5068", marginTop: 2 }}>
                  {new Date(f.modified).toLocaleDateString("de-DE", { day: "numeric", month: "short" })}
                </div>
              </button>
            );
          })}
        </div>

        {/* Drag handle */}
        <div style={{ width: 5, flexShrink: 0, background: "#1e2128", cursor: "col-resize", display: "flex", alignItems: "center", justifyContent: "center" }}
          onMouseDown={onDragStart}
          onMouseEnter={e => e.currentTarget.style.background = "#2a2d38"}
          onMouseLeave={e => e.currentTarget.style.background = "#1e2128"}>
          <span style={{ fontSize: 10, color: "#4a5068", writingMode: "vertical-rl" }}>⋮⋮</span>
        </div>

        {/* Content */}
        <div style={{ flex: 1, background: "#0d0f12", overflowY: "auto", padding: "20px 28px", minWidth: 0 }}>
          {contentLoading ? <p style={{ color: "#8b90a0", fontSize: 13 }}>Loading…</p>
            : content ? <div>{renderMd(content)}</div>
            : <p style={{ color: "#4a5068", fontSize: 13 }}>Datei auswählen.</p>}
        </div>
      </div>
    </div>
  );
}
