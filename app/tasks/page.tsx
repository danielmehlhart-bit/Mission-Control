"use client";

import { useEffect, useState } from "react";
import { CapturePill } from "@/components/capture-pill";

type Task = {
  id: string; title: string; project: string;
  status: "todo" | "done"; createdAt: string; doneAt?: string; notes?: string;
};

type Project = {
  id: string; name: string; color: string; status: string;
};

const DEFAULT_COLOR = "#64748b";
const ALLGEMEIN = "Allgemein";

function hexToStyle(hex: string) {
  return {
    borderColor: hex + "55",
    backgroundColor: hex + "22",
    color: hex,
  };
}

const EMPTY_EDIT = { title: "", project: ALLGEMEIN, notes: "" };

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [showCapture, setShowCapture] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_EDIT);
  const [editSaving, setEditSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const projectNames = [ALLGEMEIN, ...projects.map(p => p.name)];

  function getProjectStyle(name: string) {
    const p = projects.find(p => p.name === name);
    return hexToStyle(p?.color ?? DEFAULT_COLOR);
  }

  const load = async () => {
    try {
      const [tasksRes, projectsRes] = await Promise.all([
        fetch("/api/tasks", { cache: "no-store" }),
        fetch("/api/projects", { cache: "no-store" }),
      ]);
      const tasksData = await tasksRes.json();
      const projectsData = await projectsRes.json();
      setTasks(tasksData.tasks ?? []);
      setProjects(projectsData.projects ?? []);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const filtered = filter === "All" ? tasks : tasks.filter(t => t.project === filter);
  const todoTasks = filtered.filter(t => t.status === "todo");
  const doneTasks = filtered.filter(t => t.status === "done");

  const addTask = async (title: string, project: string) => {
    const optimistic: Task = { id: "tmp-" + Date.now(), title, project, status: "todo", createdAt: new Date().toISOString() };
    setTasks(prev => [optimistic, ...prev]);
    const res = await fetch("/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, project }) });
    const data = await res.json();
    setTasks(prev => prev.map(t => t.id === optimistic.id ? data.task : t));
  };

  const toggleTask = async (task: Task) => {
    const newStatus = task.status === "todo" ? "done" : "todo";
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
    await fetch(`/api/tasks?id=${task.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: newStatus }) });
  };

  const openEdit = (task: Task) => {
    setEditTask(task);
    setEditForm({ title: task.title, project: task.project, notes: task.notes ?? "" });
  };

  const saveEdit = async () => {
    if (!editTask || !editForm.title.trim()) return;
    setEditSaving(true);
    const updated = { title: editForm.title.trim(), project: editForm.project, notes: editForm.notes };
    setTasks(prev => prev.map(t => t.id === editTask.id ? { ...t, ...updated } : t));
    await fetch(`/api/tasks?id=${editTask.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updated) });
    setEditSaving(false);
    setEditTask(null);
  };

  const deleteTask = async (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    setDeleteConfirm(null);
    await fetch(`/api/tasks?id=${id}`, { method: "DELETE" });
  };

  const TaskRow = ({ task }: { task: Task }) => {
    const done = task.status === "done";
    const badgeStyle = getProjectStyle(task.project);
    return (
      <div style={{
        display: "flex", flexDirection: "column", borderRadius: "var(--radius-sm)", padding: "10px 12px",
        border: `1px solid ${done ? "var(--border-muted)" : "var(--border-strong)"}`,
        background: done ? "color-mix(in srgb, var(--surface-1) 65%, transparent)" : "var(--surface-1)",
        transition: "all var(--motion-fast) var(--ease-standard)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => toggleTask(task)} style={{
            display: "flex", width: 20, height: 20, alignItems: "center", justifyContent: "center", flexShrink: 0,
            borderRadius: 6, border: `2px solid ${done ? "color-mix(in srgb, var(--accent) 60%, transparent)" : "var(--text-3)"}`,
            background: done ? "color-mix(in srgb, var(--accent) 18%, transparent)" : "transparent", color: "var(--accent)",
          }}>
            {done && <span style={{ fontSize: 11 }}>✓</span>}
          </button>
          <span style={{ flex: 1, fontSize: 14, color: done ? "var(--text-3)" : "var(--text-1)", textDecoration: done ? "line-through" : "none" }}>{task.title}</span>
          <span style={{ ...badgeStyle, borderWidth: 1, borderStyle: "solid", borderRadius: 999, padding: "2px 8px", fontSize: 11, fontWeight: 500 }}>
            {task.project}
          </span>
          <div style={{ display: "flex", gap: 4 }}>
            <button onClick={() => openEdit(task)} style={{ borderRadius: 6, padding: 4, color: "var(--text-2)", fontSize: 11 }}>✏️</button>
            {deleteConfirm === task.id ? (
              <>
                <button onClick={() => deleteTask(task.id)} style={{ borderRadius: 6, padding: "4px 8px", color: "var(--state-danger)", fontSize: 11, fontWeight: 600 }}>Löschen?</button>
                <button onClick={() => setDeleteConfirm(null)} style={{ borderRadius: 6, padding: 4, color: "var(--text-2)", fontSize: 11 }}>✕</button>
              </>
            ) : (
              <button onClick={() => setDeleteConfirm(task.id)} style={{ borderRadius: 6, padding: 4, color: "var(--text-3)", fontSize: 11 }}>🗑</button>
            )}
          </div>
        </div>
        {task.notes && !done && (
          <p style={{ marginTop: 6, marginLeft: 32, fontSize: 12, color: "var(--text-3)", lineHeight: 1.6 }}>{task.notes}</p>
        )}
      </div>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <header style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 30, fontWeight: 600, color: "var(--text-1)" }}>Task Board</h1>
          <p style={{ marginTop: 8, fontSize: 14, color: "var(--text-2)" }}>Deine offenen Tasks — projektübergreifend.</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ borderRadius: 999, border: "1px solid var(--border-strong)", background: "var(--surface-2)", padding: "4px 12px", fontSize: 12, color: "var(--text-1)" }}>{todoTasks.length} offen</span>
          <button onClick={() => setShowCapture(v => !v)} style={{ borderRadius: "var(--radius-sm)", background: "var(--accent)", color: "white", fontSize: 14, fontWeight: 500, padding: "8px 16px" }}>
            + New Task
          </button>
        </div>
      </header>

      {showCapture && (
        <CapturePill onSave={addTask} onClose={() => setShowCapture(false)} projects={projectNames} />
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {["All", ...projectNames].map(p => (
          <button key={p} onClick={() => setFilter(p)} style={{
            borderRadius: 999, border: "1px solid",
            borderColor: filter === p ? "color-mix(in srgb, var(--accent) 50%, transparent)" : "var(--border-strong)",
            background: filter === p ? "var(--accent-dim)" : "transparent",
            color: filter === p ? "color-mix(in srgb, var(--accent) 72%, white)" : "var(--text-2)",
            padding: "4px 12px", fontSize: 12, fontWeight: 500,
          }}>
            {p}{p !== "All" && p !== ALLGEMEIN && <span style={{ marginLeft: 6, color: "var(--text-3)" }}>{tasks.filter(t => t.project === p && t.status === "todo").length}</span>}
          </button>
        ))}
      </div>

      {loading ? <div style={{ fontSize: 14, color: "var(--text-2)" }}>Loading…</div> : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {todoTasks.length === 0 && doneTasks.length === 0 ? (
            <div style={{ borderRadius: "var(--radius-lg)", border: "1px solid var(--border-muted)", background: "color-mix(in srgb, var(--surface-1) 65%, transparent)", padding: "64px 0", textAlign: "center", color: "var(--text-3)" }}>Keine offenen Tasks. 🎉</div>
          ) : (
            <>
              {todoTasks.map(t => <TaskRow key={t.id} task={t} />)}
              {doneTasks.length > 0 && (
                <>
                  <div style={{ paddingTop: 8, paddingBottom: 4, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.3em", color: "var(--text-3)" }}>Erledigt</div>
                  {doneTasks.map(t => <TaskRow key={t.id} task={t} />)}
                </>
              )}
            </>
          )}
        </div>
      )}

      {editTask && (
        <div style={{ position: "fixed", inset: 0, background: "color-mix(in srgb, black 70%, transparent)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20 }} onClick={() => setEditTask(null)}>
          <div style={{ background: "var(--surface-1)", border: "1px solid var(--border-strong)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-strong)", padding: 24, width: "100%", maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-1)", marginBottom: 18 }}>Task bearbeiten</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, color: "var(--text-2)", marginBottom: 4, display: "block" }}>Titel</label>
                <input value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                  onKeyDown={e => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditTask(null); }}
                  autoFocus
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-strong)", background: "var(--surface-0)", color: "var(--text-1)", fontSize: 14, outline: "none", boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, color: "var(--text-2)", marginBottom: 4, display: "block" }}>Projekt</label>
                <select value={editForm.project} onChange={e => setEditForm(f => ({ ...f, project: e.target.value }))}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-strong)", background: "var(--surface-0)", color: "var(--text-1)", fontSize: 13, outline: "none" }}>
                  {projectNames.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: "var(--text-2)", marginBottom: 4, display: "block" }}>Notizen</label>
                <textarea value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} rows={3}
                  placeholder="Kontext, Links, Gedanken…"
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-strong)", background: "var(--surface-0)", color: "var(--text-1)", fontSize: 13, outline: "none", resize: "vertical", boxSizing: "border-box" }}
                />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button onClick={() => setEditTask(null)} style={{ flex: 1, padding: "9px 0", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-strong)", background: "transparent", color: "var(--text-2)", fontSize: 13, cursor: "pointer" }}>Abbrechen</button>
              <button onClick={saveEdit} disabled={editSaving || !editForm.title.trim()} style={{ flex: 2, padding: "9px 0", borderRadius: "var(--radius-sm)", border: "none", background: "var(--accent)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                {editSaving ? "Speichern…" : "Speichern"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
