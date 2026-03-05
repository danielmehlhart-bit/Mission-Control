import { NextResponse } from "next/server";
import { listBriefings, readBriefing } from "@/lib/fs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const file = searchParams.get("file");

  try {
    if (file) {
      const content = await readBriefing(file);
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
