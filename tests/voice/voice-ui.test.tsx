import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { VoiceConsoleView, type VoiceConsoleViewProps } from "../../components/voice/voice-console";

function renderVoiceView(overrides: Partial<VoiceConsoleViewProps> = {}) {
  const props: VoiceConsoleViewProps = {
    profiles: [
      { id: "vp_main", slug: "main", label: "Call Hermes", color: "#10B981", description: "General command bridge" },
      { id: "vp_sales", slug: "sales_support", label: "Call Sales Support", color: "#6366F1", description: "Pipeline and outreach" },
    ],
    sessions: [],
    activeSession: null,
    activeProfile: null,
    contextSummary: null,
    turns: [],
    switchTargets: [],
    draft: "",
    isBooting: false,
    isSubmitting: false,
    error: null,
    lastActionLabel: null,
    onDraftChange: () => {},
    onCreateSession: () => {},
    onSelectSession: () => {},
    onRefresh: () => {},
    onSubmitTurn: () => {},
    onSwitchContext: () => {},
    ...overrides,
  };

  return renderToStaticMarkup(React.createElement(VoiceConsoleView, props));
}

test("VoiceConsoleView renders headline and profile launch buttons in empty state", () => {
  const html = renderVoiceView();

  assert.match(html, /Mission Control Voice/i);
  assert.match(html, /Call Hermes/);
  assert.match(html, /Call Sales Support/);
  assert.match(html, /Wähle ein Voice-Profil/);
});

test("VoiceConsoleView renders active session transcript, context summary, and switch targets", () => {
  const html = renderVoiceView({
    activeProfile: { id: "vp_sales", slug: "sales_support", label: "Call Sales Support", color: "#6366F1", description: "Pipeline and outreach" },
    activeSession: {
      id: "vs_1",
      profileId: "vp_sales",
      state: "awaiting_user",
      transport: "web",
      lastUserTranscript: "Wie ist der Stand bei LUMA?",
      lastAssistantText: "LUMA ist in der Angebotsphase.",
      lastError: null,
      startedAt: "2026-04-30T10:00:00.000Z",
      endedAt: null,
      updatedAt: "2026-04-30T10:01:00.000Z",
    },
    contextSummary: "LUMA GmbH · offene Deals · letzte Aktivitäten",
    turns: [
      { id: "turn_user", sessionId: "vs_1", sequence: 1, speaker: "user", text: "Wie ist der Stand bei LUMA?", source: "complete-turn", createdAt: "2026-04-30T10:00:00.000Z", metadata: null },
      { id: "turn_assistant", sessionId: "vs_1", sequence: 2, speaker: "assistant", text: "LUMA ist in der Angebotsphase.", source: "assistant", createdAt: "2026-04-30T10:00:05.000Z", metadata: null },
    ],
    switchTargets: ["main", "luma"],
    draft: "Nächster Schritt?",
  });

  assert.match(html, /LUMA GmbH/);
  assert.match(html, /Wie ist der Stand bei LUMA\?/);
  assert.match(html, /LUMA ist in der Angebotsphase\./);
  assert.match(html, /Zu LUMA wechseln/);
  assert.match(html, /Antwort senden/);
});

test("VoiceConsoleView renders loading and error states", () => {
  const html = renderVoiceView({
    isBooting: true,
    error: "Voice API nicht erreichbar",
    lastActionLabel: "Session wird aufgebaut",
  });

  assert.match(html, /Session wird aufgebaut/);
  assert.match(html, /Voice API nicht erreichbar/);
  assert.match(html, /Lade Voice-Kontext/);
});
