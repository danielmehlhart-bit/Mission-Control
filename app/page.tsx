import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function HomePage() {
  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-slate-50">Home Dashboard</h1>
          <p className="mt-2 text-sm text-slate-400">
            System status, active workstreams, and launch readiness.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="border-slate-700 bg-slate-800 text-slate-200">
            MVP
          </Badge>
          <Button className="bg-emerald-400/90 text-slate-950 hover:bg-emerald-300">
            New Briefing
          </Button>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          { title: "Active Tasks", value: "12", meta: "3 blocked" },
          { title: "Deployments", value: "2", meta: "Coolify pending" },
          { title: "Last Sync", value: "5 min", meta: "SSH online" },
        ].map((item) => (
          <Card key={item.title} className="border-slate-800/60 bg-slate-900/50 p-4">
            <div className="text-xs uppercase tracking-[0.3em] text-slate-500">
              {item.title}
            </div>
            <div className="mt-3 text-3xl font-semibold text-slate-50">
              {item.value}
            </div>
            <div className="mt-2 text-sm text-slate-400">{item.meta}</div>
          </Card>
        ))}
      </section>

      <Card className="border-slate-800/60 bg-slate-900/40 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-100">Mission Control Roadmap</h2>
            <p className="mt-1 text-sm text-slate-400">
              Hooks for future systems are ready to be wired.
            </p>
          </div>
          <Button variant="outline" className="border-slate-700 text-slate-200">
            View Milestones
          </Button>
        </div>
        <Separator className="my-4 bg-slate-800/80" />
        <div className="grid gap-3 text-sm text-slate-300 md:grid-cols-3">
          <div className="rounded-xl border border-dashed border-slate-700/70 p-3">
            WebSocket Live Updates
            <div className="mt-2 text-xs text-slate-500">
              Placeholder for real-time telemetry.
            </div>
          </div>
          <div className="rounded-xl border border-dashed border-slate-700/70 p-3">
            Database Integration
            <div className="mt-2 text-xs text-slate-500">
              Planned Postgres + audit trail.
            </div>
          </div>
          <div className="rounded-xl border border-dashed border-slate-700/70 p-3">
            Auth System
            <div className="mt-2 text-xs text-slate-500">
              Role-based access control.
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
