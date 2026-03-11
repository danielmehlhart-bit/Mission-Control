"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { detectCategory, CATEGORY_META } from "@/lib/categories";
import { CapturePill } from "@/components/capture-pill";

type BriefingFile = { name: string; path: string; modified: string };
type Project = { id: string; name: string; color: string };
type Deal = { id: string; accountName?: string; accountColor?: string; title: string; value?: number; stage: string; probability: number; };
type Account = { id: string; name: string; color: string; lastActivityAt?: string; pipelineValue?: number; };
type CalendarEvent = {
  id: string; summary: string; start: string; end: string;
  linkedPeople: { id: string; name: string }[];
  linkedProject?: { id: string; name: string; color: string };
  linkedAccount?: { id: string; name: string; color: string };
};

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
  const [deals, setDeals] = useState<Deal[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [lastSeen, setLastSeen] = useState(0);
  const [showToast, setShowToast] = useState(false);
  const [newCount, setNewCount] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [now, setNow] = useState("");
  const [showCapture, setShowCapture] = useState(false);
  const [todayEvents, setTodayEvents] = useState<CalendarEvent[]>([]);

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
        const [res, projRes, dealRes, accRes] = await Promise.all([
          fetch("/api/briefings", { cache: "no-store" }),
          fetch("/api/projects", { cache: "no-store" }),
          fetch("/api/deals", { cache: "no-store" }),
          fetch("/api/accounts", { cache: "no-store" }),
        ]);
        const data = await res.json();
        const projData = await projRes.json();
        const dealData = await dealRes.json();
        const accData = await accRes.json();
        setProjects(projData.projects ?? []);
        setDeals(dealData.deals ?? []);
        setAccounts(accData.accounts ?? []);
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

    // Re-fetch wenn Tab wieder aktiv wird (Router Cache Workaround + Hintergrund-Updates)
    const onVisible = () => { if (document.visibilityState === "visible") load(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  useEffect(() => {
    fetch("/api/calendar", { cache: "no-store" })
      .then(r => r.json())
      .then(d => {
        if (d.disabled) return;
        const todayStr = new Date().toISOString().slice(0, 10);
        const today = (d.events as CalendarEvent[]).filter(e => e.start.startsWith(todayStr));
        setTodayEvents(today);
      })
      .catch(() => {});
  }, []);

  const isNew = (f: BriefingFile) => new Date(f.modified).getTime() > lastSeen;

  const card = {
    background: "var(--surface-1)", border: "1px solid var(--border-strong)",
    borderRadius: 12, padding: "16px 20px",
  };

  return (
    <div style={{ padding: "20px 24px", maxWidth: 960, margin: "0 auto" }}>
      {/* Hero */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: isMobile ? 22 : 28, fontWeight: 700, letterSpacing: "-0.5px", color: "var(--text-1)" }}>{now}</h1>
        <p style={{ fontSize: 14, color: "var(--text-2)", marginTop: 4 }}>Dein persönliches Ops-Dashboard.</p>
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
            background: a.label === "+ Task" && showCapture ? "color-mix(in srgb, var(--accent) 18%, transparent)" : "var(--surface-2)",
            border: `1px solid ${a.label === "+ Task" && showCapture ? "color-mix(in srgb, var(--accent) 45%, transparent)" : "var(--border-strong)"}`,
            color: a.label === "+ Task" && showCapture ? "var(--accent)" : "var(--text-2)",
            cursor: "pointer", transition: "all 0.15s",
          }}
            onMouseEnter={e => { e.currentTarget.style.background = "var(--surface-3)"; e.currentTarget.style.color = "var(--text-1)"; }}
            onMouseLeave={e => {
              e.currentTarget.style.background = a.label === "+ Task" && showCapture ? "color-mix(in srgb, var(--accent) 18%, transparent)" : "var(--surface-2)";
              e.currentTarget.style.color = a.label === "+ Task" && showCapture ? "var(--accent)" : "var(--text-2)";
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

      {/* Pipeline Stats */}
      {(() => {
        const openDeals = deals.filter(d => !d.stage.startsWith("closed-"));
        const totalPipeline = openDeals.reduce((s, d) => s + (d.value ?? 0), 0);
        const weightedPipeline = openDeals.reduce((s, d) => s + ((d.value ?? 0) * d.probability / 100), 0);
        const wonDeals = deals.filter(d => d.stage === "closed-won");
        const wonValue = wonDeals.reduce((s, d) => s + (d.value ?? 0), 0);
        return (
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
            {[
              { label: "Pipeline", value: totalPipeline > 0 ? `€${totalPipeline.toLocaleString("de-DE")}` : "–", sub: `${openDeals.length} open deals`, accent: totalPipeline > 0 },
              { label: "Weighted", value: weightedPipeline > 0 ? `€${Math.round(weightedPipeline).toLocaleString("de-DE")}` : "–", sub: "expected revenue" },
              { label: "Won", value: wonValue > 0 ? `€${wonValue.toLocaleString("de-DE")}` : "–", sub: `${wonDeals.length} deals closed`, accent: wonValue > 0 },
              { label: "Briefings", value: newCount > 0 ? String(newCount) : "–", sub: newCount > 0 ? "neue seit letztem Besuch" : `${briefings.length} im Archiv`, accent: newCount > 0 },
            ].map(s => (
              <div key={s.label} style={{ ...card }}>
                <div style={{ fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--text-3)", marginBottom: 8 }}>{s.label}</div>
                <div style={{ fontSize: 26, fontWeight: 700, color: s.accent ? "var(--accent)" : "var(--text-1)", lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 6 }}>{s.sub}</div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Follow-up Nudges */}
      {(() => {
        const stale = accounts.filter(a => {
          if (a.lastActivityAt) {
            const days = Math.floor((Date.now() - new Date(a.lastActivityAt).getTime()) / (1000 * 60 * 60 * 24));
            return days > 7 && (a.pipelineValue ?? 0) > 0;
          }
          return (a.pipelineValue ?? 0) > 0;
        }).slice(0, 4);
        if (stale.length === 0) return null;
        return (
          <div style={{ ...card, marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={{ fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--state-warning)" }}>Follow-Up Needed</span>
              <button onClick={() => router.push("/accounts")} style={{ fontSize: 12, color: "var(--accent)", background: "none", border: "none", cursor: "pointer" }}>All Accounts →</button>
            </div>
            {stale.map(a => {
              const days = a.lastActivityAt ? Math.floor((Date.now() - new Date(a.lastActivityAt).getTime()) / (1000 * 60 * 60 * 24)) : null;
              return (
                <button key={a.id} onClick={() => router.push(`/accounts/${a.id}`)} style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 8,
                  background: "none", border: "none", cursor: "pointer", width: "100%", textAlign: "left",
                  transition: "background 0.12s",
                }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--surface-2)"}
                  onMouseLeave={e => e.currentTarget.style.background = "none"}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: days !== null && days > 21 ? "var(--state-danger)" : "var(--state-warning)", flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-2)", flex: 1 }}>{a.name}</span>
                  <span style={{ fontSize: 11, color: days !== null && days > 21 ? "var(--state-danger)" : "var(--state-warning)" }}>
                    {days !== null ? `${days}d ago` : "No activity"}
                  </span>
                  <span style={{ fontSize: 12, color: "var(--surface-3)" }}>→</span>
                </button>
              );
            })}
          </div>
        );
      })()}

      {/* Heute — Calendar Widget */}
      {todayEvents.length > 0 && (
        <div style={{ ...card, marginBottom: 24 }}>
          <div style={{ fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--text-3)", marginBottom: 12 }}>
            📅 Heute
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {todayEvents.slice(0, 3).map(ev => {
              const time = ev.start.includes("T")
                ? new Date(ev.start).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })
                : "Ganztag";
              return (
                <div key={ev.id} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "8px 12px", borderRadius: 8, background: "var(--surface-0)",
                  border: "1px solid var(--border-strong)",
                }}>
                  <span style={{
                    fontSize: 11, fontWeight: 600, color: "var(--state-info)",
                    minWidth: 46, flexShrink: 0,
                  }}>{time}</span>
                  <span style={{ flex: 1, fontSize: 13, color: "var(--text-2)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {ev.summary}
                  </span>
                  {ev.linkedPeople.length > 0 && (
                    <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                      {ev.linkedPeople.slice(0, 2).map(p => (
                        <span key={p.id} style={{
                          fontSize: 10, padding: "2px 7px", borderRadius: 999,
                          background: "var(--surface-2)", color: "var(--text-2)", border: "1px solid var(--border-strong)",
                        }}>{p.name.split(" ")[0]}</span>
                      ))}
                    </div>
                  )}
                  {ev.linkedAccount && (
                    <span
                      onClick={() => router.push(`/accounts/${ev.linkedAccount!.id}`)}
                      style={{
                        fontSize: 10, padding: "2px 7px", borderRadius: 999,
                        background: `${ev.linkedAccount.color}20`,
                        color: ev.linkedAccount.color,
                        border: `1px solid ${ev.linkedAccount.color}40`,
                        flexShrink: 0, cursor: "pointer",
                      }}
                    >{ev.linkedAccount.name}</span>
                  )}
                  {!ev.linkedAccount && ev.linkedProject && (
                    <span style={{
                      fontSize: 10, padding: "2px 7px", borderRadius: 999,
                      background: `${ev.linkedProject.color}20`,
                      color: ev.linkedProject.color,
                      border: `1px solid ${ev.linkedProject.color}40`,
                      flexShrink: 0,
                    }}>{ev.linkedProject.name}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Fresh Briefings */}
      {briefings.length > 0 && (
        <div style={card}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--text-3)" }}>Neueste Briefings</span>
            <button onClick={() => router.push("/docs")} style={{ fontSize: 12, color: "var(--accent)", background: "none", border: "none", cursor: "pointer" }}>
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
                  onMouseEnter={e => e.currentTarget.style.background = "var(--surface-2)"}
                  onMouseLeave={e => e.currentTarget.style.background = "none"}>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>{CATEGORY_META[cat].emoji}</span>
                  <span style={{ flex: 1, fontSize: 13.5, fontWeight: 500, color: "var(--text-2)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</span>
                  {isNew(f) && <span style={{ fontSize: 10, fontWeight: 700, color: "var(--state-danger)", background: "color-mix(in srgb, var(--state-danger) 15%, transparent)", border: "1px solid color-mix(in srgb, var(--state-danger) 26%, transparent)", borderRadius: 999, padding: "2px 6px", flexShrink: 0 }}>NEU</span>}
                  <span style={{ fontSize: 11, color: "var(--text-3)", flexShrink: 0 }}>{date}</span>
                  <span style={{ fontSize: 12, color: "var(--surface-3)" }}>→</span>
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
          background: "color-mix(in srgb, var(--surface-1) 97%, transparent)", border: "1px solid var(--surface-3)",
          boxShadow: "var(--shadow-strong)",
        }}>
          <span style={{ fontSize: 13, color: "var(--text-2)" }}>📄 <strong style={{ color: "var(--text-1)" }}>{newCount} neue</strong> Briefing{newCount !== 1 ? "s" : ""}</span>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => { setShowToast(false); router.push("/docs"); }} style={{ padding: "6px 12px", borderRadius: 8, background: "var(--accent)", border: "none", color: "white", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              Anzeigen
            </button>
            <button onClick={() => setShowToast(false)} style={{ padding: "6px 10px", borderRadius: 8, background: "var(--border-strong)", border: "none", color: "var(--text-2)", fontSize: 12, cursor: "pointer" }}>✕</button>
          </div>
        </div>
      )}
    </div>
  );
}
