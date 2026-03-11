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

  const TaskRow = ({ task, index }: { task: Task; index: number }) => {
    const done = task.status === "done";
    const badgeStyle = getProjectStyle(task.project);
    return (
      <div className={`motion-item motion-elevated group flex flex-col rounded-lg border px-3 py-2.5 transition ${
        done ? "border-slate-800/40 bg-slate-900/20" : "border-slate-800/60 bg-slate-900/40 hover:border-slate-700/60"
      }`} style={{ ["--stagger-index" as const]: index }}>
        <div className="flex items-center gap-3">
          <button onClick={() => toggleTask(task)} className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition ${
            done ? "border-emerald-500/60 bg-emerald-500/20 text-emerald-400" : "border-slate-600 hover:border-emerald-500/60"
          }`}>
            {done && <span className="text-xs">✓</span>}
          </button>
          <span className={`flex-1 text-sm ${done ? "line-through text-slate-500" : "text-slate-200"}`}>{task.title}</span>
          <span style={{ ...badgeStyle, borderWidth: 1, borderStyle: "solid" }}
            className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium">
            {task.project}
          </span>
          {/* Actions — visible on hover */}
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => openEdit(task)} className="rounded p-1 text-slate-500 hover:text-slate-200 hover:bg-slate-700/50 transition text-xs" title="Bearbeiten">✏️</button>
            {deleteConfirm === task.id ? (
              <>
                <button onClick={() => deleteTask(task.id)} className="rounded px-2 py-1 text-red-400 hover:bg-red-500/10 text-xs font-semibold transition">Löschen?</button>
                <button onClick={() => setDeleteConfirm(null)} className="rounded p-1 text-slate-500 hover:text-slate-200 text-xs transition">✕</button>
              </>
            ) : (
              <button onClick={() => setDeleteConfirm(task.id)} className="rounded p-1 text-slate-600 hover:text-red-400 transition text-xs">🗑</button>
            )}
          </div>
        </div>
        {task.notes && !done && (
          <p className="mt-1.5 ml-8 text-xs text-slate-500 leading-relaxed">{task.notes}</p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-slate-50">Task Board</h1>
          <p className="mt-2 text-sm text-slate-400">Deine offenen Tasks — projektübergreifend.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs text-slate-200">{todoTasks.length} offen</span>
          <button onClick={() => setShowCapture(v => !v)} className="rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium px-4 py-2 transition">
            + New Task
          </button>
        </div>
      </header>

      {showCapture && (
        <CapturePill onSave={addTask} onClose={() => setShowCapture(false)} projects={projectNames} />
      )}

      {/* Project filter */}
      <div className="motion-stagger flex flex-wrap gap-1.5">
        {["All", ...projectNames].map((p, index) => (
          <button key={p} onClick={() => setFilter(p)} className={`motion-item rounded-full border px-3 py-1 text-xs font-medium transition ${
            filter === p ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-200" : "border-slate-700/60 text-slate-400 hover:border-slate-600 hover:text-slate-200"
          }`} style={{ ["--stagger-index" as const]: index }}>
            {p}{p !== "All" && p !== ALLGEMEIN && <span className="ml-1.5 text-slate-500">{tasks.filter(t => t.project === p && t.status === "todo").length}</span>}
          </button>
        ))}
      </div>

      {loading ? <div className="text-sm text-slate-400">Loading…</div> : (
        <div key={filter} className="motion-stagger space-y-2">
          {todoTasks.length === 0 && doneTasks.length === 0 ? (
            <div className="rounded-2xl border border-slate-800/40 bg-slate-900/20 py-16 text-center text-slate-500">Keine offenen Tasks. 🎉</div>
          ) : (
            <>
              {todoTasks.map((t, index) => <TaskRow key={t.id} task={t} index={index} />)}
              {doneTasks.length > 0 && (
                <>
                  <div className="pt-2 pb-1 text-xs uppercase tracking-[0.3em] text-slate-600">Erledigt</div>
                  {doneTasks.map((t, index) => <TaskRow key={t.id} task={t} index={todoTasks.length + index + 1} />)}
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* Edit Modal */}
      {editTask && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20 }} onClick={() => setEditTask(null)}>
          <div style={{ background: "#141720", border: "1px solid #1e2128", borderRadius: 16, padding: 24, width: "100%", maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#f0f2f5", marginBottom: 18 }}>Task bearbeiten</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, color: "#8b90a0", marginBottom: 4, display: "block" }}>Titel</label>
                <input value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                  onKeyDown={e => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditTask(null); }}
                  autoFocus
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #1e2128", background: "#0d0f12", color: "#f0f2f5", fontSize: 14, outline: "none", boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, color: "#8b90a0", marginBottom: 4, display: "block" }}>Projekt</label>
                <select value={editForm.project} onChange={e => setEditForm(f => ({ ...f, project: e.target.value }))}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #1e2128", background: "#0d0f12", color: "#f0f2f5", fontSize: 13, outline: "none" }}>
                  {projectNames.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: "#8b90a0", marginBottom: 4, display: "block" }}>Notizen</label>
                <textarea value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} rows={3}
                  placeholder="Kontext, Links, Gedanken…"
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #1e2128", background: "#0d0f12", color: "#f0f2f5", fontSize: 13, outline: "none", resize: "vertical", boxSizing: "border-box" }}
                />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button onClick={() => setEditTask(null)} style={{ flex: 1, padding: "9px 0", borderRadius: 8, border: "1px solid #1e2128", background: "transparent", color: "#8b90a0", fontSize: 13, cursor: "pointer" }}>Abbrechen</button>
              <button onClick={saveEdit} disabled={editSaving || !editForm.title.trim()} style={{ flex: 2, padding: "9px 0", borderRadius: 8, border: "none", background: "#10B981", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                {editSaving ? "Speichern…" : "Speichern"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
