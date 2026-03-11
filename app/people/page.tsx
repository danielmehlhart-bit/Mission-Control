"use client";

import { useEffect, useState } from "react";

type Person = {
  id: string; name: string; company: string; role?: string;
  email?: string; phone?: string; project?: string; notes?: string;
  accountId?: string; contactRole?: string; accountName?: string; accountColor?: string;
};
type Account = { id: string; name: string; color: string };

const EMPTY: Omit<Person, "id"> = { name: "", company: "", role: "", email: "", phone: "", project: "", notes: "", contactRole: "contact", accountId: "" };

const ROLE_LABEL: Record<string, string> = {
  "decision-maker": "Decision Maker", champion: "Champion", "technical-lead": "Tech Lead",
  contact: "Contact", billing: "Billing",
};
const ROLE_COLOR: Record<string, string> = {
  "decision-maker": "#F59E0B", champion: "#10B981", "technical-lead": "#3B82F6",
  contact: "#8b90a0", billing: "#8B5CF6",
};

const INPUT_STYLE = {
  width: "100%", padding: "8px 12px", borderRadius: 8,
  border: "1px solid #1e2128", background: "#0d0f12",
  color: "#f0f2f5", fontSize: 13, outline: "none",
  boxSizing: "border-box" as const,
};

const LABEL_STYLE = { fontSize: 11, color: "#8b90a0", marginBottom: 4, display: "block" as const };

