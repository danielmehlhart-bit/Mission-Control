import { NextResponse } from "next/server";

import { getMemoryDiagnostics } from "@/lib/fs";
import { voiceErrorResponse } from "@/lib/voice/api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await getMemoryDiagnostics());
  } catch (error) {
    return voiceErrorResponse(error);
  }
}
