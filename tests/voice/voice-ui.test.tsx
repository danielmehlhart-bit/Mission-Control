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
    voiceMode: "idle",
    browserVoiceSupported: true,
    liveTranscript: "",
    isVoiceModeEnabled: false,
    layoutMode: "desktop",
    canReplayAssistant: false,
    onDraftChange: () => {},
    onCreateSession: () => {},
    onSelectSession: () => {},
    onRefresh: () => {},
    onSubmitTurn: () => {},
    onSwitchContext: () => {},
    onToggleVoiceMode: () => {},
    onReplayAssistant: () => {},
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
    isVoiceModeEnabled: true,
    voiceMode: "listening",
    liveTranscript: "Sag mir den nächsten Schritt",
    canReplayAssistant: true,
  });

  assert.match(html, /LUMA GmbH/);
  assert.match(html, /Wie ist der Stand bei LUMA\?/);
  assert.match(html, /LUMA ist in der Angebotsphase\./);
  assert.match(html, /Zu LUMA wechseln/);
  assert.match(html, /Antwort senden/);
  assert.match(html, /Voice Mode/);
  assert.match(html, /Mikrofon läuft/);
  assert.match(html, /Sag mir den nächsten Schritt/);
  assert.match(html, /Voice stoppen/);
  assert.match(html, /Antwort anhören/);
});

test("VoiceConsoleView renders a stacked mobile layout with replay action", () => {
  const html = renderVoiceView({
    layoutMode: "mobile",
    activeProfile: { id: "vp_main", slug: "main", label: "Call Hermes", color: "#10B981", description: "General command bridge" },
    activeSession: {
      id: "vs_mobile",
      profileId: "vp_main",
      state: "awaiting_user",
      transport: "web",
      lastUserTranscript: "Hörst du mich?",
      lastAssistantText: "Ja, ich höre dich.",
      lastError: null,
      startedAt: "2026-04-30T10:00:00.000Z",
      endedAt: null,
      updatedAt: "2026-04-30T10:01:00.000Z",
    },
    turns: [
      { id: "turn_mobile_user", sessionId: "vs_mobile", sequence: 1, speaker: "user", text: "Hörst du mich?", source: "complete-turn", createdAt: "2026-04-30T10:00:00.000Z", metadata: null },
      { id: "turn_mobile_assistant", sessionId: "vs_mobile", sequence: 2, speaker: "assistant", text: "Ja, ich höre dich.", source: "assistant", createdAt: "2026-04-30T10:00:05.000Z", metadata: null },
    ],
    canReplayAssistant: true,
  });

  assert.match(html, /grid-template-columns:1fr/);
  assert.match(html, /Antwort anhören/);
  assert.match(html, /min-height:240px/);
});

test("VoiceConsoleView renders loading and error states", () => {
  const html = renderVoiceView({
    isBooting: true,
    error: "Voice API nicht erreichbar",
    lastActionLabel: "Session wird aufgebaut",
    browserVoiceSupported: false,
  });

  assert.match(html, /Session wird aufgebaut/);
  assert.match(html, /Voice API nicht erreichbar/);
  assert.match(html, /Lade Voice-Kontext/);
  assert.match(html, /Sprachmodus in diesem Browser nicht unterstützt/);
});
