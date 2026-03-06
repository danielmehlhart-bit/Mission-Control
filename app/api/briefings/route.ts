import { NextResponse } from "next/server";
import { listBriefings, readBriefing } from "@/lib/fs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const file = searchParams.get("file");
  const raw = searchParams.get("raw");

  try {
    if (file) {
      const content = await readBriefing(file);
      if (raw === "1") {
        return new Response(content, {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      }
      return NextResponse.json({ content });
    }

    const data = await listBriefings();
    return NextResponse.json({ files: data.files });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message ?? "Failed to read briefings" },
      { status: 500 }
    );
  }
}
