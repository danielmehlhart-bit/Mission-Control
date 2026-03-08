"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { detectCategory, CATEGORY_META } from "@/lib/categories";
import { CapturePill } from "@/components/capture-pill";

type BriefingFile = { name: string; path: string; modified: string };
type Project = { id: string; name: string; color: string };

function formatFilename(name: string): { title: string; date: string } {
  const match = name.match(/^(\d{4}-\d{2}-\d{2})-(.+)\.html$/);
  if (match) {
    const [, dateStr, slug] = match;
    const date = new Date(dateStr).toLocaleDateString("de-DE", { day: "numeric", month: "short" });
    const title = slug.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    return { title, date };
  }
  return { title: name.replace(".html", ""), date: "" };
}

export default function HomePage() {
  const router = useRouter();
  const [briefings, setBriefings] = useState<BriefingFile[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [lastSeen, setLastSeen] = useState(0);
  const [showToast, setShowToast] = useState(false);
  const [newCount, setNewCount] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [now, setNow] = useState("");
  const [showCapture, setShowCapture] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    const d = new Date();
    const h = d.getHours();
    const greeting = h < 12 ? "Guten Morgen" : h < 18 ? "Guten Tag" : "Guten Abend";
    setNow(`${greeting}, Daniel. ${d.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" })}`);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const ts = parseInt(localStorage.getItem("lastSeenTimestamp") ?? "0", 10);
    setLastSeen(ts);
    const load = async () => {
      try {
        const [res, projRes] = await Promise.all([
          fetch("/api/briefings", { cache: "no-store" }),
          fetch("/api/projects", { cache: "no-store" }),
        ]);
        const data = await res.json();
        const projData = await projRes.json();
        setProjects(projData.projects ?? []);
        const DATED = /^\d{4}-\d{2}-\d{2}-.*\.html?$/i;
      const sorted = (data.files ?? [])
        .filter((f: BriefingFile) => DATED.test(f.name))
        .sort((a: BriefingFile, b: BriefingFile) => b.name.localeCompare(a.name))
        .slice(0, 8);
        setBriefings(sorted);
        const count = sorted.filter((f: BriefingFile) => new Date(f.modified).getTime() > ts).length;
        setNewCount(count);
        if (count > 0 && window.innerWidth < 768 && !sessionStorage.getItem("toastShown")) {
          setShowToast(true);
          sessionStorage.setItem("toastShown", "1");
        }
      } catch {}
    };
    load();
  }, []);

  const isNew = (f: BriefingFile) => new Date(f.modified).getTime() > lastSeen;

  const card = {
    background: "#141720", border: "1px solid #1e2128",
    borderRadius: 12, padding: "16px 20px",
  };

  return (
    <div style={{ padding: "20px 24px", maxWidth: 960, margin: "0 auto" }}>
      {/* Hero */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: isMobile ? 22 : 28, fontWeight: 700, letterSpacing: "-0.5px", color: "#f0f2f5" }}>{now}</h1>
        <p style={{ fontSize: 14, color: "#8b90a0", marginTop: 4 }}>Dein persönliches Ops-Dashboard.</p>
      </div>

      {/* Quick Actions */}
      <div style={{ display: "flex", gap: 8, marginBottom: showCapture ? 12 : 24, flexWrap: "wrap" }}>
        {[
          { label: "+ Task", onClick: () => setShowCapture(v => !v) },
          { label: "💬 Hatti", onClick: () => router.push("/hatti") },
          { label: "📄 Briefings", onClick: () => router.push("/docs") },
        ].map(a => (
          <button key={a.label} onClick={a.onClick} style={{
            padding: "7px 16px", borderRadius: 999, fontSize: 13, fontWeight: 500,
            background: a.label === "+ Task" && showCapture ? "#10B98120" : "#1a1d27",
            border: `1px solid ${a.label === "+ Task" && showCapture ? "#10B98150" : "#1e2128"}`,
            color: a.label === "+ Task" && showCapture ? "#10B981" : "#c8ccd6",
            cursor: "pointer", transition: "all 0.15s",
          }}
            onMouseEnter={e => { e.currentTarget.style.background = "#22263a"; e.currentTarget.style.color = "#f0f2f5"; }}
            onMouseLeave={e => {
              e.currentTarget.style.background = a.label === "+ Task" && showCapture ? "#10B98120" : "#1a1d27";
              e.currentTarget.style.color = a.label === "+ Task" && showCapture ? "#10B981" : "#c8ccd6";
            }}>
            {a.label}
          </button>
        ))}
      </div>

      {/* Capture Pill */}
      {showCapture && (
        <div style={{ marginBottom: 24 }}>
          <CapturePill
            onSave={async (title, project) => {
              await fetch("/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, project }) });
            }}
            onClose={() => setShowCapture(false)}
            projects={["Allgemein", ...projects.map(p => p.name)]}
          />
        </div>
      )}

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Neue Briefings", value: newCount > 0 ? String(newCount) : "–", sub: "seit letztem Besuch", accent: newCount > 0 },
          { label: "Mission Control", value: "Online", sub: "mc.mehlhart.de", accent: true },
          { label: "Briefings gesamt", value: String(briefings.length), sub: "im Archiv" },
        ].map(s => (
          <div key={s.label} style={{ ...card }}>
            <div style={{ fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: "#4a5068", marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: s.accent ? "#10B981" : "#f0f2f5", lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 11, color: "#4a5068", marginTop: 6 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Fresh Briefings */}
      {briefings.length > 0 && (
        <div style={card}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: "#4a5068" }}>Neueste Briefings</span>
            <button onClick={() => router.push("/docs")} style={{ fontSize: 12, color: "#10B981", background: "none", border: "none", cursor: "pointer" }}>
              Alle →
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {briefings.map(f => {
              const { title, date } = formatFilename(f.name);
              const cat = detectCategory(f.name);
              return (
                <button key={f.path} onClick={() => router.push(`/docs?file=${encodeURIComponent(f.name)}`)} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "9px 12px", borderRadius: 8, textAlign: "left",
                  background: "none", border: "none", cursor: "pointer", width: "100%",
                  transition: "background 0.12s",
                }}
                  onMouseEnter={e => e.currentTarget.style.background = "#1a1d27"}
                  onMouseLeave={e => e.currentTarget.style.background = "none"}>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>{CATEGORY_META[cat].emoji}</span>
                  <span style={{ flex: 1, fontSize: 13.5, fontWeight: 500, color: "#c8ccd6", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</span>
                  {isNew(f) && <span style={{ fontSize: 10, fontWeight: 700, color: "#f87171", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 999, padding: "2px 6px", flexShrink: 0 }}>NEU</span>}
                  <span style={{ fontSize: 11, color: "#4a5068", flexShrink: 0 }}>{date}</span>
                  <span style={{ fontSize: 12, color: "#2a2d38" }}>→</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Mobile Toast */}
      {showToast && isMobile && (
        <div style={{
          position: "fixed", bottom: 20, left: 16, right: 16, zIndex: 200,
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
          padding: "12px 16px", borderRadius: 14,
          background: "rgba(20,23,32,0.97)", border: "1px solid #2a2d38",
          boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
        }}>
          <span style={{ fontSize: 13, color: "#c8ccd6" }}>📄 <strong style={{ color: "#f0f2f5" }}>{newCount} neue</strong> Briefing{newCount !== 1 ? "s" : ""}</span>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => { setShowToast(false); router.push("/docs"); }} style={{ padding: "6px 12px", borderRadius: 8, background: "#10B981", border: "none", color: "white", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              Anzeigen
            </button>
            <button onClick={() => setShowToast(false)} style={{ padding: "6px 10px", borderRadius: 8, background: "#1e2128", border: "none", color: "#8b90a0", fontSize: 12, cursor: "pointer" }}>✕</button>
          </div>
        </div>
      )}
    </div>
  );
}
