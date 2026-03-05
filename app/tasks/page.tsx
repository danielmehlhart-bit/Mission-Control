"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const initialColumns = [
  {
    id: "backlog",
    title: "Backlog",
    tasks: [
      { id: "b1", title: "Define mission KPIs", meta: "Ops" },
      { id: "b2", title: "Finalize deploy checklist", meta: "Infra" },
    ],
  },
  {
    id: "in-progress",
    title: "In Progress",
    tasks: [
      { id: "p1", title: "Coolify pipeline", meta: "Deployment" },
    ],
  },
  {
    id: "review",
    title: "Review",
    tasks: [{ id: "r1", title: "Security baseline", meta: "Audit" }],
  },
  {
    id: "done",
    title: "Done",
    tasks: [{ id: "d1", title: "Initial setup guide", meta: "Docs" }],
  },
];

export default function TasksPage() {
  const [columns, setColumns] = useState(initialColumns);

  const addTask = () => {
    const next = structuredClone(columns);
    next[0].tasks.unshift({
      id: `b${Date.now()}`,
      title: "New task placeholder",
      meta: "Manual",
    });
    setColumns(next);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-slate-50">Task Board</h1>
          <p className="mt-2 text-sm text-slate-400">
            Local state Kanban (MVP). Drag & drop coming later.
          </p>
        </div>
        <Button
          onClick={addTask}
          className="bg-emerald-400/90 text-slate-950 hover:bg-emerald-300"
        >
          Add Task
        </Button>
      </header>

      <div className="grid gap-4 lg:grid-cols-4">
        {columns.map((column) => (
          <Card
            key={column.id}
            className="border-slate-800/60 bg-slate-900/50 p-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                {column.title}
              </h2>
              <Badge className="border-slate-700 bg-slate-800 text-slate-200">
                {column.tasks.length}
              </Badge>
            </div>
            <div className="mt-4 space-y-3">
              {column.tasks.map((task) => (
                <div
                  key={task.id}
                  className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-3"
                >
                  <div className="text-sm font-medium text-slate-100">
                    {task.title}
                  </div>
                  <div className="mt-2 text-xs text-slate-500">{task.meta}</div>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
