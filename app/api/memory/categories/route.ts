import { NextResponse } from "next/server";
import { listMemoryByCategory, readMemoryFile, MEMORY_CATEGORIES } from "@/lib/fs";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const file = searchParams.get("file");

  try {
    if (file) {
      const content = await readMemoryFile(file);
      return NextResponse.json({ content });
    }

    const [byCategory] = await Promise.all([listMemoryByCategory()]);

    return NextResponse.json({
      categories: MEMORY_CATEGORIES.map(cat => ({
        id: cat.id,
        label: cat.label,
        emoji: cat.emoji,
        desc: cat.desc,
      })),
      files: byCategory,
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message ?? "Failed to read memory" },
      { status: 500 }
    );
  }
}
