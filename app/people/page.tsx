"use client";

import { useEffect, useState } from "react";

type Person = {
  id: string; name: string; company: string; role?: string;
  email?: string; phone?: string; project?: string; notes?: string;
};

const EMPTY: Omit<Person, "id"> = { name: "", company: "", role: "", email: "", phone: "", project: "", notes: "" };

const PROJECT_COLORS: Record<string, string> = {
  "ModulAI": "#8B5CF6",
  "HAM / ModulAI": "#8B5CF6",
  "Architekt Connect": "#3B82F6",
  "BPP": "#F59E0B",
  "Concord": "#10B981",
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
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [modal, setModal] = useState<null | "add" | "edit">(null);
  const [editing, setEditing] = useState<Person | null>(null);
  const [form, setForm] = useState<Omit<Person, "id">>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const load = () => fetch("/api/people").then(r => r.json()).then(d => { setPeople(d.people ?? []); setLoading(false); });
  useEffect(() => { load(); }, []);

  const projects = ["All", ...Array.from(new Set(people.map(p => p.project).filter((p): p is string => Boolean(p))))];
  const filtered = people.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.company.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "All" || p.project === filter;
    return matchSearch && matchFilter;
  });

  const openAdd = () => { setForm(EMPTY); setEditing(null); setModal("add"); };
  const openEdit = (p: Person) => { setForm({ name: p.name, company: p.company, role: p.role ?? "", email: p.email ?? "", phone: p.phone ?? "", project: p.project ?? "", notes: p.notes ?? "" }); setEditing(p); setModal("edit"); };
  const closeModal = () => { setModal(null); setEditing(null); };

  const save = async () => {
    if (!form.name.trim() || !form.company.trim()) return;
    setSaving(true);
    if (modal === "add") {
      await fetch("/api/people", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    } else if (modal === "edit" && editing) {
      await fetch(`/api/people?id=${editing.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
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
          <p style={{ fontSize: 13, color: "#8b90a0", marginTop: 4 }}>Projekt-Kontakte auf einen Blick.</p>
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
          {projects.map(p => (
            <button key={p} onClick={() => setFilter(p)} style={{
              padding: "6px 14px", borderRadius: 999, fontSize: 12.5, fontWeight: 500,
              border: `1px solid ${filter === p ? (PROJECT_COLORS[p] ? PROJECT_COLORS[p] + "60" : "rgba(16,185,129,0.4)") : "#1e2128"}`,
              background: filter === p ? (PROJECT_COLORS[p] ? PROJECT_COLORS[p] + "18" : "rgba(16,185,129,0.1)") : "#141720",
              color: filter === p ? "#f0f2f5" : "#8b90a0", cursor: "pointer",
            }}>{p}</button>
          ))}
        </div>
      </div>

      {/* List */}
      {loading ? <p style={{ color: "#8b90a0" }}>Loading…</p> : (
        <div style={{ background: "#141720", border: "1px solid #1e2128", borderRadius: 12, overflow: "hidden" }}>
          {filtered.length === 0 && (
            <p style={{ padding: 20, color: "#4a5068", fontSize: 13 }}>Keine Personen gefunden.</p>
          )}
          {filtered.map((person, i) => {
            const color = PROJECT_COLORS[person.project ?? ""] ?? "#4a5068";
            return (
              <div key={person.id} style={{
                display: "flex", alignItems: "center", gap: 14,
                padding: "12px 16px",
                borderTop: i > 0 ? "1px solid #1e2128" : "none",
              }}>
                {/* Avatar */}
                <div style={{
                  width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
                  background: `${color}22`, border: `1.5px solid ${color}55`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 13, fontWeight: 700, color,
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
                    {person.project && (
                      <span style={{ padding: "1px 7px", borderRadius: 999, fontSize: 11, fontWeight: 500, background: `${color}18`, border: `1px solid ${color}40`, color }}>{person.project}</span>
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
              {([
                ["name", "Name *"],
                ["company", "Firma *"],
                ["role", "Rolle"],
                ["project", "Projekt"],
                ["email", "Email"],
                ["phone", "Telefon"],
                ["notes", "Notizen"],
              ] as [keyof typeof form, string][]).map(([key, label]) => (
                <div key={key}>
                  <label style={LABEL_STYLE}>{label}</label>
                  {key === "notes" ? (
                    <textarea
                      value={form[key] ?? ""}
                      onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                      rows={3}
                      style={{ ...INPUT_STYLE, resize: "vertical" }}
                    />
                  ) : (
                    <input
                      value={form[key] ?? ""}
                      onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                      style={INPUT_STYLE}
                    />
                  )}
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button onClick={closeModal} style={{ flex: 1, padding: "9px 0", borderRadius: 8, border: "1px solid #1e2128", background: "transparent", color: "#8b90a0", fontSize: 13, cursor: "pointer" }}>Abbrechen</button>
              <button onClick={save} disabled={saving || !form.name.trim() || !form.company.trim()} style={{
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
