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
  const { title, project } = await req.json();
  if (!title?.trim()) return NextResponse.json({ error: 'Title required' }, { status: 400 });
  const tasks = read();
  const task: Task = {
    id: Date.now().toString(),
    title: title.trim(),
    project: project || 'Allgemein',
    status: 'todo',
    createdAt: new Date().toISOString(),
  };
  tasks.push(task);
  write(tasks);
  return NextResponse.json({ task });
}

export async function PATCH(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const { status } = await req.json();
  const tasks = read();
  const idx = tasks.findIndex(t => t.id === id);
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  tasks[idx].status = status;
  if (status === 'done') tasks[idx].doneAt = new Date().toISOString();
  else delete tasks[idx].doneAt;
  write(tasks);
  return NextResponse.json({ task: tasks[idx] });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  write(read().filter(t => t.id !== id));
  return NextResponse.json({ ok: true });
}
