"use client";

import { useEffect, useRef, useState } from "react";

const PROJECTS = ["Allgemein", "ModulAI", "Architekt Connect", "BPP", "Concord"];

type Props = {
  onSave: (title: string, project: string) => Promise<void>;
  onClose: () => void;
};

export function CapturePill({ onSave, onClose }: Props) {
  const [title, setTitle] = useState("");
  const [project, setProject] = useState("Allgemein");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const submit = async () => {
    if (!title.trim() || saving) return;
    setSaving(true);
    await onSave(title.trim(), project);
    setSaving(false);
    onClose();
  };

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
      padding: "10px 14px", borderRadius: 12,
      background: "#141720", border: "1px solid #2a3040",
      boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
      animation: "pill-in 0.12s ease-out",
    }}>
      <style>{`@keyframes pill-in { from { opacity:0; transform:translateY(-4px); } to { opacity:1; transform:translateY(0); } }`}</style>
      <span style={{ fontSize: 15, flexShrink: 0 }}>✎</span>
      <input
        ref={inputRef}
        value={title}
        onChange={e => setTitle(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") submit(); }}
        placeholder="Task eingeben… (Enter = speichern)"
        style={{
          flex: 1, minWidth: 180, background: "transparent", border: "none",
          color: "#f0f2f5", fontSize: 14, outline: "none",
        }}
      />
      <select
        value={project}
        onChange={e => setProject(e.target.value)}
        style={{
          padding: "4px 8px", borderRadius: 6, border: "1px solid #1e2128",
          background: "#0d0f12", color: "#8b90a0", fontSize: 12, outline: "none",
        }}
      >
        {PROJECTS.map(p => <option key={p} value={p}>{p}</option>)}
      </select>
      <button onClick={submit} disabled={!title.trim() || saving} style={{
        padding: "5px 14px", borderRadius: 6, border: "none",
        background: title.trim() ? "#10B981" : "#1a1d27",
        color: title.trim() ? "#fff" : "#4a5068",
        fontSize: 12, fontWeight: 600, cursor: title.trim() ? "pointer" : "default",
        transition: "all 0.15s",
      }}>
        {saving ? "…" : "Speichern"}
      </button>
      <button onClick={onClose} style={{
        padding: "5px 8px", borderRadius: 6, border: "none",
        background: "transparent", color: "#4a5068", fontSize: 13, cursor: "pointer",
      }}>✕</button>
    </div>
  );
}
