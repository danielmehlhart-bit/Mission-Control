import { NextResponse } from "next/server";
import { listMemory, readMemory } from "@/lib/fs";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const file = searchParams.get("file");

  try {
    if (file) {
      const content = await readMemory(file);
      return NextResponse.json({ content });
    }

    const data = await listMemory();
    return NextResponse.json({ files: data.files });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message ?? "Failed to read memory" },
      { status: 500 }
    );
  }
}
