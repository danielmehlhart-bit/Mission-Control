import { NextResponse } from "next/server";

import { parseJsonBody, requireString, voiceErrorResponse } from "@/lib/voice/api";
import {
  createVoiceWorkOrder,
  listVoiceWorkOrdersForSession,
  serializeVoiceWorkOrder,
  VOICE_WORK_ORDER_OUTPUTS,
  VOICE_WORK_ORDER_PRIORITIES,
  type VoiceWorkOrderPriority,
  type VoiceWorkOrderRequestedOutput,
} from "@/lib/voice/work-orders";

export const dynamic = "force-dynamic";

function parseRequestedOutput(value: unknown): VoiceWorkOrderRequestedOutput {
  if (typeof value === "string" && (VOICE_WORK_ORDER_OUTPUTS as readonly string[]).includes(value)) {
    return value as VoiceWorkOrderRequestedOutput;
  }
  throw new Error("Invalid requestedOutput");
}

function parsePriority(value: unknown): VoiceWorkOrderPriority | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "string" && (VOICE_WORK_ORDER_PRIORITIES as readonly string[]).includes(value)) {
    return value as VoiceWorkOrderPriority;
  }
  throw new Error("Invalid priority");
}

export async function GET(_request: Request, context: { params: { id: string } }) {
  try {
    const workOrders = listVoiceWorkOrdersForSession(context.params.id).map(serializeVoiceWorkOrder);
    return NextResponse.json({ workOrders });
  } catch (error) {
    return voiceErrorResponse(error);
  }
}

export async function POST(request: Request, context: { params: { id: string } }) {
  try {
    const body = await parseJsonBody(request);
    const order = createVoiceWorkOrder({
      sessionId: context.params.id,
      title: requireString(body.title, "title"),
      goal: requireString(body.goal, "goal"),
      requestedOutput: parseRequestedOutput(body.requestedOutput),
      priority: parsePriority(body.priority),
      sourceTurnId: typeof body.sourceTurnId === "string" && body.sourceTurnId.trim() ? body.sourceTurnId.trim() : undefined,
      sourceUserText: typeof body.sourceUserText === "string" && body.sourceUserText.trim() ? body.sourceUserText.trim() : undefined,
    });

    return NextResponse.json({
      workOrder: serializeVoiceWorkOrder(order),
    }, { status: 201 });
  } catch (error) {
    return voiceErrorResponse(error);
  }
}
