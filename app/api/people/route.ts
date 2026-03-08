import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const FILE = process.env.PEOPLE_FILE || '/data/briefings/people.json';
const FALLBACK = '/tmp/mc-people.json';

function getFile() {
  try {
    const dir = path.dirname(FILE);
    if (fs.existsSync(dir)) { fs.accessSync(dir, fs.constants.W_OK); return FILE; }
  } catch {}
  return FALLBACK;
}

export type Person = {
  id: string;
  name: string;
  company: string;
  role?: string;
  email?: string;
  phone?: string;
  project?: string;
  notes?: string;
};

const SEED: Person[] = [
  { id: "1", name: "Alex Hamm", company: "HAM Architekten", role: "Inhaber", email: "a.hamm@hammarchitekten.de", project: "HAM / ModulAI" },
  { id: "2", name: "Stavros Gavalas", company: "HAM Architekten", role: "Mitarbeiter", email: "a.gavalas@hammarchitekten.de", project: "HAM / ModulAI" },
  { id: "3", name: "Kim Weber", company: "Weber Architekten", role: "Projektleiterin", project: "Architekt Connect" },
  { id: "4", name: "Paul Weber", company: "Weber Architekten", role: "Inhaber", project: "Architekt Connect" },
  { id: "5", name: "Sebastian Weißmann", company: "BPP", role: "Geschäftsführer", email: "seba@bpp.photography", project: "BPP" },
  { id: "6", name: "Eduard Raab", company: "Raab Immobilien", role: "Inhaber", email: "e.raab@raabimmobilien.com", project: "HAM / ModulAI" },
];

function read(): Person[] {
  try {
    const f = getFile();
    if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, 'utf-8'));
  } catch {}
  // Seed on first run
  fs.writeFileSync(getFile(), JSON.stringify(SEED, null, 2));
  return SEED;
}
function write(data: Person[]) { fs.writeFileSync(getFile(), JSON.stringify(data, null, 2)); }

export async function GET() { return NextResponse.json({ people: read() }); }

export async function POST(req: Request) {
  // Fix 4: Allowlist — nur bekannte Felder, kein ...body spread
  const body = await req.json();
  const { name, company, role, email, phone, project, notes } = body;
  if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 });
  const people = read();
  const person: Person = {
    id: Date.now().toString(),
    name: String(name).trim(),
    company: String(company ?? '').trim(),
    ...(role ? { role: String(role).trim() } : {}),
    ...(email ? { email: String(email).trim() } : {}),
    ...(phone ? { phone: String(phone).trim() } : {}),
    ...(project ? { project: String(project).trim() } : {}),
    ...(notes ? { notes: String(notes).trim() } : {}),
  };
  people.push(person);
  write(people);
  return NextResponse.json({ person });
}

export async function PATCH(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  // Fix 4: Allowlist — nur bekannte Felder patchen
  const body = await req.json();
  const people = read();
  const idx = people.findIndex(p => p.id === id);
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const { name, company, role, email, phone, project, notes } = body;
  if (name !== undefined) people[idx].name = String(name).trim();
  if (company !== undefined) people[idx].company = String(company).trim();
  if (role !== undefined) people[idx].role = String(role).trim();
  if (email !== undefined) people[idx].email = String(email).trim();
  if (phone !== undefined) people[idx].phone = String(phone).trim();
  if (project !== undefined) people[idx].project = String(project).trim();
  if (notes !== undefined) people[idx].notes = String(notes).trim();
  write(people);
  return NextResponse.json({ person: people[idx] });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  write(read().filter(p => p.id !== id));
  return NextResponse.json({ ok: true });
}
