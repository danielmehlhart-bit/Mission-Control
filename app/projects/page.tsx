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
    <div style={{ padding: "20px 24px", maxWidth: 960 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.3px" }}>Projekte</h1>
        <p style={{ fontSize: 13, color: "#8b90a0", marginTop: 4 }}>Alle aktiven Projekte auf einen Blick.</p>
      </div>

      {loading ? <p style={{ color: "#8b90a0" }}>Loading…</p> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
          {projects.map(project => {
            const todoCount = getTaskCount(project.name);
            const color = project.color;
            return (
              <div key={project.id} style={{
                background: "#141720", border: "1px solid #1e2128", borderRadius: 14,
                overflow: "hidden", cursor: "default",
              }}>
                {/* Header bar */}
                <div style={{ height: 4, background: color }} />

                <div style={{ padding: "20px 22px" }}>
                  {/* Title + status */}
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 8 }}>
                    <div>
                      <h2 style={{ fontSize: 16, fontWeight: 700, color: "#f0f2f5", letterSpacing: "-0.2px" }}>{project.name}</h2>
                      <div style={{ fontSize: 12, color: "#8b90a0", marginTop: 2 }}>{project.client}</div>
                    </div>
                    <span style={{
                      padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600,
                      background: `${STATUS_COLOR[project.status]}18`,
                      border: `1px solid ${STATUS_COLOR[project.status]}40`,
                      color: STATUS_COLOR[project.status], flexShrink: 0,
                    }}>{STATUS_LABEL[project.status]}</span>
                  </div>

                  {project.description && (
                    <p style={{ fontSize: 13, color: "#8b90a0", lineHeight: 1.5, marginBottom: 16 }}>{project.description}</p>
                  )}

                  {/* Stats */}
                  <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                    <button onClick={() => router.push(`/tasks?project=${encodeURIComponent(project.name)}`)} style={{
                      display: "flex", alignItems: "center", gap: 6, padding: "5px 12px",
                      borderRadius: 8, border: "1px solid #1e2128", background: "#1a1d27",
                      cursor: "pointer", color: "#c8ccd6", fontSize: 12, fontWeight: 500,
                    }}>
                      <span style={{ color: todoCount > 0 ? color : "#4a5068", fontWeight: 700 }}>{todoCount}</span>
                      offene Tasks
                    </button>
                    <button onClick={() => router.push(`/docs?project=${encodeURIComponent(project.name)}`)} style={{
                      display: "flex", alignItems: "center", gap: 6, padding: "5px 12px",
                      borderRadius: 8, border: "1px solid #1e2128", background: "#1a1d27",
                      cursor: "pointer", color: "#c8ccd6", fontSize: 12,
                    }}>
                      📄 Briefings
                    </button>
                  </div>

                  {/* Repo link */}
                  {project.repo && (
                    <a href={`https://github.com/${project.repo}`} target="_blank" rel="noreferrer"
                      style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#4a5068", textDecoration: "none" }}
                      onMouseEnter={e => e.currentTarget.style.color = "#8b90a0"}
                      onMouseLeave={e => e.currentTarget.style.color = "#4a5068"}>
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
