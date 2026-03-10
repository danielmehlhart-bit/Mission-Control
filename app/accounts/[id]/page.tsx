"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";

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

type Tab = "overview" | "contacts" | "deals" | "projects" | "activities";

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
    setLoading(false);
  }, [id, router]);

  useEffect(() => { load(); }, [load]);

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
    { key: "contacts", label: "Contacts", count: contacts.length },
    { key: "deals", label: "Deals", count: deals.length },
    { key: "projects", label: "Projects", count: projects.length },
    { key: "activities", label: "Activities", count: activities.length },
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
