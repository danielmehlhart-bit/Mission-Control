"use client";

import { useEffect, useState, useCallback, useRef } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

type DiscoveryNote = {
  id: string; accountId: string; title: string; callDate?: string;
  contactId?: string; status: string;
  // 1. Kontext
  kontextBuerotyp: string; kontextTeam: string; kontextProjektarten: string; kontextAblaeufe: string;
  // 2. Pain Landscape
  painKernpain: string; painWoranZeigtSich: string; painWeitereSignale: string; painEinordnung: string;
  // 3. Konkreter Fall
  konkreterFallAusloeser: string; konkreterFallBeteiligte: string; konkreterFallAblauf: string;
  konkreterFallReibung: string; konkreterFallDoppelt: string; konkreterFallFolge: string;
  konkreterFallSollAblauf: string;
  // 4. Impact
  auswirkungHaeufigkeit: string; auswirkungZeitaufwand: string; auswirkungBetroffene: string;
  auswirkungFolge: string; auswirkungWarumJetzt: string;
  auswirkungDringlichkeit?: number; auswirkungSchmerzstaerke?: number;
  // 5. Workarounds
  workaroundsTools: string; workaroundsLoesungen: string; workaroundsAusprobiert: string;
  workaroundsWarumNicht: string; workaroundsKeinStandard: string;
  // 6. Priorisierung
  prioritaetHoechste: string; prioritaetWarumJetzt: string;
  prioritaetNiceToHave: string; prioritaetTestbar14Tage: string;
  // 7. Testbare Hypothese
  hypotheseProblem: string; hypotheseMinimal: string; hypotheseNoGo: string;
  hypotheseWerNutzt: string; hypotheseWorkflow: string;
  // 8. Test Readiness
  testBereitschaft: string; testBeispiel: string; testUnterlagen: string;
  testErfolgskriterium: string; testNaechsterSchritt: string;
  // 9. Scorecard
  scorePainIdentifiziert?: number; scoreKonkreterFall?: number;
  scoreImpactQuantifiziert?: number; scoreRootCause?: number;
  scorePrioritaet?: number; scoreNichtGepitcht?: number;
  scoreTestfall?: number; scoreNaechsterSchritt?: number;
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
  { key: "scoreRootCause", label: "Root Cause verstanden" },
  { key: "scorePrioritaet", label: "Priorität bestätigt" },
  { key: "scoreNichtGepitcht", label: "Nicht zu früh gepitcht" },
  { key: "scoreTestfall", label: "Testfall identifiziert" },
  { key: "scoreNaechsterSchritt", label: "Nächster Schritt definiert" },
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
  if (total >= 34) return { label: "Sehr starke Discovery", color: "#10B981" };
  if (total >= 28) return { label: "Gut, aber noch unscharf", color: "#F59E0B" };
  if (total >= 20) return { label: "Viel gelernt, keine harte Prio", color: "#F97316" };
  return { label: "Zu breit / lösungsgetrieben", color: "#ef4444" };
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
    setNotes((prev: DiscoveryNote[]) => prev.map((n: DiscoveryNote) => n.id === id ? { ...n, [field]: value } : n));
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
          <div>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Discovery Notes</span>
            <span style={{ fontSize: 11, color: "#64748b", marginLeft: 8 }}>Pre-GTM Product Discovery</span>
          </div>
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
          {notes.length === 0 && <div style={{ padding: "16px 0", textAlign: "center", color: "#4a5068", fontSize: 12 }}>Noch keine Discovery Notes. Erstelle eine Prep vor deinem nächsten Call.</div>}

          {notes.map(note => {
            const isExpanded = expandedId === note.id;
            const contactName = contacts.find(c => c.id === note.contactId)?.name;
            const { total, count, max } = getScoreTotal(note);
            const hasScore = count > 0;

            return (
              <div key={note.id} style={{ borderBottom: "1px solid #111318" }}>
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
                      <span style={{ fontSize: 10, color: "#64748b" }}>Ziel: Kernpain + testbarer Startpunkt</span>
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
                  <button onClick={e => { e.stopPropagation(); deleteNote(note.id); }} style={{ padding: "2px 6px", borderRadius: 4, border: "none", background: "transparent", color: "#4a5068", fontSize: 11, cursor: "pointer" }} title="Löschen">x</button>
                </div>

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

        {/* Footer */}
        <div style={{ padding: "12px 16px", borderTop: "1px solid #1e2128", fontSize: 11, color: "#64748b" }}>
          Ziel pro Gespräch: 1 Kernpain tief verstehen, 1 testbaren Startpunkt definieren, Nebensignale sauber parken.
        </div>
      </div>

      {/* New Prep Modal */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, padding: 20 }} onClick={() => setShowModal(false)}>
          <div style={{ background: "#141720", border: "1px solid #1e2128", borderRadius: 16, padding: 24, width: "100%", maxWidth: 480, display: "flex", flexDirection: "column", gap: 14 }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: 16, fontWeight: 700 }}>Neue Call Prep</h2>
            <div><label style={LS}>Titel *</label><input style={IS} value={modalForm.title} onChange={e => setModalForm(f => ({ ...f, title: e.target.value }))} placeholder="z. B. Martin Keller - Test Discovery" /></div>
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
  onPatch: (field: string, value: unknown) => void;
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
      <Section title="1. Kontext" hint="Bürotyp, Team, Projektarten, Alltag">
        <Grid cols={2}>
          <Field label="Bürotyp / Schwerpunkt" value={note.kontextBuerotyp} onChange={v => onPatch("kontextBuerotyp", v)} placeholder="z. B. Bestandssanierung, Umbauten, Gewerbe, Bauüberwachung" />
          <Field label="Team & Rollen" value={note.kontextTeam} onChange={v => onPatch("kontextTeam", v)} placeholder="z. B. 9 Personen, Inhaber, Bauleiter, Zeichnerin, Projektmitarbeitende" />
          <Field label="Typische Projektarten" value={note.kontextProjektarten} onChange={v => onPatch("kontextProjektarten", v)} placeholder="z. B. viele kleinere Sanierungen, einige mittlere Bestandsumbauten" />
          <Field label="Typische tägliche Abläufe" value={note.kontextAblaeufe} onChange={v => onPatch("kontextAblaeufe", v)} placeholder="z. B. stark E-Mail-getrieben, viel Abstimmung mit Baustelle, Chef stark operativ" />
        </Grid>
      </Section>

      {/* 2. Pain Landscape */}
      <Section title="2. Pain Landscape" hint="Schmerzpunkte rund um Koordination & Kommunikation">
        <Field label="Wie läuft eine typische Planänderung ab?" value={note.painKernpain} onChange={v => onPatch("painKernpain", v)} placeholder="Beschreiben Sie den Weg einer Info vom Eingang bei Ihnen bis zur Umsetzung auf der Baustelle. Wer leitet was an wen weiter?" rows={3} />
        <Grid cols={2} mt={14}>
          <Field label="Was sind die größten Störfaktoren / Unterbrechungen im Alltag?" value={note.painWoranZeigtSich} onChange={v => onPatch("painWoranZeigtSich", v)} placeholder="Wie oft werden Sie oder Projektleiter aus der Konzentration gerissen, um kurze Infos weiterzugeben?" />
          <Field label="Was war das letzte Mal, dass eine Aufgabe liegen blieb?" value={note.painWeitereSignale} onChange={v => onPatch("painWeitereSignale", v)} placeholder="...weil die zuständige Person nicht wusste, dass der Ball bei ihr liegt?" />
        </Grid>
      </Section>

      {/* 3. Impact */}
      <Section title="3. Impact" hint="Konsequenzen & Kosten des Informations-Overheads">
        <Grid cols={1}>
        <Field label="Wie finden Sie nach dem Urlaub heraus, was wirklich passiert ist?" value={note.konkreterFallAusloeser} onChange={v => onPatch("konkreterFallAusloeser", v)} placeholder="Wie verschaffen Sie sich schnell einen Überblick über alle wichtigen Projekte?" />
        </Grid>
        <Grid cols={2} mt={14}>
          <Field label="Wie lange brauchen Sie, um eine Entscheidung von vor 3 Monaten zu finden?" value={note.konkreterFallBeteiligte} onChange={v => onPatch("konkreterFallBeteiligte", v)} placeholder="Wo und wie suchen Sie, wenn ein Bauherr anruft?" />
          <Field label="Wie wird ein neues Teammitglied auf ein laufendes Projekt gebrieft?" value={note.konkreterFallAblauf} onChange={v => onPatch("konkreterFallAblauf", v)} placeholder="Wie stellen Sie sicher, dass alle relevanten Infos & die Historie ankommen?" />
        </Grid>
      </Section>

      {/* 4. Hypothesen-Validierung */}
      <Section title="4. Hypothesen-Validierung" hint="Den Bedarf für einen 'Agenten' testen">
          <Field label="Die 'Zauberstab-Frage'" value={note.auswirkungHaeufigkeit} onChange={v => onPatch("auswirkungHaeufigkeit", v)} placeholder="Wenn Sie einen perfekten Assistenten in der Software hätten, der zuhören und Aufgaben erledigen kann: Welche 3 Sätze würden Sie den ganzen Tag zu ihm sagen?" rows={3} />
          <div style={{marginTop: 14}}>
            <Field label="Welche wiederkehrenden Aufgaben fressen die meiste Zeit?" value={note.auswirkungZeitaufwand} onChange={v => onPatch("auswirkungZeitaufwand", v)} placeholder="z.B. Protokolle zusammenfassen, Status-Updates formulieren, Bautagebuch schreiben..." rows={2} />
          </div>
      </Section>
      
      {/* 5. Heutige Lösung / Workarounds */}
      <Section title="5. Heutige Lösung / Workarounds" hint="Verstehen, warum das bisher nicht sauber gelöst ist">
        <Grid cols={2}>
          <Field label="Tools / Systeme heute" value={note.workaroundsTools} onChange={v => onPatch("workaroundsTools", v)} placeholder="Excel, Outlook, WhatsApp, OneNote, PM-Tool, Telefon, Laufwerk" />
          <Field label="Improvisierte Lösung heute" value={note.workaroundsLoesungen} onChange={v => onPatch("workaroundsLoesungen", v)} placeholder="Wie löst das Büro das aktuell im Alltag?" />
          <Field label="Was wurde schon ausprobiert?" value={note.workaroundsAusprobiert} onChange={v => onPatch("workaroundsAusprobiert", v)} placeholder="Welche Tools oder Routinen wurden schon getestet?" />
          <Field label="Warum hat es nicht funktioniert?" value={note.workaroundsWarumNicht} onChange={v => onPatch("workaroundsWarumNicht", v)} placeholder="Zu kompliziert? Nicht genutzt? Zu viel Pflege? Kein Fit zum Alltag?" />
        </Grid>
        <div style={{ marginTop: 14 }}>
          <Field label="Warum gibt es bis heute keinen funktionierenden Standard?" value={note.workaroundsKeinStandard} onChange={v => onPatch("workaroundsKeinStandard", v)} placeholder="Was verhindert nachhaltige Einführung?" />
        </div>
      </Section>
      
      {/* 6. Critical Event & Decision */}
       <Section title="6. Critical Event & Decision" hint="Warum jetzt? Wer entscheidet? Was passiert wenn nicht?">
         <Grid cols={2}>
           <Field label="Warum ist das gerade jetzt relevant?" value={note.auswirkungWarumJetzt} onChange={v => onPatch("auswirkungWarumJetzt", v)} placeholder="Was hat sich verändert, dass das Thema auf dem Tisch liegt?" />
           <Field label="Was passiert, wenn Sie das in den nächsten 6 Monaten nicht lösen?" value={note.auswirkungFolge} onChange={v => onPatch("auswirkungFolge", v)} placeholder="Effizienz, Qualität, Fristen, Risiko, Marge, Kapazitätsverlust" />
         </Grid>
       </Section>

      {/* 7. Priorisierung */}
      <Section title="7. Priorisierung" hint="Ein Startpunkt, keine Wunschliste">
        <Grid cols={2}>
          <Field label="Größtes Thema" value={note.prioritaetHoechste} onChange={v => onPatch("prioritaetHoechste", v)} placeholder="Was ist wirklich die höchste Priorität?" />
          <Field label="Was hätte sofort spürbaren Wert?" value={note.prioritaetWarumJetzt} onChange={v => onPatch("prioritaetWarumJetzt", v)} placeholder="Woran würde das Büro unmittelbar merken, dass etwas besser läuft?" />
          <Field label="Was wäre nice-to-have, aber nicht zuerst wichtig?" value={note.prioritaetNiceToHave} onChange={v => onPatch("prioritaetNiceToHave", v)} placeholder="Was sollte bewusst geparkt werden?" />
          <Field label="Welcher Pain wäre in 14 Tagen real testbar?" value={note.prioritaetTestbar14Tage} onChange={v => onPatch("prioritaetTestbar14Tage", v)} placeholder="Welches Thema eignet sich für einen kleinen echten Test?" />
        </Grid>
      </Section>

      {/* 8. Test Readiness / Nächster Schritt */}
      <Section title="8. Test Readiness / Nächster Schritt" hint="Prüfen, ob der Gesprächspartner wirklich testbereit ist">
        <Grid cols={2}>
          <Field label="Bereitschaft zum Test?" value={note.testBereitschaft} onChange={v => onPatch("testBereitschaft", v)} placeholder="Wie offen ist die Person für einen kleinen, echten Test?" />
          <Field label="Mit welchem realen Beispiel?" value={note.testBeispiel} onChange={v => onPatch("testBeispiel", v)} placeholder="Welcher konkrete Fall oder Prozess wäre geeignet?" />
          <Field label="Welche Unterlagen / Beispiele könnten eingebracht werden?" value={note.testUnterlagen} onChange={v => onPatch("testUnterlagen", v)} placeholder="Screenshots, E-Mails, Pläne, Fotos, Ablaufbeispiel" />
          <Field label="Woran würden sie merken, dass der Test hilfreich war?" value={note.testErfolgskriterium} onChange={v => onPatch("testErfolgskriterium", v)} placeholder="Zeitersparnis, weniger Rückfragen, bessere Sichtbarkeit, schnellere Reaktion" />
        </Grid>
        <div style={{ marginTop: 14 }}>
          <Field label="Nächster konkreter Schritt" value={note.testNaechsterSchritt} onChange={v => onPatch("testNaechsterSchritt", v)} placeholder="z. B. 30-min Termin mit Bauleiter + echter Beispielprozess" />
        </div>
      </Section>

      {/* 9. Scorecard */}
      <Section title="9. Scorecard" hint="Nach dem Call 1-5 bewerten">
        <div style={{ background: "#0a0e18", border: "1px solid #1e2128", borderRadius: 10, padding: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#dbeafe", marginBottom: 12 }}>Discovery-Qualität</div>
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
        </div>
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
        style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", cursor: "pointer", borderBottom: open ? "1px solid #1e2128" : "none", background: "rgba(9,14,24,0.55)" }}
      >
        <span style={{ fontSize: 11, color: "#4a5068", transform: open ? "rotate(90deg)" : "none", transition: "transform 0.15s" }}>&#9654;</span>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: "#f8fafc" }}>{title}</span>
        <span style={{ fontSize: 10, color: "#64748b", marginLeft: 4 }}>{hint}</span>
      </div>
      {open && <div style={{ padding: "14px 16px" }}>{children}</div>}
    </div>
  );
}

function Grid({ cols, mt, children }: { cols: number; mt?: number; children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: 14, marginTop: mt ?? 0 }}>
      {children}
    </div>
  );
}

function Field({ label, value, onChange, placeholder, rows }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: "#cbd5e1" }}>{label}</label>
      <textarea
        style={TA}
        rows={rows ?? 2}
        value={value ?? ""}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

function NumberField({ label, value, onChange, min, max }: {
  label: string; value: number | undefined; onChange: (v: number) => void; min: number; max: number;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: "#cbd5e1" }}>{label}</label>
      <input
        style={IS}
        type="number"
        min={min}
        max={max}
        value={value ?? ""}
        onChange={e => onChange(parseInt(e.target.value) || 0)}
        placeholder={String(min)}
      />
    </div>
  );
}

function ScoreRow({ label, value, onChange, color }: {
  label: string; value: number | undefined; onChange: (v: number) => void; color: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0" }}>
      <span style={{ fontSize: 12, color: "#cbd5e1", width: 200, flexShrink: 0 }}>{label}</span>
      <div style={{ display: "flex", gap: 4 }}>
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            onClick={() => onChange(n)}
            style={{
              width: 36, height: 36, borderRadius: 8, border: "1px solid #1e2128",
              background: value === n ? `${color}28` : "#0b1220",
              color: value === n ? "#dcfce7" : "#64748b",
              fontWeight: 700, fontSize: 12, cursor: "pointer",
              borderColor: value === n ? `${color}88` : "#1e2128",
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
