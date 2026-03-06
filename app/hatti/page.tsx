"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Command = { id: number; message: string; timestamp: string; processed: boolean };

export default function HattiPage() {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<"idle" | "sent" | "error">("idle");
  const [commands, setCommands] = useState<Command[]>([]);

  const loadCommands = async () => {
    try {
      const res = await fetch("/api/hatti");
      const data = await res.json();
      setCommands(data.commands ?? []);
    } catch {}
  };

  useEffect(() => { loadCommands(); }, []);

  const send = async () => {
    if (!message.trim()) return;
    setSending(true);
    setStatus("idle");
    try {
      const res = await fetch("/api/hatti", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      if (res.ok) {
        setStatus("sent");
        setMessage("");
        loadCommands();
        setTimeout(() => setStatus("idle"), 4000);
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold text-slate-50">💬 Hatti</h1>
        <p className="mt-2 text-sm text-slate-400">
          Gib Hatti eine Anweisung — sie liest es beim nächsten Check (ca. alle 5 Min).
        </p>
      </header>

      <Card className="border-slate-800/60 bg-slate-900/40 p-5">
        <textarea
          className="w-full min-h-[120px] resize-y rounded-xl border border-slate-700/60 bg-slate-950/60 p-4 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 transition"
          placeholder="z.B. Erstelle einen Marktbericht über Renewable Energy. Oder: Erinnere mich morgen früh an das Meeting mit Alex."
          value={message}
          onChange={e => setMessage(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) send(); }}
        />
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-slate-500">⌘↵ zum Senden</span>
          <div className="flex items-center gap-3">
            {status === "sent" && (
              <span className="text-sm text-emerald-400">✅ Gespeichert. Hatti liest es gleich.</span>
            )}
            {status === "error" && (
              <span className="text-sm text-red-400">❌ Fehler beim Speichern.</span>
            )}
            <Button
              onClick={send}
              disabled={!message.trim() || sending}
              className="bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-40"
            >
              {sending ? "Sendet…" : "Senden"}
            </Button>
          </div>
        </div>
      </Card>

      {commands.length > 0 && (
        <div>
          <div className="mb-3 text-xs uppercase tracking-[0.3em] text-slate-500">Zuletzt gesendete Anweisungen</div>
          <div className="space-y-2">
            {commands.map(cmd => (
              <Card key={cmd.id} className="border-slate-800/60 bg-slate-900/30 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm text-slate-300 leading-relaxed">{cmd.message}</p>
                  <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs ${
                    cmd.processed
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                      : "border-slate-700/60 bg-slate-800/40 text-slate-400"
                  }`}>
                    {cmd.processed ? "✓ Erledigt" : "⏳ Offen"}
                  </span>
                </div>
                <div className="mt-1 text-xs text-slate-600">
                  {new Date(cmd.timestamp).toLocaleString("de-DE")}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
