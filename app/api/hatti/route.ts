import { NextResponse } from 'next/server';
import fs from 'fs';

const COMMANDS_FILE = process.env.COMMANDS_FILE || '/data/briefings/mc-commands.json';

type Command = { id: number; message: string; timestamp: string; processed: boolean };

function readCommands(): Command[] {
  try {
    if (fs.existsSync(COMMANDS_FILE)) return JSON.parse(fs.readFileSync(COMMANDS_FILE, 'utf-8'));
  } catch {}
  return [];
}

export async function POST(req: Request) {
  const { message } = await req.json();
  if (!message?.trim()) return NextResponse.json({ error: 'Message required' }, { status: 400 });
  const commands = readCommands();
  const cmd: Command = { id: Date.now(), message: message.trim(), timestamp: new Date().toISOString(), processed: false };
  commands.push(cmd);
  try {
    fs.writeFileSync(COMMANDS_FILE, JSON.stringify(commands, null, 2));
  } catch {
    return NextResponse.json({ error: 'Could not save' }, { status: 500 });
  }
  return NextResponse.json({ ok: true, command: cmd });
}

export async function GET() {
  const commands = readCommands();
  return NextResponse.json({ commands: commands.slice(-20).reverse() });
}
