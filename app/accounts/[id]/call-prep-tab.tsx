"use client";

import { useEffect, useState, useCallback, useRef } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

type DiscoveryNote = {
  id: string; accountId: string; title: string; callDate?: string;
  contactId?: string; status: string;
  kontextBuerotyp: string; kontextTeam: string; kontextProjektarten: string; kontextAblaeufe: string;
  pain1: string; pain2: string; pain3: string;
  konkreterFallAusloeser: string; konkreterFallBeteiligte: string; konkreterFallAblauf: string;
  konkreterFallReibung: string; konkreterFallFolge: string;
  auswirkungHaeufigkeit: string; auswirkungZeitaufwand: string;
  auswirkungBetroffene: string; auswirkungFolge: string;
  workaroundsTools: string; workaroundsLoesungen: string; workaroundsWarumUnzureichend: string;
  prioritaetHoechste: string; prioritaetWarumJetzt: string;
  anforderungenMustHave: string; anforderungenNoGo: string; anforderungenNutzer: string;
  naechsterSchritt: string; offeneFragen: string; hypotheseProdukt: string;
  scorePainIdentifiziert?: number; scoreKonkreterFall?: number;
  scoreImpactQuantifiziert?: number; scorePrioritaet?: number;
  scoreNichtGepitcht?: number; scoreNaechsterSchritt?: number;
  createdAt: string; updatedAt: string;
};

type Person = { id: string; name: string; contactRole?: string };

// ─── Styles ──────────────────────────────────────────────────────────────────

