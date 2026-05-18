"use client";

import { FileText, ListTodo, MoveRight } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Project = {
  id: string;
  name: string;
  client: string;
  status: string;
  description?: string;
  contactId?: string;
  repo?: string;
  color: string;
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
    Promise.all([fetch("/api/projects").then((r) => r.json()), fetch("/api/tasks").then((r) => r.json())]).then(([pd, td]) => {
      setProjects(pd.projects ?? []);
      setTasks(td.tasks ?? []);
      setLoading(false);
    });
  }, []);

  const getTaskCount = (name: string) => tasks.filter((t) => t.project === name && t.status === "todo").length;

  const navigateToProject = (projectId: string) => {
    const startTransition = (document as Document & { startViewTransition?: (updateCallback: () => void) => void }).startViewTransition;
    if (startTransition) {
      startTransition(() => {
        router.push(`/projects/${projectId}`);
      });
      return;
    }

    router.push(`/projects/${projectId}`);
  };

  return (
    <div style={{ padding: "20px 24px", maxWidth: 960 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.3px" }}>Projekte</h1>
        <p style={{ fontSize: 13, color: "#8b90a0", marginTop: 4 }}>Alle aktiven Projekte auf einen Blick.</p>
      </div>

      {loading ? (
        <p style={{ color: "#8b90a0" }}>Loading…</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
          {projects.map((project) => {
            const todoCount = getTaskCount(project.name);
            const color = project.color;

            return (
              <article
                key={project.id}
                onClick={() => navigateToProject(project.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    navigateToProject(project.id);
                  }
                }}
                tabIndex={0}
                className="group relative cursor-pointer overflow-hidden rounded-2xl border border-[#242834] bg-[#141720] transition-all duration-300 ease-out hover:-translate-y-1 hover:border-[#34394a] focus-visible:-translate-y-1 focus-visible:border-[#34394a] focus-visible:outline-none"
                style={{
                  boxShadow: `0 10px 28px rgba(0, 0, 0, 0.28), 0 0 0 1px ${color}15 inset`,
                  viewTransitionName: `project-card-${project.id}`,
                }}
              >
                <div
                  className="relative h-16"
                  style={{
                    background: `linear-gradient(115deg, ${color}E6 0%, ${color}94 58%, #141720 100%)`,
                    boxShadow: `0 14px 28px ${color}3F`,
                  }}
                >
                  <div
                    className="absolute inset-x-0 bottom-0 h-8"
                    style={{ background: `linear-gradient(180deg, transparent 0%, #141720 100%)` }}
                  />
                </div>

                <div className="space-y-5 px-5 pb-5 pt-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-base font-semibold tracking-[-0.2px] text-[#f0f2f5]">{project.name}</h2>
                      <p className="mt-1 text-xs text-[#8b90a0]">{project.client}</p>
                    </div>
                    <span
                      style={{
                        background: `${STATUS_COLOR[project.status]}18`,
                        border: `1px solid ${STATUS_COLOR[project.status]}40`,
                        color: STATUS_COLOR[project.status],
                      }}
                      className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                    >
                      {STATUS_LABEL[project.status]}
                    </span>
                  </div>

                  {project.description && <p className="line-clamp-2 text-[13px] leading-relaxed text-[#8b90a0]">{project.description}</p>}

                  <div className="flex flex-wrap gap-2.5">
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        router.push(`/tasks?project=${encodeURIComponent(project.name)}`);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-full border border-[#2a2f3d] bg-[#191d28] px-3 py-1.5 text-xs font-medium text-[#d4d8e2] transition-colors hover:border-[#3a4153]"
                    >
                      <ListTodo size={13} style={{ color }} />
                      <span className="font-semibold" style={{ color }}>
                        {todoCount}
                      </span>
                      offen
                    </button>
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        router.push(`/docs?project=${encodeURIComponent(project.name)}`);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-full border border-[#2a2f3d] bg-[#191d28] px-3 py-1.5 text-xs font-medium text-[#d4d8e2] transition-colors hover:border-[#3a4153]"
                    >
                      <FileText size={13} style={{ color }} />
                      Briefings
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    {project.repo ? (
                      <a
                        href={`https://github.com/${project.repo}`}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(event) => event.stopPropagation()}
                        className="inline-flex items-center gap-1.5 text-xs text-[#596079] transition-colors hover:text-[#98a1b6]"
                      >
                        ⎇ {project.repo}
                      </a>
                    ) : (
                      <span />
                    )}

                    <span className="inline-flex items-center gap-1 text-xs font-medium text-[#9aa3b8] opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100 -translate-x-1">
                      Details
                      <MoveRight size={14} />
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
