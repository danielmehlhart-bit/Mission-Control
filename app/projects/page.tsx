"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Project = {
  id: string; name: string; client: string; status: string;
  description?: string; contactId?: string; repo?: string; color: string;
};

type Task = { id: string; title: string; project: string; status: string; createdAt: string };

const STATUS_LABEL: Record<string, string> = { active: "Aktiv", paused: "Pausiert", done: "Abgeschlossen" };
const STATUS_COLOR: Record<string, string> = { active: "#10B981", paused: "#F59E0B", done: "#8b90a0" };

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/projects").then(r => r.json()),
      fetch("/api/tasks").then(r => r.json()),
    ]).then(([pd, td]) => {
      setProjects(pd.projects ?? []);
      setTasks(td.tasks ?? []);
      setLoading(false);
    });
  }, []);

  const getTaskCount = (name: string) => tasks.filter(t => t.project === name && t.status === "todo").length;

  return (
    <div style={{ padding: "var(--space-5) var(--space-6)", maxWidth: 960 }}>
      <div style={{ marginBottom: "var(--space-5)" }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.3px", color: "var(--text-1)" }}>Projekte</h1>
        <p style={{ fontSize: 13, color: "var(--text-2)", marginTop: 4 }}>Alle aktiven Projekte auf einen Blick.</p>
      </div>

      {loading ? <p style={{ color: "var(--text-2)" }}>Loading…</p> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
          {projects.map(project => {
            const todoCount = getTaskCount(project.name);
            const color = project.color;
            return (
              <div key={project.id} onClick={() => router.push(`/projects/${project.id}`)} style={{
                background: "var(--surface-1)", border: "1px solid var(--border-strong)", borderRadius: "var(--radius-lg)",
                overflow: "hidden", cursor: "pointer", boxShadow: "var(--shadow-soft)",
              }}>
                <div style={{ height: 4, background: color }} />

                <div style={{ padding: "var(--space-5) 22px" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 8 }}>
                    <div>
                      <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-1)", letterSpacing: "-0.2px" }}>{project.name}</h2>
                      <div style={{ fontSize: 12, color: "var(--text-2)", marginTop: 2 }}>{project.client}</div>
                    </div>
                    <span style={{
                      padding: "3px 10px", borderRadius: "var(--radius-pill)", fontSize: 11, fontWeight: 600,
                      background: `${STATUS_COLOR[project.status]}18`,
                      border: `1px solid ${STATUS_COLOR[project.status]}40`,
                      color: STATUS_COLOR[project.status], flexShrink: 0,
                    }}>{STATUS_LABEL[project.status]}</span>
                  </div>

                  {project.description && (
                    <p style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.5, marginBottom: 16 }}>{project.description}</p>
                  )}

                  <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                    <button onClick={() => router.push(`/tasks?project=${encodeURIComponent(project.name)}`)} style={{
                      display: "flex", alignItems: "center", gap: 6, padding: "5px 12px",
                      borderRadius: "var(--radius-sm)", border: "1px solid var(--border-strong)", background: "var(--surface-2)",
                      cursor: "pointer", color: "var(--text-2)", fontSize: 12, fontWeight: 500,
                    }}>
                      <span style={{ color: todoCount > 0 ? color : "var(--text-3)", fontWeight: 700 }}>{todoCount}</span>
                      offene Tasks
                    </button>
                    <button onClick={() => router.push(`/docs?project=${encodeURIComponent(project.name)}`)} style={{
                      display: "flex", alignItems: "center", gap: 6, padding: "5px 12px",
                      borderRadius: "var(--radius-sm)", border: "1px solid var(--border-strong)", background: "var(--surface-2)",
                      cursor: "pointer", color: "var(--text-2)", fontSize: 12,
                    }}>
                      📄 Briefings
                    </button>
                  </div>

                  {project.repo && (
                    <a href={`https://github.com/${project.repo}`} target="_blank" rel="noreferrer"
                      style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--text-3)", textDecoration: "none" }}
                      onMouseEnter={e => e.currentTarget.style.color = "var(--text-2)"}
                      onMouseLeave={e => e.currentTarget.style.color = "var(--text-3)"}>
                      <span>⎇</span> {project.repo}
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
