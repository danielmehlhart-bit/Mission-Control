"use client";

import { useEffect, useMemo, useState } from "react";
import { CapturePill } from "@/components/capture-pill";

type Task = {
  id: string;
  title: string;
  project: string;
  status: "todo" | "done";
  createdAt: string;
  doneAt?: string;
  notes?: string;
};

type Project = {
  id: string;
  name: string;
  color: string;
  status: string;
};

const DEFAULT_COLOR = "#64748b";
const ALLGEMEIN = "Allgemein";

function hexToStyle(hex: string) {
  return {
    borderColor: `${hex}55`,
    backgroundColor: `${hex}22`,
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
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});
  const [completionFx, setCompletionFx] = useState<Record<string, boolean>>({});
  const [recentlyDone, setRecentlyDone] = useState<Record<string, boolean>>({});
  const [isModalClosing, setIsModalClosing] = useState(false);

  const projectNames = [ALLGEMEIN, ...projects.map((p) => p.name)];

  function getProjectStyle(name: string) {
    const p = projects.find((project) => project.name === name);
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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = filter === "All" ? tasks : tasks.filter((task) => task.project === filter);
  const todoTasks = filtered.filter((task) => task.status === "todo");
  const doneTasks = filtered.filter((task) => task.status === "done");

  const groupedTodo = useMemo(() => {
    return todoTasks.reduce<Record<string, Task[]>>((acc, task) => {
      acc[task.project] = acc[task.project] ?? [];
      acc[task.project].push(task);
      return acc;
    }, {});
  }, [todoTasks]);

  const groupedDone = useMemo(() => {
    return doneTasks.reduce<Record<string, Task[]>>((acc, task) => {
      acc[task.project] = acc[task.project] ?? [];
      acc[task.project].push(task);
      return acc;
    }, {});
  }, [doneTasks]);

  const addTask = async (title: string, project: string) => {
    const optimistic: Task = {
      id: `tmp-${Date.now()}`,
      title,
      project,
      status: "todo",
      createdAt: new Date().toISOString(),
    };
    setTasks((prev) => [optimistic, ...prev]);
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, project }),
    });
    const data = await res.json();
    setTasks((prev) => prev.map((task) => (task.id === optimistic.id ? data.task : task)));
  };

  const toggleTask = async (task: Task) => {
    const newStatus = task.status === "todo" ? "done" : "todo";
    if (newStatus === "done") {
      setCompletionFx((prev) => ({ ...prev, [task.id]: true }));
      setRecentlyDone((prev) => ({ ...prev, [task.id]: true }));
      setTimeout(() => {
        setCompletionFx((prev) => {
          const next = { ...prev };
          delete next[task.id];
          return next;
        });
      }, 520);
      setTimeout(() => {
        setRecentlyDone((prev) => {
          const next = { ...prev };
          delete next[task.id];
          return next;
        });
      }, 1400);
    }
    setTasks((prev) => prev.map((item) => (item.id === task.id ? { ...item, status: newStatus } : item)));
    await fetch(`/api/tasks?id=${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
  };

  const openEdit = (task: Task) => {
    setIsModalClosing(false);
    setEditTask(task);
    setEditForm({ title: task.title, project: task.project, notes: task.notes ?? "" });
  };

  const closeEdit = () => {
    setIsModalClosing(true);
    setTimeout(() => {
      setEditTask(null);
      setIsModalClosing(false);
    }, 180);
  };

  const saveEdit = async () => {
    if (!editTask || !editForm.title.trim()) return;
    setEditSaving(true);
    const updated = {
      title: editForm.title.trim(),
      project: editForm.project,
      notes: editForm.notes,
    };
    setTasks((prev) => prev.map((task) => (task.id === editTask.id ? { ...task, ...updated } : task)));
    await fetch(`/api/tasks?id=${editTask.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    });
    setEditSaving(false);
    closeEdit();
  };

  const deleteTask = async (id: string) => {
    setTasks((prev) => prev.filter((task) => task.id !== id));
    setDeleteConfirm(null);
    await fetch(`/api/tasks?id=${id}`, { method: "DELETE" });
  };

  const formatDate = (value?: string) => {
    if (!value) return "-";
    return new Date(value).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const TaskRow = ({ task }: { task: Task }) => {
    const done = task.status === "done";
    const badgeStyle = getProjectStyle(task.project);
    const expanded = Boolean(expandedTasks[task.id]);

    return (
      <article
        className={`group relative overflow-hidden rounded-xl border px-4 py-3 transition-all duration-300 ${
          done
            ? "border-slate-800/40 bg-slate-900/20"
            : "border-slate-800/70 bg-slate-900/50 hover:border-slate-700/70"
        } ${recentlyDone[task.id] ? "animate-pulse border-emerald-500/40" : ""}`}
      >
        <div className="flex items-start gap-3">
          <button
            onClick={() => toggleTask(task)}
            className={`relative mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-xs transition ${
              done
                ? "border-emerald-500/70 bg-emerald-500/25 text-emerald-300"
                : "border-slate-600 hover:border-emerald-500/70"
            }`}
            aria-label={done ? "Als offen markieren" : "Als erledigt markieren"}
          >
            {done && <span>✓</span>}
            {completionFx[task.id] && (
              <span className="pointer-events-none absolute inset-0">
                {[0, 1, 2, 3, 4].map((index) => (
                  <span
                    key={index}
                    className="absolute left-1/2 top-1/2 h-1 w-1 rounded-full bg-emerald-300/90"
                    style={{
                      transform: `translate(-50%, -50%) rotate(${index * 72}deg) translateY(-14px)`,
                      animation: "ping 520ms ease-out forwards",
                    }}
                  />
                ))}
              </span>
            )}
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className={`text-sm font-medium leading-tight ${done ? "text-slate-500 line-through" : "text-slate-100"}`}>
                {task.title}
              </h3>
              <span
                style={{ ...badgeStyle, borderWidth: 1, borderStyle: "solid" }}
                className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
              >
                {task.project}
              </span>
              <span className="rounded-full border border-slate-700/60 bg-slate-800/70 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-400">
                {done ? "Done" : "Open"}
              </span>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
              <span className="rounded-full border border-slate-700/70 px-2 py-0.5">Erstellt {formatDate(task.createdAt)}</span>
              {done && task.doneAt && <span className="rounded-full border border-emerald-500/30 px-2 py-0.5 text-emerald-300/80">Erledigt {formatDate(task.doneAt)}</span>}
              <button
                onClick={() => setExpandedTasks((prev) => ({ ...prev, [task.id]: !expanded }))}
                className="rounded-full border border-slate-700/70 px-2 py-0.5 text-slate-400 transition hover:border-slate-500 hover:text-slate-200"
              >
                {expanded ? "Details ausblenden" : "Details anzeigen"}
              </button>
            </div>
          </div>

          <div className="flex gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
            <button
              onClick={() => openEdit(task)}
              className="rounded-md px-2 py-1 text-xs text-slate-400 transition hover:bg-slate-700/50 hover:text-slate-100"
              title="Bearbeiten"
            >
              ✏️
            </button>
            {deleteConfirm === task.id ? (
              <>
                <button
                  onClick={() => deleteTask(task.id)}
                  className="rounded-md px-2 py-1 text-xs font-semibold text-red-400 transition hover:bg-red-500/10"
                >
                  Löschen?
                </button>
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="rounded-md px-2 py-1 text-xs text-slate-500 transition hover:text-slate-200"
                >
                  ✕
                </button>
              </>
            ) : (
              <button
                onClick={() => setDeleteConfirm(task.id)}
                className="rounded-md px-2 py-1 text-xs text-slate-600 transition hover:text-red-400"
                title="Löschen"
              >
                🗑
              </button>
            )}
          </div>
        </div>

        <div
          className={`grid transition-all duration-300 ease-out ${expanded ? "mt-2 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
        >
          <div className="overflow-hidden pl-9">
            <p className="rounded-lg border border-slate-800/70 bg-slate-950/40 p-2.5 text-xs leading-relaxed text-slate-400">
              {task.notes?.trim() || "Keine Zusatznotizen vorhanden."}
            </p>
          </div>
        </div>
      </article>
    );
  };

  const Lane = ({ title, subtitle, groups }: { title: string; subtitle: string; groups: Record<string, Task[]> }) => {
    const entries = Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));

    return (
      <section className="space-y-3 rounded-2xl border border-slate-800/70 bg-slate-900/30 p-3 sm:p-4">
        <div className="flex items-center justify-between border-b border-slate-800/70 pb-2">
          <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">{title}</h2>
          <span className="text-xs text-slate-500">{subtitle}</span>
        </div>
        {entries.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-800 px-4 py-6 text-center text-sm text-slate-500">Keine Tasks</div>
        ) : (
          <div className="space-y-4">
            {entries.map(([project, groupTasks]) => (
              <div key={project} className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: getProjectStyle(project).color }} />
                  <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{project}</h3>
                  <span className="text-[11px] text-slate-600">{groupTasks.length}</span>
                </div>
                <div className="space-y-2">
                  {groupTasks.map((task) => (
                    <TaskRow key={task.id} task={task} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    );
  };

  return (
    <div className="space-y-6 pb-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-slate-50">Task Board</h1>
          <p className="mt-2 text-sm text-slate-400">Deine offenen Tasks — projektübergreifend.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs text-slate-200">{todoTasks.length} offen</span>
          <button
            onClick={() => setShowCapture((value) => !value)}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500"
          >
            + New Task
          </button>
        </div>
      </header>

      {showCapture && <CapturePill onSave={addTask} onClose={() => setShowCapture(false)} projects={projectNames} />}

      <div className="sticky top-2 z-20 -mx-1 rounded-xl border border-slate-800/80 bg-[#141720]/95 px-2 py-2 backdrop-blur">
        <div className="flex flex-wrap gap-1.5">
          {["All", ...projectNames].map((project) => (
            <button
              key={project}
              onClick={() => setFilter(project)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                filter === project
                  ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-200"
                  : "border-slate-700/60 text-slate-400 hover:border-slate-600 hover:text-slate-200"
              }`}
            >
              {project}
              {project !== "All" && project !== ALLGEMEIN && (
                <span className="ml-1.5 text-slate-500">{tasks.filter((task) => task.project === project && task.status === "todo").length}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-slate-400">Loading…</div>
      ) : todoTasks.length === 0 && doneTasks.length === 0 ? (
        <div className="rounded-2xl border border-slate-800/40 bg-slate-900/20 py-16 text-center text-slate-500">Keine offenen Tasks. 🎉</div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Lane title="In Arbeit" subtitle={`${todoTasks.length} offen`} groups={groupedTodo} />
          <Lane title="Erledigt" subtitle={`${doneTasks.length} abgeschlossen`} groups={groupedDone} />
        </div>
      )}

      {editTask && (
        <div
          className={`fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-5 transition-opacity duration-200 ${
            isModalClosing ? "opacity-0" : "opacity-100"
          }`}
          onClick={closeEdit}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className={`w-full max-w-xl rounded-2xl border border-slate-700/80 bg-[#141720] p-6 shadow-2xl transition-all duration-200 ${
              isModalClosing ? "scale-[0.98] opacity-0" : "scale-100 opacity-100"
            }`}
          >
            <h2 className="mb-5 text-lg font-semibold text-slate-100">Task bearbeiten</h2>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">Titel</label>
                <input
                  value={editForm.title}
                  onChange={(event) => setEditForm((form) => ({ ...form, title: event.target.value }))}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") saveEdit();
                    if (event.key === "Escape") closeEdit();
                  }}
                  autoFocus
                  className="h-11 w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 text-sm text-slate-100 outline-none transition focus:border-emerald-500/60"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">Projekt</label>
                <select
                  value={editForm.project}
                  onChange={(event) => setEditForm((form) => ({ ...form, project: event.target.value }))}
                  className="h-11 w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 text-sm text-slate-100 outline-none transition focus:border-emerald-500/60"
                >
                  {projectNames.map((project) => (
                    <option key={project} value={project}>
                      {project}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">Notizen</label>
                <textarea
                  value={editForm.notes}
                  onChange={(event) => setEditForm((form) => ({ ...form, notes: event.target.value }))}
                  rows={4}
                  placeholder="Kontext, Links, Gedanken…"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-emerald-500/60"
                />
              </div>
            </div>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row">
              <button
                onClick={closeEdit}
                className="h-11 flex-1 rounded-lg border border-slate-700 px-4 text-sm font-medium text-slate-300 transition hover:border-slate-500 hover:text-slate-100"
              >
                Abbrechen
              </button>
              <button
                onClick={saveEdit}
                disabled={editSaving || !editForm.title.trim()}
                className="h-11 flex-[1.4] rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {editSaving ? "Speichern…" : "Speichern"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
