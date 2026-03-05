"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

type MemoryFile = {
  name: string;
  path: string;
  modified: string;
};

export default function MemoryPage() {
  const [files, setFiles] = useState<MemoryFile[]>([]);
  const [selected, setSelected] = useState<MemoryFile | null>(null);
  const [content, setContent] = useState<string>("");

  useEffect(() => {
    const load = async () => {
      const res = await fetch("/api/memory", { cache: "no-store" });
      const data = await res.json();
      setFiles(data.files ?? []);
      if (data.files?.length) {
        setSelected(data.files[0]);
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
      const res = await fetch(`/api/memory?file=${encodeURIComponent(selected.path)}`);
      const data = await res.json();
      setContent(data.content ?? "");
    };
    load();
  }, [selected]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-slate-50">Memory Viewer</h1>
          <p className="mt-2 text-sm text-slate-400">
            MEMORY.md and daily logs (read-only).
          </p>
        </div>
        <Badge className="border-slate-700 bg-slate-800 text-slate-200">
          {files.length} files
        </Badge>
      </header>

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <Card className="border-slate-800/60 bg-slate-900/40 p-4">
          <div className="text-xs uppercase tracking-[0.3em] text-slate-500">
            Memory
          </div>
          <div className="mt-3 space-y-2">
            {files.length === 0 ? (
              <div className="text-sm text-slate-500">No memory files found.</div>
            ) : (
              files.map((file) => (
                <button
                  key={file.path}
                  className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${
                    selected?.path === file.path
                      ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-100"
                      : "border-slate-800/70 text-slate-300 hover:border-slate-700"
                  }`}
                  onClick={() => setSelected(file)}
                >
                  <div className="font-medium">{file.name}</div>
                  <div className="text-xs text-slate-500">{file.modified}</div>
                </button>
              ))
            )}
          </div>
        </Card>

        <Card className="border-slate-800/60 bg-slate-900/30 p-4">
          <div className="text-xs uppercase tracking-[0.3em] text-slate-500">Content</div>
          <div className="mt-3 rounded-xl border border-slate-800/60 bg-slate-950/60 p-4">
            <pre className="whitespace-pre-wrap text-sm text-slate-200">
              {content || "Select a file to view content."}
            </pre>
          </div>
        </Card>
      </div>
    </div>
  );
}
