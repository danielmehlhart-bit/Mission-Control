import { VOICE_REALTIME_TOOLS } from "./tools";

export type VoiceCapabilityStatus = "available" | "not_implemented" | "gated";

export type VoiceCapability = {
  key: string;
  label: string;
  status: VoiceCapabilityStatus;
  toolName?: string;
  safeFallback: string;
};

const CAPABILITIES: VoiceCapability[] = [
  {
    key: "memory_context_retrieval",
    label: "Memory and context retrieval",
    status: "available",
    toolName: "hermes_memory_search",
    safeFallback: "Ich kann nur gespeicherten Memory- und Kontextbestand prüfen und sage klar, wenn ich nichts Belegtes finde.",
  },
  {
    key: "memory_read",
    label: "Read a known memory source",
    status: "available",
    toolName: "hermes_memory_read",
    safeFallback: "Ich kann nur Memory-Pfade lesen, die mir ein Tool vorher als sichere Quelle geliefert hat.",
  },
  {
    key: "voice_work_order",
    label: "Persist voice work orders",
    status: "available",
    toolName: "voice_create_work_order",
    safeFallback: "Ich kann einen Work Order anlegen, aber noch kein finales Dokument daraus erzeugen.",
  },
  {
    key: "live_web_research",
    label: "Live web research",
    status: "available",
    toolName: "voice_web_search",
    safeFallback: "Ich kann Live-Web-Recherche ausführen, wenn voice_web_search erfolgreich Quellen liefert. Ohne Quellen sage ich klar, dass die Recherche nicht belegbar war.",
  },
  {
    key: "document_creation",
    label: "Create finished documents",
    status: "not_implemented",
    safeFallback: "Ein fertiges Dokument kann ich aus dem Voice Call heraus noch nicht direkt erstellen. Ich kann dafür einen Work Order anlegen.",
  },
  {
    key: "telegram_send",
    label: "Send Telegram messages",
    status: "not_implemented",
    safeFallback: "Direkt aus dem Voice Call kann ich noch nicht in Telegram posten. Ich kann den Handoff vorbereiten und den Telegram-Link anzeigen.",
  },
];

export function listVoiceCapabilities(): VoiceCapability[] {
  const registeredToolNames = new Set(VOICE_REALTIME_TOOLS.map((tool) => tool.name));
  return CAPABILITIES.map((capability) => {
    if (capability.toolName && !registeredToolNames.has(capability.toolName)) {
      return { ...capability, status: "not_implemented" };
    }
    return capability;
  });
}

export function buildVoiceCapabilityInstructions(): string {
  const capabilities = listVoiceCapabilities();
  const availableTools = capabilities
    .filter((capability) => capability.status === "available" && capability.toolName)
    .map((capability) => capability.toolName);
  const notImplemented = capabilities
    .filter((capability) => capability.status === "not_implemented")
    .map((capability) => `${capability.key} (${capability.status}, ${capability.label}): ${capability.safeFallback}`);

  const availableDescriptions = capabilities
    .filter((capability) => capability.status === "available")
    .map((capability) => `${capability.key} (${capability.label})${capability.toolName ? ` via ${capability.toolName}` : ""}`);

  return [
    `Current voice tools available: ${availableTools.length ? availableTools.join(", ") : "none"}.`,
    availableDescriptions.length ? `Available capabilities: ${availableDescriptions.join(" | ")}.` : "",
    "Capability truth rule: never claim to have sent, created, posted, scheduled, researched, or completed anything unless the corresponding tool/API call succeeded and returned a persisted result.",
    "For long deliverables such as review documents, follow-up texts, task drafts, or later output packages, call voice_create_work_order when available. Only say 'Work Order angelegt' after the tool result says created=true.",
    "Do not say a final document, file, link, Telegram post, or live research result exists unless a real tool produced it.",
    "If a tool fails, say it did not complete. Do not hide the failure behind a confident completion claim.",
    notImplemented.length ? `Not implemented capabilities: ${notImplemented.join(" | ")}` : "",
  ].filter(Boolean).join("\n");
}
