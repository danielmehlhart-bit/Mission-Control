import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

const cronJobs = [
  { name: "Mission sync", schedule: "*/15 * * * *", status: "Active" },
  { name: "Daily report", schedule: "0 8 * * *", status: "Queued" },
  { name: "Backup snapshot", schedule: "0 3 * * 1", status: "Paused" },
];

export default function CronPage() {
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-slate-50">Cron Jobs</h1>
          <p className="mt-2 text-sm text-slate-400">
            Planned schedules (placeholder for backend integration).
          </p>
        </div>
        <Badge className="border-slate-700 bg-slate-800 text-slate-200">
          {cronJobs.length} jobs
        </Badge>
      </header>

      <div className="grid gap-4">
        {cronJobs.map((job) => (
          <Card
            key={job.name}
            className="flex flex-wrap items-center justify-between gap-4 border-slate-800/60 bg-slate-900/40 p-4"
          >
            <div>
              <div className="text-lg font-semibold text-slate-50">{job.name}</div>
              <div className="mt-1 text-sm text-slate-400">{job.schedule}</div>
            </div>
            <Badge className="border-slate-700 bg-slate-800 text-slate-200">
              {job.status}
            </Badge>
          </Card>
        ))}
      </div>
    </div>
  );
}
