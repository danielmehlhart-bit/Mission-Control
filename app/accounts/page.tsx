"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Account = {
  id: string; name: string; domain?: string; industry?: string; size?: string;
  status: string; color: string; notes?: string; createdAt: string;
  contactCount?: number; dealCount?: number; projectCount?: number;
  lastActivityAt?: string; pipelineValue?: number;
};

const STATUS_LABEL: Record<string, string> = { prospect: "Prospect", active: "Active", churned: "Churned", paused: "Paused", Qualification: "Qualification", qualification: "Qualification" };
const STATUS_COLOR: Record<string, string> = { prospect: "#6366f1", active: "#10B981", churned: "#ef4444", paused: "#F59E0B", Qualification: "#3B82F6", qualification: "#3B82F6" };

const IS = { width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #1e2128", background: "#0d0f12", color: "#f0f2f5", fontSize: 13, outline: "none", boxSizing: "border-box" as const };
const LS = { fontSize: 11, color: "#8b90a0", marginBottom: 4, display: "block" as const };

function daysSince(dateStr?: string): number | null {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function healthColor(days: number | null): string {
  if (days === null) return "#4a5068";
  if (days <= 7) return "#10B981";
  if (days <= 21) return "#F59E0B";
  return "#ef4444";
}

export default function AccountsPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ name: "", domain: "", industry: "", size: "", status: "prospect", color: "#6366f1", notes: "" });
  const [saving, setSaving] = useState(false);

  const load = () => fetch("/api/accounts").then(r => r.json()).then(d => { setAccounts(d.accounts ?? []); setLoading(false); });
  useEffect(() => { load(); }, []);

  const filtered = accounts.filter(a => {
    const matchSearch = !search || a.name.toLowerCase().includes(search.toLowerCase()) || (a.domain ?? "").toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "All" || a.status === filter;
    return matchSearch && matchFilter;
  });

  const save = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    await fetch("/api/accounts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    await load();
    setSaving(false);
    setModal(false);
    setForm({ name: "", domain: "", industry: "", size: "", status: "prospect", color: "#6366f1", notes: "" });
  };

  const totalPipeline = accounts.reduce((sum, a) => sum + (a.pipelineValue ?? 0), 0);

  return (
    <div style={{ padding: "20px 24px", maxWidth: 1100, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.3px" }}>Accounts</h1>
          <p style={{ fontSize: 13, color: "#8b90a0", marginTop: 4 }}>
            {accounts.length} Accounts · Pipeline: {totalPipeline > 0 ? `€${totalPipeline.toLocaleString("de-DE")}` : "–"}
          </p>
        </div>
        <button onClick={() => setModal(true)} style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "8px 16px", borderRadius: 8, border: "none",
          background: "#10B981", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
        }}>+ Account</button>
      </div>

      {/* Search + Filter */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Account suchen…"
          style={{ flex: 1, minWidth: 200, padding: "8px 14px", borderRadius: 8, border: "1px solid #1e2128", background: "#141720", color: "#f0f2f5", fontSize: 13, outline: "none" }} />
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {["All", "prospect", "Qualification", "active", "paused", "churned"].map(s => (
            <button key={s} onClick={() => setFilter(s)} style={{
              padding: "6px 14px", borderRadius: 999, fontSize: 12.5, fontWeight: 500,
              border: `1px solid ${filter === s ? "rgba(16,185,129,0.4)" : "#1e2128"}`,
              background: filter === s ? "rgba(16,185,129,0.1)" : "#141720",
              color: filter === s ? "#f0f2f5" : "#8b90a0", cursor: "pointer",
            }}>{s === "All" ? "Alle" : STATUS_LABEL[s]}</button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {loading ? <p style={{ color: "#8b90a0" }}>Loading…</p> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
          {filtered.map(account => {
            const color = account.color;
            const days = daysSince(account.lastActivityAt);
            const hc = healthColor(days);
            const sc = STATUS_COLOR[account.status] ?? "#4a5068";
            return (
              <div key={account.id} onClick={() => router.push(`/accounts/${account.id}`)} style={{
                background: "#141720", border: "1px solid #1e2128", borderRadius: 14,
                overflow: "hidden", cursor: "pointer", transition: "border-color 0.15s",
              }}
                onMouseEnter={e => e.currentTarget.style.borderColor = "#2a2d38"}
                onMouseLeave={e => e.currentTarget.style.borderColor = "#1e2128"}>
                <div style={{ height: 4, background: color }} />
                <div style={{ padding: "18px 20px" }}>
                  {/* Name + status */}
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <h2 style={{ fontSize: 16, fontWeight: 700, color: "#f0f2f5", letterSpacing: "-0.2px" }}>{account.name}</h2>
                        {/* Health dot */}
                        <span style={{ width: 7, height: 7, borderRadius: "50%", background: hc, display: "inline-block", flexShrink: 0 }} title={days !== null ? `${days}d seit letzter Aktivität` : "Keine Aktivität"} />
                      </div>
                      {account.domain && <div style={{ fontSize: 12, color: "#4a5068", marginTop: 2 }}>{account.domain}</div>}
                    </div>
                    <span style={{
                      padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600,
                      background: `${sc}18`, border: `1px solid ${sc}40`, color: sc, flexShrink: 0,
                    }}>{STATUS_LABEL[account.status]}</span>
                  </div>

                  {/* Stats */}
                  <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                    {[
                      { label: "Contacts", val: account.contactCount ?? 0 },
                      { label: "Deals", val: account.dealCount ?? 0 },
                      { label: "Projects", val: account.projectCount ?? 0 },
                    ].map(s => (
                      <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#8b90a0" }}>
                        <span style={{ fontWeight: 700, color: s.val > 0 ? color : "#4a5068" }}>{s.val}</span>
                        {s.label}
                      </div>
                    ))}
                  </div>

                  {/* Pipeline value + last activity */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    {(account.pipelineValue ?? 0) > 0 && (
                      <span style={{ fontSize: 12, fontWeight: 600, color }}>
                        €{(account.pipelineValue ?? 0).toLocaleString("de-DE")} Pipeline
                      </span>
                    )}
                    {days !== null && (
                      <span style={{ fontSize: 11, color: hc, marginLeft: "auto" }}>
                        {days === 0 ? "Heute" : `vor ${days}d`}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Account Modal */}
      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20 }} onClick={() => setModal(false)}>
          <div style={{ background: "#141720", border: "1px solid #1e2128", borderRadius: 16, padding: 24, width: "100%", maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 20 }}>Account hinzufügen</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div><label style={LS}>Name *</label><input style={IS} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Firma GmbH" /></div>
                <div><label style={LS}>Domain</label><input style={IS} value={form.domain} onChange={e => setForm(f => ({ ...f, domain: e.target.value }))} placeholder="firma.de" /></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div><label style={LS}>Branche</label><input style={IS} value={form.industry} onChange={e => setForm(f => ({ ...f, industry: e.target.value }))} placeholder="Immobilien" /></div>
                <div>
                  <label style={LS}>Größe</label>
                  <select style={{ ...IS, cursor: "pointer" }} value={form.size} onChange={e => setForm(f => ({ ...f, size: e.target.value }))}>
                    <option value="">–</option>
                    <option value="startup">Startup</option>
                    <option value="sme">KMU</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={LS}>Status</label>
                  <select style={{ ...IS, cursor: "pointer" }} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                    <option value="prospect">Prospect</option>
                    <option value="Qualification">Qualification</option>
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                  </select>
                </div>
                <div><label style={LS}>Farbe</label><input style={{ ...IS, padding: "4px 8px" }} type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} /></div>
              </div>
              <div><label style={LS}>Notizen</label><textarea style={{ ...IS, resize: "vertical" }} rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button onClick={() => setModal(false)} style={{ flex: 1, padding: "9px 0", borderRadius: 8, border: "1px solid #1e2128", background: "transparent", color: "#8b90a0", fontSize: 13, cursor: "pointer" }}>Abbrechen</button>
              <button onClick={save} disabled={saving || !form.name.trim()} style={{
                flex: 2, padding: "9px 0", borderRadius: 8, border: "none",
                background: saving ? "#0d7a5f" : "#10B981", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
              }}>{saving ? "Speichern…" : "Speichern"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
