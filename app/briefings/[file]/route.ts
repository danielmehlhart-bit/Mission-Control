import { readBriefing } from "@/lib/fs";

export async function GET(
  _req: Request,
  { params }: { params: { file: string } }
) {
  try {
    const content = await readBriefing(params.file);
    return new Response(content, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
