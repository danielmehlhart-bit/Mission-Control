"use client";

import { useEffect, useRef } from "react";

const SECTIONS = [
  {
    id: "situation",
    label: "🏠 Situation",
    hint: "Wie groß ist der Bestand? Wie viele Mitarbeiter? Was verwalten sie? ERP/Tools aktuell?",
    placeholder: "z.B. ~80 Einheiten, 3 Mitarbeiter, Excel + E-Mail, kein ERP..."
  },
  {
    id: "pain",
    label: "🔥 Pains (eigene Worte)",
    hint: "Wörtliche Zitate vom Kunden. Was nervt? Was kostet Zeit?",
    placeholder: "z.B. \"Wir tippen die gleichen Daten 5x ein\" / \"Mieterwechsel dauert ewig\"..."
  },
  {
    id: "quantify",
    label: "📊 Quantifizierung",
    hint: "Stunden/Woche für welche Aufgabe? Stundensatz? Jahreskosten? Leerstand-Dauer?",
    placeholder: "z.B. Mieterwechsel: 11h × X€/h × XX Wechsel/Jahr = ???€"
  },
  {
    id: "everreal_gap",
    label: "🧩 EverReal / Immoware — Was lösen die NICHT?",
    hint: "Das ist die Schlüsselfrage. Wo hört die Software auf? Was bleibt manuell?",
    placeholder: "z.B. Onboarding-Prozess nach Vertragsabschluss? Strom/Internet/Versicherung? Eigentümer-Kommunikation?"
  },
  {
    id: "critical_event",
    label: "⚡ Critical Event",
    hint: "WARUM JETZT? Was hat sich verändert? Was ist der Auslöser für das Gespräch?",
    placeholder: "z.B. Neuer Mitarbeiter ausgefallen / Fachkräftemangel / Wachstumsplan..."
  },
  {
    id: "impact",
    label: "💥 Impact (wenn nichts passiert)",
    hint: "Was kostet der Status Quo in 12 Monaten? Was können sie NICHT tun wegen der Reibung?",
    placeholder: "z.B. Können nicht skalieren / verlieren Aufträge / Team überlastet..."
  },
  {
    id: "decision",
    label: "🗳️ Decision Process",
    hint: "Wer entscheidet? Wer muss noch zustimmen? Budget? Zeitrahmen?",
    placeholder: "z.B. Eduard allein / Gesellschafter-Meeting nötig / Budget vorhanden ja/nein..."
  },
  {
    id: "ideen",
    label: "💡 Lösungsideen (die SIE nennen)",
    hint: "Wenn sie in Lösungen springen: aufschreiben, aber erstmal stoppen. Problem erst fertig verstehen.",
    placeholder: "z.B. \"Wir wollten schon mal eine App bauen die...\" — notieren, nicht drauf eingehen."
  },
  {
    id: "pos_onboarding",
    label: "⚡ PoS-Onboarding Reaktion",
    hint: "Wie reagieren sie auf die Idee: Beim Einzug Strom/Internet/Versicherung automatisch vermitteln?",
    placeholder: "z.B. Sehr interessiert / kennen das / haben Partnerschaft mit...?"
  },
  {
    id: "next_steps",
    label: "✅ Next Steps",
    hint: "Konkreter nächster Termin! Nicht 'meld dich'. Datum, Thema, wer macht was.",
    placeholder: "z.B. Demo-Call: KW12, Mo 10:00 / ich zeige Prototyp / Eduard bringt Zahlen..."
  },
  {
    id: "spiced",
    label: "🎯 SPICED Score (nach dem Call)",
    hint: "S=Situation P=Pain I=Impact C=Critical Event E=Evidence D=Decision — je 1-10",
    placeholder: "S: ? / P: ? / I: ? / C: ? / E: ? / D: ?\nMin. P≥7, I≥6, C≥5 → sonst kein Angebot!"
  },
  {
    id: "sonstige",
    label: "🗒️ Sonstiges / Rohe Notizen",
    hint: "Alles was noch nicht oben passt.",
    placeholder: ""
  }
];

