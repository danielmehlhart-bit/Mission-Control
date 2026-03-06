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

export default function DocsPage() {
  const [files, setFiles] = useState<BriefingFile[]>([]);
  const [selected, setSelected] = useState<BriefingFile | null>(null);
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/briefings", { cache: "no-store" });
        const data = await res.json();
        setFiles(data.files ?? []);
        if (data.files?.length) {
          setSelected(data.files[0]);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!selected) {
      setContent("");
      return;
    }
    const load = async () => {
      const res = await fetch(`/api/briefings?file=${encodeURIComponent(selected.path)}`);
      const data = await res.json();
      setContent(data.content ?? "");
    };
    load();
  }, [selected]);

  // Sort newest first (by filename date prefix)
  const sortedFiles = [...files].sort((a, b) => b.name.localeCompare(a.name));

  // Human-readable label: "2026-03-05-alles-auf-aktien.html" → "Alles auf Aktien · 5. Mär"
  function friendlyName(name: string): { title: string; date: string } {
    const match = name.match(/^(\d{4})-(\d{2})-(\d{2})-(.+)\.html$/);
    if (!match) return { title: name, date: "" };
    const [, year, month, day, slug] = match;
    const title = slug
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
    const dateObj = new Date(`${year}-${month}-${day}`);
    const date = dateObj.toLocaleDateString("de-DE", { day: "numeric", month: "short" });
    return { title, date };
  }

  function openInNewTab() {
    if (!content) return;
    const blob = new Blob([content], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  }

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

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <Card className="border-slate-800/60 bg-slate-900/40 p-4">
          <div className="text-xs uppercase tracking-[0.3em] text-slate-500">
            Briefings
          </div>
          <div className="mt-3 space-y-2">
            {loading ? (
              <div className="text-sm text-slate-400">Loading…</div>
            ) : sortedFiles.length === 0 ? (
              <div className="text-sm text-slate-500">
                No HTML briefings found.
              </div>
            ) : (
              sortedFiles.map((file) => {
                const { title, date } = friendlyName(file.name);
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
                    <div className="text-xs text-slate-500">{date}</div>
                  </button>
                );
              })
            )}
          </div>
        </Card>

        <Card className="border-slate-800/60 bg-slate-900/30 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.3em] text-slate-500">
                Preview
              </div>
              <div className="mt-1 text-sm text-slate-300">
                {selected ? friendlyName(selected.name).title : "Nothing selected"}
              </div>
            </div>
            <Button
              variant="outline"
              className="border-slate-700 text-slate-200"
              disabled={!content}
              onClick={openInNewTab}
            >
              Open in new tab
            </Button>
          </div>
          <div className="mt-4 rounded-xl border border-slate-800/60 overflow-hidden" style={{ height: "calc(100vh - 280px)" }}>
            {content ? (
              <iframe
                srcDoc={content}
                className="w-full h-full border-0"
                sandbox="allow-same-origin allow-popups"
                title="Briefing Preview"
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
