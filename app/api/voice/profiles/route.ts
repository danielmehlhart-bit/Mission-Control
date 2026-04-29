import { NextResponse } from "next/server";
import { listButtonReadyProfiles, voiceErrorResponse } from "@/lib/voice/api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ profiles: listButtonReadyProfiles() });
  } catch (error) {
    return voiceErrorResponse(error);
  }
}
