"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

const navItems = [
  { href: "/", label: "Home Dashboard", hint: "Overview" },
  { href: "/tasks", label: "Task Board", hint: "Kanban" },
  { href: "/docs", label: "Docs Browser", hint: "HTML Briefings" },
  { href: "/memory", label: "Memory Viewer", hint: "MEMORY.md + Logs" },
  { href: "/cron", label: "Cron Jobs", hint: "Schedules" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-linear-grid text-slate-100">
      <div className="mx-auto grid w-full max-w-screen-2xl grid-cols-1 gap-6 px-4 pb-10 pt-8 md:grid-cols-[220px_1fr] xl:grid-cols-[200px_1fr]">
        <aside className="rounded-2xl border border-slate-800/60 bg-slate-900/60 backdrop-blur">
          <div className="px-5 pt-5">
            <div className="text-xs uppercase tracking-[0.3em] text-slate-500">
              OpenClaw
            </div>
            <div className="mt-2 text-2xl font-semibold text-slate-50">
              Mission Control
            </div>
            <p className="mt-2 text-sm text-slate-400">
              Linear-style ops console for fast visibility.
            </p>
          </div>
          <ScrollArea className="mt-5 h-[420px] px-2 pb-6">
            <nav className="space-y-1 px-3">
              {navItems.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "group flex items-center justify-between rounded-xl border border-transparent px-3 py-2 text-sm transition",
                      active
                        ? "border-slate-700/80 bg-slate-800/70 text-white"
                        : "text-slate-400 hover:border-slate-800/70 hover:bg-slate-900/60 hover:text-slate-100"
                    )}
                  >
                    <span className="flex flex-col">
                      <span className="font-medium">{item.label}</span>
                      <span className="text-xs text-slate-500 group-hover:text-slate-400">
                        {item.hint}
                      </span>
                    </span>
                    {active ? (
                      <Badge className="border-slate-700 bg-slate-800 text-slate-200">
                        Active
                      </Badge>
                    ) : null}
                  </Link>
                );
              })}
            </nav>
          </ScrollArea>
          <div className="border-t border-slate-800/60 px-5 py-4 text-xs text-slate-500">
            Status: <span className="text-slate-300">Local MVP</span>
          </div>
        </aside>

        <main className="rounded-2xl border border-slate-800/60 bg-slate-950/40 p-6 shadow-[0_18px_60px_rgba(0,0,0,0.35)]">
          {children}
        </main>
      </div>
    </div>
  );
}
