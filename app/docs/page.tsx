"use client";

import { useEffect, useRef, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { detectCategory, CATEGORY_META, type CategoryKey } from "@/lib/categories";
import { briefingMatchesProject } from "@/lib/projects";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import HorizontalRule from "@tiptap/extension-horizontal-rule";
import Placeholder from "@tiptap/extension-placeholder";

type BriefingFile = { name: string; path: string; modified: string };
type Project = { id: string; name: string; color: string };
type Doc = { id: string; title: string; content: string; createdAt: string; updatedAt: string };

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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("de-DE", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// ─── Toolbar Button ───────────────────────────────────────────────────────────
function TB({ onClick, active, children }: { onClick: () => void; active?: boolean; children: React.ReactNode }) {
  return (
    <button
      onMouseDown={e => { e.preventDefault(); onClick(); }}
      style={{
        padding: "3px 8px", borderRadius: 4, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600,
        background: active ? "#1e2128" : "transparent",
        color: active ? "#f0f2f5" : "#8b90a0",
      }}
    >{children}</button>
  );
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

  // Mode toggle
  const [mode, setMode] = useState<"briefings" | "documents">("briefings");

  // Briefings state
  const [files, setFiles] = useState<BriefingFile[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selected, setSelected] = useState<BriefingFile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<CategoryKey>("all");
  const [activeProject, setActiveProject] = useState<string>("all");
  const [lastSeen, setLastSeen] = useState(0);

  // Documents state
  const [documents, setDocuments] = useState<Doc[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<Doc | null>(null);
  const [docsLoading, setDocsLoading] = useState(false);
  const [docSaving, setDocSaving] = useState(false);
  const [docSaved, setDocSaved] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState("");
  const [mobileEditing, setMobileEditing] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");

  // Layout state
  const [isMobile, setIsMobile] = useState(false);
  const [listWidth, setListWidth] = useState(280);
  const dragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // TipTap editor
  const editor = useEditor({
    extensions: [
      StarterKit, Underline, TaskList, TaskItem.configure({ nested: true }),
      HorizontalRule, Placeholder.configure({ placeholder: "Dokument schreiben…" }),
    ],
    content: "",
    editorProps: {
      attributes: { style: "outline:none; min-height:300px; padding:14px; font-size:13px; line-height:1.7; color:#c8ccd8;" },
    },
  });

  // Init
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    const saved = localStorage.getItem("docsListWidth");
    if (saved) setListWidth(parseInt(saved, 10));
    const tab = localStorage.getItem("docsTab") as CategoryKey;
    if (tab) setActiveTab(tab);
    const savedMode = localStorage.getItem("docsMode") as "briefings" | "documents";
    if (savedMode) setMode(savedMode);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Load briefings
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

        const fileParam = searchParams.get("file");
        const projectParam = searchParams.get("project");
        if (projectParam) setActiveProject(projectParam);

        const found = fileParam ? sorted.find((f: BriefingFile) => f.name === fileParam) : null;
        setSelected(found ?? sorted[0] ?? null);
      } finally { setLoading(false); }
    };
    load();
  }, [searchParams]);

  // Load documents
  const loadDocuments = useCallback(async () => {
    setDocsLoading(true);
    try {
      const res = await fetch("/api/documents", { cache: "no-store" });
      const data = await res.json();
      setDocuments(data.documents ?? []);
    } finally { setDocsLoading(false); }
  }, []);

  useEffect(() => { loadDocuments(); }, [loadDocuments]);

  // Select document → load into editor
  useEffect(() => {
    if (!editor || !selectedDoc) return;
    try { editor.commands.setContent(JSON.parse(selectedDoc.content)); } catch { editor.commands.setContent(""); }
    setTitleInput(selectedDoc.title);
  }, [selectedDoc, editor]);

  // Keyboard shortcut: Ctrl+S
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s" && mode === "documents" && selectedDoc) {
        e.preventDefault();
        saveDocument();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, selectedDoc, editor]);

  // CRUD operations
  const createDocument = async () => {
    const res = await fetch("/api/documents", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Neues Dokument" }),
    });
    const data = await res.json();
    await loadDocuments();
    setSelectedDoc(data.document);
    setEditingTitle(true);
    setTitleInput(data.document.title);
    if (isMobile) setMobileEditing(true);
    setTimeout(() => titleInputRef.current?.select(), 100);
  };

  const saveDocument = async () => {
    if (!editor || !selectedDoc) return;
    setDocSaving(true);
    const res = await fetch(`/api/documents?id=${selectedDoc.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: titleInput.trim() || selectedDoc.title, content: JSON.stringify(editor.getJSON()) }),
    });
    const data = await res.json();
    setSelectedDoc(data.document);
    setDocuments(prev => prev.map(d => d.id === data.document.id ? data.document : d));
    setDocSaving(false);
    setDocSaved(true);
    setTimeout(() => setDocSaved(false), 2000);
  };

  const deleteDocument = async (id: string) => {
    await fetch(`/api/documents?id=${id}`, { method: "DELETE" });
    if (selectedDoc?.id === id) {
      setSelectedDoc(null);
      editor?.commands.setContent("");
      if (isMobile) setMobileEditing(false);
    }
    setDeleteConfirm(null);
    await loadDocuments();
  };

  const saveTitle = async () => {
    if (!selectedDoc) return;
    setEditingTitle(false);
    if (titleInput.trim() && titleInput.trim() !== selectedDoc.title) {
      const res = await fetch(`/api/documents?id=${selectedDoc.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: titleInput.trim() }),
      });
      const data = await res.json();
      setSelectedDoc(data.document);
      setDocuments(prev => prev.map(d => d.id === data.document.id ? data.document : d));
    }
  };

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

  // Briefing filtering
  const byCategory = activeTab === "all" ? files : files.filter(f => detectCategory(f.name) === activeTab);
  const byProject = activeProject === "all"
    ? byCategory
    : byCategory.filter(f => briefingMatchesProject(f.name, activeProject));
  const filtered = searchQuery.trim()
    ? byProject.filter(f => {
        const q = searchQuery.toLowerCase();
        const { title } = formatFilename(f.name);
        return title.toLowerCase().includes(q) || f.name.toLowerCase().includes(q);
      })
    : byProject;

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
    const params = new URLSearchParams(searchParams.toString());
    if (name === "all") params.delete("project");
    else params.set("project", name);
    router.replace(`/docs?${params.toString()}`, { scroll: false });
  };

  const switchMode = (m: "briefings" | "documents") => {
    setMode(m);
    localStorage.setItem("docsMode", m);
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

  // ─── Mode toggle chips ─────────────────────────────────────────────────────
  const modeToggle = (
    <div style={s.filterRow}>
      <button style={s.chip(mode === "briefings")} onClick={() => switchMode("briefings")}>
        Briefings
        {files.length > 0 && <span style={{ marginLeft: 2, background: "#1a1d27", borderRadius: 999, padding: "0 5px", fontSize: 11, color: "#4a5068" }}>{files.length}</span>}
      </button>
      <button style={s.chip(mode === "documents")} onClick={() => switchMode("documents")}>
        Meine Dokumente
        {documents.length > 0 && <span style={{ marginLeft: 2, background: "#1a1d27", borderRadius: 999, padding: "0 5px", fontSize: 11, color: "#4a5068" }}>{documents.length}</span>}
      </button>
    </div>
  );

  // ─── Document list (shared between desktop & mobile) ────────────────────────
  const docListItems = docsLoading
    ? <p style={{ padding: "12px 14px", color: "#8b90a0", fontSize: 13 }}>Loading…</p>
    : documents.length === 0
    ? <p style={{ padding: "12px 14px", color: "#4a5068", fontSize: 13 }}>Noch keine Dokumente erstellt.</p>
    : documents.map(d => {
        const active = selectedDoc?.id === d.id;
        return (
          <button key={d.id} onClick={() => { setSelectedDoc(d); if (isMobile) setMobileEditing(true); }} style={{
            width: "100%", textAlign: "left", padding: "10px 14px",
            borderLeft: `2px solid ${active ? "#10B981" : "transparent"}`,
            background: active ? "rgba(16,185,129,0.06)" : "transparent",
            cursor: "pointer", borderBottom: "1px solid #16191f", display: "flex", alignItems: "flex-start", gap: 8,
          }}>
            <span style={{ fontSize: 15, marginTop: 1, flexShrink: 0 }}>📄</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: active ? "#f0f2f5" : "#c8ccd6", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.title}</div>
              <div style={{ fontSize: 11, color: "#4a5068", marginTop: 2 }}>{formatDate(d.updatedAt)}</div>
            </div>
            {deleteConfirm === d.id ? (
              <div style={{ display: "flex", gap: 4, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                <button onClick={() => deleteDocument(d.id)} style={{ fontSize: 11, color: "#f87171", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 4, padding: "2px 6px", cursor: "pointer" }}>Ja</button>
                <button onClick={() => setDeleteConfirm(null)} style={{ fontSize: 11, color: "#8b90a0", background: "#141720", border: "1px solid #1e2128", borderRadius: 4, padding: "2px 6px", cursor: "pointer" }}>Nein</button>
              </div>
            ) : (
              <button onClick={e => { e.stopPropagation(); setDeleteConfirm(d.id); }} style={{ fontSize: 13, color: "#4a5068", background: "none", border: "none", cursor: "pointer", flexShrink: 0, padding: "2px 4px" }} title="Löschen">✕</button>
            )}
          </button>
        );
      });

  // ─── Document editor pane (shared) ──────────────────────────────────────────
  const editorPane = selectedDoc ? (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "#141720" }}>
      {/* Title bar */}
      <div style={{ padding: "10px 14px", borderBottom: "1px solid #1e2128", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexShrink: 0 }}>
        {isMobile && (
          <button onClick={() => { setMobileEditing(false); setSelectedDoc(null); }} style={{ fontSize: 13, color: "#8b90a0", background: "none", border: "none", cursor: "pointer", padding: "2px 6px" }}>← Zurück</button>
        )}
        {editingTitle ? (
          <input
            ref={titleInputRef}
            value={titleInput}
            onChange={e => setTitleInput(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={e => { if (e.key === "Enter") saveTitle(); if (e.key === "Escape") { setEditingTitle(false); setTitleInput(selectedDoc.title); } }}
            style={{ flex: 1, fontSize: 15, fontWeight: 600, background: "#0d0f12", border: "1px solid #1e2128", borderRadius: 6, padding: "4px 10px", color: "#f0f2f5", outline: "none" }}
            autoFocus
          />
        ) : (
          <span onClick={() => { setEditingTitle(true); setTitleInput(selectedDoc.title); setTimeout(() => titleInputRef.current?.select(), 50); }}
            style={{ flex: 1, fontSize: 15, fontWeight: 600, color: "#f0f2f5", cursor: "pointer", minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title="Klicken zum Bearbeiten">
            {selectedDoc.title}
          </span>
        )}
        <span style={{ fontSize: 11, color: docSaved ? "#10B981" : "#4a5068", flexShrink: 0 }}>
          {docSaved ? "Gespeichert" : formatDate(selectedDoc.updatedAt)}
        </span>
      </div>
      {/* Toolbar */}
      <div style={{ display: "flex", gap: 2, padding: "6px 10px", background: "#111318", borderBottom: "1px solid #1e2128", flexWrap: "wrap" }}>
        <TB onClick={() => editor?.chain().focus().toggleBold().run()} active={editor?.isActive("bold")}><b>B</b></TB>
        <TB onClick={() => editor?.chain().focus().toggleItalic().run()} active={editor?.isActive("italic")}><i>I</i></TB>
        <TB onClick={() => editor?.chain().focus().toggleUnderline().run()} active={editor?.isActive("underline")}><u>U</u></TB>
        <span style={{ width: 1, background: "#1e2128", margin: "2px 4px" }} />
        <TB onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} active={editor?.isActive("heading", { level: 1 })}>H1</TB>
        <TB onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} active={editor?.isActive("heading", { level: 2 })}>H2</TB>
        <TB onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()} active={editor?.isActive("heading", { level: 3 })}>H3</TB>
        <span style={{ width: 1, background: "#1e2128", margin: "2px 4px" }} />
        <TB onClick={() => editor?.chain().focus().toggleBulletList().run()} active={editor?.isActive("bulletList")}>Liste</TB>
        <TB onClick={() => editor?.chain().focus().toggleOrderedList().run()} active={editor?.isActive("orderedList")}>1. Liste</TB>
        <TB onClick={() => editor?.chain().focus().toggleTaskList().run()} active={editor?.isActive("taskList")}>Tasks</TB>
        <span style={{ width: 1, background: "#1e2128", margin: "2px 4px" }} />
        <TB onClick={() => editor?.chain().focus().toggleBlockquote().run()} active={editor?.isActive("blockquote")}>Zitat</TB>
        <TB onClick={() => editor?.chain().focus().setHorizontalRule().run()}>— Linie</TB>
      </div>
      {/* Editor */}
      <div style={{ flex: 1, overflowY: "auto", background: "#0d0f12" }}>
        <EditorContent editor={editor} />
      </div>
      {/* Footer */}
      <div style={{ display: "flex", justifyContent: "flex-end", padding: "8px 12px", background: "#111318", borderTop: "1px solid #1e2128", gap: 8, flexShrink: 0 }}>
        <button onClick={saveDocument} disabled={docSaving} style={{ padding: "6px 18px", borderRadius: 6, border: "none", background: docSaving ? "#0a7a50" : "#10B981", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
          {docSaving ? "Speichern…" : "Speichern"}
        </button>
      </div>
    </div>
  ) : (
    <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#8b90a0", fontSize: 14, background: "#141720" }}>
      Dokument auswählen oder neu erstellen
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // MOBILE
  // ═══════════════════════════════════════════════════════════════════════════
  if (isMobile) {
    // Mobile: document editor full-screen
    if (mode === "documents" && mobileEditing && selectedDoc) {
      return (
        <div style={{ ...s.page, padding: 0 }}>
          {editorPane}
        </div>
      );
    }

    return (
      <div style={s.page}>
        <div style={s.header}>
          <span style={s.title}>Docs</span>
          {mode === "documents" && (
            <button onClick={createDocument} style={{ fontSize: 12, fontWeight: 600, color: "#10B981", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 6, padding: "5px 12px", cursor: "pointer" }}>
              + Neu erstellen
            </button>
          )}
        </div>
        {modeToggle}
        {mode === "briefings" ? (
          <>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "#4a5068", pointerEvents: "none" }}>🔍</span>
              <input
                type="text"
                placeholder="Suchen…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: "100%", paddingLeft: 32, paddingRight: searchQuery ? 28 : 12, paddingTop: 7, paddingBottom: 7,
                  background: "#141720", border: "1px solid #1e2535", borderRadius: 999,
                  color: "#e2e8f0", fontSize: 13, outline: "none", boxSizing: "border-box" as const,
                }}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#4a5068", cursor: "pointer", fontSize: 14 }}>×</button>
              )}
            </div>
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
          </>
        ) : (
          <div style={{ flex: 1, overflowY: "auto" }}>
            {docListItems}
          </div>
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DESKTOP
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <span style={s.title}>Docs</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {mode === "documents" && (
            <button onClick={createDocument} style={{ fontSize: 12, fontWeight: 600, color: "#10B981", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 6, padding: "5px 14px", cursor: "pointer" }}>
              + Neu erstellen
            </button>
          )}
          <span style={s.count}>{mode === "briefings" ? `${filtered.length} Briefings` : `${documents.length} Dokumente`}</span>
        </div>
      </div>

      {/* Mode toggle */}
      {modeToggle}

      {/* Briefings filters (only in briefings mode) */}
      {mode === "briefings" && (
        <>
          <div style={s.filterRow}>
            <button style={s.chip(activeProject === "all")} onClick={() => setProject("all")}>
              Alle Projekte
            </button>
            {projects.map(p => (
              <button key={p.id} style={s.chip(activeProject === p.name, p.color)} onClick={() => setProject(p.name)}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: p.color, flexShrink: 0 }} />
                {p.name.split("—")[0].trim()}
                <span style={{ color: "#4a5068", fontSize: 11, marginLeft: 1 }}>{projectCount(p.name)}</span>
              </button>
            ))}
          </div>
          <div style={s.filterRow}>
            {TABS.filter(t => counts[t] > 0 || t === "all").map(t => (
              <button key={t} style={s.chip(activeTab === t)} onClick={() => { setActiveTab(t); localStorage.setItem("docsTab", t); }}>
                {CATEGORY_META[t].emoji} {CATEGORY_META[t].label}
                {counts[t] > 0 && <span style={{ marginLeft: 2, background: "#1a1d27", borderRadius: 999, padding: "0 5px", fontSize: 11, color: "#4a5068" }}>{counts[t]}</span>}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Search pill (briefings mode only) */}
      {mode === "briefings" && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <div style={{ position: "relative", flex: 1, maxWidth: 320 }}>
            <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "#4a5068", pointerEvents: "none" }}>🔍</span>
            <input
              type="text"
              placeholder="Briefings durchsuchen…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: "100%", paddingLeft: 32, paddingRight: searchQuery ? 28 : 12, paddingTop: 6, paddingBottom: 6,
                background: "#141720", border: "1px solid #1e2535", borderRadius: 999,
                color: "#e2e8f0", fontSize: 13, outline: "none",
                boxSizing: "border-box" as const,
              }}
              onFocus={e => e.currentTarget.style.borderColor = "#6366f1"}
              onBlur={e => e.currentTarget.style.borderColor = "#1e2535"}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} style={{
                position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                background: "none", border: "none", color: "#4a5068", cursor: "pointer", fontSize: 14, lineHeight: 1,
              }}>×</button>
            )}
          </div>
          {searchQuery && (
            <span style={{ fontSize: 12, color: "#4a5068" }}>{filtered.length} Treffer</span>
          )}
        </div>
      )}

      {/* Split Pane */}
      <div ref={containerRef} style={s.splitContainer}>
        {/* List */}
        <div style={{ ...s.list, width: listWidth }}>
          {mode === "briefings" ? (
            <>
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
            </>
          ) : (
            <>
              <div style={s.listHeader}>
                Dokumente · {documents.length}
              </div>
              {docListItems}
            </>
          )}
        </div>

        {/* Drag Handle */}
        <div style={s.handle} onMouseDown={onDragStart}
          onMouseEnter={e => (e.currentTarget.style.background = "#2a2d38")}
          onMouseLeave={e => (e.currentTarget.style.background = "#1e2128")}>
          <span style={{ fontSize: 10, color: "#4a5068", writingMode: "vertical-rl" }}>⋮⋮</span>
        </div>

        {/* Right Pane */}
        {mode === "briefings" ? (
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
        ) : (
          <div style={{ ...s.preview, background: "#141720" }}>
            {editorPane}
          </div>
        )}
      </div>
    </div>
  );
}
