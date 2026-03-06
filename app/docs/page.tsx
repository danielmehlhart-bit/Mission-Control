"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { detectCategory, CATEGORY_META, type CategoryKey } from "@/lib/categories";

type BriefingFile = {
  name: string;
  path: string;
  modified: string;
};

function formatFilename(name: string): { title: string; date: string } {
  const match = name.match(/^(\d{4}-\d{2}-\d{2})-(.+)\.html$/);
  if (match) {
    const [, dateStr, slug] = match;
    const date = new Date(dateStr).toLocaleDateString("de-DE", {
      day: "numeric", month: "short", year: "numeric",
    });
    const title = slug.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    return { title, date };
  }
  return { title: name.replace(".html", ""), date: "" };
}

const CATEGORY_TABS: CategoryKey[] = ["all", "morning", "podcast", "projekt", "research", "training", "security", "sonstige"];

export default function DocsPage() {
  const searchParams = useSearchParams();

  const [files, setFiles] = useState<BriefingFile[]>([]);
  const [selected, setSelected] = useState<BriefingFile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [activeTab, setActiveTab] = useState<CategoryKey>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("docsTab") as CategoryKey) ?? "all";
    }
    return "all";
  });
  const [lastSeen, setLastSeen] = useState(0);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Mark as seen
  useEffect(() => {
    const ts = parseInt(localStorage.getItem("lastSeenTimestamp") ?? "0", 10);
    setLastSeen(ts);
    localStorage.setItem("lastSeenTimestamp", Date.now().toString());
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/briefings", { cache: "no-store" });
        const data = await res.json();
        const sorted = (data.files ?? []).sort((a: BriefingFile, b: BriefingFile) =>
          b.name.localeCompare(a.name)
        );
        setFiles(sorted);

        // Auto-select via URL param or first file
        const fileParam = searchParams.get("file");
        if (fileParam) {
          const found = sorted.find((f: BriefingFile) => f.name === fileParam || f.path === fileParam);
          if (found) { setSelected(found); return; }
        }
        if (sorted.length) setSelected(sorted[0]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [searchParams]);

  const filtered = activeTab === "all"
    ? files
    : files.filter(f => detectCategory(f.name) === activeTab);

  const categoryCounts = CATEGORY_TABS.reduce((acc, cat) => {
    acc[cat] = cat === "all" ? files.length : files.filter(f => detectCategory(f.name) === cat).length;
    return acc;
  }, {} as Record<CategoryKey, number>);

  const handleTabChange = (tab: CategoryKey) => {
    setActiveTab(tab);
    localStorage.setItem("docsTab", tab);
  };

  const rawUrl = selected
    ? `/api/briefings?file=${encodeURIComponent(selected.path)}&raw=1`
    : null;

  const handleSelect = (file: BriefingFile) => {
    const url = `/api/briefings?file=${encodeURIComponent(file.path)}&raw=1`;
    if (isMobile) window.open(url, "_blank");
    else setSelected(file);
  };

  const isNew = (file: BriefingFile) => new Date(file.modified).getTime() > lastSeen;

  // Tab bar
  const TabBar = () => (
    <div className="flex flex-wrap gap-1.5 mb-4">
      {CATEGORY_TABS.filter(tab => categoryCounts[tab] > 0 || tab === "all").map(tab => {
        const meta = CATEGORY_META[tab];
        const active = activeTab === tab;
        return (
          <button
            key={tab}
            onClick={() => handleTabChange(tab)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
              active
                ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-200"
                : "border-slate-700/60 text-slate-400 hover:border-slate-600 hover:text-slate-200"
            }`}
          >
            {meta.emoji} {meta.label}
            {categoryCounts[tab] > 0 && (
              <span className="ml-1.5 rounded-full bg-slate-700/70 px-1.5 py-0.5 text-[10px]">
                {categoryCounts[tab]}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-slate-50">Docs Browser</h1>
          <p className="mt-2 text-sm text-slate-400">
            {isMobile ? "Tippe ein Briefing zum Öffnen." : "HTML briefings aus dem Workspace."}
          </p>
        </div>
        <Badge className="border-slate-700 bg-slate-800 text-slate-200">{files.length} docs</Badge>
      </header>

      <TabBar />

      {isMobile ? (
        <div className="space-y-2">
          {loading ? (
            <div className="text-sm text-slate-400 px-1">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="text-sm text-slate-500 px-1">Keine Briefings in dieser Kategorie.</div>
          ) : (
            filtered.map(file => {
              const { title, date } = formatFilename(file.name);
              const cat = detectCategory(file.name);
              return (
                <button
                  key={file.path}
                  className="w-full rounded-xl border border-slate-800/70 bg-slate-900/50 px-4 py-3 text-left active:bg-slate-800/60 transition"
                  onClick={() => handleSelect(file)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-slate-100 text-sm">{title}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {isNew(file) && (
                        <span className="rounded-full bg-red-500/20 border border-red-500/30 px-1.5 py-0.5 text-[10px] text-red-300">NEU</span>
                      )}
                      <span className="text-xs text-slate-400">{CATEGORY_META[cat].emoji}</span>
                    </div>
                  </div>
                  {date && <div className="mt-0.5 text-xs text-slate-500">{date}</div>}
                </button>
              );
            })
          )}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[240px_1fr] xl:grid-cols-[200px_1fr] 2xl:grid-cols-[180px_1fr]">
          <Card className="border-slate-800/60 bg-slate-900/40 p-4">
            <div className="text-xs uppercase tracking-[0.3em] text-slate-500">Briefings</div>
            <div className="mt-3 space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto pr-1">
              {loading ? (
                <div className="text-sm text-slate-400">Loading…</div>
              ) : filtered.length === 0 ? (
                <div className="text-sm text-slate-500">Keine Briefings in dieser Kategorie.</div>
              ) : (
                filtered.map(file => {
                  const { title, date } = formatFilename(file.name);
                  const cat = detectCategory(file.name);
                  return (
                    <button
                      key={file.path}
                      className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${
                        selected?.path === file.path
                          ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-100"
                          : "border-slate-800/70 text-slate-300 hover:border-slate-700"
                      }`}
                      onClick={() => setSelected(file)}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-medium truncate">{title}</span>
                        <div className="flex shrink-0 items-center gap-1">
                          {isNew(file) && (
                            <span className="rounded-full bg-red-500/20 border border-red-500/30 px-1.5 py-0.5 text-[10px] text-red-300">NEU</span>
                          )}
                          <span className="text-xs">{CATEGORY_META[cat].emoji}</span>
                        </div>
                      </div>
                      {date && <div className="text-xs text-slate-500 mt-0.5">{date}</div>}
                    </button>
                  );
                })
              )}
            </div>
          </Card>

          <Card className="border-slate-800/60 bg-slate-900/30 p-4 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-xs uppercase tracking-[0.3em] text-slate-500">Preview</div>
                <div className="mt-1 text-sm text-slate-300">
                  {selected ? formatFilename(selected.name).title : "Nothing selected"}
                </div>
              </div>
              <Button
                variant="outline"
                className="border-slate-700 text-slate-200"
                disabled={!rawUrl}
                onClick={() => rawUrl && window.open(rawUrl, "_blank")}
              >
                Open in new tab ↗
              </Button>
            </div>
            <div className="flex-1 rounded-xl overflow-hidden border border-slate-800/60 bg-white" style={{ height: "calc(100vh - 270px)" }}>
              {rawUrl ? (
                <iframe
                  key={rawUrl}
                  src={rawUrl}
                  className="w-full h-full"
                  style={{ height: "calc(100vh - 270px)", border: "none" }}
                  title={selected?.name}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-sm text-slate-500">
                  Select a briefing to preview.
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
