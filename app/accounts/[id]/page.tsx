"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import CallPrepTab from "./call-prep-tab";

type Account = {
  id: string; name: string; domain?: string; industry?: string; size?: string;
  status: string; color: string; notes?: string; createdAt: string;
  contactCount?: number; dealCount?: number; projectCount?: number;
  lastActivityAt?: string; pipelineValue?: number;
};
type Person = {
  id: string; name: string; company: string; role?: string; email?: string;
  phone?: string; notes?: string; accountId?: string; contactRole?: string;
};
type Deal = {
  id: string; accountId: string; title: string; value?: number; stage: string;
  probability: number; expectedClose?: string; notes?: string; createdAt: string;
  closedAt?: string; accountName?: string; accountColor?: string;
};
type Project = {
  id: string; name: string; client: string; status: string; description?: string;
  repo?: string; color: string; accountId?: string;
};
type Activity = {
  id: string; type: string; title?: string; summary?: string; createdAt: string;
  accountId?: string; dealId?: string; contactId?: string;
};
type CalEvent = {
  id: string; summary: string; start: string; end: string;
  linkedPeople: { id: string; name: string }[];
  linkedAccount?: { id: string; name: string; color: string };
};

const STATUS_LABEL: Record<string, string> = { prospect: "Prospect", active: "Active", churned: "Churned", paused: "Paused" };
const STATUS_COLOR: Record<string, string> = { prospect: "#6366f1", active: "#10B981", churned: "#ef4444", paused: "#F59E0B" };
const DEAL_STAGE_LABEL: Record<string, string> = {
  lead: "Lead", qualified: "Qualified", discovery: "Discovery", proposal: "Proposal",
  negotiation: "Negotiation", "closed-won": "Won", "closed-lost": "Lost",
};
const DEAL_STAGE_COLOR: Record<string, string> = {
  lead: "#6366f1", qualified: "#8B5CF6", discovery: "#3B82F6", proposal: "#F59E0B",
  negotiation: "#EC4899", "closed-won": "#10B981", "closed-lost": "#ef4444",
};
const ROLE_LABEL: Record<string, string> = {
  "decision-maker": "Decision Maker", champion: "Champion", "technical-lead": "Tech Lead",
  contact: "Contact", billing: "Billing",
};
const ROLE_COLOR: Record<string, string> = {
  "decision-maker": "#F59E0B", champion: "#10B981", "technical-lead": "#3B82F6",
  contact: "#8b90a0", billing: "#8B5CF6",
};
const ACTIVITY_ICONS: Record<string, string> = {
  call: "📞", email: "📧", meeting: "📅", note: "📝", transcript: "🎙️", "stage-change": "📊",
};

