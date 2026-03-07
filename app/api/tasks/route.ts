import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const PRIMARY_FILE = process.env.TASKS_FILE || '/data/briefings/tasks.json';
const FALLBACK_FILE = '/tmp/mc-tasks.json';

function getFile(): string {
  try {
    const dir = path.dirname(PRIMARY_FILE);
    if (fs.existsSync(dir)) {
      fs.accessSync(dir, fs.constants.W_OK);
      return PRIMARY_FILE;
    }
  } catch {}
  return FALLBACK_FILE;
}

function read(): Task[] {
  try {
    const f = getFile();
    if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, 'utf-8'));
  } catch {}
  return [];
}

function write(tasks: Task[]) {
  fs.writeFileSync(getFile(), JSON.stringify(tasks, null, 2));
}

export type Task = {
  id: string;
  title: string;
  project: string;
  status: 'todo' | 'done';
  createdAt: string;
  doneAt?: string;
  notes?: string;
};

export async function GET() {
  const tasks = read();
  const sorted = [
    ...tasks.filter(t => t.status === 'todo').sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    ...tasks.filter(t => t.status === 'done').sort((a, b) => (b.doneAt ?? '').localeCompare(a.doneAt ?? '')),
  ];
  return NextResponse.json({ tasks: sorted });
}

export async function POST(req: Request) {
  const { title, project, notes } = await req.json();
  if (!title?.trim()) return NextResponse.json({ error: 'Title required' }, { status: 400 });
  const tasks = read();
  const task: Task = {
    id: Date.now().toString(),
    title: title.trim(),
    project: project || 'Allgemein',
    status: 'todo',
    createdAt: new Date().toISOString(),
    ...(notes?.trim() ? { notes: notes.trim() } : {}),
  };
  tasks.push(task);
  write(tasks);
  return NextResponse.json({ task });
}

export async function PATCH(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const body = await req.json();
  const tasks = read();
  const idx = tasks.findIndex(t => t.id === id);
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (body.status !== undefined) {
    tasks[idx].status = body.status;
    if (body.status === 'done') tasks[idx].doneAt = new Date().toISOString();
    else delete tasks[idx].doneAt;
  }
  if (body.title !== undefined) tasks[idx].title = body.title;
  if (body.project !== undefined) tasks[idx].project = body.project;
  if (body.notes !== undefined) tasks[idx].notes = body.notes;
  write(tasks);
  return NextResponse.json({ task: tasks[idx] });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  write(read().filter(t => t.id !== id));
  return NextResponse.json({ ok: true });
}
