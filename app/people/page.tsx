"use client";

import { useEffect, useState } from "react";

type Person = {
  id: string; name: string; company: string; role?: string;
  email?: string; phone?: string; project?: string; notes?: string;
};

const PROJECT_COLORS: Record<string, string> = {
  "ModulAI": "#8B5CF6",
  "HAM / ModulAI": "#8B5CF6",
  "Architekt Connect": "#3B82F6",
  "BPP": "#F59E0B",
  "Concord": "#10B981",
};

const s = {
  page: { padding: "20px 24px", maxWidth: 900 },
  card: { background: "#141720", border: "1px solid #1e2128", borderRadius: 12, padding: "20px 24px" },
};

export default function PeoplePage() {
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    fetch("/api/people").then(r => r.json()).then(d => { setPeople(d.people ?? []); setLoading(false); });
  }, []);

  const projects = ["All", ...Array.from(new Set(people.map(p => p.project).filter((p): p is string => Boolean(p))))];
  const filtered = people.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.company.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "All" || p.project === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div style={s.page}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.3px" }}>People</h1>
        <p style={{ fontSize: 13, color: "#8b90a0", marginTop: 4 }}>Projekt-Kontakte auf einen Blick.</p>
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

      {/* People Grid */}
      {loading ? <p style={{ color: "#8b90a0" }}>Loading…</p> : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
          {filtered.map(person => {
            const color = PROJECT_COLORS[person.project ?? ""] ?? "#4a5068";
            return (
              <div key={person.id} style={{ ...s.card, position: "relative", overflow: "hidden" }}>
                {/* Color accent bar */}
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: color, borderRadius: "12px 12px 0 0" }} />
                <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginTop: 4 }}>
                  {/* Avatar */}
                  <div style={{
                    width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
                    background: `${color}25`, border: `1.5px solid ${color}50`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 16, fontWeight: 700, color,
                  }}>
                    {person.name.charAt(0)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#f0f2f5" }}>{person.name}</div>
                    <div style={{ fontSize: 12, color: "#8b90a0", marginTop: 1 }}>{person.role ?? ""} {person.role && person.company ? "·" : ""} {person.company}</div>
                    {person.project && (
                      <span style={{
                        display: "inline-block", marginTop: 6,
                        padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 500,
                        background: `${color}18`, border: `1px solid ${color}40`, color,
                      }}>{person.project}</span>
                    )}
                  </div>
                </div>

                {/* Contact details */}
                <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 5 }}>
                  {person.email && (
                    <a href={`mailto:${person.email}`} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#8b90a0", textDecoration: "none" }}
                      onMouseEnter={e => e.currentTarget.style.color = "#10B981"}
                      onMouseLeave={e => e.currentTarget.style.color = "#8b90a0"}>
                      <span style={{ fontSize: 13 }}>✉</span> {person.email}
                    </a>
                  )}
                  {person.phone && (
                    <a href={`tel:${person.phone}`} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#8b90a0", textDecoration: "none" }}>
                      <span style={{ fontSize: 13 }}>📞</span> {person.phone}
                    </a>
                  )}
                  {person.notes && (
                    <p style={{ fontSize: 11, color: "#4a5068", marginTop: 4, lineHeight: 1.5 }}>{person.notes}</p>
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