const IS = { width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #1e2128", background: "#0d0f12", color: "#f0f2f5", fontSize: 13, outline: "none", boxSizing: "border-box" as const };
const LS = { fontSize: 11, color: "#8b90a0", marginBottom: 4, display: "block" as const };

type Tab = "overview" | "notes" | "contacts" | "deals" | "projects" | "activities" | "callprep";

export default function AccountDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");
  const [account, setAccount] = useState<Account | null>(null);
  const [contacts, setContacts] = useState<Person[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [calEvents, setCalEvents] = useState<CalEvent[]>([]);
  const [openNoteEventId, setOpenNoteEventId] = useState<string | null>(null);
  const [discoveryNotesCount, setDiscoveryNotesCount] = useState(0);
  const [notesSaved, setNotesSaved] = useState(false);
  const [notesSaving, setNotesSaving] = useState(false);
  const notesAutoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Modals
  const [contactModal, setContactModal] = useState(false);
  const [editingContact, setEditingContact] = useState<Person | null>(null);
  const [contactForm, setContactForm] = useState({ name: "", role: "", email: "", phone: "", contactRole: "contact", notes: "" });
  const [dealModal, setDealModal] = useState(false);
  const [dealForm, setDealForm] = useState({ title: "", value: "", stage: "lead", probability: "50", expectedClose: "", notes: "" });
  const [activityModal, setActivityModal] = useState(false);
  const [activityForm, setActivityForm] = useState({ type: "call", title: "", summary: "" });
  const [editModal, setEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", domain: "", industry: "", size: "", status: "prospect", color: "#6366f1", notes: "" });
  const [saving, setSaving] = useState(false);
  const [dealEditModal, setDealEditModal] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [dealEditForm, setDealEditForm] = useState({ title: "", value: "", stage: "lead", probability: "50", expectedClose: "", notes: "" });
  const [dealDeleteConfirm, setDealDeleteConfirm] = useState(false);

  // Notes editor (TipTap)
  const notesEditor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Placeholder.configure({ placeholder: "Notizen zum Account…" }),
    ],
    content: "",
    editorProps: {
      attributes: { style: "outline:none; min-height:300px; padding:16px 20px; font-size:13px; line-height:1.75; color:#c8ccd8;" },
    },
    onUpdate: ({ editor }) => {
      if (notesAutoSaveRef.current) clearTimeout(notesAutoSaveRef.current);
      notesAutoSaveRef.current = setTimeout(async () => {
        setNotesSaving(true);
        await fetch("/api/account-notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accountId: id, content: JSON.stringify(editor.getJSON()) }),
        });
        setNotesSaving(false);
        setNotesSaved(true);
        setTimeout(() => setNotesSaved(false), 2000);
      }, 1200);
    },
  });

  // Load notes when switching to notes tab
  useEffect(() => {
    if (tab !== "notes" || !notesEditor) return;
    fetch(`/api/account-notes?accountId=${id}`)
      .then(r => r.json())
      .then(d => {
        if (d.content) {
          try { notesEditor.commands.setContent(JSON.parse(d.content)); } catch { notesEditor.commands.setContent(""); }
        }
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, id]);

  const load = useCallback(async () => {
    const [accRes, contactRes, dealRes, projRes, actRes] = await Promise.all([
      fetch("/api/accounts"), fetch(`/api/people?accountId=${id}`),
      fetch(`/api/deals?accountId=${id}`), fetch(`/api/projects?accountId=${id}`),
      fetch(`/api/activities?accountId=${id}`),
    ]);
    const accData = await accRes.json();
    const acc = (accData.accounts ?? []).find((a: Account) => a.id === id);
    if (!acc) { router.push("/accounts"); return; }
    setAccount(acc);
    setEditForm({ name: acc.name, domain: acc.domain ?? "", industry: acc.industry ?? "", size: acc.size ?? "", status: acc.status, color: acc.color, notes: acc.notes ?? "" });
    setContacts((await contactRes.json()).people ?? []);
    setDeals((await dealRes.json()).deals ?? []);
    setProjects((await projRes.json()).projects ?? []);
    setActivities((await actRes.json()).activities ?? []);
    fetch(`/api/discovery-notes?accountId=${id}`).then(r => r.json()).then(d => setDiscoveryNotesCount((d.discoveryNotes ?? []).length)).catch(() => {});
    setLoading(false);
  }, [id, router]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    fetch("/api/calendar", { cache: "no-store" })
      .then(r => r.json())
      .then(d => {
        if (d.disabled) return;
        // Filter: nur Events wo ein Kontakt dieses Accounts verknüpft ist
        // (linkedAccount.id = id ODER wir matchen nachträglich via contacts)
        setCalEvents(d.events ?? []);
      })
      .catch(() => {});
  }, [id]);

  const saveContact = async () => {
    if (!contactForm.name.trim()) return;
    setSaving(true);
    if (editingContact) {
      await fetch(`/api/people?id=${editingContact.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...contactForm, accountId: id, company: account?.name ?? "" }) });
    } else {
      await fetch("/api/people", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...contactForm, accountId: id, company: account?.name ?? "" }) });
    }
    setSaving(false); setContactModal(false); setEditingContact(null);
    setContactForm({ name: "", role: "", email: "", phone: "", contactRole: "contact", notes: "" });
    load();
  };

  const deleteContact = async (cid: string) => {
    await fetch(`/api/people?id=${cid}`, { method: "DELETE" });
    load();
  };

  const saveDeal = async () => {
    if (!dealForm.title.trim()) return;
    setSaving(true);
    await fetch("/api/deals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
      accountId: id, title: dealForm.title, value: dealForm.value ? parseInt(dealForm.value) : null,
      stage: dealForm.stage, probability: parseInt(dealForm.probability) || 0,
      expectedClose: dealForm.expectedClose || null, notes: dealForm.notes || null,
    }) });
    setSaving(false); setDealModal(false);
    setDealForm({ title: "", value: "", stage: "lead", probability: "50", expectedClose: "", notes: "" });
    load();
  };

  const saveActivity = async () => {
    if (!activityForm.title.trim()) return;
    setSaving(true);
    await fetch("/api/activities", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
      type: activityForm.type, title: activityForm.title, summary: activityForm.summary || null, accountId: id,
    }) });
    setSaving(false); setActivityModal(false);
    setActivityForm({ type: "call", title: "", summary: "" });
    load();
  };

  const openDealEdit = (d: Deal) => {
    setEditingDeal(d);
    setDealEditForm({
      title: d.title, value: d.value != null ? String(d.value) : "",
      stage: d.stage, probability: String(d.probability),
      expectedClose: d.expectedClose ?? "", notes: d.notes ?? "",
    });
    setDealDeleteConfirm(false);
    setDealEditModal(true);
  };

  const saveDealEdit = async () => {
    if (!editingDeal || !dealEditForm.title.trim()) return;
    setSaving(true);
    await fetch(`/api/deals?id=${editingDeal.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: dealEditForm.title,
        value: dealEditForm.value ? parseInt(dealEditForm.value) : null,
        stage: dealEditForm.stage,
        probability: parseInt(dealEditForm.probability) || 0,
        expectedClose: dealEditForm.expectedClose || null,
        notes: dealEditForm.notes || null,
      }),
    });
    setSaving(false); setDealEditModal(false); setEditingDeal(null);
    load();
  };

  const deleteDealById = async () => {
    if (!editingDeal) return;
    await fetch(`/api/deals?id=${editingDeal.id}`, { method: "DELETE" });
    setDealEditModal(false); setEditingDeal(null);
    load();
  };

  const saveAccount = async () => {
    if (!editForm.name.trim()) return;
    setSaving(true);
    await fetch(`/api/accounts?id=${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editForm) });
    setSaving(false); setEditModal(false);
    load();
  };

  if (loading) return <div style={{ padding: 40, color: "#8b90a0" }}>Laden…</div>;
  if (!account) return null;

  const color = account.color;
  const sc = STATUS_COLOR[account.status] ?? "#4a5068";
  const openDeals = deals.filter(d => !d.stage.startsWith("closed-"));
  const pipelineValue = openDeals.reduce((s, d) => s + (d.value ?? 0), 0);
  const weightedValue = openDeals.reduce((s, d) => s + ((d.value ?? 0) * d.probability / 100), 0);

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "overview", label: "Overview" },
    { key: "notes", label: "Notes" },
    { key: "contacts", label: "Contacts", count: contacts.length },
    { key: "deals", label: "Deals", count: deals.length },
    { key: "projects", label: "Projects", count: projects.length },
    { key: "activities", label: "Activities", count: activities.length },
    { key: "callprep", label: "Call Prep", count: discoveryNotesCount },
  ];

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      {/* Color Bar */}
      <div style={{ height: 4, background: color }} />

      {/* Header */}
      <div style={{ padding: "20px 28px 16px", borderBottom: "1px solid #1e2128" }}>
        <div style={{ fontSize: 12, color: "#4a5068", marginBottom: 8 }}>
          <span style={{ cursor: "pointer", color: "#8b90a0" }} onClick={() => router.push("/accounts")}>← Accounts</span>
        </div>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.3px" }}>{account.name}</h1>
            <div style={{ display: "flex", gap: 8, marginTop: 4, alignItems: "center", flexWrap: "wrap" }}>
              {account.domain && <span style={{ fontSize: 13, color: "#8b90a0" }}>{account.domain}</span>}
              {account.industry && <span style={{ fontSize: 11, color: "#4a5068", padding: "2px 8px", borderRadius: 999, background: "#1a1d27" }}>{account.industry}</span>}
              {account.size && <span style={{ fontSize: 11, color: "#4a5068", padding: "2px 8px", borderRadius: 999, background: "#1a1d27" }}>{account.size.toUpperCase()}</span>}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ padding: "4px 12px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: `${sc}18`, color: sc, border: `1px solid ${sc}40` }}>● {STATUS_LABEL[account.status]}</span>
            <button onClick={() => setEditModal(true)} style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid #1e2128", background: "transparent", color: "#8b90a0", fontSize: 12, cursor: "pointer" }}>✏️ Edit</button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, padding: "0 28px", borderBottom: "1px solid #1e2128", overflowX: "auto" }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: "10px 16px", fontSize: 13, fontWeight: tab === t.key ? 600 : 400,
            color: tab === t.key ? "#f0f2f5" : "#8b90a0",
            borderBottom: tab === t.key ? `2px solid ${color}` : "2px solid transparent",
            background: "transparent", border: "none", borderBottomWidth: 2, borderBottomStyle: "solid",
            borderBottomColor: tab === t.key ? color : "transparent",
            cursor: "pointer", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6,
          }}>
            {t.label}
            {t.count !== undefined && <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 999, background: tab === t.key ? `${color}20` : "#1a1d27", color: tab === t.key ? color : "#4a5068" }}>{t.count}</span>}
          </button>
        ))}
      </div>

      {/* Body */}
      <div style={{ display: "flex", gap: 20, padding: "24px 28px", alignItems: "flex-start", flexWrap: "wrap" }}>

        {/* Main */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 16 }}>

          {/* ─── OVERVIEW TAB ─── */}
          {tab === "overview" && (
            <>
              {/* Stats */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
                {[
                  { label: "Pipeline", value: pipelineValue > 0 ? `€${pipelineValue.toLocaleString("de-DE")}` : "–", accent: pipelineValue > 0 },
                  { label: "Weighted", value: weightedValue > 0 ? `€${Math.round(weightedValue).toLocaleString("de-DE")}` : "–" },
                  { label: "Open Deals", value: String(openDeals.length), accent: openDeals.length > 0 },
                  { label: "Contacts", value: String(contacts.length) },
                ].map(s => (
                  <div key={s.label} style={{ background: "#141720", border: "1px solid #1e2128", borderRadius: 10, padding: "14px 16px" }}>
                    <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", color: "#4a5068", marginBottom: 6 }}>{s.label}</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: s.accent ? color : "#f0f2f5" }}>{s.value}</div>
                  </div>
                ))}
              </div>

              {/* Recent Activities */}
              <Card title="Recent Activities" action={{ label: "+ Log", onClick: () => { setTab("activities"); setActivityModal(true); } }}>
                {activities.length === 0 && <Empty text="Noch keine Aktivitäten." />}
                {activities.slice(0, 8).map(a => (
                  <div key={a.id} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: "1px solid #111318", alignItems: "flex-start" }}>
                    <span style={{ fontSize: 14, marginTop: 1 }}>{ACTIVITY_ICONS[a.type] ?? "📌"}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 500, color: "#c8ccd6" }}>{a.title ?? a.type}</div>
                      {a.summary && <div style={{ fontSize: 11.5, color: "#4a5068", marginTop: 2, lineHeight: 1.5 }}>{a.summary.length > 120 ? a.summary.slice(0, 120) + "…" : a.summary}</div>}
                    </div>
                    <span style={{ fontSize: 11, color: "#4a5068", flexShrink: 0, whiteSpace: "nowrap" }}>{formatDate(a.createdAt)}</span>
                  </div>
                ))}
              </Card>

              {/* Open Deals */}
              {openDeals.length > 0 && (
                <Card title="Open Deals">
                  {openDeals.map(d => {
                    const stc = DEAL_STAGE_COLOR[d.stage] ?? "#4a5068";
                    return (
                      <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #111318" }}>
                        <span style={{ padding: "2px 8px", borderRadius: 999, fontSize: 10, fontWeight: 600, background: `${stc}18`, color: stc, border: `1px solid ${stc}30` }}>{DEAL_STAGE_LABEL[d.stage]}</span>
                        <span style={{ fontSize: 12.5, fontWeight: 500, color: "#c8ccd6", flex: 1 }}>{d.title}</span>
                        {d.value && <span style={{ fontSize: 12, fontWeight: 600, color }}>{`€${d.value.toLocaleString("de-DE")}`}</span>}
                      </div>
                    );
                  })}
                </Card>
              )}
            </>
          )}

          {/* ─── NOTES TAB ─── */}
          {tab === "notes" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 0, borderRadius: 12, overflow: "hidden", border: "1px solid #1e2128" }}>
              {/* Toolbar */}
              <div style={{ display: "flex", gap: 2, padding: "8px 12px", background: "#111318", borderBottom: "1px solid #1e2128", flexWrap: "wrap", alignItems: "center" }}>
                {[
                  { label: <b>B</b>, action: () => notesEditor?.chain().focus().toggleBold().run(), active: notesEditor?.isActive("bold") },
                  { label: <i>I</i>, action: () => notesEditor?.chain().focus().toggleItalic().run(), active: notesEditor?.isActive("italic") },
                  { label: <u>U</u>, action: () => notesEditor?.chain().focus().toggleUnderline().run(), active: notesEditor?.isActive("underline") },
                ].map((btn, i) => (
                  <button key={i} onMouseDown={e => { e.preventDefault(); btn.action(); }}
                    style={{ padding: "3px 8px", borderRadius: 4, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600,
                      background: btn.active ? "#1e2128" : "transparent", color: btn.active ? "#f0f2f5" : "#8b90a0" }}>
                    {btn.label}
                  </button>
                ))}
                <span style={{ width: 1, background: "#1e2128", margin: "2px 4px", alignSelf: "stretch" }} />
                {(["H1", "H2", "H3"] as const).map((h, i) => (
                  <button key={h} onMouseDown={e => { e.preventDefault(); notesEditor?.chain().focus().toggleHeading({ level: (i + 1) as 1|2|3 }).run(); }}
                    style={{ padding: "3px 8px", borderRadius: 4, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600,
                      background: notesEditor?.isActive("heading", { level: i + 1 }) ? "#1e2128" : "transparent",
                      color: notesEditor?.isActive("heading", { level: i + 1 }) ? "#f0f2f5" : "#8b90a0" }}>
                    {h}
                  </button>
                ))}
                <span style={{ width: 1, background: "#1e2128", margin: "2px 4px", alignSelf: "stretch" }} />
                <button onMouseDown={e => { e.preventDefault(); notesEditor?.chain().focus().toggleBulletList().run(); }}
                  style={{ padding: "3px 8px", borderRadius: 4, border: "none", cursor: "pointer", fontSize: 12,
                    background: notesEditor?.isActive("bulletList") ? "#1e2128" : "transparent", color: notesEditor?.isActive("bulletList") ? "#f0f2f5" : "#8b90a0" }}>
                  Liste
                </button>
                <button onMouseDown={e => { e.preventDefault(); notesEditor?.chain().focus().toggleOrderedList().run(); }}
                  style={{ padding: "3px 8px", borderRadius: 4, border: "none", cursor: "pointer", fontSize: 12,
                    background: notesEditor?.isActive("orderedList") ? "#1e2128" : "transparent", color: notesEditor?.isActive("orderedList") ? "#f0f2f5" : "#8b90a0" }}>
                  1. Liste
                </button>
                <button onMouseDown={e => { e.preventDefault(); notesEditor?.chain().focus().toggleBlockquote().run(); }}
                  style={{ padding: "3px 8px", borderRadius: 4, border: "none", cursor: "pointer", fontSize: 12,
                    background: notesEditor?.isActive("blockquote") ? "#1e2128" : "transparent", color: notesEditor?.isActive("blockquote") ? "#f0f2f5" : "#8b90a0" }}>
                  Zitat
                </button>
                <div style={{ marginLeft: "auto", fontSize: 11, color: notesSaved ? "#10B981" : "#4a5068" }}>
                  {notesSaving ? "Speichern…" : notesSaved ? "✓ Gespeichert" : "Auto-Save"}
                </div>
              </div>
              {/* Editor */}
              <div style={{ background: "#0d0f12", minHeight: 400 }}>
                <EditorContent editor={notesEditor} />
              </div>
            </div>
          )}

          {/* ─── CONTACTS TAB ─── */}
          {tab === "contacts" && (
            <Card title="Contacts" action={{ label: "+ Contact", onClick: () => { setEditingContact(null); setContactForm({ name: "", role: "", email: "", phone: "", contactRole: "contact", notes: "" }); setContactModal(true); } }}>
              {contacts.length === 0 && <Empty text="Noch keine Kontakte." />}
              {contacts.map(c => {
                const rc = ROLE_COLOR[c.contactRole ?? "contact"] ?? "#8b90a0";
                return (
                  <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid #111318" }}>
                    <div style={{ width: 34, height: 34, borderRadius: "50%", background: `${color}18`, border: `1.5px solid ${color}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color, flexShrink: 0 }}>{c.name.charAt(0)}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: "#f0f2f5" }}>{c.name}</span>
                        <span style={{ padding: "1px 7px", borderRadius: 999, fontSize: 10, fontWeight: 600, background: `${rc}18`, color: rc, border: `1px solid ${rc}30` }}>{ROLE_LABEL[c.contactRole ?? "contact"] ?? "Contact"}</span>
                      </div>
                      <div style={{ display: "flex", gap: 8, marginTop: 3, flexWrap: "wrap", alignItems: "center" }}>
                        {c.role && <span style={{ fontSize: 11.5, color: "#4a5068" }}>{c.role}</span>}
                        {c.email && <a href={`mailto:${c.email}`} style={{ fontSize: 11, color: "#8b90a0", textDecoration: "none" }}>{c.email}</a>}
                        {c.phone && <span style={{ fontSize: 11, color: "#4a5068" }}>{c.phone}</span>}
                      </div>
                      {c.notes && <div style={{ fontSize: 11, color: "#4a5068", marginTop: 4, lineHeight: 1.5 }}>{c.notes.length > 150 ? c.notes.slice(0, 150) + "…" : c.notes}</div>}
                    </div>
                    <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                      <button onClick={() => { setEditingContact(c); setContactForm({ name: c.name, role: c.role ?? "", email: c.email ?? "", phone: c.phone ?? "", contactRole: c.contactRole ?? "contact", notes: c.notes ?? "" }); setContactModal(true); }} style={{ padding: "4px 8px", borderRadius: 5, border: "1px solid #1e2128", background: "transparent", color: "#8b90a0", fontSize: 11, cursor: "pointer" }}>✏️</button>
                      <button onClick={() => deleteContact(c.id)} style={{ padding: "4px 8px", borderRadius: 5, border: "1px solid #1e2128", background: "transparent", color: "#4a5068", fontSize: 11, cursor: "pointer" }}>🗑</button>
                    </div>
                  </div>
                );
              })}
            </Card>
          )}

          {/* ─── DEALS TAB ─── */}
          {tab === "deals" && (
            <Card title="Deals" action={{ label: "+ Deal", onClick: () => setDealModal(true) }}>
              {deals.length === 0 && <Empty text="Noch keine Deals." />}
              {deals.map(d => {
                const stc = DEAL_STAGE_COLOR[d.stage] ?? "#4a5068";
                return (
                  <div key={d.id} style={{ padding: "12px 0", borderBottom: "1px solid #111318" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                      <span style={{ padding: "2px 8px", borderRadius: 999, fontSize: 10, fontWeight: 600, background: `${stc}18`, color: stc, border: `1px solid ${stc}30` }}>{DEAL_STAGE_LABEL[d.stage]}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#f0f2f5", flex: 1 }}>{d.title}</span>
                      {d.value != null && <span style={{ fontSize: 13, fontWeight: 700, color }}>€{d.value.toLocaleString("de-DE")}</span>}
                      <button onClick={() => openDealEdit(d)} style={{ padding: "3px 8px", borderRadius: 5, border: "1px solid #1e2128", background: "transparent", color: "#8b90a0", fontSize: 11, cursor: "pointer", flexShrink: 0 }}>✏️</button>
                    </div>
                    <div style={{ display: "flex", gap: 12, fontSize: 11, color: "#4a5068" }}>
                      <span>{d.probability}% probability</span>
                      {d.expectedClose && <span>Close: {d.expectedClose}</span>}
                      <span>Created: {formatDate(d.createdAt)}</span>
                    </div>
                    {d.notes && <div style={{ fontSize: 11.5, color: "#8b90a0", marginTop: 4 }}>{d.notes}</div>}
                  </div>
                );
              })}
            </Card>
          )}

          {/* ─── PROJECTS TAB ─── */}
          {tab === "projects" && (
            <Card title="Projects">
              {projects.length === 0 && <Empty text="Noch keine Projekte." />}
              {projects.map(p => (
                <div key={p.id} onClick={() => router.push(`/projects/${p.id}`)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid #111318", cursor: "pointer" }}>
                  <div style={{ width: 4, height: 32, borderRadius: 2, background: p.color, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#f0f2f5" }}>{p.name}</div>
                    {p.description && <div style={{ fontSize: 11.5, color: "#4a5068", marginTop: 2 }}>{p.description.length > 100 ? p.description.slice(0, 100) + "…" : p.description}</div>}
                  </div>
                  <span style={{ padding: "3px 8px", borderRadius: 999, fontSize: 11, background: p.status === "active" ? "rgba(16,185,129,0.12)" : "#1a1d27", color: p.status === "active" ? "#10B981" : "#4a5068" }}>{p.status}</span>
                </div>
              ))}
            </Card>
          )}

          {/* ─── ACTIVITIES TAB ─── */}
          {tab === "activities" && (
            <>
              {/* Upcoming Calendar Events */}
              {(() => {
                const contactIds = new Set(contacts.map(c => c.id));
                const upcoming = calEvents
                  .filter(e => new Date(e.start) >= new Date() && e.linkedPeople.some(lp => contactIds.has(lp.id)))
                  .sort((a, b) => a.start.localeCompare(b.start))
                  .slice(0, 10);
                if (upcoming.length === 0) return null;
                return (
                  <Card title="📅 Geplante Termine">
                    {upcoming.map(ev => (
                      <CalEventRow
                        key={ev.id}
                        ev={ev}
                        color={color}
                        isOpen={openNoteEventId === ev.id}
                        onToggleNote={() => setOpenNoteEventId(openNoteEventId === ev.id ? null : ev.id)}
                      />
                    ))}
                  </Card>
                );
              })()}

              <Card title="Activity Timeline" action={{ label: "+ Log Activity", onClick: () => setActivityModal(true) }}>
                {activities.length === 0 && <Empty text="Noch keine Aktivitäten." />}
                {activities.map(a => (
                  <div key={a.id} style={{ display: "flex", gap: 10, padding: "10px 0", borderBottom: "1px solid #111318", alignItems: "flex-start" }}>
                    <span style={{ fontSize: 16, marginTop: 1 }}>{ACTIVITY_ICONS[a.type] ?? "📌"}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 12.5, fontWeight: 500, color: "#c8ccd6" }}>{a.title ?? a.type}</span>
                        <span style={{ padding: "1px 6px", borderRadius: 999, fontSize: 10, background: "#1a1d27", color: "#4a5068" }}>{a.type}</span>
                      </div>
                      {a.summary && <div style={{ fontSize: 12, color: "#8b90a0", marginTop: 4, lineHeight: 1.6, background: "#0d0f12", borderRadius: 6, padding: "6px 10px" }}>{a.summary}</div>}
                    </div>
                    <span style={{ fontSize: 11, color: "#4a5068", flexShrink: 0, whiteSpace: "nowrap" }}>{formatDate(a.createdAt)}</span>
                  </div>
                ))}
              </Card>
            </>
          )}

          {/* ─── CALL PREP TAB ─── */}
          {tab === "callprep" && (
            <CallPrepTab accountId={id} contacts={contacts} color={color} />
          )}
        </div>

        {/* ─── SIDEBAR ─── */}
        <div style={{ width: 260, flexShrink: 0, display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Key Contacts */}
          <SideCard title="Key Contacts">
            {contacts.filter(c => c.contactRole === "decision-maker" || c.contactRole === "champion").length === 0 && contacts.length > 0 && (
              <div style={{ fontSize: 11, color: "#4a5068", padding: "4px 0" }}>No key contacts assigned yet.</div>
            )}
            {contacts.filter(c => c.contactRole === "decision-maker" || c.contactRole === "champion").map(c => {
              const rc = ROLE_COLOR[c.contactRole ?? "contact"] ?? "#8b90a0";
              return (
                <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderBottom: "1px solid #111318" }}>
                  <div style={{ width: 26, height: 26, borderRadius: "50%", background: `${color}18`, border: `1.5px solid ${color}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color, flexShrink: 0 }}>{c.name.charAt(0)}</div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{c.name}</div>
                    <div style={{ fontSize: 10, color: rc }}>{ROLE_LABEL[c.contactRole ?? "contact"]}</div>
                  </div>
                </div>
              );
            })}
            {contacts.length === 0 && <div style={{ fontSize: 11, color: "#4a5068" }}>No contacts yet.</div>}
          </SideCard>

          {/* Pipeline */}
          <SideCard title="Pipeline">
            <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid #111318", fontSize: 12 }}>
              <span style={{ color: "#4a5068" }}>Total</span>
              <span style={{ color: "#c8ccd8", fontWeight: 600 }}>{pipelineValue > 0 ? `€${pipelineValue.toLocaleString("de-DE")}` : "–"}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid #111318", fontSize: 12 }}>
              <span style={{ color: "#4a5068" }}>Weighted</span>
              <span style={{ color: "#c8ccd8" }}>{weightedValue > 0 ? `€${Math.round(weightedValue).toLocaleString("de-DE")}` : "–"}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 12 }}>
              <span style={{ color: "#4a5068" }}>Open</span>
              <span style={{ color: "#c8ccd8" }}>{openDeals.length} deals</span>
            </div>
          </SideCard>

          {/* Quick Actions */}
          <SideCard title="Quick Actions">
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <QuickBtn label="📞 Log Call" onClick={() => { setActivityForm({ type: "call", title: "", summary: "" }); setActivityModal(true); }} color={color} />
              <QuickBtn label="📝 Add Note" onClick={() => { setActivityForm({ type: "note", title: "", summary: "" }); setActivityModal(true); }} color={color} />
              <QuickBtn label="💰 Create Deal" onClick={() => setDealModal(true)} color={color} />
              <QuickBtn label="👤 Add Contact" onClick={() => { setEditingContact(null); setContactForm({ name: "", role: "", email: "", phone: "", contactRole: "contact", notes: "" }); setContactModal(true); }} color={color} />
            </div>
          </SideCard>
        </div>
      </div>

      {/* ─── MODALS ─── */}

      {/* Contact Modal */}
      {contactModal && (
        <Modal title={editingContact ? "Contact bearbeiten" : "Contact hinzufügen"} onClose={() => { setContactModal(false); setEditingContact(null); }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><label style={LS}>Name *</label><input style={IS} value={contactForm.name} onChange={e => setContactForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div>
              <label style={LS}>Rolle (CRM)</label>
              <select style={{ ...IS, cursor: "pointer" }} value={contactForm.contactRole} onChange={e => setContactForm(f => ({ ...f, contactRole: e.target.value }))}>
                <option value="contact">Contact</option>
                <option value="decision-maker">Decision Maker</option>
                <option value="champion">Champion</option>
                <option value="technical-lead">Tech Lead</option>
                <option value="billing">Billing</option>
              </select>
            </div>
          </div>
          <div><label style={LS}>Position / Titel</label><input style={IS} value={contactForm.role} onChange={e => setContactForm(f => ({ ...f, role: e.target.value }))} placeholder="z.B. Geschäftsführer" /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><label style={LS}>Email</label><input style={IS} value={contactForm.email} onChange={e => setContactForm(f => ({ ...f, email: e.target.value }))} /></div>
            <div><label style={LS}>Phone</label><input style={IS} value={contactForm.phone} onChange={e => setContactForm(f => ({ ...f, phone: e.target.value }))} /></div>
          </div>
          <div><label style={LS}>Notes</label><textarea style={{ ...IS, resize: "vertical" }} rows={2} value={contactForm.notes} onChange={e => setContactForm(f => ({ ...f, notes: e.target.value }))} /></div>
          <ModalActions onClose={() => { setContactModal(false); setEditingContact(null); }} onSave={saveContact} saving={saving} disabled={!contactForm.name.trim()} />
        </Modal>
      )}

      {/* Deal Modal */}
      {dealModal && (
        <Modal title="Neuen Deal anlegen" onClose={() => setDealModal(false)}>
          <div><label style={LS}>Titel *</label><input style={IS} value={dealForm.title} onChange={e => setDealForm(f => ({ ...f, title: e.target.value }))} placeholder="z.B. ModulAI Implementation" /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><label style={LS}>Wert (€)</label><input style={IS} type="number" value={dealForm.value} onChange={e => setDealForm(f => ({ ...f, value: e.target.value }))} placeholder="10000" /></div>
            <div>
              <label style={LS}>Stage</label>
              <select style={{ ...IS, cursor: "pointer" }} value={dealForm.stage} onChange={e => setDealForm(f => ({ ...f, stage: e.target.value }))}>
                {Object.entries(DEAL_STAGE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><label style={LS}>Probability (%)</label><input style={IS} type="number" min="0" max="100" value={dealForm.probability} onChange={e => setDealForm(f => ({ ...f, probability: e.target.value }))} /></div>
            <div><label style={LS}>Expected Close</label><input style={IS} type="date" value={dealForm.expectedClose} onChange={e => setDealForm(f => ({ ...f, expectedClose: e.target.value }))} /></div>
          </div>
          <div><label style={LS}>Notes</label><textarea style={{ ...IS, resize: "vertical" }} rows={2} value={dealForm.notes} onChange={e => setDealForm(f => ({ ...f, notes: e.target.value }))} /></div>
          <ModalActions onClose={() => setDealModal(false)} onSave={saveDeal} saving={saving} disabled={!dealForm.title.trim()} />
        </Modal>
      )}

      {/* Activity Modal */}
      {activityModal && (
        <Modal title="Log Activity" onClose={() => setActivityModal(false)}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={LS}>Type</label>
              <select style={{ ...IS, cursor: "pointer" }} value={activityForm.type} onChange={e => setActivityForm(f => ({ ...f, type: e.target.value }))}>
                {["call", "email", "meeting", "note"].map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
            <div><label style={LS}>Title *</label><input style={IS} value={activityForm.title} onChange={e => setActivityForm(f => ({ ...f, title: e.target.value }))} placeholder="z.B. Follow-up Call" /></div>
          </div>
          <div><label style={LS}>Summary</label><textarea style={{ ...IS, resize: "vertical" }} rows={3} value={activityForm.summary} onChange={e => setActivityForm(f => ({ ...f, summary: e.target.value }))} placeholder="Was wurde besprochen?" /></div>
          <ModalActions onClose={() => setActivityModal(false)} onSave={saveActivity} saving={saving} disabled={!activityForm.title.trim()} />
        </Modal>
      )}

      {/* Deal Edit Modal */}
      {dealEditModal && editingDeal && (
        <Modal title="Deal bearbeiten" onClose={() => setDealEditModal(false)}>
          <div><label style={LS}>Titel *</label><input style={IS} value={dealEditForm.title} onChange={e => setDealEditForm(f => ({ ...f, title: e.target.value }))} /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><label style={LS}>Wert (€)</label><input style={IS} type="number" value={dealEditForm.value} onChange={e => setDealEditForm(f => ({ ...f, value: e.target.value }))} /></div>
            <div>
              <label style={LS}>Stage</label>
              <select style={{ ...IS, cursor: "pointer" }} value={dealEditForm.stage} onChange={e => setDealEditForm(f => ({ ...f, stage: e.target.value }))}>
                {Object.entries(DEAL_STAGE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><label style={LS}>Probability (%)</label><input style={IS} type="number" min="0" max="100" value={dealEditForm.probability} onChange={e => setDealEditForm(f => ({ ...f, probability: e.target.value }))} /></div>
            <div><label style={LS}>Expected Close</label><input style={IS} type="date" value={dealEditForm.expectedClose} onChange={e => setDealEditForm(f => ({ ...f, expectedClose: e.target.value }))} /></div>
          </div>
          <div><label style={LS}>Notes</label><textarea style={{ ...IS, resize: "vertical" }} rows={2} value={dealEditForm.notes} onChange={e => setDealEditForm(f => ({ ...f, notes: e.target.value }))} /></div>
          <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
            {dealDeleteConfirm ? (
              <>
                <span style={{ fontSize: 12, color: "#ef4444", display: "flex", alignItems: "center", flex: 1 }}>Wirklich löschen?</span>
                <button onClick={() => setDealDeleteConfirm(false)} style={{ padding: "9px 14px", borderRadius: 8, border: "1px solid #1e2128", background: "transparent", color: "#8b90a0", fontSize: 13, cursor: "pointer" }}>Nein</button>
                <button onClick={deleteDealById} style={{ padding: "9px 14px", borderRadius: 8, border: "none", background: "#ef4444", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Löschen</button>
              </>
            ) : (
              <>
                <button onClick={() => setDealDeleteConfirm(true)} style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid #ef444440", background: "transparent", color: "#ef4444", fontSize: 13, cursor: "pointer" }}>🗑</button>
                <button onClick={() => setDealEditModal(false)} style={{ flex: 1, padding: "9px 0", borderRadius: 8, border: "1px solid #1e2128", background: "transparent", color: "#8b90a0", fontSize: 13, cursor: "pointer" }}>Abbrechen</button>
                <button onClick={saveDealEdit} disabled={saving || !dealEditForm.title.trim()} style={{ flex: 2, padding: "9px 0", borderRadius: 8, border: "none", background: saving ? "#0a7a50" : "#10B981", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{saving ? "Speichern…" : "Speichern"}</button>
              </>
            )}
          </div>
        </Modal>
      )}

      {/* Edit Account Modal */}
      {editModal && (
        <Modal title="Account bearbeiten" onClose={() => setEditModal(false)}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><label style={LS}>Name *</label><input style={IS} value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div><label style={LS}>Domain</label><input style={IS} value={editForm.domain} onChange={e => setEditForm(f => ({ ...f, domain: e.target.value }))} /></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><label style={LS}>Industry</label><input style={IS} value={editForm.industry} onChange={e => setEditForm(f => ({ ...f, industry: e.target.value }))} /></div>
            <div>
              <label style={LS}>Size</label>
              <select style={{ ...IS, cursor: "pointer" }} value={editForm.size} onChange={e => setEditForm(f => ({ ...f, size: e.target.value }))}>
                <option value="">–</option><option value="startup">Startup</option><option value="sme">KMU</option><option value="enterprise">Enterprise</option>
              </select>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={LS}>Status</label>
              <select style={{ ...IS, cursor: "pointer" }} value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}>
                <option value="prospect">Prospect</option><option value="active">Active</option><option value="paused">Paused</option><option value="churned">Churned</option>
              </select>
            </div>
            <div><label style={LS}>Color</label><input style={{ ...IS, padding: "4px 8px" }} type="color" value={editForm.color} onChange={e => setEditForm(f => ({ ...f, color: e.target.value }))} /></div>
          </div>
          <div><label style={LS}>Notes</label><textarea style={{ ...IS, resize: "vertical" }} rows={2} value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} /></div>
          <ModalActions onClose={() => setEditModal(false)} onSave={saveAccount} saving={saving} disabled={!editForm.name.trim()} />
        </Modal>
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(d: string): string {
  try {
    return new Date(d).toLocaleDateString("de-DE", { day: "2-digit", month: "short" });
  } catch { return d; }
}

function Card({ title, children, action }: { title: string; children: React.ReactNode; action?: { label: string; onClick: () => void } }) {
  return (
    <div style={{ background: "#141720", border: "1px solid #1e2128", borderRadius: 12, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid #1e2128" }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>{title}</span>
        {action && <button onClick={action.onClick} style={{ padding: "4px 12px", borderRadius: 6, border: "none", background: "#10B981", color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{action.label}</button>}
      </div>
      <div style={{ padding: "8px 16px" }}>{children}</div>
    </div>
  );
}

function SideCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#141720", border: "1px solid #1e2128", borderRadius: 12, overflow: "hidden" }}>
      <div style={{ padding: "11px 14px", borderBottom: "1px solid #1e2128", fontSize: 13, fontWeight: 600 }}>{title}</div>
      <div style={{ padding: "10px 14px" }}>{children}</div>
    </div>
  );
}

function QuickBtn({ label, onClick, color }: { label: string; onClick: () => void; color: string }) {
  return (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 6, padding: "7px 12px",
      borderRadius: 8, border: "1px solid #1e2128", background: "#0d0f12",
      color: "#c8ccd6", fontSize: 12, cursor: "pointer", width: "100%", textAlign: "left",
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = `${color}40`; e.currentTarget.style.color = "#f0f2f5"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "#1e2128"; e.currentTarget.style.color = "#c8ccd6"; }}>
      {label}
    </button>
  );
}

function Empty({ text }: { text: string }) {
  return <div style={{ padding: "16px 0", textAlign: "center", color: "#4a5068", fontSize: 12 }}>{text}</div>;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, padding: 20 }} onClick={onClose}>
      <div style={{ background: "#141720", border: "1px solid #1e2128", borderRadius: 16, padding: 24, width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: 14 }} onClick={e => e.stopPropagation()}>
        <h2 style={{ fontSize: 16, fontWeight: 700 }}>{title}</h2>
        {children}
      </div>
    </div>
  );
}

function ModalActions({ onClose, onSave, saving, disabled }: { onClose: () => void; onSave: () => void; saving: boolean; disabled: boolean }) {
  return (
    <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
      <button onClick={onClose} style={{ flex: 1, padding: "9px 0", borderRadius: 8, border: "1px solid #1e2128", background: "transparent", color: "#8b90a0", fontSize: 13, cursor: "pointer" }}>Abbrechen</button>
      <button onClick={onSave} disabled={saving || disabled} style={{ flex: 2, padding: "9px 0", borderRadius: 8, border: "none", background: saving ? "#0a7a50" : "#10B981", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{saving ? "Speichern…" : "Speichern"}</button>
    </div>
  );
}

// ─── Calendar Event Row with inline TipTap notes ──────────────────────────────
function CalEventRow({ ev, color, isOpen, onToggleNote }: {
  ev: CalEvent; color: string; isOpen: boolean; onToggleNote: () => void;
}) {
  const d = new Date(ev.start);
  const dateStr = ev.start.includes("T")
    ? d.toLocaleDateString("de-DE", { weekday: "short", day: "numeric", month: "short" }) + " · " + d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString("de-DE", { weekday: "short", day: "numeric", month: "short" });

  const [hasNote, setHasNote] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Placeholder.configure({ placeholder: "Agenda, Vorbereitung, Notizen…" }),
    ],
    editorProps: {
      attributes: { style: "outline:none; min-height:80px; font-size:13px; color:#c8ccd6; line-height:1.7;" },
    },
    onUpdate: ({ editor }) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      setSaved(false);
      saveTimer.current = setTimeout(async () => {
        setSaving(true);
        await fetch("/api/meeting-notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ calEventId: ev.id, title: ev.summary, content: JSON.stringify(editor.getJSON()) }),
        });
        setSaving(false);
        setSaved(true);
        setHasNote(true);
        setTimeout(() => setSaved(false), 2000);
      }, 800);
    },
  }, [ev.id]);

  // Load existing note when panel opens
  useEffect(() => {
    if (!isOpen || !editor) return;
    fetch(`/api/meeting-notes?calEventId=${encodeURIComponent(ev.id)}`)
      .then(r => r.json())
      .then(d => {
        if (d.note?.content) {
          try {
            editor.commands.setContent(JSON.parse(d.note.content));
            setHasNote(true);
          } catch { /* empty note */ }
        }
      })
      .catch(() => {});
  }, [isOpen, editor, ev.id]);

  // Check if note exists on mount
  useEffect(() => {
    fetch(`/api/meeting-notes?calEventId=${encodeURIComponent(ev.id)}`)
      .then(r => r.json())
      .then(d => setHasNote(!!d.note?.content))
      .catch(() => {});
  }, [ev.id]);

  return (
    <div style={{ borderBottom: "1px solid #111318" }}>
      {/* Event row */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0" }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: "#a78bfa", minWidth: 120, flexShrink: 0 }}>{dateStr}</span>
        <span style={{ flex: 1, fontSize: 13, color: "#c8ccd6", fontWeight: 500 }}>{ev.summary}</span>
        {ev.linkedPeople.slice(0, 3).map(p => (
          <span key={p.id} style={{ fontSize: 10, padding: "2px 7px", borderRadius: 999, background: "#1e2536", color: "#7c8db0", border: "1px solid #2d3348" }}>
            {p.name.split(" ")[0]}
          </span>
        ))}
        <button
          onClick={onToggleNote}
          style={{
            padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", flexShrink: 0,
            border: `1px solid ${isOpen ? color + "60" : hasNote ? "#10B98160" : "#1e2128"}`,
            background: isOpen ? color + "18" : hasNote ? "#10B98110" : "transparent",
            color: isOpen ? color : hasNote ? "#10B981" : "#8b90a0",
          }}
        >
          {hasNote ? "📝 Notizen" : "✏️ Vorbereiten"}
        </button>
      </div>

      {/* Inline notes panel */}
      {isOpen && (
        <div style={{
          margin: "0 0 12px 0", background: "#0d0f12", border: "1px solid #1e2536",
          borderRadius: 8, padding: "12px 14px",
        }}>
          {/* Toolbar */}
          <div style={{ display: "flex", gap: 4, marginBottom: 8, borderBottom: "1px solid #1e2128", paddingBottom: 8 }}>
            {([
              { label: "B", cmd: () => editor?.chain().focus().toggleBold().run(), active: () => editor?.isActive("bold") ?? false },
              { label: "I", cmd: () => editor?.chain().focus().toggleItalic().run(), active: () => editor?.isActive("italic") ?? false },
              { label: "U", cmd: () => editor?.chain().focus().toggleUnderline().run(), active: () => editor?.isActive("underline") ?? false },
              { label: "•", cmd: () => editor?.chain().focus().toggleBulletList().run(), active: () => editor?.isActive("bulletList") ?? false },
              { label: "1.", cmd: () => editor?.chain().focus().toggleOrderedList().run(), active: () => editor?.isActive("orderedList") ?? false },
            ] as { label: string; cmd: () => void; active: () => boolean }[]).map(b => (
              <button key={b.label} onMouseDown={e => { e.preventDefault(); b.cmd(); }} style={{
                padding: "2px 8px", borderRadius: 4, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600,
                background: b.active() ? "#1e2128" : "transparent",
                color: b.active() ? "#f0f2f5" : "#8b90a0",
              }}>{b.label}</button>
            ))}
            <div style={{ flex: 1 }} />
            <span style={{ fontSize: 10, color: saving ? "#a78bfa" : saved ? "#10B981" : "#4a5068", alignSelf: "center" }}>
              {saving ? "Speichern…" : saved ? "✓ Gespeichert" : ""}
            </span>
          </div>
          <EditorContent editor={editor} />
        </div>
      )}
    </div>
  );
}
