"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import HorizontalRule from "@tiptap/extension-horizontal-rule";
import Placeholder from "@tiptap/extension-placeholder";
import EditProjectModal from "./edit-modal";


// ─── Types ───────────────────────────────────────────────────────────────────
type Project = {
  id: string; name: string; client: string; status: string;
  stage?: string; opportunityValue?: string; description?: string;
  repo?: string; color: string;
};

type Meeting = {
  id: string; projectId: string; title: string; type: string; date: string;
  durationMin?: number; participants: string[]; notes?: string;
  summary?: string; driveLink?: string; actionItems: string[];
  status: string; createdAt: string;
};

type Task = { id: string; title: string; project: string; status: string; };
type Person = { id: string; name: string; company: string; role?: string; email?: string; project?: string; };
type BriefingFile = { name: string; path: string; modified: string; };

// ─── Constants ────────────────────────────────────────────────────────────────
const STAGES = [
  { key: "lead", label: "Lead" },
  { key: "discovery", label: "Discovery" },
  { key: "proposal", label: "Proposal" },
  { key: "solution-engineering", label: "Solution Engineering" },
  { key: "rollout", label: "Rollout" },
  { key: "live", label: "Live ✓" },
];

const MEETING_TYPES = ["call", "meeting", "review", "workshop", "demo"];

const EMPTY_MEETING = { title: "", type: "call", date: "", durationMin: "", driveLink: "", summary: "", participants: [] as string[] };

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