const IS = { width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #1e2128", background: "#0d0f12", color: "#f0f2f5", fontSize: 13, outline: "none", boxSizing: "border-box" as const };
const LS = { fontSize: 11, color: "#8b90a0", marginBottom: 4, display: "block" as const };
const TA = { ...IS, resize: "vertical" as const, fontFamily: "inherit", lineHeight: "1.6" };

// ─── Score helpers ───────────────────────────────────────────────────────────

const SCORE_KEYS: { key: keyof DiscoveryNote; label: string }[] = [
  { key: "scorePainIdentifiziert", label: "Pain identifiziert" },
  { key: "scoreKonkreterFall", label: "Konkreter Fall verstanden" },
  { key: "scoreImpactQuantifiziert", label: "Impact quantifiziert" },
  { key: "scorePrioritaet", label: "Prioritaet bestaetigt" },
  { key: "scoreNichtGepitcht", label: "Nicht zu frueh gepitcht" },
  { key: "scoreNaechsterSchritt", label: "Naechster Schritt definiert" },
];

function getScoreTotal(note: DiscoveryNote): { total: number; count: number; max: number } {
  let total = 0; let count = 0;
  for (const { key } of SCORE_KEYS) {
    const v = note[key] as number | undefined;
    if (v && v > 0) { total += v; count++; }
  }
  return { total, count, max: SCORE_KEYS.length * 5 };
}

function getScoreLabel(total: number): { label: string; color: string } {
  if (total >= 26) return { label: "Sehr starke Discovery", color: "#10B981" };
  if (total >= 21) return { label: "Gut, aber noch unscharf", color: "#F59E0B" };
  if (total >= 15) return { label: "Viel gelernt, keine harte Prio", color: "#F97316" };
  return { label: "Zu breit / loesungsgetrieben", color: "#ef4444" };
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function CallPrepTab({ accountId, contacts, color }: {
  accountId: string; contacts: Person[]; color: string;
}) {
  const [notes, setNotes] = useState<DiscoveryNote[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalForm, setModalForm] = useState({ title: "", callDate: "", contactId: "" });
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/discovery-notes?accountId=${accountId}`);
    const data = await res.json();
    setNotes(data.discoveryNotes ?? []);
  }, [accountId]);

  useEffect(() => { load(); }, [load]);

  const createNote = async () => {
    if (!modalForm.title.trim()) return;
    setSaving(true);
    const res = await fetch("/api/discovery-notes", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId, title: modalForm.title, callDate: modalForm.callDate || null, contactId: modalForm.contactId || null }),
    });
    const data = await res.json();
    setSaving(false);
    setShowModal(false);
    setModalForm({ title: "", callDate: "", contactId: "" });
    await load();
    if (data.discoveryNote?.id) setExpandedId(data.discoveryNote.id);
  };

  const deleteNote = async (id: string) => {
    await fetch(`/api/discovery-notes?id=${id}`, { method: "DELETE" });
    if (expandedId === id) setExpandedId(null);
    load();
  };

  const patchNote = (id: string, field: string, value: unknown) => {
    // Update local state immediately
    setNotes((prev: DiscoveryNote[]) => prev.map((n: DiscoveryNote) => n.id === id ? { ...n, [field]: value } : n));
    // Debounce save
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveStatus("saving");
    saveTimer.current = setTimeout(async () => {
      await fetch(`/api/discovery-notes?id=${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    }, 800);
  };

  const patchScoreImmediate = async (id: string, field: string, value: number) => {
    setNotes((prev: DiscoveryNote[]) => prev.map((n: DiscoveryNote) => n.id === id ? { ...n, [field]: value } : n));
    await fetch(`/api/discovery-notes?id=${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
  };

  const expandedNote = notes.find((n: DiscoveryNote) => n.id === expandedId);

  return (
    <>
      {/* Header */}
      <div style={{ background: "#141720", border: "1px solid #1e2128", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid #1e2128" }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Discovery Notes</span>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {saveStatus !== "idle" && (
              <span style={{ fontSize: 10, color: saveStatus === "saving" ? "#a78bfa" : "#10B981" }}>
                {saveStatus === "saving" ? "Speichern..." : "Gespeichert"}
              </span>
            )}
            <button onClick={() => setShowModal(true)} style={{ padding: "4px 12px", borderRadius: 6, border: "none", background: "#10B981", color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>+ Neue Prep</button>
          </div>
        </div>

        <div style={{ padding: "8px 16px" }}>
          {notes.length === 0 && <div style={{ padding: "16px 0", textAlign: "center", color: "#4a5068", fontSize: 12 }}>Noch keine Discovery Notes. Erstelle eine Prep vor deinem naechsten Call.</div>}

          {notes.map(note => {
            const isExpanded = expandedId === note.id;
            const contactName = contacts.find(c => c.id === note.contactId)?.name;
            const { total, count, max } = getScoreTotal(note);
            const hasScore = count > 0;

            return (
              <div key={note.id} style={{ borderBottom: "1px solid #111318" }}>
                {/* Row header */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : note.id)}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 0", cursor: "pointer" }}
                >
                  <span style={{ fontSize: 12, color: "#4a5068", transform: isExpanded ? "rotate(90deg)" : "none", transition: "transform 0.15s" }}>&#9654;</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#c8ccd6" }}>{note.title}</div>
                    <div style={{ display: "flex", gap: 8, marginTop: 3, alignItems: "center", flexWrap: "wrap" }}>
                      {note.callDate && <span style={{ fontSize: 11, color: "#4a5068" }}>{formatDate(note.callDate)}</span>}
                      {contactName && <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 999, background: "#1a1d27", color: "#8b90a0" }}>{contactName}</span>}
                    </div>
                  </div>
                  <span style={{
                    padding: "3px 10px", borderRadius: 999, fontSize: 10, fontWeight: 600,
                    background: note.status === "completed" ? "#10B98118" : "#F59E0B18",
                    color: note.status === "completed" ? "#10B981" : "#F59E0B",
                    border: `1px solid ${note.status === "completed" ? "#10B98140" : "#F59E0B40"}`,
                  }}>{note.status === "completed" ? "Abgeschlossen" : "Entwurf"}</span>
                  {hasScore && (
                    <span style={{ fontSize: 11, color: getScoreLabel(total).color, fontWeight: 600 }}>{total}/{max}</span>
                  )}
                  <button onClick={e => { e.stopPropagation(); deleteNote(note.id); }} style={{ padding: "2px 6px", borderRadius: 4, border: "none", background: "transparent", color: "#4a5068", fontSize: 11, cursor: "pointer" }} title="Loeschen">x</button>
                </div>

                {/* Expanded content */}
                {isExpanded && expandedNote && (
                  <ExpandedNote
                    note={expandedNote}
                    color={color}
                    onPatch={(field, value) => patchNote(note.id, field, value)}
                    onScorePatch={(field, value) => patchScoreImmediate(note.id, field, value)}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* New Prep Modal */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, padding: 20 }} onClick={() => setShowModal(false)}>
          <div style={{ background: "#141720", border: "1px solid #1e2128", borderRadius: 16, padding: 24, width: "100%", maxWidth: 480, display: "flex", flexDirection: "column", gap: 14 }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: 16, fontWeight: 700 }}>Neue Call Prep</h2>
            <div><label style={LS}>Titel *</label><input style={IS} value={modalForm.title} onChange={e => setModalForm(f => ({ ...f, title: e.target.value }))} placeholder="z.B. Discovery Call - Buero Weber" /></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div><label style={LS}>Call-Datum</label><input style={IS} type="date" value={modalForm.callDate} onChange={e => setModalForm(f => ({ ...f, callDate: e.target.value }))} /></div>
              <div>
                <label style={LS}>Kontakt</label>
                <select style={{ ...IS, cursor: "pointer" }} value={modalForm.contactId} onChange={e => setModalForm(f => ({ ...f, contactId: e.target.value }))}>
                  <option value="">– Kein Kontakt –</option>
                  {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: "9px 0", borderRadius: 8, border: "1px solid #1e2128", background: "transparent", color: "#8b90a0", fontSize: 13, cursor: "pointer" }}>Abbrechen</button>
              <button onClick={createNote} disabled={saving || !modalForm.title.trim()} style={{ flex: 2, padding: "9px 0", borderRadius: 8, border: "none", background: saving ? "#0a7a50" : "#10B981", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{saving ? "Erstellen..." : "Erstellen"}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Expanded Note ───────────────────────────────────────────────────────────

function ExpandedNote({ note, color, onPatch, onScorePatch }: {
  note: DiscoveryNote; color: string;
  onPatch: (field: string, value: string) => void;
  onScorePatch: (field: string, value: number) => void;
}) {
  const { total, count, max } = getScoreTotal(note);
  const hasScore = count === SCORE_KEYS.length;

  return (
    <div style={{ paddingBottom: 20, display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Status toggle */}
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button
          onClick={() => onPatch("status", note.status === "completed" ? "draft" : "completed")}
          style={{
            padding: "4px 12px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer",
            border: `1px solid ${note.status === "completed" ? "#10B98140" : "#F59E0B40"}`,
            background: note.status === "completed" ? "#10B98118" : "#F59E0B18",
            color: note.status === "completed" ? "#10B981" : "#F59E0B",
          }}
        >
          {note.status === "completed" ? "Als Entwurf markieren" : "Als abgeschlossen markieren"}
        </button>
      </div>

      {/* 1. Kontext */}
      <Section title="1. Kontext" hint="Buerotyp, Arbeitsrealitaet, Rollenbild">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Field label="Buerotyp / Was machen sie?" value={note.kontextBuerotyp} onChange={v => onPatch("kontextBuerotyp", v)} placeholder="Neubau vs Bestand, Entwurf vs Ausfuehrung..." />
          <Field label="Team & Rollen" value={note.kontextTeam} onChange={v => onPatch("kontextTeam", v)} placeholder="Groesse, wer macht was..." />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
          <Field label="Typische Projektarten" value={note.kontextProjektarten} onChange={v => onPatch("kontextProjektarten", v)} placeholder="Viele kleine vs wenige grosse..." />
          <Field label="Wichtigste Ablaeufe" value={note.kontextAblaeufe} onChange={v => onPatch("kontextAblaeufe", v)} placeholder="E-Mail-getrieben, Chef-zentriert..." />
        </div>
      </Section>

      {/* 2. Pain Points */}
      <Section title="2. Pain Points" hint="Probleme, nicht Features">
        <Field label="Pain 1 (groesster Schmerz)" value={note.pain1} onChange={v => onPatch("pain1", v)} placeholder="Wo verliert ihr am meisten Zeit?" rows={2} />
        <div style={{ marginTop: 8 }}><Field label="Pain 2" value={note.pain2} onChange={v => onPatch("pain2", v)} placeholder="Was nervt operativ am meisten?" rows={2} /></div>
        <div style={{ marginTop: 8 }}><Field label="Pain 3" value={note.pain3} onChange={v => onPatch("pain3", v)} placeholder="Was laeuft regelmaessig nicht sauber?" rows={2} /></div>
      </Section>

      {/* 3. Konkreter Fall */}
      <Section title="3. Konkreter Fall" hint="Letztes konkretes Beispiel sezieren">
        <Field label="Ausloeser" value={note.konkreterFallAusloeser} onChange={v => onPatch("konkreterFallAusloeser", v)} placeholder="Was war der Ausloeser?" />
        <div style={{ marginTop: 8 }}><Field label="Beteiligte" value={note.konkreterFallBeteiligte} onChange={v => onPatch("konkreterFallBeteiligte", v)} placeholder="Wer war beteiligt?" /></div>
        <div style={{ marginTop: 8 }}><Field label="Ablauf heute" value={note.konkreterFallAblauf} onChange={v => onPatch("konkreterFallAblauf", v)} placeholder="Wie lief das Schritt fuer Schritt?" rows={3} /></div>
        <div style={{ marginTop: 8 }}><Field label="Reibungspunkt" value={note.konkreterFallReibung} onChange={v => onPatch("konkreterFallReibung", v)} placeholder="Wo genau ist Reibung entstanden?" rows={2} /></div>
        <div style={{ marginTop: 8 }}><Field label="Folge" value={note.konkreterFallFolge} onChange={v => onPatch("konkreterFallFolge", v)} placeholder="Was war am Ende die Folge?" /></div>
      </Section>

      {/* 4. Auswirkungen */}
      <Section title="4. Auswirkungen" hint="Impact quantifizieren">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Field label="Haeufigkeit" value={note.auswirkungHaeufigkeit} onChange={v => onPatch("auswirkungHaeufigkeit", v)} placeholder="Taeglich? Woechentlich? Pro Projekt?" />
          <Field label="Zeitaufwand" value={note.auswirkungZeitaufwand} onChange={v => onPatch("auswirkungZeitaufwand", v)} placeholder="30min/Woche oder 5h/Woche?" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
          <Field label="Betroffene Rollen" value={note.auswirkungBetroffene} onChange={v => onPatch("auswirkungBetroffene", v)} placeholder="Wer ist betroffen? Wie viele?" />
          <Field label="Geschaeftliche Folge" value={note.auswirkungFolge} onChange={v => onPatch("auswirkungFolge", v)} placeholder="Effizienz-, Qualitaets- oder Risikoproblem?" />
        </div>
      </Section>

      {/* 5. Workarounds */}
      <Section title="5. Aktuelle Workarounds" hint="Warum ist das bisher nicht geloest?">
        <Field label="Tools & Systeme" value={note.workaroundsTools} onChange={v => onPatch("workaroundsTools", v)} placeholder="Excel, Outlook, WhatsApp, OneNote..." />
        <div style={{ marginTop: 8 }}><Field label="Improvisierte Loesungen" value={note.workaroundsLoesungen} onChange={v => onPatch("workaroundsLoesungen", v)} placeholder="Wie loest ihr das heute?" /></div>
        <div style={{ marginTop: 8 }}><Field label="Warum unzureichend?" value={note.workaroundsWarumUnzureichend} onChange={v => onPatch("workaroundsWarumUnzureichend", v)} placeholder="Warum hat sich kein Standard etabliert?" /></div>
      </Section>

      {/* 6. Prioritaet */}
      <Section title="6. Prioritaet" hint="Priorisierung erzwingen">
        <Field label="Hoechste Prioritaet" value={note.prioritaetHoechste} onChange={v => onPatch("prioritaetHoechste", v)} placeholder="Was ist wirklich das groesste Thema?" rows={2} />
        <div style={{ marginTop: 8 }}><Field label="Warum jetzt?" value={note.prioritaetWarumJetzt} onChange={v => onPatch("prioritaetWarumJetzt", v)} placeholder="Was haette sofort spuerbaren Wert?" /></div>
      </Section>

      {/* 7. Loesungsanforderungen */}
      <Section title="7. Loesungsanforderungen" hint="Erst jetzt vorsichtig Loesung testen">
        <Field label="Must-have" value={note.anforderungenMustHave} onChange={v => onPatch("anforderungenMustHave", v)} placeholder="Was muss die Loesung konkret koennen?" rows={2} />
        <div style={{ marginTop: 8 }}><Field label="No-Go" value={note.anforderungenNoGo} onChange={v => onPatch("anforderungenNoGo", v)} placeholder="Was darf auf keinen Fall passieren?" /></div>
        <div style={{ marginTop: 8 }}><Field label="Wer muss es nutzen?" value={note.anforderungenNutzer} onChange={v => onPatch("anforderungenNutzer", v)} placeholder="Wer muesste das taeglich nutzen?" /></div>
      </Section>

      {/* 8. Naechster Schritt */}
      <Section title="8. Naechster Schritt" hint="Gespraech sauber schliessen">
        <Field label="Follow-up" value={note.naechsterSchritt} onChange={v => onPatch("naechsterSchritt", v)} placeholder="Was ist der naechste konkrete Schritt?" />
        <div style={{ marginTop: 8 }}><Field label="Offene Fragen" value={note.offeneFragen} onChange={v => onPatch("offeneFragen", v)} placeholder="Was muss noch geklaert werden?" rows={2} /></div>
        <div style={{ marginTop: 8 }}><Field label="Produkt-Hypothese" value={note.hypotheseProdukt} onChange={v => onPatch("hypotheseProdukt", v)} placeholder="Hypothese fuer moegliches Produkt/Feature" /></div>
      </Section>

      {/* 9. Scorecard */}
      <Section title="9. Scorecard" hint="Nach dem Call: 1-5 Punkte je Kategorie">
        {SCORE_KEYS.map(({ key, label }) => (
          <ScoreRow
            key={key}
            label={label}
            value={note[key] as number | undefined}
            onChange={v => onScorePatch(key, v)}
            color={color}
          />
        ))}
        {hasScore && (
          <div style={{ marginTop: 12, padding: "10px 12px", background: "#0d0f12", borderRadius: 8, border: "1px solid #1e2128", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#f0f2f5" }}>Gesamt: {total}/{max}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: getScoreLabel(total).color }}>{getScoreLabel(total).label}</span>
          </div>
        )}
      </Section>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Section({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ background: "#0d0f12", border: "1px solid #1e2128", borderRadius: 10, overflow: "hidden" }}>
      <div
        onClick={() => setOpen(!open)}
        style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", cursor: "pointer", borderBottom: open ? "1px solid #1e2128" : "none" }}
      >
        <span style={{ fontSize: 11, color: "#4a5068", transform: open ? "rotate(90deg)" : "none", transition: "transform 0.15s" }}>&#9654;</span>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: "#c8ccd6" }}>{title}</span>
        <span style={{ fontSize: 10, color: "#4a5068", marginLeft: 4 }}>{hint}</span>
      </div>
      {open && <div style={{ padding: "12px 14px" }}>{children}</div>}
    </div>
  );
}

function Field({ label, value, onChange, placeholder, rows }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number;
}) {
  return (
    <div>
      <label style={LS}>{label}</label>
      <textarea
        style={TA}
        rows={rows ?? 1}
        value={value ?? ""}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

function ScoreRow({ label, value, onChange, color }: {
  label: string; value: number | undefined; onChange: (v: number) => void; color: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0" }}>
      <span style={{ fontSize: 12, color: "#8b90a0", width: 180, flexShrink: 0 }}>{label}</span>
      <div style={{ display: "flex", gap: 4 }}>
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            onClick={() => onChange(n)}
            style={{
              width: 28, height: 28, borderRadius: 6, border: "1px solid #1e2128",
              background: value === n ? `${color}30` : "#141720",
              color: value === n ? color : "#4a5068",
              fontWeight: value === n ? 700 : 400, fontSize: 12, cursor: "pointer",
            }}
          >{n}</button>
        ))}
      </div>
    </div>
  );
}

function formatDate(d: string): string {
  try {
    return new Date(d).toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric" });
  } catch { return d; }
}
