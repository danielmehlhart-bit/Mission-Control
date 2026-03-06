"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type BriefingFile = {
  name: string;
  path: string;
  modified: string;
};

function formatFilename(name: string): { title: string; date: string } {
  // Pattern: YYYY-MM-DD-some-title.html
  const match = name.match(/^(\d{4}-\d{2}-\d{2})-(.+)\.html$/);
  if (match) {
    const [, dateStr, slug] = match;
    const date = new Date(dateStr).toLocaleDateString("de-DE", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    const title = slug
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
    return { title, date };
  }
  return { title: name.replace(".html", ""), date: "" };
}

export default function DocsPage() {
  const [files, setFiles] = useState<BriefingFile[]>([]);
  const [selected, setSelected] = useState<BriefingFile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/briefings", { cache: "no-store" });
        const data = await res.json();
        // Sort newest first
        const sorted = (data.files ?? []).sort((a: BriefingFile, b: BriefingFile) =>
          b.name.localeCompare(a.name)
        );
        setFiles(sorted);
        if (sorted.length) {
          setSelected(sorted[0]);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const rawUrl = selected
    ? `/api/briefings?file=${encodeURIComponent(selected.path)}&raw=1`
    : null;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-slate-50">Docs Browser</h1>
          <p className="mt-2 text-sm text-slate-400">
            HTML briefings from the shared workspace.
          </p>
        </div>
        <Badge className="border-slate-700 bg-slate-800 text-slate-200">
          {files.length} docs
        </Badge>
      </header>

      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        {/* File list */}
        <Card className="border-slate-800/60 bg-slate-900/40 p-4">
          <div className="text-xs uppercase tracking-[0.3em] text-slate-500">
            Briefings
          </div>
          <div className="mt-3 space-y-2 max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
            {loading ? (
              <div className="text-sm text-slate-400">Loading…</div>
            ) : files.length === 0 ? (
              <div className="text-sm text-slate-500">No HTML briefings found.</div>
            ) : (
              files.map((file) => {
                const { title, date } = formatFilename(file.name);
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
                    <div className="font-medium">{title}</div>
                    {date && <div className="text-xs text-slate-500">{date}</div>}
                  </button>
                );
              })
            )}
          </div>
        </Card>

        {/* Preview */}
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
          <div className="flex-1 rounded-xl overflow-hidden border border-slate-800/60 bg-white" style={{ minHeight: "calc(100vh - 260px)" }}>
            {rawUrl ? (
              <iframe
                key={rawUrl}
                src={rawUrl}
                className="w-full h-full"
                style={{ height: "calc(100vh - 260px)", border: "none" }}
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
    </div>
  );
}
