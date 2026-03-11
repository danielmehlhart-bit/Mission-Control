"use client";
import { useRef, useState } from "react";

interface Props {
  onSave: (title: string, project: string) => Promise<void>;
  onClose: () => void;
  projects?: string[];
}

export function CapturePill({ onSave, onClose, projects = ["Allgemein"] }: Props) {
  const [title, setTitle] = useState("");
  const [project, setProject] = useState("Allgemein");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const save = async () => {
    if (!title.trim()) return;
    setSaving(true);
    await onSave(title.trim(), project);
    setTitle("");
    setProject("Allgemein");
    setSaving(false);
    inputRef.current?.focus();
  };

  return (
    <div className="mc-surface-1" style={{
      display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
      padding: "10px 14px",
    }}>
      <input
        ref={inputRef}
        autoFocus
        value={title}
        onChange={e => setTitle(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") onClose(); }}
        placeholder="Task beschreiben…"
        style={{
          flex: "1 1 200px", background: "none", border: "none", outline: "none",
          color: "var(--text-1)", fontSize: 14,
        }}
      />
      <select
        value={project}
        onChange={e => setProject(e.target.value)}
        style={{
          background: "var(--surface-0)", border: "1px solid var(--border-strong)", borderRadius: "var(--radius-sm)",
          color: "var(--text-2)", fontSize: 12, padding: "5px 10px", outline: "none",
        }}
      >
        {projects.map(p => <option key={p} value={p}>{p}</option>)}
      </select>
      <button
        onClick={save}
        disabled={saving || !title.trim()}
        style={{
          padding: "6px 16px", borderRadius: "var(--radius-sm)", background: "var(--accent)", border: "none",
          color: "#fff", fontSize: 13, fontWeight: 600, cursor: saving ? "default" : "pointer",
          opacity: saving || !title.trim() ? 0.6 : 1,
        }}
      >
        {saving ? "…" : "Add"}
      </button>
      <button
        onClick={onClose}
        style={{ background: "none", border: "none", color: "var(--text-3)", cursor: "pointer", fontSize: 16, lineHeight: 1 }}
      >✕</button>
    </div>
  );
}
