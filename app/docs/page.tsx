"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { detectCategory, CATEGORY_META, type CategoryKey } from "@/lib/categories";
import { briefingMatchesProject } from "@/lib/projects";

type BriefingFile = { name: string; path: string; modified: string };
type Project = { id: string; name: string; color: string };

function formatFilename(name: string): { title: string; date: string } {
  const match = name.match(/^(\d{4}-\d{2}-\d{2})-(.+)\.html$/);
  if (match) {
    const [, dateStr, slug] = match;
    const date = new Date(dateStr).toLocaleDateString("de-DE", { day: "numeric", month: "short", year: "numeric" });
    const title = slug.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    return { title, date };
  }
  return { title: name.replace(".html", ""), date: "" };
}

const TABS: CategoryKey[] = ["all", "morning", "podcast", "projekt", "research", "training", "security", "sonstige"];

export default function DocsPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24, color: "#8b90a0" }}>Loading…</div>}>
      <DocsPageInner />
    </Suspense>
  );
}

function DocsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [files, setFiles] = useState<BriefingFile[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selected, setSelected] = useState<BriefingFile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<CategoryKey>("all");
  const [activeProject, setActiveProject] = useState<string>("all");
  const [lastSeen, setLastSeen] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [listWidth, setListWidth] = useState(280);
  const dragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    const saved = localStorage.getItem("docsListWidth");
    if (saved) setListWidth(parseInt(saved, 10));
    const tab = localStorage.getItem("docsTab") as CategoryKey;
    if (tab) setActiveTab(tab);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const ts = parseInt(localStorage.getItem("lastSeenTimestamp") ?? "0", 10);
    setLastSeen(ts);
    localStorage.setItem("lastSeenTimestamp", Date.now().toString());

    const load = async () => {
      try {
        const [briefRes, projRes] = await Promise.all([
          fetch("/api/briefings", { cache: "no-store" }),
          fetch("/api/projects", { cache: "no-store" }),
        ]);
        const data = await briefRes.json();
        const projData = await projRes.json();
        const sorted = (data.files ?? []).sort((a: BriefingFile, b: BriefingFile) => b.name.localeCompare(a.name));
        setFiles(sorted);
        setProjects(projData.projects ?? []);

        // URL params
        const fileParam = searchParams.get("file");
        const projectParam = searchParams.get("project");
        if (projectParam) setActiveProject(projectParam);

        const found = fileParam ? sorted.find((f: BriefingFile) => f.name === fileParam) : null;
        setSelected(found ?? sorted[0] ?? null);
      } finally { setLoading(false); }
    };
    load();
  }, [searchParams]);

  // Drag handle
  const onDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    const onMove = (ev: MouseEvent) => {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newW = Math.max(180, Math.min(500, ev.clientX - rect.left));
      setListWidth(newW);
    };
    const onUp = () => {
      dragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      localStorage.setItem("docsListWidth", String(listWidth));
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  // Filtering
  const byCategory = activeTab === "all" ? files : files.filter(f => detectCategory(f.name) === activeTab);
  const filtered = activeProject === "all"
    ? byCategory
    : byCategory.filter(f => briefingMatchesProject(f.name, activeProject));

  const counts = TABS.reduce((a, t) => {
    const base = t === "all" ? files : files.filter(f => detectCategory(f.name) === t);
    a[t] = activeProject === "all" ? base.length : base.filter(f => briefingMatchesProject(f.name, activeProject)).length;
    return a;
  }, {} as Record<CategoryKey, number>);

  const projectCount = (name: string) =>
    name === "all" ? files.length : files.filter(f => briefingMatchesProject(f.name, name)).length;

  const rawUrl = selected ? `/api/briefings?file=${encodeURIComponent(selected.path)}&raw=1` : null;
  const isNew = (f: BriefingFile) => new Date(f.modified).getTime() > lastSeen;

  const setProject = (name: string) => {
    setActiveProject(name);
    // Update URL without full navigation
    const params = new URLSearchParams(searchParams.toString());
    if (name === "all") params.delete("project");
    else params.set("project", name);
    router.replace(`/docs?${params.toString()}`, { scroll: false });
  };

  const s = {
    page: { padding: "16px 20px", height: "calc(100vh - 52px)", display: "flex", flexDirection: "column" as const, gap: 8 },
    header: { display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 },
    title: { fontSize: 22, fontWeight: 700, letterSpacing: "-0.3px" },
    count: { fontSize: 12, color: "#8b90a0", background: "#141720", border: "1px solid #1e2128", borderRadius: 999, padding: "2px 10px" },
    filterRow: { display: "flex", flexWrap: "wrap" as const, gap: 5, flexShrink: 0 },
    chip: (active: boolean, color?: string) => ({
      display: "flex", alignItems: "center", gap: 4,
      padding: "4px 11px", borderRadius: 999, fontSize: 12, fontWeight: 500,
      border: `1px solid ${active ? (color ? color + "80" : "rgba(16,185,129,0.4)") : "#1e2128"}`,
      background: active ? (color ? color + "18" : "rgba(16,185,129,0.1)") : "#141720",
      color: active ? (color ?? "#6ee7b7") : "#8b90a0",
      cursor: "pointer", transition: "all 0.15s",
    }),
    splitContainer: { flex: 1, display: "flex", minHeight: 0, borderRadius: 12, overflow: "hidden", border: "1px solid #1e2128" },
    list: { flexShrink: 0, overflowY: "auto" as const, background: "#141720", display: "flex", flexDirection: "column" as const },
    listHeader: { padding: "12px 14px 8px", fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase" as const, color: "#4a5068", flexShrink: 0 },
    handle: {
      width: 5, flexShrink: 0, background: "#1e2128",
      cursor: "col-resize", position: "relative" as const,
      display: "flex", alignItems: "center", justifyContent: "center",
      transition: "background 0.15s",
    },
    preview: { flex: 1, background: "white", minWidth: 0 },
  };

  if (isMobile) {
    return (
      <div style={s.page}>
        <div style={s.header}>
          <span style={s.title}>Docs</span>
          <span style={s.count}>{filtered.length}</span>
        </div>
        {/* Project filter — mobile */}
        <div style={s.filterRow}>
          <button style={s.chip(activeProject === "all")} onClick={() => setProject("all")}>
            Alle Projekte
          </button>
          {projects.map(p => (
            <button key={p.id} style={s.chip(activeProject === p.name, p.color)} onClick={() => setProject(p.name)}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: p.color, flexShrink: 0 }} />
              {p.name.split("—")[0].trim()}
              <span style={{ color: "#4a5068", fontSize: 11 }}>{projectCount(p.name)}</span>
            </button>
          ))}
        </div>
        {/* Category tabs — mobile */}
        <div style={s.filterRow}>
          {TABS.filter(t => counts[t] > 0 || t === "all").map(t => (
            <button key={t} style={s.chip(activeTab === t)} onClick={() => { setActiveTab(t); localStorage.setItem("docsTab", t); }}>
              {CATEGORY_META[t].emoji} {CATEGORY_META[t].label}
              <span style={{ color: "#4a5068", fontSize: 11 }}>{counts[t]}</span>
            </button>
          ))}
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {loading ? <p style={{ padding: 16, color: "#8b90a0" }}>Loading…</p> : filtered.map(f => {
            const { title, date } = formatFilename(f.name);
            return (
              <button key={f.path} onClick={() => window.open(`/api/briefings?file=${encodeURIComponent(f.path)}&raw=1`, "_blank")}
                style={{ width: "100%", textAlign: "left", padding: "12px 16px", borderBottom: "1px solid #1e2128", background: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 18 }}>{CATEGORY_META[detectCategory(f.name)].emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: "#f0f2f5" }}>{title}</div>
                  <div style={{ fontSize: 12, color: "#8b90a0", marginTop: 2 }}>{date}</div>
                </div>
                {isNew(f) && <span style={{ fontSize: 10, fontWeight: 700, color: "#f87171", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 999, padding: "2px 6px" }}>NEU</span>}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <span style={s.title}>Docs Browser</span>
        <span style={s.count}>{filtered.length} Briefings</span>
      </div>

      {/* Project filter */}
      <div style={s.filterRow}>
        <button style={s.chip(activeProject === "all")} onClick={() => setProject("all")}>
          📁 Alle Projekte
        </button>
        {projects.map(p => (
          <button key={p.id} style={s.chip(activeProject === p.name, p.color)} onClick={() => setProject(p.name)}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: p.color, flexShrink: 0 }} />
            {p.name.split("—")[0].trim()}
            <span style={{ color: "#4a5068", fontSize: 11, marginLeft: 1 }}>{projectCount(p.name)}</span>
          </button>
        ))}
      </div>

      {/* Category tabs */}
      <div style={s.filterRow}>
        {TABS.filter(t => counts[t] > 0 || t === "all").map(t => (
          <button key={t} style={s.chip(activeTab === t)} onClick={() => { setActiveTab(t); localStorage.setItem("docsTab", t); }}>
            {CATEGORY_META[t].emoji} {CATEGORY_META[t].label}
            {counts[t] > 0 && <span style={{ marginLeft: 2, background: "#1a1d27", borderRadius: 999, padding: "0 5px", fontSize: 11, color: "#4a5068" }}>{counts[t]}</span>}
          </button>
        ))}
      </div>

      {/* Split Pane */}
      <div ref={containerRef} style={s.splitContainer}>
        {/* List */}
        <div style={{ ...s.list, width: listWidth }}>
          <div style={s.listHeader}>
            {activeProject !== "all" ? `${activeProject.split("—")[0].trim()} · ${filtered.length}` : `Alle · ${filtered.length}`}
          </div>
          {loading ? <p style={{ padding: "12px 14px", color: "#8b90a0", fontSize: 13 }}>Loading…</p>
            : filtered.length === 0
            ? <p style={{ padding: "12px 14px", color: "#4a5068", fontSize: 13 }}>Keine Briefings für dieses Projekt.</p>
            : filtered.map(f => {
              const { title, date } = formatFilename(f.name);
              const active = selected?.path === f.path;
              return (
                <button key={f.path} onClick={() => setSelected(f)} style={{
                  width: "100%", textAlign: "left", padding: "10px 14px",
                  borderLeft: `2px solid ${active ? "#10B981" : "transparent"}`,
                  background: active ? "rgba(16,185,129,0.06)" : "transparent",
                  cursor: "pointer", borderBottom: "1px solid #16191f", display: "flex", alignItems: "flex-start", gap: 8,
                }}>
                  <span style={{ fontSize: 15, marginTop: 1, flexShrink: 0 }}>{CATEGORY_META[detectCategory(f.name)].emoji}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: active ? "#f0f2f5" : "#c8ccd6", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</div>
                    <div style={{ fontSize: 11, color: "#4a5068", marginTop: 2 }}>{date}</div>
                  </div>
                  {isNew(f) && <span style={{ fontSize: 9, fontWeight: 700, color: "#f87171", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 999, padding: "2px 5px", flexShrink: 0, marginTop: 2 }}>NEU</span>}
                </button>
              );
            })}
        </div>

        {/* Drag Handle */}
        <div style={s.handle} onMouseDown={onDragStart}
          onMouseEnter={e => (e.currentTarget.style.background = "#2a2d38")}
          onMouseLeave={e => (e.currentTarget.style.background = "#1e2128")}>
          <span style={{ fontSize: 10, color: "#4a5068", writingMode: "vertical-rl" }}>⋮⋮</span>
        </div>

        {/* Preview */}
        <div style={s.preview}>
          {rawUrl ? (
            <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
              <div style={{ padding: "8px 12px", background: "#f8f9fa", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
                <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 500 }}>{selected ? formatFilename(selected.name).title : ""}</span>
                <button onClick={() => rawUrl && window.open(rawUrl, "_blank")}
                  style={{ fontSize: 12, color: "#10B981", background: "none", border: "none", cursor: "pointer", fontWeight: 500 }}>
                  ↗ Neuer Tab
                </button>
              </div>
              <iframe key={rawUrl} src={rawUrl} style={{ flex: 1, border: "none", width: "100%" }} title={selected?.name} />
            </div>
          ) : (
            <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#8b90a0", fontSize: 14 }}>
              Briefing auswählen
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
