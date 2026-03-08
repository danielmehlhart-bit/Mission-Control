import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const FILE = process.env.PROJECTS_FILE || '/data/briefings/projects.json';
const FALLBACK = '/tmp/mc-projects.json';

function getFile() {
  try {
    const dir = path.dirname(FILE);
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
  // Fix 4: Allowlist — nur bekannte Felder, kein ...body spread
  const body = await req.json();
  const { name, client, status, description, contactId, repo, color } = body;
  if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 });
  const projects = read();
  const project: Project = {
    id: Date.now().toString(),
    name: String(name).trim(),
    client: String(client ?? '').trim(),
    status: ['active', 'paused', 'done'].includes(status) ? status : 'active',
    ...(description ? { description: String(description).trim() } : {}),
    ...(contactId ? { contactId: String(contactId).trim() } : {}),
    ...(repo ? { repo: String(repo).trim() } : {}),
    color: String(color ?? '#6366f1').trim(),
  };
  projects.push(project);
  write(projects);
  return NextResponse.json({ project });
}

export async function PATCH(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  // Fix 4: Allowlist — nur bekannte Felder patchen
  const body = await req.json();
  const projects = read();
  const idx = projects.findIndex(p => p.id === id);
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const { name, client, status, description, contactId, repo, color } = body;
  if (name !== undefined) projects[idx].name = String(name).trim();
  if (client !== undefined) projects[idx].client = String(client).trim();
  if (status !== undefined && ['active', 'paused', 'done'].includes(status)) projects[idx].status = status;
  if (description !== undefined) projects[idx].description = String(description).trim();
  if (contactId !== undefined) projects[idx].contactId = String(contactId).trim();
  if (repo !== undefined) projects[idx].repo = String(repo).trim();
  if (color !== undefined) projects[idx].color = String(color).trim();
  write(projects);
  return NextResponse.json({ project: projects[idx] });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  write(read().filter(p => p.id !== id));
  return NextResponse.json({ ok: true });
}
