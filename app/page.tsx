"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { detectCategory, CATEGORY_META } from "@/lib/categories";
import { CapturePill } from "@/components/capture-pill";

type BriefingFile = { name: string; path: string; modified: string };
type Project = { id: string; name: string; color: string };
type Deal = { id: string; accountName?: string; accountColor?: string; title: string; value?: number; stage: string; probability: number };
type Account = { id: string; name: string; color: string; lastActivityAt?: string; pipelineValue?: number };
type CalendarEvent = {
  id: string;
  summary: string;
  start: string;
  end: string;
  linkedPeople: { id: string; name: string }[];
  linkedProject?: { id: string; name: string; color: string };
  linkedAccount?: { id: string; name: string; color: string };
};
type Task = { id: string; title: string; project: string; status: "todo" | "done"; createdAt?: string };

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
  const [tasks, setTasks] = useState<Task[]>([]);
  const [lastSeen, setLastSeen] = useState(0);
  const [showToast, setShowToast] = useState(false);
  const [newCount, setNewCount] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [now, setNow] = useState("");
  const [showCapture, setShowCapture] = useState(false);
  const [todayEvents, setTodayEvents] = useState<CalendarEvent[]>([]);
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    const d = new Date();
    const h = d.getHours();
    const greeting = h < 12 ? "Guten Morgen" : h < 18 ? "Guten Tag" : "Guten Abend";
    setNow(`${greeting}, Daniel. ${d.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" })}`);
    setAnimateIn(true);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const ts = parseInt(localStorage.getItem("lastSeenTimestamp") ?? "0", 10);
    setLastSeen(ts);

    const load = async () => {
      try {
        const [res, projRes, dealRes, accRes, taskRes] = await Promise.all([
          fetch("/api/briefings", { cache: "no-store" }),
          fetch("/api/projects", { cache: "no-store" }),
          fetch("/api/deals", { cache: "no-store" }),
          fetch("/api/accounts", { cache: "no-store" }),
          fetch("/api/tasks", { cache: "no-store" }),
        ]);
        const data = await res.json();
        const projData = await projRes.json();
        const dealData = await dealRes.json();
        const accData = await accRes.json();
        const taskData = await taskRes.json();

        setProjects(projData.projects ?? []);
        setDeals(dealData.deals ?? []);
        setAccounts(accData.accounts ?? []);
        setTasks(taskData.tasks ?? []);

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
    const onVisible = () => {
      if (document.visibilityState === "visible") load();
    };
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
  const newBriefings = briefings.filter(isNew).slice(0, 3);
  const openTasks = tasks.filter(t => t.status === "todo");
  const urgentTasks = useMemo(() => {
    const urgentRegex = /(urgent|asap|heute|today|kritisch|blocker|!)/i;
    return openTasks
      .filter(task => {
        const ageDays = task.createdAt
          ? (Date.now() - new Date(task.createdAt).getTime()) / (1000 * 60 * 60 * 24)
          : 0;
        return urgentRegex.test(task.title) || ageDays >= 3;
      })
      .slice(0, 4);
  }, [openTasks]);

  const openDeals = deals.filter(d => !d.stage.startsWith("closed-"));
  const totalPipeline = openDeals.reduce((s, d) => s + (d.value ?? 0), 0);
  const weightedPipeline = openDeals.reduce((s, d) => s + (d.value ?? 0) * d.probability / 100, 0);

  const staleAccounts = accounts.filter(a => {
    if (a.lastActivityAt) {
      const days = Math.floor((Date.now() - new Date(a.lastActivityAt).getTime()) / (1000 * 60 * 60 * 24));
      return days > 7 && (a.pipelineValue ?? 0) > 0;
    }
    return (a.pipelineValue ?? 0) > 0;
  }).slice(0, 4);

  const cardBase = {
    background: "#141720",
    border: "1px solid #1e2128",
    borderRadius: 14,
    padding: "16px 18px",
    boxShadow: "0 12px 28px rgba(0,0,0,0.25)",
  } as const;

  const entryStyle = (index: number) => ({
    opacity: animateIn ? 1 : 0,
    transform: animateIn ? "translateY(0)" : "translateY(14px)",
    transition: `opacity 420ms ease ${index * 80}ms, transform 420ms ease ${index * 80}ms`,
  });

  return (
    <div style={{ padding: "20px 24px", maxWidth: 1240, margin: "0 auto" }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: isMobile ? 22 : 28, fontWeight: 700, letterSpacing: "-0.5px", color: "#f0f2f5" }}>{now}</h1>
        <p style={{ fontSize: 14, color: "#8b90a0", marginTop: 4 }}>Dein persönliches Ops-Dashboard.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-12 lg:gap-5">
        <section className="lg:col-span-7 xl:col-span-8 flex flex-col gap-4">
          <div style={{ ...cardBase, ...entryStyle(0) }}>
            <div style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "#4a5068", marginBottom: 10 }}>Heute auf einen Blick</div>
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", borderRadius: 10, background: "#0f1219", border: "1px solid #1e2128" }}>
                <span style={{ color: "#c8ccd6", fontSize: 13 }}>Heute Events</span>
                <strong style={{ color: "#a78bfa", fontSize: 16 }}>{todayEvents.length}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", borderRadius: 10, background: "#0f1219", border: "1px solid #1e2128" }}>
                <span style={{ color: "#c8ccd6", fontSize: 13 }}>Urgent Tasks</span>
                <strong style={{ color: urgentTasks.length ? "#f59e0b" : "#f0f2f5", fontSize: 16 }}>{urgentTasks.length}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", borderRadius: 10, background: "#0f1219", border: "1px solid #1e2128" }}>
                <span style={{ color: "#c8ccd6", fontSize: 13 }}>Neue Briefings</span>
                <strong style={{ color: newCount ? "#10B981" : "#f0f2f5", fontSize: 16 }}>{newCount}</strong>
              </div>
            </div>
          </div>

          <div style={{ ...cardBase, ...entryStyle(1) }}>
            <div style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "#4a5068", marginBottom: 10 }}>Quick Actions</div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                { icon: "⚡", title: "Task erfassen", helper: "Neue Aufgabe in Sekunden", onClick: () => setShowCapture(v => !v), active: showCapture },
                { icon: "💬", title: "Hatti öffnen", helper: "Kommandos & Notizen", onClick: () => router.push("/hatti") },
                { icon: "📄", title: "Briefings lesen", helper: `${newCount} neue seit letztem Besuch`, onClick: () => router.push("/docs") },
              ].map((action, index) => (
                <button
                  key={action.title}
                  onClick={action.onClick}
                  style={{
                    textAlign: "left",
                    borderRadius: 12,
                    border: `1px solid ${action.active ? "#10B98170" : "#262b38"}`,
                    background: action.active ? "#10B98118" : "#171b26",
                    padding: "12px 14px",
                    minHeight: 88,
                    boxShadow: "0 8px 20px rgba(0,0,0,0.2)",
                    cursor: "pointer",
                    ...entryStyle(index + 2),
                  }}
                >
                  <div style={{ fontSize: 20, marginBottom: 8 }}>{action.icon}</div>
                  <div style={{ color: "#f0f2f5", fontWeight: 600, fontSize: 14 }}>{action.title}</div>
                  <div style={{ color: "#8b90a0", fontSize: 12, marginTop: 3 }}>{action.helper}</div>
                </button>
              ))}
            </div>
          </div>

          {showCapture && (
            <div style={{ ...cardBase, ...entryStyle(5) }}>
              <CapturePill
                onSave={async (title, project) => {
                  await fetch("/api/tasks", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ title, project }),
                  });
                }}
                onClose={() => setShowCapture(false)}
                projects={["Allgemein", ...projects.map(p => p.name)]}
              />
            </div>
          )}

          <div style={{ ...cardBase, ...entryStyle(6) }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "#a78bfa" }}>Today Events</span>
              <button onClick={() => router.push("/calendar")} style={{ fontSize: 12, color: "#10B981", background: "none", border: "none", cursor: "pointer" }}>Kalender →</button>
            </div>
            {todayEvents.length === 0 ? (
              <p style={{ color: "#8b90a0", fontSize: 13 }}>Keine Events für heute.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {todayEvents.slice(0, 4).map(ev => {
                  const time = ev.start.includes("T")
                    ? new Date(ev.start).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })
                    : "Ganztag";
                  return (
                    <div key={ev.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 10, background: "#0f1219", border: "1px solid #1e2128" }}>
                      <span style={{ minWidth: 50, color: "#a78bfa", fontWeight: 600, fontSize: 12 }}>{time}</span>
                      <span style={{ color: "#c8ccd6", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ev.summary}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{ ...cardBase, ...entryStyle(7) }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "#f59e0b" }}>Critical Actions</span>
              <button onClick={() => router.push("/tasks")} style={{ fontSize: 12, color: "#10B981", background: "none", border: "none", cursor: "pointer" }}>Alle Tasks →</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {urgentTasks.length === 0 && staleAccounts.length === 0 && <p style={{ color: "#8b90a0", fontSize: 13 }}>Keine kritischen Aktionen offen.</p>}
              {urgentTasks.map(task => (
                <button key={task.id} onClick={() => router.push("/tasks")} style={{ background: "#0f1219", border: "1px solid #2e2516", color: "#f1dfbc", borderRadius: 10, textAlign: "left", padding: "9px 11px", fontSize: 13, cursor: "pointer" }}>
                  ⚠️ {task.title}
                </button>
              ))}
              {staleAccounts.map(account => (
                <button key={account.id} onClick={() => router.push(`/accounts/${account.id}`)} style={{ background: "#0f1219", border: "1px solid #2a2d38", color: "#c8ccd6", borderRadius: 10, textAlign: "left", padding: "9px 11px", fontSize: 13, cursor: "pointer" }}>
                  ↺ Follow-up: {account.name}
                </button>
              ))}
            </div>
          </div>
        </section>

        <aside className="lg:col-span-5 xl:col-span-4 flex flex-col gap-4">
          <div style={{ ...cardBase, ...entryStyle(8) }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "#4a5068" }}>Neueste Briefings</span>
              <button onClick={() => router.push("/docs")} style={{ fontSize: 12, color: "#10B981", background: "none", border: "none", cursor: "pointer" }}>Alle →</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {briefings.slice(0, 6).map(f => {
                const { title, date } = formatFilename(f.name);
                const cat = detectCategory(f.name);
                return (
                  <button
                    key={f.path}
                    onClick={() => router.push(`/docs?file=${encodeURIComponent(f.name)}`)}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8, textAlign: "left", background: "none", border: "none", cursor: "pointer", width: "100%" }}
                  >
                    <span style={{ fontSize: 15 }}>{CATEGORY_META[cat].emoji}</span>
                    <span style={{ flex: 1, fontSize: 13, color: "#c8ccd6", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{title}</span>
                    {isNew(f) && <span style={{ fontSize: 10, color: "#f87171", border: "1px solid rgba(239,68,68,0.2)", padding: "2px 6px", borderRadius: 999 }}>NEU</span>}
                    <span style={{ fontSize: 11, color: "#4a5068" }}>{date}</span>
                  </button>
                );
              })}
              {briefings.length === 0 && <p style={{ color: "#8b90a0", fontSize: 13 }}>Keine Briefings gefunden.</p>}
            </div>
          </div>

          <div style={{ ...cardBase, ...entryStyle(9) }}>
            <div style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "#4a5068", marginBottom: 10 }}>Pipeline Snapshot</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div style={{ background: "#0f1219", border: "1px solid #1e2128", borderRadius: 10, padding: "10px" }}>
                <div style={{ fontSize: 11, color: "#8b90a0" }}>Open Volume</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#f0f2f5" }}>{totalPipeline ? `€${totalPipeline.toLocaleString("de-DE")}` : "–"}</div>
              </div>
              <div style={{ background: "#0f1219", border: "1px solid #1e2128", borderRadius: 10, padding: "10px" }}>
                <div style={{ fontSize: 11, color: "#8b90a0" }}>Weighted</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#10B981" }}>{weightedPipeline ? `€${Math.round(weightedPipeline).toLocaleString("de-DE")}` : "–"}</div>
              </div>
            </div>
          </div>

          <div style={{ ...cardBase, ...entryStyle(10) }}>
            <div style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "#4a5068", marginBottom: 10 }}>Fresh Activity</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {newBriefings.map(b => (
                <div key={b.path} style={{ background: "#0f1219", border: "1px solid #1e2128", borderRadius: 10, padding: "8px 10px", fontSize: 12, color: "#c8ccd6" }}>
                  📄 Neues Briefing: {formatFilename(b.name).title}
                </div>
              ))}
              {openTasks.slice(0, 2).map(t => (
                <div key={t.id} style={{ background: "#0f1219", border: "1px solid #1e2128", borderRadius: 10, padding: "8px 10px", fontSize: 12, color: "#c8ccd6" }}>
                  ✅ Offen: {t.title}
                </div>
              ))}
              {newBriefings.length === 0 && openTasks.length === 0 && <p style={{ color: "#8b90a0", fontSize: 13 }}>Aktuell keine neue Aktivität.</p>}
            </div>
          </div>
        </aside>
      </div>

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