export default function PeoplePage() {
  const [people, setPeople] = useState<Person[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [modal, setModal] = useState<null | "add" | "edit">(null);
  const [editing, setEditing] = useState<Person | null>(null);
  const [form, setForm] = useState<Omit<Person, "id">>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const load = () => Promise.all([
    fetch("/api/people").then(r => r.json()),
    fetch("/api/accounts").then(r => r.json()),
  ]).then(([pd, ad]) => {
    setPeople(pd.people ?? []);
    setAccounts(ad.accounts ?? []);
    setLoading(false);
  });
  useEffect(() => { load(); }, []);

  const accountFilters = ["All", ...accounts.map(a => a.name)];
  const filtered = people.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.company.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "All" || p.accountName === filter || p.company === filter;
    return matchSearch && matchFilter;
  });

  const openAdd = () => { setForm(EMPTY); setEditing(null); setModal("add"); };
  const openEdit = (p: Person) => {
    setForm({ name: p.name, company: p.company, role: p.role ?? "", email: p.email ?? "", phone: p.phone ?? "", project: p.project ?? "", notes: p.notes ?? "", accountId: p.accountId ?? "", contactRole: p.contactRole ?? "contact" });
    setEditing(p); setModal("edit");
  };
  const closeModal = () => { setModal(null); setEditing(null); };

  const save = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const body = { ...form };
    // If account is selected, auto-fill company from account name
    if (body.accountId) {
      const acc = accounts.find(a => a.id === body.accountId);
      if (acc) body.company = acc.name;
    }
    if (modal === "add") {
      await fetch("/api/people", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    } else if (modal === "edit" && editing) {
      await fetch(`/api/people?id=${editing.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    }
    await load();
    setSaving(false);
    closeModal();
  };

  const deletePerson = async (id: string) => {
    await fetch(`/api/people?id=${id}`, { method: "DELETE" });
    setDeleteConfirm(null);
    load();
  };

  return (
    <div style={{ padding: "20px 24px", maxWidth: 960 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.3px" }}>People</h1>
          <p style={{ fontSize: 13, color: "#8b90a0", marginTop: 4 }}>{people.length} Kontakte across {accounts.length} Accounts.</p>
        </div>
        <button onClick={openAdd} style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "8px 16px", borderRadius: 8, border: "none",
          background: "#10B981", color: "#fff", fontSize: 13, fontWeight: 600,
          cursor: "pointer",
        }}>
          + Person
        </button>
      </div>

      {/* Search + Filter */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Name oder Firma suchen…"
          style={{ flex: 1, minWidth: 200, padding: "8px 14px", borderRadius: 8, border: "1px solid #1e2128", background: "#141720", color: "#f0f2f5", fontSize: 13, outline: "none" }}
        />
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {accountFilters.map(af => {
            const acc = accounts.find(a => a.name === af);
            const accColor = acc?.color ?? "#10B981";
            return (
              <button key={af} onClick={() => setFilter(af)} style={{
                padding: "6px 14px", borderRadius: 999, fontSize: 12.5, fontWeight: 500,
                border: `1px solid ${filter === af ? accColor + "60" : "#1e2128"}`,
                background: filter === af ? accColor + "18" : "#141720",
                color: filter === af ? "#f0f2f5" : "#8b90a0", cursor: "pointer",
              }}>{af === "All" ? "Alle" : af}</button>
            );
          })}
        </div>
      </div>

      {/* List */}
      {loading ? <p style={{ color: "#8b90a0" }}>Loading…</p> : (
        <div style={{ background: "#141720", border: "1px solid #1e2128", borderRadius: 12, overflow: "hidden" }}>
          {filtered.length === 0 && (
            <p style={{ padding: 20, color: "#4a5068", fontSize: 13 }}>Keine Personen gefunden.</p>
          )}
          {filtered.map((person, i) => {
            const accColor = person.accountColor ?? "#4a5068";
            const rc = ROLE_COLOR[person.contactRole ?? "contact"] ?? "#8b90a0";
            return (
              <div key={person.id} style={{
                display: "flex", alignItems: "center", gap: 14,
                padding: "12px 16px",
                borderTop: i > 0 ? "1px solid #1e2128" : "none",
              }}>
                {/* Avatar */}
                <div style={{
                  width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
                  background: `${accColor}22`, border: `1.5px solid ${accColor}55`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 13, fontWeight: 700, color: accColor,
                }}>
                  {person.name.charAt(0)}
                </div>

                {/* Name + Meta */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#f0f2f5" }}>{person.name}</span>
                    <span style={{ fontSize: 12, color: "#4a5068" }}>{[person.role, person.company].filter(Boolean).join(" · ")}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3, flexWrap: "wrap" }}>
                    {/* Account badge */}
                    {person.accountName && (
                      <span style={{ padding: "1px 7px", borderRadius: 999, fontSize: 11, fontWeight: 500, background: `${accColor}18`, border: `1px solid ${accColor}40`, color: accColor }}>{person.accountName}</span>
                    )}
                    {/* Role badge */}
                    {person.contactRole && person.contactRole !== "contact" && (
                      <span style={{ padding: "1px 7px", borderRadius: 999, fontSize: 10, fontWeight: 600, background: `${rc}18`, border: `1px solid ${rc}30`, color: rc }}>{ROLE_LABEL[person.contactRole] ?? person.contactRole}</span>
                    )}
                    {person.email && <a href={`mailto:${person.email}`} style={{ fontSize: 11, color: "#8b90a0", textDecoration: "none" }}>{person.email}</a>}
                    {person.phone && <span style={{ fontSize: 11, color: "#4a5068" }}>{person.phone}</span>}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button onClick={() => openEdit(person)} style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #1e2128", background: "transparent", color: "#8b90a0", fontSize: 12, cursor: "pointer" }}>✏️</button>
                  {deleteConfirm === person.id ? (
                    <>
                      <button onClick={() => deletePerson(person.id)} style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #ef4444", background: "#ef444420", color: "#ef4444", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>Löschen?</button>
                      <button onClick={() => setDeleteConfirm(null)} style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #1e2128", background: "transparent", color: "#8b90a0", fontSize: 12, cursor: "pointer" }}>✕</button>
                    </>
                  ) : (
                    <button onClick={() => setDeleteConfirm(person.id)} style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #1e2128", background: "transparent", color: "#4a5068", fontSize: 12, cursor: "pointer" }}>🗑</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20 }} onClick={closeModal}>
          <div style={{ background: "#141720", border: "1px solid #1e2128", borderRadius: 16, padding: 24, width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 20 }}>{modal === "add" ? "Person hinzufügen" : "Person bearbeiten"}</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div><label style={LABEL_STYLE}>Name *</label><input value={form.name ?? ""} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={INPUT_STYLE} /></div>
                <div>
                  <label style={LABEL_STYLE}>Account</label>
                  <select style={{ ...INPUT_STYLE, cursor: "pointer" }} value={form.accountId ?? ""} onChange={e => setForm(f => ({ ...f, accountId: e.target.value }))}>
                    <option value="">– Kein Account –</option>
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div><label style={LABEL_STYLE}>Position / Titel</label><input value={form.role ?? ""} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} style={INPUT_STYLE} placeholder="z.B. Geschäftsführer" /></div>
                <div>
                  <label style={LABEL_STYLE}>Contact Role</label>
                  <select style={{ ...INPUT_STYLE, cursor: "pointer" }} value={form.contactRole ?? "contact"} onChange={e => setForm(f => ({ ...f, contactRole: e.target.value }))}>
                    <option value="contact">Contact</option>
                    <option value="decision-maker">Decision Maker</option>
                    <option value="champion">Champion</option>
                    <option value="technical-lead">Tech Lead</option>
                    <option value="billing">Billing</option>
                  </select>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div><label style={LABEL_STYLE}>Email</label><input value={form.email ?? ""} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} style={INPUT_STYLE} /></div>
                <div><label style={LABEL_STYLE}>Telefon</label><input value={form.phone ?? ""} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} style={INPUT_STYLE} /></div>
              </div>
              <div><label style={LABEL_STYLE}>Notizen</label><textarea value={form.notes ?? ""} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} style={{ ...INPUT_STYLE, resize: "vertical" }} /></div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button onClick={closeModal} style={{ flex: 1, padding: "9px 0", borderRadius: 8, border: "1px solid #1e2128", background: "transparent", color: "#8b90a0", fontSize: 13, cursor: "pointer" }}>Abbrechen</button>
              <button onClick={save} disabled={saving || !form.name?.trim()} style={{
                flex: 2, padding: "9px 0", borderRadius: 8, border: "none",
                background: saving ? "#0d7a5f" : "#10B981", color: "#fff",
                fontSize: 13, fontWeight: 600, cursor: saving ? "default" : "pointer",
              }}>{saving ? "Speichern…" : "Speichern"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