// ─── Meeting Modal ─────────────────────────────────────────────────────────────
function MeetingModal({ project, people, onClose, onSaved, editing }: {
  project: Project; people: Person[]; onClose: () => void; onSaved: () => void; editing?: Meeting | null;
}) {
  const [form, setForm] = useState(editing ? {
    title: editing.title, type: editing.type, date: editing.date,
    durationMin: editing.durationMin?.toString() ?? "", driveLink: editing.driveLink ?? "",
    summary: editing.summary ?? "", participants: editing.participants,
  } : { ...EMPTY_MEETING });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.title.trim() || !form.date) return;
    setSaving(true);
    const body = {
      projectId: project.id, title: form.title, type: form.type, date: form.date,
      durationMin: form.durationMin ? parseInt(form.durationMin) : null,
      driveLink: form.driveLink || null, summary: form.summary || null,
      participants: form.participants,
    };
    if (editing) {
      await fetch(`/api/meetings?id=${editing.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    } else {
      await fetch("/api/meetings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    }
    setSaving(false);
    onSaved();
  };

  const IS = { width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #1e2128", background: "#0d0f12", color: "#f0f2f5", fontSize: 13, outline: "none" };
  const LS = { fontSize: 11, color: "#8b90a0", marginBottom: 4, display: "block" as const };

  const projectPeople = people.filter(p =>
    (p.project && p.project.toLowerCase().includes(project.name.toLowerCase())) ||
    (p.company && p.company.toLowerCase().includes(project.client.toLowerCase()))
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, padding: 20 }} onClick={onClose}>
      <div style={{ background: "#141720", border: "1px solid #1e2128", borderRadius: 16, padding: 24, width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>{editing ? "Meeting bearbeiten" : "Neues Meeting"}</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div><label style={LS}>Titel *</label><input style={IS} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="z.B. Discovery Call" /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={LS}>Typ</label>
              <select style={{ ...IS, cursor: "pointer" }} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                {MEETING_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
            <div><label style={LS}>Datum *</label><input style={IS} type="datetime-local" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><label style={LS}>Dauer (Min)</label><input style={IS} type="number" value={form.durationMin} onChange={e => setForm(f => ({ ...f, durationMin: e.target.value }))} placeholder="60" /></div>
            <div><label style={LS}>Drive-Link</label><input style={IS} value={form.driveLink} onChange={e => setForm(f => ({ ...f, driveLink: e.target.value }))} placeholder="https://drive.google.com/..." /></div>
          </div>
          <div>
            <label style={LS}>Teilnehmer</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
              {projectPeople.map(p => {
                const sel = form.participants.includes(p.name);
                return (
                  <button key={p.id} onClick={() => setForm(f => ({ ...f, participants: sel ? f.participants.filter(x => x !== p.name) : [...f.participants, p.name] }))}
                    style={{ padding: "4px 10px", borderRadius: 999, fontSize: 11, border: `1px solid ${sel ? "#10B981" : "#1e2128"}`, background: sel ? "rgba(16,185,129,0.12)" : "#0d0f12", color: sel ? "#10B981" : "#8b90a0", cursor: "pointer" }}>
                    {p.name}
                  </button>
                );
              })}
            </div>
          </div>
          <div><label style={LS}>Zusammenfassung / Notizen</label><textarea style={{ ...IS, resize: "vertical" }} rows={3} value={form.summary} onChange={e => setForm(f => ({ ...f, summary: e.target.value }))} placeholder="Key-Takeaways, Entscheidungen, nächste Schritte…" /></div>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "9px 0", borderRadius: 8, border: "1px solid #1e2128", background: "transparent", color: "#8b90a0", fontSize: 13, cursor: "pointer" }}>Abbrechen</button>
          <button onClick={save} disabled={saving || !form.title.trim() || !form.date} style={{ flex: 2, padding: "9px 0", borderRadius: 8, border: "none", background: saving ? "#0a7a50" : "#10B981", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{saving ? "Speichern…" : "Speichern"}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [project, setProject] = useState<Project | null>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [briefings, setBriefings] = useState<BriefingFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);
  const [meetingModal, setMeetingModal] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [stageUpdating, setStageUpdating] = useState(false);
  const [editOppValue, setEditOppValue] = useState(false);
  const [oppValueInput, setOppValueInput] = useState("");
  const [editProjectModal, setEditProjectModal] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit, Underline, TaskList, TaskItem.configure({ nested: true }),
      HorizontalRule, Placeholder.configure({ placeholder: "Notizen, Vorbereitung, Fragen für den nächsten Call…" }),
    ],
    content: "",
    editorProps: {
      attributes: { style: "outline:none; min-height:200px; padding:14px; font-size:13px; line-height:1.7; color:#c8ccd8;" },
    },
  });

  const load = useCallback(async () => {
    const [projRes, meetRes, taskRes, peopleRes, briefRes, noteRes] = await Promise.all([
      fetch("/api/projects"),
      fetch(`/api/meetings?projectId=${id}`),
      fetch("/api/tasks"),
      fetch("/api/people"),
      fetch("/api/briefings"),
      fetch(`/api/notes?projectId=${id}`),
    ]);
    const projData = await projRes.json();
    const proj = (projData.projects ?? []).find((p: Project) => p.id === id);
    if (!proj) { router.push("/projects"); return; }
    setProject(proj);
    setOppValueInput(proj.opportunityValue ?? "");

    const meetData = await meetRes.json();
    setMeetings(meetData.meetings ?? []);

    const taskData = await taskRes.json();
    setTasks((taskData.tasks ?? []).filter((t: Task) => t.project === proj.name && t.status === "todo"));

    const peopleData = await peopleRes.json();
    setPeople(peopleData.people ?? []);

    const briefData = await briefRes.json();
    const words = proj.name.toLowerCase().split(/\s+/).filter((w: string) => w.length > 3);
    setBriefings((briefData.files ?? []).filter((f: BriefingFile) =>
      words.some((w: string) => f.name.toLowerCase().includes(w))
    ).slice(0, 5));

    const noteData = await noteRes.json();
    if (editor && noteData.content) {
      try { editor.commands.setContent(JSON.parse(noteData.content)); } catch {}
    }
    setLoading(false);
  }, [id, editor, router]);

  useEffect(() => { if (editor) load(); }, [editor, load]);

  const saveNote = async () => {
    if (!editor) return;
    setNoteSaving(true);
    await fetch(`/api/notes?projectId=${id}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: JSON.stringify(editor.getJSON()) }),
    });
    setNoteSaving(false);
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 2000);
  };

  const setStage = async (stage: string) => {
    if (!project || stageUpdating) return;
    setStageUpdating(true);
    await fetch(`/api/projects?id=${project.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stage }) });
    setProject(p => p ? { ...p, stage } : p);
    setStageUpdating(false);
  };

  const saveOppValue = async () => {
    if (!project) return;
    await fetch(`/api/projects?id=${project.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ opportunityValue: oppValueInput }) });
    setProject(p => p ? { ...p, opportunityValue: oppValueInput } : p);
    setEditOppValue(false);
  };

  const deleteMeeting = async (mId: string) => {
    await fetch(`/api/meetings?id=${mId}`, { method: "DELETE" });
    load();
  };

  if (loading) return <div style={{ padding: 40, color: "#8b90a0" }}>Laden…</div>;
  if (!project) return null;

  const color = project.color;
  const stageIdx = STAGES.findIndex(s => s.key === (project.stage ?? "lead"));
  const planned = meetings.filter(m => m.status === "planned").sort((a, b) => a.date.localeCompare(b.date));
  const past = meetings.filter(m => m.status !== "planned").sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      {/* Color Bar */}
      <div style={{ height: 4, background: color }} />

      {/* Header */}
      <div style={{ padding: "20px 28px 16px", borderBottom: "1px solid #1e2128" }}>
        <div style={{ fontSize: 12, color: "#4a5068", marginBottom: 8 }}>
          <span style={{ cursor: "pointer", color: "#8b90a0" }} onClick={() => router.push("/projects")}>← Projects</span>
        </div>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.3px" }}>{project.name}</h1>
            <div style={{ fontSize: 13, color: "#8b90a0", marginTop: 3 }}>{project.client}</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {/* Opportunity Value */}
            {editOppValue ? (
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input value={oppValueInput} onChange={e => setOppValueInput(e.target.value)} onKeyDown={e => e.key === "Enter" && saveOppValue()}
                  placeholder="z.B. 12.000 €" autoFocus
                  style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #1e2128", background: "#0d0f12", color: "#f0f2f5", fontSize: 12, width: 130, outline: "none" }} />
                <button onClick={saveOppValue} style={{ padding: "5px 10px", borderRadius: 6, border: "none", background: "#10B981", color: "#fff", fontSize: 12, cursor: "pointer" }}>✓</button>
                <button onClick={() => setEditOppValue(false)} style={{ padding: "5px 8px", borderRadius: 6, border: "1px solid #1e2128", background: "transparent", color: "#8b90a0", fontSize: 12, cursor: "pointer" }}>✕</button>
              </div>
            ) : (
              <button onClick={() => setEditOppValue(true)} style={{ padding: "5px 12px", borderRadius: 6, border: `1px solid ${color}40`, background: `${color}12`, color, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                💰 {project.opportunityValue ?? "Wert eintragen"}
              </button>
            )}
            <span style={{ padding: "4px 12px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: "rgba(16,185,129,0.12)", color: "#10B981", border: "1px solid rgba(16,185,129,0.25)" }}>● {project.status.charAt(0).toUpperCase() + project.status.slice(1)}</span>
            <button onClick={() => setEditProjectModal(true)} style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid #1e2128", background: "transparent", color: "#8b90a0", fontSize: 12, cursor: "pointer" }}>✏️ Bearbeiten</button>
          </div>
        </div>
      </div>

      {/* Pipeline */}
      <div style={{ padding: "12px 28px", background: "#0d0f12", borderBottom: "1px solid #1e2128", display: "flex", alignItems: "center", gap: 0, overflowX: "auto" }}>
        <span style={{ fontSize: 11, color: "#4a5068", marginRight: 16, whiteSpace: "nowrap", textTransform: "uppercase", letterSpacing: "0.5px" }}>Opportunity</span>
        {STAGES.map((s, i) => {
          const isDone = i < stageIdx;
          const isActive = i === stageIdx;
          return (
            <div key={s.key} style={{ display: "flex", alignItems: "center" }}>
              {i > 0 && <span style={{ color: "#1e2128", fontSize: 14, margin: "0 2px" }}>›</span>}
              <button onClick={() => setStage(s.key)} style={{
                display: "flex", alignItems: "center", gap: 5, padding: "5px 12px",
                fontSize: 12, fontWeight: isActive ? 700 : 500,
                color: isActive ? color : isDone ? "#10B981" : "#4a5068",
                background: isActive ? `${color}12` : "transparent",
                border: isActive ? `1px solid ${color}30` : "1px solid transparent",
                borderRadius: 6, cursor: "pointer", whiteSpace: "nowrap",
              }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", flexShrink: 0, background: isActive ? color : isDone ? "#10B981" : "#1e2128", border: `2px solid ${isActive ? `${color}50` : isDone ? "rgba(16,185,129,0.4)" : "#2a2e38"}`, display: "inline-block" }} />
                {s.label}
              </button>
            </div>
          );
        })}
      </div>

      {/* Body */}
      <div style={{ display: "flex", gap: 20, padding: "24px 28px", alignItems: "flex-start", flexWrap: "wrap" }}>

        {/* Main Column */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Notes Editor */}
          <div style={{ background: "#141720", border: "1px solid #1e2128", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid #1e2128" }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>📝 Notizen & Vorbereitung</span>
              <span style={{ fontSize: 11, color: noteSaved ? "#10B981" : "#4a5068" }}>{noteSaved ? "✓ Gespeichert" : "Nicht gespeichert"}</span>
            </div>
            {/* Toolbar */}
            <div style={{ display: "flex", gap: 2, padding: "6px 10px", background: "#111318", borderBottom: "1px solid #1e2128", flexWrap: "wrap" }}>
              <TB onClick={() => editor?.chain().focus().toggleBold().run()} active={editor?.isActive("bold")}><b>B</b></TB>
              <TB onClick={() => editor?.chain().focus().toggleItalic().run()} active={editor?.isActive("italic")}><i>I</i></TB>
              <TB onClick={() => editor?.chain().focus().toggleUnderline().run()} active={editor?.isActive("underline")}><u>U</u></TB>
              <span style={{ width: 1, background: "#1e2128", margin: "2px 4px" }} />
              <TB onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} active={editor?.isActive("heading", { level: 1 })}>H1</TB>
              <TB onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} active={editor?.isActive("heading", { level: 2 })}>H2</TB>
              <span style={{ width: 1, background: "#1e2128", margin: "2px 4px" }} />
              <TB onClick={() => editor?.chain().focus().toggleBulletList().run()} active={editor?.isActive("bulletList")}>• Liste</TB>
              <TB onClick={() => editor?.chain().focus().toggleOrderedList().run()} active={editor?.isActive("orderedList")}>1. Liste</TB>
              <TB onClick={() => editor?.chain().focus().toggleTaskList().run()} active={editor?.isActive("taskList")}>☐ Tasks</TB>
              <span style={{ width: 1, background: "#1e2128", margin: "2px 4px" }} />
              <TB onClick={() => editor?.chain().focus().setHorizontalRule().run()}>— Linie</TB>
            </div>
            <div style={{ background: "#0d0f12" }}>
              <EditorContent editor={editor} />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", padding: "8px 12px", background: "#111318", borderTop: "1px solid #1e2128" }}>
              <button onClick={saveNote} disabled={noteSaving} style={{ padding: "6px 18px", borderRadius: 6, border: "none", background: noteSaving ? "#0a7a50" : "#10B981", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                {noteSaving ? "Speichern…" : "💾 Speichern"}
              </button>
            </div>
          </div>

          {/* Meetings */}
          <div style={{ background: "#141720", border: "1px solid #1e2128", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid #1e2128" }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>📅 Meetings & Calls</span>
              <button onClick={() => { setEditingMeeting(null); setMeetingModal(true); }} style={{ padding: "5px 14px", borderRadius: 6, border: "none", background: color, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>+ Neues Meeting</button>
            </div>

            {planned.length > 0 && (
              <>
                <div style={{ padding: "8px 16px 4px", fontSize: 11, color: "#4a5068", textTransform: "uppercase", letterSpacing: "0.5px" }}>Geplant</div>
                {planned.map(m => <MeetingRow key={m.id} m={m} color={color} onEdit={() => { setEditingMeeting(m); setMeetingModal(true); }} onDelete={() => deleteMeeting(m.id)} onMarkDone={async () => { await fetch(`/api/meetings?id=${m.id}`, { method: "PATCH", headers: {"Content-Type":"application/json"}, body: JSON.stringify({status:"done"}) }); load(); }} projectId={id} onTaskCreated={load} />)}
              </>
            )}
            {past.length > 0 && (
              <>
                <div style={{ padding: "8px 16px 4px", fontSize: 11, color: "#4a5068", textTransform: "uppercase", letterSpacing: "0.5px", borderTop: planned.length > 0 ? "1px solid #1e2128" : "none" }}>Vergangen</div>
                {past.map(m => <MeetingRow key={m.id} m={m} color={color} onEdit={() => { setEditingMeeting(m); setMeetingModal(true); }} onDelete={() => deleteMeeting(m.id)} onMarkDone={async () => { await fetch(`/api/meetings?id=${m.id}`, { method: "PATCH", headers: {"Content-Type":"application/json"}, body: JSON.stringify({status:"done"}) }); load(); }} projectId={id} onTaskCreated={load} />)}
              </>
            )}
            {meetings.length === 0 && <div style={{ padding: "24px 16px", textAlign: "center", color: "#4a5068", fontSize: 12 }}>Noch keine Meetings. + Neues Meeting anlegen.</div>}
          </div>
        </div>

        {/* Sidebar */}
        <div style={{ width: 260, flexShrink: 0, display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Info */}
          <SideCard title="📊 Projekt-Info">
            <InfoRow label="Client" value={project.client} />
            <InfoRow label="Stage" value={<span style={{ padding: "2px 8px", borderRadius: 999, fontSize: 11, background: `${color}18`, color, border: `1px solid ${color}30` }}>{STAGES.find(s => s.key === project.stage)?.label ?? "Lead"}</span>} />
            {project.opportunityValue && <InfoRow label="Wert" value={project.opportunityValue} />}
            {project.description && <div style={{ fontSize: 12, color: "#4a5068", paddingTop: 8, lineHeight: 1.6 }}>{project.description}</div>}
          </SideCard>

          {/* Briefings */}
          {briefings.length > 0 && (
            <SideCard title="📁 Briefings">
              {briefings.map(f => (
                <a key={f.name} href={`/briefings/${f.name}`} target="_blank" rel="noreferrer"
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 8px", borderRadius: 6, fontSize: 11, color: "#8b90a0", textDecoration: "none", background: "#0d0f12", marginBottom: 4 }}>
                  📄 {f.name}
                </a>
              ))}
            </SideCard>
          )}

          {/* Tasks */}
          {tasks.length > 0 && (
            <SideCard title="✅ Offene Tasks">
              {tasks.map(t => (
                <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: "1px solid #111318", fontSize: 12, color: "#8b90a0" }}>
                  <div style={{ width: 13, height: 13, borderRadius: 3, border: "1.5px solid #2a2e38", flexShrink: 0 }} />
                  {t.title}
                </div>
              ))}
            </SideCard>
          )}

          {/* People */}
          {people.filter(p => p.project?.toLowerCase().includes(project.name.toLowerCase().split(" ")[0]) || project.client.toLowerCase().includes((p.company ?? "").toLowerCase().split(" ")[0])).length > 0 && (
            <SideCard title="👥 Kontakte">
              {people.filter(p => p.project?.toLowerCase().includes(project.name.toLowerCase().split(" ")[0]) || project.client.toLowerCase().includes((p.company ?? "").toLowerCase().split(" ")[0])).map(p => (
                <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: "1px solid #111318" }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: `${color}18`, border: `1.5px solid ${color}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color, flexShrink: 0 }}>{p.name.charAt(0)}</div>
                  <div><div style={{ fontSize: 12, fontWeight: 600 }}>{p.name}</div><div style={{ fontSize: 11, color: "#4a5068" }}>{p.role ?? p.company}</div></div>
                </div>
              ))}
            </SideCard>
          )}
        </div>
      </div>

      {/* Modals */}
      {meetingModal && project && (
        <MeetingModal
          project={project} people={people}
          editing={editingMeeting}
          onClose={() => { setMeetingModal(false); setEditingMeeting(null); }}
          onSaved={() => { setMeetingModal(false); setEditingMeeting(null); load(); }}
        />
      )}
      {editProjectModal && project && (
        <EditProjectModal
          project={project}
          onClose={() => setEditProjectModal(false)}
          onSaved={() => { setEditProjectModal(false); load(); }}
        />
      )}
    </div>
  );
}

// ─── MeetingRow Component ─────────────────────────────────────────────────────
function MeetingRow({ m, color, onEdit, onDelete, onMarkDone, projectId, onTaskCreated }: {
  m: Meeting; color: string; onEdit: () => void; onDelete: () => void; onMarkDone: () => void;
  projectId: string; onTaskCreated: () => void;
}) {
  const [addingAI, setAddingAI] = useState("");

  const dateStr = m.date ? new Date(m.date).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "";
  const typeColor = m.status === "planned" ? color : "#4a5068";

  const createTask = async (title: string) => {
    if (!title.trim()) return;
    await fetch("/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, project: projectId }) });
    onTaskCreated();
    setAddingAI("");
  };

  return (
    <div style={{ padding: "14px 16px", borderTop: "1px solid #1e2128" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>{dateStr}</span>
          <span style={{ padding: "2px 8px", borderRadius: 999, fontSize: 11, background: `${typeColor}15`, color: typeColor, border: `1px solid ${typeColor}30` }}>{m.type.charAt(0).toUpperCase() + m.type.slice(1)}</span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {m.status === "planned" && <button onClick={onMarkDone} style={{ padding: "3px 8px", borderRadius: 5, border: "1px solid #1e2128", background: "transparent", color: "#8b90a0", fontSize: 11, cursor: "pointer" }}>✓ Erledigt</button>}
          <button onClick={onEdit} style={{ padding: "3px 8px", borderRadius: 5, border: "1px solid #1e2128", background: "transparent", color: "#8b90a0", fontSize: 11, cursor: "pointer" }}>✏️</button>
          <button onClick={onDelete} style={{ padding: "3px 8px", borderRadius: 5, border: "1px solid #1e2128", background: "transparent", color: "#4a5068", fontSize: 11, cursor: "pointer" }}>🗑</button>
        </div>
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{m.title}</div>
      {(m.participants.length > 0 || m.durationMin) && (
        <div style={{ fontSize: 12, color: "#4a5068", marginBottom: 6 }}>
          {m.durationMin && `${m.durationMin} min`}{m.durationMin && m.participants.length > 0 && " · "}{m.participants.join(", ")}
        </div>
      )}
      {m.summary && <div style={{ fontSize: 12, color: "#8b90a0", background: "#0d0f12", borderRadius: 6, padding: "8px 10px", lineHeight: 1.6, marginBottom: 8 }}>{m.summary}</div>}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {m.driveLink && <a href={m.driveLink} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 999, fontSize: 11, border: "1px solid #1e2128", color: "#8b90a0", background: "#0d0f12", textDecoration: "none" }}>🔗 Drive</a>}
        {/* Action Items → Tasks */}
        {m.actionItems.map((ai, i) => (
          <button key={i} onClick={() => createTask(ai)} title="Als Task anlegen"
            style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 999, fontSize: 11, border: "1px solid rgba(16,185,129,0.3)", color: "#10B981", background: "rgba(16,185,129,0.08)", cursor: "pointer" }}>
            + Task: {ai.length > 25 ? ai.slice(0, 25) + "…" : ai}
          </button>
        ))}
        <button onClick={() => setAddingAI(addingAI ? "" : " ")} style={{ padding: "3px 8px", borderRadius: 999, fontSize: 11, border: "1px dashed #1e2128", color: "#4a5068", background: "transparent", cursor: "pointer" }}>+ Action Item</button>
      </div>
      {addingAI !== "" && (
        <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
          <input autoFocus value={addingAI.trim()} onChange={e => setAddingAI(e.target.value)} onKeyDown={e => e.key === "Enter" && createTask(addingAI)} placeholder="Task-Titel" style={{ flex: 1, padding: "5px 10px", borderRadius: 6, border: "1px solid #1e2128", background: "#0d0f12", color: "#f0f2f5", fontSize: 12, outline: "none" }} />
          <button onClick={() => createTask(addingAI)} style={{ padding: "5px 10px", borderRadius: 6, border: "none", background: "#10B981", color: "#fff", fontSize: 12, cursor: "pointer" }}>+ Task</button>
        </div>
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function SideCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#141720", border: "1px solid #1e2128", borderRadius: 12, overflow: "hidden" }}>
      <div style={{ padding: "11px 14px", borderBottom: "1px solid #1e2128", fontSize: 13, fontWeight: 600 }}>{title}</div>
      <div style={{ padding: "10px 14px" }}>{children}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid #111318", fontSize: 12 }}>
      <span style={{ color: "#4a5068" }}>{label}</span>
      <span style={{ color: "#c8ccd8" }}>{value}</span>
    </div>
  );
}
