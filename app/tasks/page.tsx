"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Task = {
  id: string;
  title: string;
  project: string;
  status: "todo" | "done";
  createdAt: string;
  doneAt?: string;
};

const PROJECTS = ["Allgemein", "ModulAI", "Architekt Connect", "BPP", "Concord"];

const PROJECT_COLORS: Record<string, string> = {
  "ModulAI": "border-purple-500/30 bg-purple-500/10 text-purple-300",
  "Architekt Connect": "border-blue-500/30 bg-blue-500/10 text-blue-300",
  "BPP": "border-yellow-500/30 bg-yellow-500/10 text-yellow-300",
  "Concord": "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  "Allgemein": "border-slate-600/50 bg-slate-700/30 text-slate-300",
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newProject, setNewProject] = useState("Allgemein");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const res = await fetch("/api/tasks", { cache: "no-store" });
      const data = await res.json();
      setTasks(data.tasks ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = filter === "All" ? tasks : tasks.filter(t => t.project === filter);
  const todoTasks = filtered.filter(t => t.status === "todo");
  const doneTasks = filtered.filter(t => t.status === "done");

  const addTask = async () => {
    if (!newTitle.trim()) return;
    setSaving(true);
    const optimistic: Task = {
      id: "tmp-" + Date.now(),
      title: newTitle.trim(),
      project: newProject,
      status: "todo",
      createdAt: new Date().toISOString(),
    };
    setTasks(prev => [optimistic, ...prev]);
    setNewTitle("");
    setShowForm(false);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: optimistic.title, project: optimistic.project }),
      });
      const data = await res.json();
      setTasks(prev => prev.map(t => t.id === optimistic.id ? data.task : t));
    } catch {
      setTasks(prev => prev.filter(t => t.id !== optimistic.id));
    } finally {
      setSaving(false);
    }
  };

  const toggleTask = async (task: Task) => {
    const newStatus = task.status === "todo" ? "done" : "todo";
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
    await fetch(`/api/tasks?id=${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
  };

  const deleteTask = async (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    await fetch(`/api/tasks?id=${id}`, { method: "DELETE" });
  };

  const TaskRow = ({ task }: { task: Task }) => {
    const done = task.status === "done";
    return (
      <div className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 transition ${
        done ? "border-slate-800/40 bg-slate-900/20" : "border-slate-800/60 bg-slate-900/40 hover:border-slate-700/60"
      }`}>
        <button
          onClick={() => toggleTask(task)}
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition ${
            done ? "border-emerald-500/60 bg-emerald-500/20 text-emerald-400" : "border-slate-600 hover:border-emerald-500/60"
          }`}
        >
          {done && <span className="text-xs">✓</span>}
        </button>
        <span className={`flex-1 text-sm ${done ? "line-through text-slate-500" : "text-slate-200"}`}>
          {task.title}
        </span>
        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium ${PROJECT_COLORS[task.project] ?? PROJECT_COLORS["Allgemein"]}`}>
          {task.project}
        </span>
        {done && (
          <button
            onClick={() => deleteTask(task.id)}
            className="shrink-0 text-slate-600 hover:text-red-400 transition text-sm"
            title="Löschen"
          >
            🗑
          </button>
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
          <Badge className="border-slate-700 bg-slate-800 text-slate-200">{todoTasks.length} offen</Badge>
          <Button
            onClick={() => setShowForm(v => !v)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm"
          >
            + New Task
          </Button>
        </div>
      </header>

      {/* New task form */}
      {showForm && (
        <Card className="border-slate-800/60 bg-slate-900/40 p-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              autoFocus
              className="flex-1 rounded-lg border border-slate-700/60 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
              placeholder="Task beschreiben…"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") addTask(); if (e.key === "Escape") setShowForm(false); }}
            />
            <select
              className="rounded-lg border border-slate-700/60 bg-slate-950/60 px-3 py-2 text-sm text-slate-200 focus:outline-none"
              value={newProject}
              onChange={e => setNewProject(e.target.value)}
            >
              {PROJECTS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <div className="flex gap-2">
              <Button onClick={addTask} disabled={!newTitle.trim() || saving} className="bg-emerald-600 hover:bg-emerald-500 text-white">
                Hinzufügen
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)} className="border-slate-700 text-slate-300">
                Abbrechen
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Project filter */}
      <div className="flex flex-wrap gap-1.5">
        {["All", ...PROJECTS].map(p => (
          <button
            key={p}
            onClick={() => setFilter(p)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
              filter === p
                ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-200"
                : "border-slate-700/60 text-slate-400 hover:border-slate-600 hover:text-slate-200"
            }`}
          >
            {p}
            {p !== "All" && (
              <span className="ml-1.5 text-slate-500">
                {tasks.filter(t => t.project === p && t.status === "todo").length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tasks */}
      {loading ? (
        <div className="text-sm text-slate-400">Loading…</div>
      ) : todoTasks.length === 0 && doneTasks.length === 0 ? (
        <div className="rounded-2xl border border-slate-800/40 bg-slate-900/20 py-16 text-center text-slate-500">
          Keine offenen Tasks. 🎉
        </div>
      ) : (
        <div className="space-y-2">
          {todoTasks.map(t => <TaskRow key={t.id} task={t} />)}
          {doneTasks.length > 0 && (
            <>
              <div className="pt-2 pb-1 text-xs uppercase tracking-[0.3em] text-slate-600">Erledigt</div>
              {doneTasks.map(t => <TaskRow key={t.id} task={t} />)}
            </>
          )}
        </div>
      )}
    </div>
  );
}
