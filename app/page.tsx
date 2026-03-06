"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { detectCategory, CATEGORY_META } from "@/lib/categories";

type BriefingFile = { name: string; path: string; modified: string };

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
  const [lastSeen, setLastSeen] = useState(0);
  const [showToast, setShowToast] = useState(false);
  const [newCount, setNewCount] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const ts = parseInt(localStorage.getItem("lastSeenTimestamp") ?? "0", 10);
    setLastSeen(ts);

    const load = async () => {
      try {
        const res = await fetch("/api/briefings", { cache: "no-store" });
        const data = await res.json();
        const sorted = (data.files ?? []).sort((a: BriefingFile, b: BriefingFile) =>
          b.name.localeCompare(a.name)
        ).slice(0, 8);
        setBriefings(sorted);

        const count = sorted.filter((f: BriefingFile) => new Date(f.modified).getTime() > ts).length;
        setNewCount(count);

        // Mobile toast — once per session
        if (count > 0 && isMobile && !sessionStorage.getItem("toastShown")) {
          setShowToast(true);
          sessionStorage.setItem("toastShown", "1");
        }
      } catch {}
    };
    load();
  }, [isMobile]);

  const goToDocs = (file?: BriefingFile) => {
    setShowToast(false);
    if (file) router.push(`/docs?file=${encodeURIComponent(file.name)}`);
    else router.push("/docs");
  };

  const isNew = (file: BriefingFile) => new Date(file.modified).getTime() > lastSeen;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold text-slate-50">Dashboard</h1>
        <p className="mt-2 text-sm text-slate-400">Dein persönliches Mission Control.</p>
      </header>

      {/* Fresh Briefings Card */}
      {briefings.length > 0 && (
        <Card className="border-slate-800/60 bg-slate-900/40 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="text-xs uppercase tracking-[0.3em] text-slate-500">Neueste Briefings</div>
            <button
              onClick={() => goToDocs()}
              className="text-xs text-emerald-400 hover:text-emerald-300 transition"
            >
              Alle anzeigen →
            </button>
          </div>
          <div className="space-y-2">
            {briefings.map(file => {
              const { title, date } = formatFilename(file.name);
              const cat = detectCategory(file.name);
              return (
                <button
                  key={file.path}
                  onClick={() => goToDocs(file)}
                  className="w-full flex items-center gap-3 rounded-lg border border-slate-800/60 bg-slate-950/30 px-3 py-2.5 text-left hover:border-slate-700/60 hover:bg-slate-900/60 transition"
                >
                  <span className="text-base">{CATEGORY_META[cat].emoji}</span>
                  <span className="flex-1 text-sm text-slate-200 font-medium truncate">{title}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    {isNew(file) && (
                      <span className="rounded-full bg-red-500/20 border border-red-500/30 px-1.5 py-0.5 text-[10px] text-red-300 font-bold">NEU</span>
                    )}
                    <span className="text-xs text-slate-500">{date}</span>
                    <span className="text-slate-600 text-xs">→</span>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Card className="border-slate-800/60 bg-slate-900/40 p-4">
          <div className="text-xs uppercase tracking-[0.3em] text-slate-500">Briefings</div>
          <div className="mt-2 text-2xl font-semibold text-slate-50">{briefings.length > 0 ? "✓" : "–"}</div>
          <div className="mt-1 text-xs text-slate-500">Live aus Dashboard-Repo</div>
        </Card>
        <Card className="border-slate-800/60 bg-slate-900/40 p-4">
          <div className="text-xs uppercase tracking-[0.3em] text-slate-500">Mission Control</div>
          <div className="mt-2 text-2xl font-semibold text-emerald-400">Online</div>
          <div className="mt-1 text-xs text-slate-500">mc.mehlhart.de</div>
        </Card>
        <Card className="border-slate-800/60 bg-slate-900/40 p-4 col-span-2 sm:col-span-1">
          <div className="text-xs uppercase tracking-[0.3em] text-slate-500">Neue Briefings</div>
          <div className="mt-2 text-2xl font-semibold text-slate-50">{newCount > 0 ? newCount : "–"}</div>
          <div className="mt-1 text-xs text-slate-500">seit letztem Besuch</div>
        </Card>
      </div>

      {/* Mobile Toast */}
      {showToast && isMobile && (
        <div className="fixed bottom-6 left-4 right-4 z-50 flex items-center justify-between gap-3 rounded-2xl border border-slate-700/60 bg-slate-800/95 px-4 py-3 shadow-2xl backdrop-blur animate-in slide-in-from-bottom-4">
          <span className="text-sm text-slate-200">
            📄 <strong>{newCount} neue</strong> Briefing{newCount !== 1 ? "s" : ""} seit deinem letzten Besuch
          </span>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => goToDocs()}
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white"
            >
              Anzeigen
            </button>
            <button
              onClick={() => setShowToast(false)}
              className="rounded-lg border border-slate-700 px-2 py-1.5 text-xs text-slate-400"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
