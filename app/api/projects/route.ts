import { NextResponse } from 'next/server';
import fs from 'fs';

const FILE = process.env.PROJECTS_FILE || '/data/briefings/projects.json';
const FALLBACK = '/tmp/mc-projects.json';

function getFile() {
  try {
    const dir = require('path').dirname(FILE);
    if (fs.existsSync(dir)) { fs.accessSync(dir, fs.constants.W_OK); return FILE; }
  } catch {}
  return FALLBACK;
}

export type Project = {
  id: string;
  name: string;
  client: string;
  status: 'active' | 'paused' | 'done';
  description?: string;
  contactId?: string;
  repo?: string;
  color: string;
};

const SEED: Project[] = [
  { id: "1", name: "ModulAI", client: "HAM Architekten", status: "active", description: "Multi-Tenant AI-Plattform für Architekturbüros", contactId: "1", repo: "danielmehlhart-bit/modulai", color: "#8B5CF6" },
  { id: "2", name: "Architekt Connect", client: "Weber Architekten", status: "active", description: "PM-Tool für Architekturbüros (Pilot: Weber)", contactId: "3", repo: "danielmehlhart-bit/architekt-connect", color: "#3B82F6" },
  { id: "3", name: "BPP CRM", client: "BPP", status: "active", description: "Internes CRM für ~300 Mitglieder", contactId: "5", repo: "danielmehlhart-bit/photobpp-organizer", color: "#F59E0B" },
  { id: "4", name: "Concord", client: "Intern", status: "active", description: "Persönliches Leadership OS", repo: "danielmehlhart-bit/concordv3", color: "#10B981" },
];

function read(): Project[] {
  try {
    const f = getFile();
    if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, 'utf-8'));
  } catch {}
  fs.writeFileSync(getFile(), JSON.stringify(SEED, null, 2));
  return SEED;
}
function write(data: Project[]) { fs.writeFileSync(getFile(), JSON.stringify(data, null, 2)); }

export async function GET() { return NextResponse.json({ projects: read() }); }

export async function POST(req: Request) {
  const body = await req.json();
  const projects = read();
  const project: Project = { ...body, id: Date.now().toString() };
  projects.push(project);
  write(projects);
  return NextResponse.json({ project });
}

export async function PATCH(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const body = await req.json();
  const projects = read();
  const idx = projects.findIndex(p => p.id === id);
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  projects[idx] = { ...projects[idx], ...body };
  write(projects);
  return NextResponse.json({ project: projects[idx] });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  write(read().filter(p => p.id !== id));
  return NextResponse.json({ ok: true });
}