export default function RaamDiscoveryPage() {
  const refs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  useEffect(() => {
    SECTIONS.forEach(s => {
      const saved = localStorage.getItem(`r1-${s.id}`);
      if (saved && refs.current[s.id]) {
        refs.current[s.id]!.value = saved;
        autoResize(refs.current[s.id]!);
      }
    });
  }, []);

  function autoResize(el: HTMLTextAreaElement) {
    el.style.height = "auto";
    el.style.height = Math.max(80, el.scrollHeight) + "px";
  }

  function handleChange(id: string, el: HTMLTextAreaElement) {
    localStorage.setItem(`r1-${id}`, el.value);
    autoResize(el);
  }

  function clearAll() {
    if (!confirm("Alle Notizen löschen?")) return;
    SECTIONS.forEach(s => {
      localStorage.removeItem(`r1-${s.id}`);
      if (refs.current[s.id]) {
        refs.current[s.id]!.value = "";
        autoResize(refs.current[s.id]!);
      }
    });
  }

  return (
    <div style={{ padding: "24px", maxWidth: 820, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "#8b90a0", marginBottom: 6 }}>
              Projekt R1 · Raam Immobilien
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: "#f0f2f5", letterSpacing: "-0.3px", marginBottom: 6 }}>
              Discovery Call — Eduard Raab
            </h1>
            <div style={{ fontSize: 13, color: "#8b90a0" }}>Mo 10.03.2026 · 10:00 Uhr · Notizen werden automatisch gespeichert</div>
          </div>
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <a href="/briefings/2026-03-08-discovery-briefing-raam.html" target="_blank"
              style={{ fontSize: 12, padding: "6px 14px", borderRadius: 8, background: "#1e2128", border: "1px solid #2a2d38", color: "#8b90a0", textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
              📋 Briefing
            </a>
            <button onClick={clearAll}
              style={{ fontSize: 12, padding: "6px 14px", borderRadius: 8, background: "#1e2128", border: "1px solid #2a2d38", color: "#ef4444", cursor: "pointer" }}>
              Löschen
            </button>
          </div>
        </div>

        {/* Quick-Reminder Bar */}
        <div style={{ marginTop: 20, background: "#141720", border: "1px solid #1e2128", borderRadius: 12, padding: "14px 18px", display: "flex", gap: 24, flexWrap: "wrap" }}>
          {[
            { icon: "🎙️", text: "80% fragen, 20% reden" },
            { icon: "🛑", text: "Nicht in Lösung springen" },
            { icon: "🧮", text: "Prospect selbst rechnen lassen" },
            { icon: "⚡", text: "Critical Event fragen" },
            { icon: "❓", text: "Was löst EverReal NICHT?" },
          ].map(r => (
            <div key={r.text} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#8b90a0" }}>
              <span>{r.icon}</span><span>{r.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Sections */}
      {SECTIONS.map(s => (
        <div key={s.id} style={{ marginBottom: 20, background: "#141720", border: "1px solid #1e2128", borderRadius: 14, overflow: "hidden" }}>
          <div style={{ padding: "14px 18px 10px", borderBottom: "1px solid #1e2128" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#f0f2f5" }}>{s.label}</div>
            <div style={{ fontSize: 12, color: "#5a5f72", marginTop: 3 }}>{s.hint}</div>
          </div>
          <textarea
            ref={el => { refs.current[s.id] = el; }}
            placeholder={s.placeholder}
            onChange={e => handleChange(s.id, e.target)}
            onInput={e => autoResize(e.target as HTMLTextAreaElement)}
            style={{
              width: "100%",
              minHeight: 80,
              background: "transparent",
              border: "none",
              outline: "none",
              padding: "14px 18px",
              fontSize: 14,
              color: "#c8ccd6",
              resize: "none",
              fontFamily: "inherit",
              lineHeight: 1.6,
              display: "block",
            }}
          />
        </div>
      ))}

      {/* Quantifizierungs-Helper */}
      <div style={{ background: "#141720", border: "1px solid #2a2d38", borderRadius: 14, padding: "20px", marginBottom: 20, marginTop: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#8b90a0", marginBottom: 12 }}>🧮 Quantifizierungs-Rechner</div>
        <div style={{ fontSize: 12, color: "#5a5f72", lineHeight: 1.8 }}>
          <strong style={{ color: "#8b90a0" }}>Mieterwechsel-Formel:</strong> ___ h/Mieterwechsel × ___€/h × ___ Wechsel/Jahr = <strong style={{ color: "#f0f2f5" }}>___€/Jahr</strong><br/>
          <strong style={{ color: "#8b90a0" }}>Immobilien Benchmark:</strong> Typische Hausverwaltung 3-8 MA → 80.000–150.000€/Jahr verbrannte Admin-Zeit<br/>
          <strong style={{ color: "#8b90a0" }}>Leerstand-Formel:</strong> ___ Tage Leerstand × ___€ Kaltmiete/Tag = ___€ Verlust pro Wechsel
        </div>
      </div>

      <div style={{ fontSize: 11, color: "#3a3f52", textAlign: "center", marginTop: 24, marginBottom: 8 }}>
        Notizen werden lokal im Browser gespeichert (localStorage) · Hatti 🏔️
      </div>
    </div>
  );
}
