"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, MessageSquareText, Mic, MicOff, MoreHorizontal, Phone, PhoneOff, RefreshCw, RotateCcw, Send, Volume2 } from "lucide-react";

import { pickPreferredSpeechSynthesisVoice } from "@/lib/voice/browser-voice";

type VoiceProfileSummary = {
  id: string;
  slug: string;
  label: string;
  description: string | null;
  color: string | null;
  telegramBinding?: {
    chatId: string;
    threadId: string | null;
    label: string;
    handoffUrl: string | null;
  } | null;
};

type VoiceSessionSummary = {
  id: string;
  profileId: string;
  state: string;
  isMuted: boolean;
  transport: string;
  lastUserTranscript: string | null;
  lastAssistantText: string | null;
  lastError: string | null;
  startedAt: string;
  endedAt: string | null;
  updatedAt: string;
};

type VoiceTurn = {
  id: string;
  sessionId: string;
  sequence: number;
  speaker: "user" | "assistant" | "system";
  text: string;
  source: string;
  createdAt: string;
  metadata: Record<string, unknown> | null;
};

type VoiceSessionListItem = {
  session: VoiceSessionSummary;
  profile: VoiceProfileSummary;
  contextSummary: string;
};

type VoiceWorkOrderSummary = {
  id: string;
  sessionId: string;
  profileSlug: string;
  title: string;
  goal: string;
  requestedOutput: string;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
};

type VoiceHandoffSummary = {
  id: string;
  sessionId: string;
  profileSlug: string;
  status: "prepared" | "failed" | "not_supported" | "sent" | string;
  title: string;
  summary: string;
  memoryPath: string | null;
  telegramTarget: {
    chatId: string;
    threadId: string | null;
    url: string | null;
  } | null;
  telegramSendStatus: "sent" | "not_supported" | string;
  decisions: string[];
  produces: string[];
  workOrderIds: string[];
  tags: string[];
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  sentAt: string | null;
};

type VoiceSessionEnvelope = {
  session: VoiceSessionSummary;
  profile: VoiceProfileSummary;
  turns: VoiceTurn[];
  contextSummary: string;
  switchTargets: string[];
  workOrders: VoiceWorkOrderSummary[];
  handoff: VoiceHandoffSummary | null;
  lastError: string | null;
};

type BrowserVoiceMode = "idle" | "connecting" | "listening" | "thinking" | "speaking" | "error";
type VoiceConsoleLayoutMode = "desktop" | "mobile";

type SpeechRecognitionResultItem = {
  transcript: string;
};

type SpeechRecognitionResultShape = {
  0: SpeechRecognitionResultItem;
  isFinal: boolean;
  length: number;
};

type SpeechRecognitionEventShape = Event & {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultShape>;
};

export function extractRecognitionTranscripts(event: SpeechRecognitionEventShape): {
  finalTranscript: string | null;
  interimTranscript: string | null;
} {
  let finalTranscript: string | null = null;
  let interimTranscript: string | null = null;

  for (let index = event.resultIndex; index < event.results.length; index += 1) {
    const result = event.results[index];
    const transcript = result?.[0]?.transcript?.trim() ?? "";
    if (!transcript) continue;

    if (result.isFinal) {
      finalTranscript = transcript;
    } else {
      interimTranscript = transcript;
    }
  }

  return { finalTranscript, interimTranscript };
}

type SpeechRecognitionErrorEventShape = Event & {
  error?: string;
  message?: string;
};

type BrowserSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: ((event: Event) => void) | null;
  onend: ((event: Event) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventShape) => void) | null;
  onresult: ((event: SpeechRecognitionEventShape) => void) | null;
  start: () => void;
  stop: () => void;
};

const CARD_STYLE = {
  background: "#141720",
  border: "1px solid #1e2128",
  borderRadius: 16,
};

function slugLabel(slug: string) {
  switch (slug) {
    case "main":
      return "Hermes";
    case "sales_support":
      return "Sales Support";
    case "luma":
      return "LUMA";
    case "fitness":
      return "Fitness";
    default:
      return slug;
  }
}

function stateLabel(state: string) {
  switch (state) {
    case "booting":
      return "Verbindet";
    case "hydrating_context":
      return "Lädt Kontext";
    case "ready":
      return "Bereit";
    case "listening":
      return "Hört zu";
    case "thinking":
      return "Denkt nach";
    case "speaking":
      return "Spricht";
    case "awaiting_user":
      return "Wartet auf dich";
    case "switching_context":
      return "Wechselt Kontext";
    case "paused":
      return "Pausiert";
    case "ending":
      return "Beendet";
    case "completed":
      return "Fertig";
    case "failed":
      return "Fehler";
    default:
      return state;
  }
}

function stateColor(state: string) {
  switch (state) {
    case "ready":
    case "awaiting_user":
      return "#10B981";
    case "thinking":
    case "hydrating_context":
    case "switching_context":
      return "#F59E0B";
    case "failed":
      return "#ef4444";
    default:
      return "#8b90a0";
  }
}

function formatTimestamp(value: string | null) {
  if (!value) return "–";
  return new Date(value).toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getVoiceModeLabel(mode: BrowserVoiceMode) {
  switch (mode) {
    case "connecting":
      return "Realtime verbindet";
    case "listening":
      return "Mikrofon läuft";
    case "thinking":
      return "Hermes denkt";
    case "speaking":
      return "Hermes spricht";
    case "error":
      return "Voice-Fehler";
    default:
      return "Bereit für Sprache";
  }
}

function getVisibleCallStatus(
  activeSession: VoiceSessionSummary | null,
  voiceMode: BrowserVoiceMode,
  isVoiceModeEnabled: boolean,
): { label: string; subline: string; tone: "idle" | "listening" | "thinking" | "speaking" | "muted" | "ended" | "error" } {
  if (!activeSession) {
    return { label: "Bereit für Call", subline: "Wähle einen Kontext und starte den Hermes-Call.", tone: "idle" };
  }
  if (activeSession.lastError || voiceMode === "error" || activeSession.state === "failed") {
    return { label: "Etwas ist schiefgelaufen", subline: "Text-Fallback und Details bleiben verfügbar.", tone: "error" };
  }
  if (activeSession.state === "completed" || activeSession.endedAt) {
    return { label: "Handoff bereit", subline: "Transcript und Memory-Zusammenfassung werden für Folgearbeit genutzt.", tone: "ended" };
  }
  if (activeSession.state === "ending") {
    return { label: "Ich speichere den Call", subline: "Transcript und Handoff werden vorbereitet.", tone: "thinking" };
  }
  if (activeSession.isMuted) {
    return { label: "Gemutet", subline: "Ich höre dich gerade nicht.", tone: "muted" };
  }
  if (voiceMode === "speaking" || activeSession.state === "speaking") {
    return { label: "Hermes spricht", subline: "Du kannst reinreden; ich stoppe die Antwort so gut der Browser es zulässt.", tone: "speaking" };
  }
  if (voiceMode === "thinking" || activeSession.state === "thinking" || activeSession.state === "hydrating_context") {
    return { label: "Ich schau kurz nach", subline: "Kontext und Quellen werden geprüft.", tone: "thinking" };
  }
  if (isVoiceModeEnabled || voiceMode === "listening" || activeSession.state === "listening" || activeSession.state === "awaiting_user") {
    return { label: "Ich höre zu", subline: "Sprich einfach los.", tone: "listening" };
  }
  if (voiceMode === "connecting" || activeSession.state === "booting" || activeSession.state === "ready") {
    return { label: "Call startet", subline: "Hermes verbindet und lädt den Kontext.", tone: "thinking" };
  }
  return { label: "Bereit", subline: "Starte den Call, um hands-free zu sprechen.", tone: "idle" };
}

function toneColor(tone: ReturnType<typeof getVisibleCallStatus>["tone"], activeColor: string) {
  switch (tone) {
    case "listening":
      return activeColor;
    case "speaking":
      return "#60a5fa";
    case "thinking":
      return "#f59e0b";
    case "muted":
      return "#f97316";
    case "ended":
      return "#10b981";
    case "error":
      return "#ef4444";
    default:
      return "#8b90a0";
  }
}

function isTerminalSession(session: VoiceSessionSummary | null) {
  return Boolean(session && (session.state === "completed" || session.state === "failed" || session.endedAt));
}

function getRealtimeEventType(event: MessageEvent<string>): string | null {
  try {
    const parsed = JSON.parse(event.data);
    return typeof parsed.type === "string" ? parsed.type : null;
  } catch {
    return null;
  }
}

function parseRealtimeEvent(event: MessageEvent<string>): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(event.data);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function getRealtimeTranscriptPayload(event: Record<string, unknown>): string | null {
  if (typeof event.transcript === "string") return event.transcript.trim();
  if (typeof event.text === "string") return event.text.trim();
  return null;
}

type RealtimeFunctionCall = {
  callId: string;
  name: string;
  arguments: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function extractRealtimeFunctionCalls(event: Record<string, unknown>): RealtimeFunctionCall[] {
  const response = asRecord(event.response);
  const output = Array.isArray(response?.output) ? response.output : [];
  const calls: RealtimeFunctionCall[] = [];

  for (const item of output) {
    const record = asRecord(item);
    if (!record || record.type !== "function_call") continue;
    const callId = typeof record.call_id === "string" ? record.call_id : "";
    const name = typeof record.name === "string" ? record.name : "";
    const args = typeof record.arguments === "string" ? record.arguments : "{}";
    if (callId && name) {
      calls.push({ callId, name, arguments: args });
    }
  }

  return calls;
}

function sendRealtimeEvent(dataChannel: RTCDataChannel, event: Record<string, unknown>) {
  if (dataChannel.readyState !== "open") return false;
  dataChannel.send(JSON.stringify(event));
  return true;
}

function needsFreshChatContextPreflight(text: string): boolean {
  const normalized = text.toLowerCase();
  const hasRecentWindow = /\b(gerade|eben|letzte[ nrs]?|letzten|halb(?:e|en)? stunde|halben stunde|stunde|stunden|heute)\b/.test(normalized);
  const hasChatReference = /\b(chat|telegram|verlauf|besprochen|gesprochen|diskutiert|zusammenfass|zusammenfassen)\b/.test(normalized);
  return hasRecentWindow && hasChatReference;
}

function waitForIceGatheringComplete(peerConnection: RTCPeerConnection): Promise<void> {
  if (peerConnection.iceGatheringState === "complete") {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const timeout = window.setTimeout(() => {
      peerConnection.removeEventListener("icegatheringstatechange", handleChange);
      resolve();
    }, 1500);

    function handleChange() {
      if (peerConnection.iceGatheringState !== "complete") return;
      window.clearTimeout(timeout);
      peerConnection.removeEventListener("icegatheringstatechange", handleChange);
      resolve();
    }

    peerConnection.addEventListener("icegatheringstatechange", handleChange);
  });
}

function extractRealtimeClientSecret(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const record = data as Record<string, unknown>;
  if (typeof record.value === "string") return record.value;

  const clientSecret = record.client_secret;
  if (clientSecret && typeof clientSecret === "object") {
    const value = (clientSecret as Record<string, unknown>).value;
    return typeof value === "string" ? value : null;
  }

  return null;
}

async function readJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    cache: "no-store",
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const data = await response.json();
      if (data && typeof data.error === "string") {
        message = data.error;
      }
    } catch {}
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export type VoiceConsoleViewProps = {
  profiles: VoiceProfileSummary[];
  sessions: VoiceSessionListItem[];
  activeSession: VoiceSessionSummary | null;
  activeProfile: VoiceProfileSummary | null;
  contextSummary: string | null;
  turns: VoiceTurn[];
  switchTargets: string[];
  workOrders: VoiceWorkOrderSummary[];
  handoff: VoiceHandoffSummary | null;
  draft: string;
  isBooting: boolean;
  isSubmitting: boolean;
  error: string | null;
  lastActionLabel: string | null;
  voiceMode: BrowserVoiceMode;
  browserVoiceSupported: boolean;
  liveTranscript: string;
  isVoiceModeEnabled: boolean;
  layoutMode: VoiceConsoleLayoutMode;
  canReplayAssistant: boolean;
  textFallbackOpen: boolean;
  detailsOpen: boolean;
  onDraftChange: (value: string) => void;
  onCreateSession: (profileId: string) => void;
  onSelectSession: (sessionId: string) => void;
  onRefresh: () => void;
  onSubmitTurn: () => void;
  onSwitchContext: (targetProfileSlug: string) => void;
  onToggleVoiceMode: () => void;
  onToggleMute: () => void;
  onToggleTextFallback: () => void;
  onToggleDetails: () => void;
  onReplayAssistant: () => void;
};

/* eslint-disable @typescript-eslint/no-unused-vars */
function LegacyVoiceConsoleView({
  profiles,
  sessions,
  activeSession,
  activeProfile,
  contextSummary,
  turns,
  switchTargets,
  workOrders,
  handoff,
  draft,
  isBooting,
  isSubmitting,
  error,
  lastActionLabel,
  voiceMode,
  browserVoiceSupported,
  liveTranscript,
  isVoiceModeEnabled,
  layoutMode,
  canReplayAssistant,
  textFallbackOpen,
  detailsOpen,
  onDraftChange,
  onCreateSession,
  onSelectSession,
  onRefresh,
  onSubmitTurn,
  onSwitchContext,
  onToggleVoiceMode,
  onToggleMute,
  onToggleTextFallback,
  onToggleDetails,
  onReplayAssistant,
}: VoiceConsoleViewProps) {
  const activeColor = activeProfile?.color ?? "#10B981";
  const isMobileLayout = layoutMode === "mobile";

  if (isMobileLayout) {
    return (
      <div style={{ padding: "16px 12px 92px", maxWidth: 520, margin: "0 auto" }}>
        {error && (
          <div style={{ ...CARD_STYLE, borderColor: "#ef444440", background: "#2a1115", padding: "12px 14px", marginBottom: 12, color: "#fecaca", fontSize: 13 }}>
            {error}
          </div>
        )}

        <section style={{ ...CARD_STYLE, padding: 14, marginBottom: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {profiles.map((profile) => {
              const isActive = activeProfile?.id === profile.id;
              return (
                <button
                  key={profile.id}
                  onClick={() => onCreateSession(profile.id)}
                  disabled={isSubmitting}
                  style={{
                    minHeight: 54,
                    padding: "10px 8px",
                    borderRadius: 10,
                    border: `1px solid ${isActive ? profile.color ?? "#10B981" : "#1e2128"}`,
                    background: isActive ? `${profile.color ?? "#10B981"}1f` : "#0f1219",
                    color: "#f0f2f5",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: isSubmitting ? "default" : "pointer",
                  }}
                >
                  {slugLabel(profile.slug)}
                </button>
              );
            })}
          </div>
        </section>

        <section style={{ ...CARD_STYLE, padding: 18, display: "grid", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div>
              <div style={{ color: "#f0f2f5", fontSize: 18, fontWeight: 800 }}>{activeProfile ? slugLabel(activeProfile.slug) : "Kein Kanal"}</div>
              <div style={{ marginTop: 4, color: stateColor(activeSession?.state ?? voiceMode), fontSize: 12, fontWeight: 700 }}>
                {activeSession ? getVoiceModeLabel(voiceMode) : "Bereit"}
              </div>
            </div>
            <div style={{ width: 14, height: 14, borderRadius: "50%", background: isVoiceModeEnabled ? "#10B981" : "#4a5068", boxShadow: isVoiceModeEnabled ? "0 0 0 6px #10B98122" : "none" }} />
          </div>

          <button
            onClick={onToggleVoiceMode}
            disabled={!activeSession || !browserVoiceSupported || isSubmitting}
            style={{
              width: "100%",
              minHeight: 56,
              borderRadius: 12,
              border: "none",
              background: !activeSession || !browserVoiceSupported ? "#374151" : isVoiceModeEnabled ? "#ef4444" : "#10B981",
              color: "#fff",
              fontSize: 16,
              fontWeight: 800,
              cursor: !activeSession || !browserVoiceSupported || isSubmitting ? "default" : "pointer",
            }}
          >
            {isVoiceModeEnabled ? "Gespräch beenden" : "Gespräch starten"}
          </button>

          {!activeSession && (
            <div style={{ color: "#8b90a0", fontSize: 12, textAlign: "center" }}>Wähle oben einen Kanal.</div>
          )}
          {!browserVoiceSupported && (
            <div style={{ color: "#fcd34d", fontSize: 12, textAlign: "center" }}>WebRTC oder Mikrofonzugriff fehlt.</div>
          )}
        </section>
      </div>
    );
  }

  return (
    <div style={{ padding: isMobileLayout ? "16px 12px" : "20px 24px", maxWidth: 1180, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 12, letterSpacing: "0.16em", textTransform: "uppercase", color: "#10B981", marginBottom: 8 }}>Call Mode</div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "#f0f2f5", margin: 0 }}>Mission Control Voice</h1>
          <p style={{ marginTop: 8, marginBottom: 0, color: "#8b90a0", fontSize: 14, maxWidth: 780 }}>
            Starte einen natürlichen Voice-Call mit Hermes, Sales Support oder LUMA. Ein Tap zum Verbinden — danach begrüßt Hermes dich und hört weiter zu.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {lastActionLabel && (
            <span style={{ fontSize: 12, color: "#8b90a0" }}>{lastActionLabel}</span>
          )}
          <button
            onClick={onRefresh}
            style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #1e2128", background: "#1a1d27", color: "#f0f2f5", fontSize: 13, cursor: "pointer" }}
          >
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div style={{ ...CARD_STYLE, borderColor: "#ef444440", background: "#2a1115", padding: "12px 16px", marginBottom: 16, color: "#fecaca", fontSize: 13 }}>
          {error}
        </div>
      )}

      {isBooting && (
        <div style={{ ...CARD_STYLE, padding: "12px 16px", marginBottom: 16, color: "#c8ccd6", fontSize: 13 }}>
          Lade Voice-Kontext …
        </div>
      )}

      {!browserVoiceSupported && (
        <div style={{ ...CARD_STYLE, padding: "12px 16px", marginBottom: 16, color: "#fcd34d", fontSize: 13 }}>
          Sprachmodus in diesem Browser nicht unterstützt.
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: isMobileLayout ? "1fr" : "minmax(290px, 360px) minmax(0, 1fr)", gap: 18, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <section style={{ ...CARD_STYLE, padding: 18 }}>
            <div style={{ fontSize: 12, color: "#8b90a0", marginBottom: 12 }}>Wähle, wen du anrufen willst</div>
            <div style={{ display: "grid", gap: 10 }}>
              {profiles.map((profile) => (
                <button
                  key={profile.id}
                  onClick={() => onCreateSession(profile.id)}
                  style={{
                    textAlign: "left",
                    padding: "14px 14px",
                    borderRadius: 12,
                    border: `1px solid ${(profile.color ?? "#10B981")}55`,
                    background: "#0f1219",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <span style={{ color: "#f0f2f5", fontWeight: 600, fontSize: 14 }}>{profile.label}</span>
                    <span style={{ fontSize: 11, color: profile.color ?? "#10B981" }}>Gespräch starten</span>
                  </div>
                  <div style={{ marginTop: 6, fontSize: 12, color: "#8b90a0" }}>{profile.description ?? slugLabel(profile.slug)}</div>
                </button>
              ))}
            </div>
          </section>

          <section style={{ ...CARD_STYLE, padding: 18 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: "#8b90a0" }}>Letzte Sessions</div>
              <div style={{ fontSize: 11, color: "#4a5068" }}>{sessions.length}</div>
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              {sessions.length === 0 && <div style={{ fontSize: 12, color: "#4a5068" }}>Noch keine Session gestartet.</div>}
              {sessions.map((entry) => (
                <button
                  key={entry.session.id}
                  onClick={() => onSelectSession(entry.session.id)}
                  style={{
                    textAlign: "left",
                    padding: "12px 14px",
                    borderRadius: 12,
                    border: activeSession?.id === entry.session.id ? `1px solid ${(entry.profile.color ?? "#10B981")}88` : "1px solid #1e2128",
                    background: activeSession?.id === entry.session.id ? "#18202b" : "#0f1219",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <span style={{ color: "#f0f2f5", fontSize: 13, fontWeight: 600 }}>{entry.profile.label}</span>
                    <span style={{ color: stateColor(entry.session.state), fontSize: 11 }}>{stateLabel(entry.session.state)}</span>
                  </div>
                  <div style={{ marginTop: 6, color: "#8b90a0", fontSize: 12 }}>{entry.contextSummary}</div>
                </button>
              ))}
            </div>
          </section>
        </div>

        <section style={{ ...CARD_STYLE, padding: 18 }}>
          {!activeSession || !activeProfile ? (
            <div style={{ minHeight: isMobileLayout ? 240 : 460, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", color: "#8b90a0", padding: isMobileLayout ? 20 : 32 }}>
              <div style={{ fontSize: 42, marginBottom: 10 }}>🎙️</div>
              <div style={{ fontSize: 16, color: "#f0f2f5", fontWeight: 600, marginBottom: 8 }}>Noch kein Gespräch aktiv</div>
              <div style={{ fontSize: 13, maxWidth: 420 }}>Starte links einen Call. Hermes meldet sich direkt und du kannst danach freihändig weiterreden.</div>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <h2 style={{ fontSize: 20, fontWeight: 700, color: "#f0f2f5", margin: 0 }}>{activeProfile.label}</h2>
                    <span style={{ padding: "4px 10px", borderRadius: 999, background: `${activeColor}22`, color: activeColor, fontSize: 11, fontWeight: 700 }}>
                      {stateLabel(activeSession.state)}
                    </span>
                  </div>
                  <div style={{ marginTop: 8, color: "#8b90a0", fontSize: 13 }}>{contextSummary ?? activeProfile.label}</div>
                </div>
                <div style={{ display: "grid", gap: 4, fontSize: 11, color: "#8b90a0", minWidth: isMobileLayout ? 0 : 170 }}>
                  <span>Session: {activeSession.id.slice(0, 8)}</span>
                  <span>Transport: {activeSession.transport}</span>
                  <span>Aktualisiert: {formatTimestamp(activeSession.updatedAt)}</span>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: isMobileLayout ? "1fr" : "minmax(0, 1fr) 260px", gap: 16, alignItems: "start" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ background: "#0f1219", border: "1px solid #1e2128", borderRadius: 14, padding: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 10 }}>
                      <div style={{ fontSize: 11, color: "#4a5068", letterSpacing: "0.14em", textTransform: "uppercase" }}>Live Call</div>
                      <span style={{ padding: "4px 10px", borderRadius: 999, background: `${activeColor}22`, color: activeColor, fontSize: 11, fontWeight: 700 }}>
                        {getVoiceModeLabel(voiceMode)}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: "#8b90a0", lineHeight: 1.5, marginBottom: 10 }}>
                      {browserVoiceSupported
                        ? "Einmal Gespräch starten und dann natürlich sprechen. Hermes läuft direkt über OpenAI Realtime WebRTC mit Mikrofon und Audio-Rückkanal."
                        : "Für den freihändigen Call-Modus brauchst du einen Browser mit WebRTC und Mikrofonzugriff."}
                    </div>
                    {liveTranscript && (
                      <div style={{ marginBottom: 10, background: "#141720", border: "1px solid #1e2128", borderRadius: 12, padding: "10px 12px", color: "#f0f2f5", fontSize: 13 }}>
                        {liveTranscript}
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", flexDirection: isMobileLayout ? "column" : "row" }}>
                      <button
                        onClick={onToggleVoiceMode}
                        disabled={!browserVoiceSupported || isSubmitting}
                        style={{
                          padding: "10px 14px",
                          borderRadius: 10,
                          border: "none",
                          background: !browserVoiceSupported ? "#374151" : isVoiceModeEnabled ? "#ef4444" : "#10B981",
                          color: "#fff",
                          fontWeight: 700,
                          cursor: !browserVoiceSupported || isSubmitting ? "default" : "pointer",
                          width: isMobileLayout ? "100%" : undefined,
                        }}
                      >
                        {isVoiceModeEnabled ? "Gespräch beenden" : "Gespräch starten"}
                      </button>
                      {canReplayAssistant && (
                        <button
                          onClick={onReplayAssistant}
                          disabled={isSubmitting}
                          style={{
                            padding: "10px 14px",
                            borderRadius: 10,
                            border: "1px solid #1e2128",
                            background: "#141720",
                            color: "#f0f2f5",
                            fontWeight: 700,
                            cursor: isSubmitting ? "default" : "pointer",
                            width: isMobileLayout ? "100%" : undefined,
                          }}
                        >
                          Nochmal abspielen
                        </button>
                      )}
                    </div>
                  </div>

                  <div style={{ background: "#0f1219", border: "1px solid #1e2128", borderRadius: 14, minHeight: isMobileLayout ? 240 : 320, maxHeight: isMobileLayout ? "none" : 520, overflowY: "auto", padding: 14 }}>
                    <div style={{ fontSize: 11, color: "#4a5068", marginBottom: 12, letterSpacing: "0.14em", textTransform: "uppercase" }}>Gespräch</div>
                    {turns.length === 0 ? (
                      <div style={{ fontSize: 12, color: "#4a5068" }}>Noch keine Turns vorhanden.</div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {turns.map((turn) => {
                          const isAssistant = turn.speaker === "assistant";
                          const isSystem = turn.speaker === "system";
                          return (
                            <div
                              key={turn.id}
                              style={{
                                alignSelf: isAssistant ? "flex-start" : "stretch",
                                background: isSystem ? "#1f2937" : isAssistant ? "#10261d" : "#1a1d27",
                                border: `1px solid ${isSystem ? "#374151" : isAssistant ? "#10B98133" : "#2a2d38"}`,
                                borderRadius: 12,
                                padding: "10px 12px",
                              }}
                            >
                              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 6 }}>
                                <span style={{ fontSize: 11, color: isAssistant ? "#10B981" : isSystem ? "#cbd5e1" : "#93c5fd", fontWeight: 700 }}>
                                  {turn.speaker === "user" ? "Du" : turn.speaker === "assistant" ? "Hermes" : "System"}
                                </span>
                                <span style={{ fontSize: 10, color: "#4a5068" }}>{formatTimestamp(turn.createdAt)}</span>
                              </div>
                              <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.55, color: "#f0f2f5", fontSize: 13 }}>{turn.text}</div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div style={{ background: "#0f1219", border: "1px solid #1e2128", borderRadius: 14, padding: 14 }}>
                    <div style={{ fontSize: 11, color: "#4a5068", marginBottom: 8, letterSpacing: "0.14em", textTransform: "uppercase" }}>Text-Fallback</div>
                    <textarea
                      value={draft}
                      onChange={(event) => onDraftChange(event.target.value)}
                      placeholder="Frag z. B. nach dem Status von LUMA oder bitte um einen nächsten Schritt."
                      style={{ width: "100%", minHeight: 110, resize: "vertical", borderRadius: 12, border: "1px solid #1e2128", background: "#141720", color: "#f0f2f5", padding: 12, fontSize: 13, outline: "none", boxSizing: "border-box" }}
                    />
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: isMobileLayout ? "stretch" : "center", marginTop: 10, gap: 12, flexWrap: "wrap", flexDirection: isMobileLayout ? "column" : "row" }}>
                      <div style={{ fontSize: 11, color: "#8b90a0" }}>Nur falls Mic oder Audio klemmt: hier kannst du Hermes auch tippen.</div>
                      <button
                        onClick={onSubmitTurn}
                        disabled={isSubmitting || draft.trim().length === 0}
                        style={{
                          padding: "10px 14px",
                          borderRadius: 10,
                          border: "none",
                          background: isSubmitting || draft.trim().length === 0 ? "#0a7a50" : "#10B981",
                          color: "#fff",
                          fontWeight: 700,
                          cursor: isSubmitting || draft.trim().length === 0 ? "default" : "pointer",
                          width: isMobileLayout ? "100%" : undefined,
                        }}
                      >
                        {isSubmitting ? "Sende …" : "Text senden"}
                      </button>
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ background: "#0f1219", border: "1px solid #1e2128", borderRadius: 14, padding: 14 }}>
                    <div style={{ fontSize: 11, color: "#4a5068", marginBottom: 10, letterSpacing: "0.14em", textTransform: "uppercase" }}>Kontextsprünge</div>
                    <div style={{ display: "grid", gap: 8 }}>
                      {switchTargets.length === 0 && <div style={{ fontSize: 12, color: "#4a5068" }}>Keine Switch-Targets hinterlegt.</div>}
                      {switchTargets.map((slug) => (
                        <button
                          key={slug}
                          onClick={() => onSwitchContext(slug)}
                          style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #1e2128", background: "#141720", color: "#f0f2f5", textAlign: "left", cursor: "pointer" }}
                        >
                          Zu {slugLabel(slug)} wechseln
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ background: "#0f1219", border: "1px solid #1e2128", borderRadius: 14, padding: 14 }}>
                    <div style={{ fontSize: 11, color: "#4a5068", marginBottom: 10, letterSpacing: "0.14em", textTransform: "uppercase" }}>Session Snapshot</div>
                    <div style={{ display: "grid", gap: 8, fontSize: 12, color: "#c8ccd6" }}>
                      <div><span style={{ color: "#8b90a0" }}>Letzter User-Turn:</span><br />{activeSession.lastUserTranscript ?? "–"}</div>
                      <div><span style={{ color: "#8b90a0" }}>Letzte Assistant-Antwort:</span><br />{activeSession.lastAssistantText ?? "–"}</div>
                      <div><span style={{ color: "#8b90a0" }}>Started:</span> {formatTimestamp(activeSession.startedAt)}</div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
/* eslint-enable @typescript-eslint/no-unused-vars */

export function VoiceConsoleView({
  profiles,
  sessions,
  activeSession,
  activeProfile,
  contextSummary,
  turns,
  switchTargets,
  workOrders,
  handoff,
  draft,
  isBooting,
  isSubmitting,
  error,
  lastActionLabel,
  voiceMode,
  browserVoiceSupported,
  liveTranscript,
  isVoiceModeEnabled,
  layoutMode,
  canReplayAssistant,
  textFallbackOpen,
  detailsOpen,
  onDraftChange,
  onCreateSession,
  onSelectSession,
  onRefresh,
  onSubmitTurn,
  onSwitchContext,
  onToggleVoiceMode,
  onToggleMute,
  onToggleTextFallback,
  onToggleDetails,
  onReplayAssistant,
}: VoiceConsoleViewProps) {
  const activeColor = activeProfile?.color ?? "#10B981";
  const status = getVisibleCallStatus(activeSession, voiceMode, isVoiceModeEnabled);
  const statusColor = toneColor(status.tone, activeColor);
  const callEnded = isTerminalSession(activeSession);
  const hasActiveCall = Boolean(activeSession && activeProfile && !callEnded);
  const profileBinding = activeProfile?.telegramBinding ?? null;
  const shellMaxWidth = layoutMode === "mobile" ? 560 : 980;
  const latestAssistant = turns.filter((turn) => turn.speaker === "assistant").slice(-1)[0] ?? null;

  const iconButtonStyle: React.CSSProperties = {
    minHeight: 44,
    borderRadius: 8,
    border: "1px solid #242936",
    background: "#1a1d27",
    color: "#f0f2f5",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: "0 12px",
    fontSize: 13,
    fontWeight: 700,
    cursor: isSubmitting ? "default" : "pointer",
  };

  return (
    <main style={{ minHeight: "100vh", background: "#141720", color: "#f0f2f5", padding: layoutMode === "mobile" ? "14px 12px 94px" : "24px 24px 72px" }}>
      <div style={{ maxWidth: shellMaxWidth, margin: "0 auto", display: "grid", gap: 18 }}>
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ color: "#10B981", fontSize: 12, fontWeight: 800, textTransform: "uppercase" }}>Call Mode</div>
            <h1 style={{ margin: "4px 0 0", fontSize: layoutMode === "mobile" ? 24 : 30, lineHeight: 1.1 }}>Hermes Call</h1>
          </div>
          <button onClick={onRefresh} style={{ ...iconButtonStyle, width: 44, padding: 0 }} aria-label="Aktualisieren" title="Aktualisieren">
            <RefreshCw size={18} />
          </button>
        </header>

        {(error || isBooting || !browserVoiceSupported) && (
          <section style={{ borderRadius: 8, border: `1px solid ${error ? "#ef444455" : "#2a2f3d"}`, background: error ? "#2a1115" : "#10131b", padding: 12, color: error ? "#fecaca" : "#c8ccd6", fontSize: 13 }}>
            {error ?? (isBooting ? "Kontext wird geladen..." : "Realtime-WebRTC oder Mikrofonzugriff ist in diesem Browser nicht verfügbar.")}
          </section>
        )}

        <section style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <div style={{ color: "#8b90a0", fontSize: 12, fontWeight: 700 }}>Kontext</div>
            {lastActionLabel && <div style={{ color: "#8b90a0", fontSize: 12 }}>{lastActionLabel}</div>}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: layoutMode === "mobile" ? "1fr" : "repeat(3, minmax(0, 1fr))", gap: 10 }}>
            {profiles.map((profile) => {
              const selected = activeProfile?.id === profile.id;
              return (
                <button
                  key={profile.id}
                  onClick={() => onCreateSession(profile.id)}
                  disabled={isSubmitting}
                  style={{
                    borderRadius: 8,
                    border: `1px solid ${selected ? profile.color ?? "#10B981" : "#242936"}`,
                    background: selected ? `${profile.color ?? "#10B981"}22` : "#10131b",
                    color: "#f0f2f5",
                    textAlign: "left",
                    padding: 14,
                    minHeight: 86,
                    cursor: isSubmitting ? "default" : "pointer",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <strong style={{ fontSize: 15 }}>{slugLabel(profile.slug)}</strong>
                    <Phone size={17} color={profile.color ?? "#10B981"} />
                  </div>
                  <div style={{ marginTop: 6, color: "#a1a6b3", fontSize: 12, lineHeight: 1.35 }}>{profile.telegramBinding?.label ?? profile.description ?? "Mission-Control-Kontext"}</div>
                </button>
              );
            })}
          </div>
        </section>

        <section style={{ borderRadius: 8, border: "1px solid #242936", background: "#10131b", padding: layoutMode === "mobile" ? 18 : 24, display: "grid", gap: 18 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div>
              <div style={{ color: "#8b90a0", fontSize: 12 }}>{activeProfile ? slugLabel(activeProfile.slug) : "Kein Profil gewählt"}</div>
              <div style={{ marginTop: 4, fontSize: 15, color: "#c8ccd6" }}>{contextSummary ?? "Mission Control bleibt die primäre Call-Oberfläche."}</div>
            </div>
            {profileBinding && (
              <span style={{ borderRadius: 999, border: "1px solid #2a2f3d", padding: "6px 10px", color: "#c8ccd6", fontSize: 12 }}>
                {profileBinding.label}
              </span>
            )}
          </div>

          <div style={{ display: "grid", placeItems: "center", gap: 16, padding: layoutMode === "mobile" ? "12px 0" : "22px 0" }}>
            <div
              aria-label={status.label}
              style={{
                width: layoutMode === "mobile" ? 184 : 236,
                aspectRatio: "1 / 1",
                borderRadius: "50%",
                display: "grid",
                placeItems: "center",
                background: `radial-gradient(circle at 50% 42%, ${statusColor}33 0, ${statusColor}1a 44%, #151923 72%)`,
                border: `1px solid ${statusColor}66`,
                boxShadow: hasActiveCall ? `0 0 0 8px ${statusColor}14, 0 0 48px ${statusColor}22` : "none",
              }}
            >
              <div style={{ textAlign: "center" }}>
                {activeSession?.isMuted ? <MicOff size={44} color={statusColor} /> : status.tone === "speaking" ? <Volume2 size={44} color={statusColor} /> : <Mic size={44} color={statusColor} />}
                <div style={{ marginTop: 10, fontSize: 13, color: "#c8ccd6" }}>{activeSession ? stateLabel(activeSession.state) : "Idle"}</div>
              </div>
            </div>
            <div style={{ textAlign: "center", display: "grid", gap: 5 }}>
              <div style={{ fontSize: layoutMode === "mobile" ? 24 : 30, fontWeight: 850 }}>{status.label}</div>
              <div style={{ color: "#a1a6b3", fontSize: 14 }}>{status.subline}</div>
              {liveTranscript && (
                <div style={{ marginTop: 6, color: "#dbeafe", fontSize: 13, maxWidth: 520 }}>
                  {liveTranscript}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: layoutMode === "mobile" ? "1fr 1fr" : "repeat(5, minmax(0, 1fr))", gap: 10 }}>
            <button
              onClick={onToggleVoiceMode}
              disabled={!activeSession || !browserVoiceSupported || isSubmitting}
              style={{
                ...iconButtonStyle,
                background: isVoiceModeEnabled || hasActiveCall ? "#ef4444" : "#10B981",
                border: "none",
                gridColumn: layoutMode === "mobile" ? "span 2" : undefined,
              }}
            >
              {isVoiceModeEnabled || hasActiveCall ? <PhoneOff size={18} /> : <Phone size={18} />}
              {isVoiceModeEnabled || hasActiveCall ? "Gespräch beenden" : "Gespräch starten"}
            </button>
            <button onClick={onToggleMute} disabled={!activeSession || callEnded || isSubmitting} style={{ ...iconButtonStyle, background: activeSession?.isMuted ? "#f97316" : "#1a1d27" }}>
              {activeSession?.isMuted ? <MicOff size={18} /> : <Mic size={18} />}
              {activeSession?.isMuted ? "Unmute" : "Mute"}
            </button>
            <button onClick={onToggleTextFallback} disabled={!activeSession} style={iconButtonStyle}>
              <MessageSquareText size={18} />
              Text
            </button>
            <button onClick={onToggleDetails} disabled={!activeSession} style={iconButtonStyle}>
              <MoreHorizontal size={18} />
              Details
            </button>
            {profileBinding?.handoffUrl ? (
              <a href={profileBinding.handoffUrl} target="_blank" rel="noreferrer" style={{ ...iconButtonStyle, textDecoration: "none" }}>
                <ExternalLink size={18} />
                Telegram
              </a>
            ) : (
              <button disabled style={{ ...iconButtonStyle, opacity: 0.55 }}>
                <ExternalLink size={18} />
                Telegram
              </button>
            )}
          </div>

          {textFallbackOpen && (
            <section style={{ borderTop: "1px solid #242936", paddingTop: 16, display: "grid", gap: 10 }}>
              <div style={{ color: "#8b90a0", fontSize: 12, fontWeight: 700 }}>Text-Fallback</div>
              <textarea
                value={draft}
                onChange={(event) => onDraftChange(event.target.value)}
                placeholder="Fallback nur falls Audio oder Umgebung nicht passt."
                style={{ width: "100%", minHeight: 88, resize: "vertical", borderRadius: 8, border: "1px solid #242936", background: "#141720", color: "#f0f2f5", padding: 12, fontSize: 14, outline: "none", boxSizing: "border-box" }}
              />
              <button onClick={onSubmitTurn} disabled={isSubmitting || draft.trim().length === 0} style={{ ...iconButtonStyle, justifySelf: "end", background: "#10B981", border: "none" }}>
                <Send size={18} />
                {isSubmitting ? "Sende..." : "Senden"}
              </button>
            </section>
          )}

          {detailsOpen && (
            <section style={{ borderTop: "1px solid #242936", paddingTop: 16, display: "grid", gap: 14 }}>
              <div style={{ display: "grid", gap: 6, color: "#c8ccd6", fontSize: 13 }}>
                <div><span style={{ color: "#8b90a0" }}>Session:</span> {activeSession?.id.slice(0, 12) ?? "-"}</div>
                <div><span style={{ color: "#8b90a0" }}>Letzter User-Turn:</span> {activeSession?.lastUserTranscript ?? "-"}</div>
                <div><span style={{ color: "#8b90a0" }}>Letzte Hermes-Antwort:</span> {latestAssistant?.text ?? activeSession?.lastAssistantText ?? "-"}</div>
              </div>
              {canReplayAssistant && (
                <button onClick={onReplayAssistant} disabled={isSubmitting} style={{ ...iconButtonStyle, justifySelf: "start" }}>
                  <RotateCcw size={18} />
                  Nochmal abspielen
                </button>
              )}
              <div style={{ display: "grid", gap: 8, maxHeight: 260, overflowY: "auto" }}>
                {turns.length === 0 ? (
                  <div style={{ color: "#8b90a0", fontSize: 13 }}>Noch kein Transcript.</div>
                ) : turns.map((turn) => (
                  <div key={turn.id} style={{ borderRadius: 8, border: "1px solid #242936", padding: 10, background: turn.speaker === "assistant" ? "#10261d" : "#1a1d27" }}>
                    <div style={{ color: turn.speaker === "assistant" ? "#10B981" : "#93c5fd", fontSize: 11, fontWeight: 800, marginBottom: 4 }}>
                      {turn.speaker === "assistant" ? "Hermes" : turn.speaker === "user" ? "Du" : "System"}
                    </div>
                    <div style={{ color: "#f0f2f5", fontSize: 13, lineHeight: 1.45, whiteSpace: "pre-wrap" }}>{turn.text}</div>
                  </div>
                ))}
              </div>
              {switchTargets.length > 0 && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {switchTargets.map((slug) => (
                    <button key={slug} onClick={() => onSwitchContext(slug)} style={{ ...iconButtonStyle, minHeight: 38 }}>
                      Zu {slugLabel(slug)}
                    </button>
                  ))}
                </div>
              )}
            </section>
          )}
        </section>

        {callEnded && (
          <section style={{ borderRadius: 8, border: "1px solid #1f6f4a", background: "#0f1f1a", padding: 16, display: "grid", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <strong>{handoff ? "Handoff bereit" : "Handoff nicht vorbereitet"}</strong>
              <span style={{ color: handoff?.status === "prepared" ? "#10B981" : "#f59e0b", fontSize: 12, fontWeight: 800 }}>
                Status: {handoff?.status ?? "fehlt"}
              </span>
            </div>
            {handoff ? (
              <div style={{ display: "grid", gap: 8, color: "#c8ccd6", fontSize: 13 }}>
                <div><span style={{ color: "#8b90a0" }}>Memory:</span> {handoff.memoryPath ?? "nicht gespeichert"}</div>
                <div><span style={{ color: "#8b90a0" }}>Work Orders:</span> {workOrders.length}</div>
                {workOrders.length > 0 && (
                  <div style={{ display: "grid", gap: 6 }}>
                    {workOrders.map((order) => (
                      <div key={order.id} style={{ borderRadius: 8, border: "1px solid #1f6f4a55", padding: "8px 10px", background: "#10261d" }}>
                        <strong>{order.title}</strong>
                        <span style={{ color: "#8b90a0" }}> · {order.status} · {order.requestedOutput}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div>
                  <span style={{ color: "#8b90a0" }}>Telegram:</span>{" "}
                  {handoff.telegramTarget?.url ? (
                    <a href={handoff.telegramTarget.url} target="_blank" rel="noreferrer" style={{ color: "#93c5fd" }}>
                      Telegram öffnen
                    </a>
                  ) : "kein direkter Link"}
                  <span style={{ color: "#8b90a0" }}> · vorbereitet, nicht gesendet</span>
                </div>
                <div style={{ color: "#a1a6b3" }}>
                  Automatisches Senden nach Telegram ist in dieser Version nicht aktiv.
                </div>
              </div>
            ) : (
              <div style={{ color: "#fcd34d", fontSize: 13 }}>
                Der Call ist beendet, aber kein verifizierbares Handoff-Paket wurde gefunden.
              </div>
            )}
          </section>
        )}

        {sessions.length > 0 && !hasActiveCall && (
          <section style={{ display: "grid", gap: 8 }}>
            <div style={{ color: "#8b90a0", fontSize: 12, fontWeight: 700 }}>Letzte Calls</div>
            <div style={{ display: "grid", gap: 8 }}>
              {sessions.slice(0, 4).map((entry) => (
                <button key={entry.session.id} onClick={() => onSelectSession(entry.session.id)} style={{ borderRadius: 8, border: "1px solid #242936", background: "#10131b", color: "#f0f2f5", textAlign: "left", padding: 12, cursor: "pointer" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <strong>{slugLabel(entry.profile.slug)}</strong>
                    <span style={{ color: stateColor(entry.session.state), fontSize: 12 }}>{stateLabel(entry.session.state)}</span>
                  </div>
                  <div style={{ marginTop: 5, color: "#8b90a0", fontSize: 12 }}>{entry.contextSummary}</div>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

export default function VoiceConsole() {
  const [profiles, setProfiles] = useState<VoiceProfileSummary[]>([]);
  const [sessions, setSessions] = useState<VoiceSessionListItem[]>([]);
  const [active, setActive] = useState<VoiceSessionEnvelope | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isBooting, setIsBooting] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastActionLabel, setLastActionLabel] = useState<string | null>(null);
  const [voiceMode, setVoiceMode] = useState<BrowserVoiceMode>("idle");
  const [browserVoiceSupported, setBrowserVoiceSupported] = useState(true);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [isVoiceModeEnabled, setIsVoiceModeEnabled] = useState(false);
  const [textFallbackOpen, setTextFallbackOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [layoutMode, setLayoutMode] = useState<VoiceConsoleLayoutMode>(() => {
    if (typeof window === "undefined") return "desktop";
    return window.innerWidth <= 900 ? "mobile" : "desktop";
  });
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const shouldRestartRecognitionRef = useRef(false);
  const recognitionHoldRef = useRef(false);
  const assistantAudioRef = useRef<HTMLAudioElement | null>(null);
  const realtimePeerRef = useRef<RTCPeerConnection | null>(null);
  const realtimeDataChannelRef = useRef<RTCDataChannel | null>(null);
  const realtimeMediaStreamRef = useRef<MediaStream | null>(null);
  const realtimeAudioElementRef = useRef<HTMLAudioElement | null>(null);
  const activeSessionIdRef = useRef<string | null>(null);
  const isSubmittingRef = useRef(false);
  const isMutedRef = useRef(false);
  const assistantSpeakingRef = useRef(false);

  const loadProfiles = useCallback(async () => {
    const data = await readJson<{ profiles: VoiceProfileSummary[] }>("/api/voice/profiles");
    setProfiles(data.profiles ?? []);
  }, []);

  const loadSessions = useCallback(async () => {
    const data = await readJson<{ sessions: VoiceSessionListItem[] }>("/api/voice/sessions?limit=12");
    setSessions(data.sessions ?? []);
    return data.sessions ?? [];
  }, []);

  const loadSessionDetail = useCallback(async (sessionId: string) => {
    const data = await readJson<VoiceSessionEnvelope>(`/api/voice/sessions/${sessionId}?limit=80`);
    setActive(data);
    return data;
  }, []);

  const primeSpeechSynthesis = useCallback(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      return;
    }
    void window.speechSynthesis.getVoices();
    window.speechSynthesis.resume();
  }, []);

  const resumeRecognitionAfterAssistant = useCallback(() => {
    recognitionHoldRef.current = false;
    if (!shouldRestartRecognitionRef.current) {
      setVoiceMode("idle");
      return;
    }
    try {
      recognitionRef.current?.start();
      setVoiceMode("listening");
      setLastActionLabel("Hermes hört wieder zu");
    } catch {
      setVoiceMode("listening");
    }
  }, []);

  const pauseRecognitionForAssistant = useCallback(() => {
    recognitionHoldRef.current = true;
    recognitionRef.current?.stop();
  }, []);

  const speakAssistantText = useCallback((text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis || !text.trim()) {
      return;
    }
    pauseRecognitionForAssistant();
    primeSpeechSynthesis();
    const voicePool = availableVoices.length > 0 ? availableVoices : window.speechSynthesis.getVoices();
    const preferredVoice = pickPreferredSpeechSynthesisVoice(voicePool);

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text.trim());
    utterance.lang = preferredVoice?.lang || "de-DE";
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }
    utterance.rate = 0.96;
    utterance.pitch = 1;
    utterance.onstart = () => {
      setVoiceMode("speaking");
      setLastActionLabel("Hermes spricht");
    };
    utterance.onend = () => {
      resumeRecognitionAfterAssistant();
    };
    utterance.onerror = () => {
      setVoiceMode("error");
      setLastActionLabel("Audio blockiert? Tippe auf „Nochmal abspielen“.");
      recognitionHoldRef.current = false;
    };
    window.speechSynthesis.speak(utterance);
  }, [availableVoices, pauseRecognitionForAssistant, primeSpeechSynthesis, resumeRecognitionAfterAssistant]);

  const playAssistantResponse = useCallback(async (text: string) => {
    const normalized = text.trim();
    if (!normalized) {
      resumeRecognitionAfterAssistant();
      return;
    }

    pauseRecognitionForAssistant();
    try {
      const response = await fetch("/api/voice/tts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: normalized }),
      });

      const contentType = response.headers.get("content-type") || "";
      if (!response.ok) {
        throw new Error(`TTS request failed (${response.status})`);
      }

      if (contentType.includes("application/json")) {
        speakAssistantText(normalized);
        return;
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      assistantAudioRef.current?.pause();
      assistantAudioRef.current = new Audio(objectUrl);
      assistantAudioRef.current.onplay = () => {
        setVoiceMode("speaking");
        setLastActionLabel("Hermes spricht");
      };
      assistantAudioRef.current.onended = () => {
        URL.revokeObjectURL(objectUrl);
        assistantAudioRef.current = null;
        resumeRecognitionAfterAssistant();
      };
      assistantAudioRef.current.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        assistantAudioRef.current = null;
        speakAssistantText(normalized);
      };
      await assistantAudioRef.current.play();
    } catch {
      speakAssistantText(normalized);
    }
  }, [pauseRecognitionForAssistant, resumeRecognitionAfterAssistant, speakAssistantText]);

  const sendVoiceTurn = useCallback(async (userText: string) => {
    if (!activeSessionIdRef.current || userText.trim().length === 0 || isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setError(null);
    setIsSubmitting(true);
    pauseRecognitionForAssistant();
    setVoiceMode("thinking");
    setLastActionLabel("Hermes verarbeitet deine Frage");
    try {
      const response = await readJson<{ session: VoiceSessionSummary; assistantText: string }>(
        `/api/voice/sessions/${activeSessionIdRef.current}/complete-turn`,
        {
          method: "POST",
          body: JSON.stringify({ userText: userText.trim(), source: "browser-voice" }),
        },
      );
      setDraft("");
      setLiveTranscript("");
      await Promise.all([loadSessions(), loadSessionDetail(activeSessionIdRef.current)]);
      setLastActionLabel("Antwort da");
      if (response.assistantText) {
        await playAssistantResponse(response.assistantText);
      } else {
        resumeRecognitionAfterAssistant();
      }
    } catch (nextError) {
      setVoiceMode("error");
      recognitionHoldRef.current = false;
      setError(nextError instanceof Error ? nextError.message : String(nextError));
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }, [loadSessionDetail, loadSessions, pauseRecognitionForAssistant, playAssistantResponse, resumeRecognitionAfterAssistant]);

  const recordRealtimeTranscript = useCallback(async (
    sessionId: string,
    speaker: "user" | "assistant",
    text: string,
    metadata?: Record<string, unknown>,
  ) => {
    if (!text.trim()) return;
    try {
      await readJson(`/api/voice/sessions/${sessionId}/realtime-turn`, {
        method: "POST",
        body: JSON.stringify({ speaker, text: text.trim(), metadata }),
      });
      await loadSessionDetail(sessionId);
    } catch {
      // Transcript capture should never interrupt a live call.
    }
  }, [loadSessionDetail]);

  const saveVoiceMemorySummary = useCallback(async (sessionId: string) => {
    try {
      const result = await readJson<{ memoryPath: string; handoff: VoiceHandoffSummary }>(`/api/voice/sessions/${sessionId}/memory-summary`, {
        method: "POST",
        body: JSON.stringify({ reason: "voice-ended" }),
      });
      setLastActionLabel(`Handoff vorbereitet: ${result.memoryPath}`);
      setError(null);
    } catch (nextError) {
      const message = nextError instanceof Error ? nextError.message : String(nextError);
      setLastActionLabel("Gespräch beendet, Memory-Speicherung fehlgeschlagen");
      setError(`Memory-Speicherung fehlgeschlagen: ${message}`);
    }
  }, []);

  const closeRealtimeConnection = useCallback(() => {
    realtimeDataChannelRef.current?.close();
    realtimeDataChannelRef.current = null;
    realtimePeerRef.current?.getSenders().forEach((sender) => sender.track?.stop());
    realtimePeerRef.current?.close();
    realtimePeerRef.current = null;
    realtimeMediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    realtimeMediaStreamRef.current = null;
    realtimeAudioElementRef.current?.pause();
    realtimeAudioElementRef.current = null;
    assistantSpeakingRef.current = false;
  }, []);

  const applyRealtimeMute = useCallback((isMuted: boolean) => {
    isMutedRef.current = isMuted;
    realtimeMediaStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = !isMuted;
    });
  }, []);

  const handleRealtimeFunctionCalls = useCallback(async (
    sessionId: string,
    calls: RealtimeFunctionCall[],
  ) => {
    const dataChannel = realtimeDataChannelRef.current;
    if (!dataChannel || dataChannel.readyState !== "open" || calls.length === 0) return;

    setVoiceMode("thinking");
    setLastActionLabel("Hermes schaut in den Memories nach");

    for (const call of calls) {
      try {
        const toolResponse = await readJson<{ output: string; result?: unknown }>(
          `/api/voice/sessions/${sessionId}/tools/execute`,
          {
            method: "POST",
            body: JSON.stringify({
              toolName: call.name,
              callId: call.callId,
              arguments: call.arguments,
            }),
          },
        );

        sendRealtimeEvent(dataChannel, {
          type: "conversation.item.create",
          item: {
            type: "function_call_output",
            call_id: call.callId,
            output: toolResponse.output,
          },
        });
      } catch (nextError) {
        sendRealtimeEvent(dataChannel, {
          type: "conversation.item.create",
          item: {
            type: "function_call_output",
            call_id: call.callId,
            output: JSON.stringify({
              answerable: false,
              error: nextError instanceof Error ? nextError.message : String(nextError),
            }),
          },
        });
      }
    }

    sendRealtimeEvent(dataChannel, {
      type: "response.create",
      response: {
        instructions: "Antworte jetzt auf Basis der Tool-Ergebnisse. Wenn keine Quelle gefunden wurde, sage das klar und erfinde nichts.",
      },
    });
    setLastActionLabel("Hermes verarbeitet Memory-Ergebnis");
    void loadSessionDetail(sessionId).catch(() => {});
  }, [loadSessionDetail]);

  const createRealtimeResponseForTranscript = useCallback(async (sessionId: string, transcript: string) => {
    const dataChannel = realtimeDataChannelRef.current;
    if (!dataChannel || dataChannel.readyState !== "open") return;

    if (!needsFreshChatContextPreflight(transcript)) {
      sendRealtimeEvent(dataChannel, { type: "response.create" });
      return;
    }

    setVoiceMode("thinking");
    setLastActionLabel("Hermes prüft frischen Chat-Kontext");

    try {
      const toolResponse = await readJson<{ output: string; result?: { answerable?: boolean } }>(
        `/api/voice/sessions/${sessionId}/tools/execute`,
        {
          method: "POST",
          body: JSON.stringify({
            toolName: "hermes_memory_search",
            arguments: {
              query: transcript,
              timeRange: "today",
              includeVoiceCalls: true,
            },
          }),
        },
      );

      const answerable = toolResponse.result?.answerable === true;
      sendRealtimeEvent(dataChannel, {
        type: "response.create",
        response: {
          instructions: answerable
            ? [
                "Beantworte Daniels frische Chat-Rueckblick-Frage ausschliesslich anhand dieses Preflight-Kontexts.",
                "Wenn der Kontext A bis Z Architekten oder andere konkrete Kunden nennt, nenne genau diese und keine anderen.",
                `Preflight-Kontext: ${toolResponse.output}`,
              ].join("\n")
            : [
                "Antworte kurz und exakt: Ich sehe den frischen Telegram-/Chat-Verlauf der letzten halben Stunde im Voice-Call gerade nicht belegt. Ich will da nichts erfinden.",
                "Fuege danach hinzu: Wenn Hermes/Gateway mir den Recent-Chat-Kontext per Handoff uebergibt, kann ich ihn hier direkt zusammenfassen.",
                `Preflight-Kontext ohne Treffer: ${toolResponse.output}`,
              ].join("\n"),
        },
      });
    } catch {
      sendRealtimeEvent(dataChannel, {
        type: "response.create",
        response: {
          instructions: "Antworte kurz: Ich konnte den frischen Chat-Kontext gerade technisch nicht laden und will dazu nichts erfinden.",
        },
      });
    }
  }, []);

  const stopVoiceMode = useCallback(async () => {
    const sessionId = activeSessionIdRef.current;
    shouldRestartRecognitionRef.current = false;
    recognitionHoldRef.current = false;
    isSubmittingRef.current = false;
    recognitionRef.current?.stop();
    closeRealtimeConnection();
    assistantAudioRef.current?.pause();
    assistantAudioRef.current = null;
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsVoiceModeEnabled(false);
    setVoiceMode("idle");
    setLiveTranscript("");
    setLastActionLabel("Gespräch wird gespeichert");
    if (sessionId) {
      try {
        await readJson<{ session: VoiceSessionSummary }>(`/api/voice/sessions/${sessionId}/end`, {
          method: "POST",
          body: JSON.stringify({ reason: "voice-ended" }),
        });
      } catch {
        // A completed/failed session may already be closed; memory persistence still gets a best-effort run.
      }
      await saveVoiceMemorySummary(sessionId);
      await Promise.all([loadSessions(), loadSessionDetail(sessionId)]).catch(() => {});
    }
  }, [closeRealtimeConnection, loadSessionDetail, loadSessions, saveVoiceMemorySummary]);

  const startVoiceMode = useCallback(async (sessionIdOverride?: string) => {
    const sessionId = sessionIdOverride ?? activeSessionIdRef.current;
    if (!sessionId) {
      setError("Starte zuerst eine Voice-Session.");
      return;
    }
    if (
      typeof window === "undefined"
      || typeof RTCPeerConnection === "undefined"
      || !navigator.mediaDevices?.getUserMedia
    ) {
      setBrowserVoiceSupported(false);
      setError("Realtime-WebRTC wird in diesem Browser nicht unterstützt.");
      return;
    }

    closeRealtimeConnection();
    setError(null);
    setIsSubmitting(true);
    setIsVoiceModeEnabled(true);
    setVoiceMode("connecting");
    setLiveTranscript("");
    setLastActionLabel("Realtime-Verbindung wird aufgebaut");

    const peerConnection = new RTCPeerConnection();
    realtimePeerRef.current = peerConnection;

    const remoteAudio = document.createElement("audio");
    remoteAudio.autoplay = true;
    realtimeAudioElementRef.current = remoteAudio;

    peerConnection.ontrack = (event) => {
      remoteAudio.srcObject = event.streams[0];
      void remoteAudio.play().catch(() => {
        setLastActionLabel("Audio wartet auf Browser-Freigabe");
      });
    };

    peerConnection.onconnectionstatechange = () => {
      if (peerConnection.connectionState === "connected") {
        setVoiceMode("listening");
        setLastActionLabel("Realtime-Call aktiv");
      }
      if (peerConnection.connectionState === "failed" || peerConnection.connectionState === "disconnected") {
        setVoiceMode("error");
        setError(`Realtime-Verbindung ${peerConnection.connectionState}.`);
        setIsVoiceModeEnabled(false);
      }
      if (peerConnection.connectionState === "closed") {
        setVoiceMode("idle");
      }
    };

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    realtimeMediaStreamRef.current = stream;
    stream.getAudioTracks().forEach((track) => {
      track.enabled = !isMutedRef.current;
    });
    peerConnection.addTrack(stream.getAudioTracks()[0], stream);

    const dataChannel = peerConnection.createDataChannel("oai-events");
    realtimeDataChannelRef.current = dataChannel;
    dataChannel.onopen = () => {
      setVoiceMode("listening");
      setLastActionLabel("Hermes hört live zu");
      dataChannel.send(JSON.stringify({
        type: "response.create",
        response: {
          instructions: "Begruesse Daniel kurz und frage, wobei du im aktuellen Mission-Control-Kontext helfen kannst.",
        },
      }));
    };
    dataChannel.onmessage = (event) => {
      const realtimeEvent = parseRealtimeEvent(event);
      const eventType = typeof realtimeEvent?.type === "string" ? realtimeEvent.type : getRealtimeEventType(event);
      if (!eventType) return;

      if (eventType === "input_audio_buffer.speech_started") {
        if (isMutedRef.current) return;
        if (assistantSpeakingRef.current) {
          // Browser-level barge-in approximation: OpenAI Realtime is configured with interrupt_response=true,
          // and this explicit cancel catches providers/browsers that keep emitting audio briefly.
          sendRealtimeEvent(dataChannel, { type: "response.cancel" });
          assistantSpeakingRef.current = false;
          setLastActionLabel("Unterbrochen, ich höre zu");
        }
        setVoiceMode("listening");
        setLiveTranscript("");
      }
      if (eventType === "conversation.item.input_audio_transcription.completed") {
        const transcript = realtimeEvent ? getRealtimeTranscriptPayload(realtimeEvent) : null;
        if (transcript) {
          setLiveTranscript(transcript);
          void recordRealtimeTranscript(sessionId, "user", transcript, { realtimeEvent: eventType });
          void createRealtimeResponseForTranscript(sessionId, transcript);
        }
      }
      if (eventType === "response.created") {
        setVoiceMode("thinking");
      }
      if (eventType === "response.audio.delta" || eventType === "response.output_audio.delta") {
        assistantSpeakingRef.current = true;
        setVoiceMode("speaking");
      }
      if (eventType === "response.audio_transcript.done" || eventType === "response.output_audio_transcript.done") {
        const transcript = realtimeEvent ? getRealtimeTranscriptPayload(realtimeEvent) : null;
        if (transcript) {
          void recordRealtimeTranscript(sessionId, "assistant", transcript, { realtimeEvent: eventType });
        }
      }
      if (eventType === "response.done") {
        const functionCalls = realtimeEvent ? extractRealtimeFunctionCalls(realtimeEvent) : [];
        if (functionCalls.length > 0) {
          void handleRealtimeFunctionCalls(sessionId, functionCalls);
          return;
        }
        setVoiceMode("listening");
        assistantSpeakingRef.current = false;
        setLastActionLabel("Hermes hört weiter zu");
        void loadSessionDetail(sessionId).catch(() => {});
      }
    };
    dataChannel.onerror = () => {
      setVoiceMode("error");
      setError("Realtime-DataChannel fehlgeschlagen.");
    };

    const tokenResponse = await fetch(`/api/voice/realtime/token?sessionId=${encodeURIComponent(sessionId)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
    });

    if (!tokenResponse.ok) {
      let message = `Realtime token failed (${tokenResponse.status})`;
      try {
        const data = await tokenResponse.json();
        if (data && typeof data.error === "string") {
          message = data.error;
        }
      } catch {}
      throw new Error(message);
    }

    const realtimeClientSecret = extractRealtimeClientSecret(await tokenResponse.json());
    if (!realtimeClientSecret) {
      throw new Error("Realtime Token enthielt kein Client-Secret.");
    }

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    await waitForIceGatheringComplete(peerConnection);
    const localSdp = peerConnection.localDescription?.sdp ?? "";
    if (!localSdp.startsWith("v=0")) {
      throw new Error("Browser hat kein gültiges SDP-Angebot erzeugt.");
    }

    const sdpResponse = await fetch("https://api.openai.com/v1/realtime/calls", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${realtimeClientSecret}`,
        "Content-Type": "application/sdp",
      },
      body: localSdp,
    });

    if (!sdpResponse.ok) {
      let message = `Realtime SDP failed (${sdpResponse.status})`;
      const text = await sdpResponse.text();
      if (text.trim()) message = text.trim();
      throw new Error(message);
    }

    await peerConnection.setRemoteDescription({
      type: "answer",
      sdp: await sdpResponse.text(),
    });

    setLastActionLabel("Realtime verbunden");
    setIsSubmitting(false);
  }, [closeRealtimeConnection, createRealtimeResponseForTranscript, handleRealtimeFunctionCalls, loadSessionDetail, recordRealtimeTranscript]);

  const toggleVoiceMode = useCallback(async () => {
    if (isVoiceModeEnabled) {
      await stopVoiceMode();
      return;
    }
    try {
      await startVoiceMode();
    } catch (nextError) {
      closeRealtimeConnection();
      setVoiceMode("error");
      setIsVoiceModeEnabled(false);
      setIsSubmitting(false);
      setError(nextError instanceof Error ? nextError.message : String(nextError));
    }
  }, [closeRealtimeConnection, isVoiceModeEnabled, startVoiceMode, stopVoiceMode]);

  const refreshAll = useCallback(async () => {
    setError(null);
    setIsBooting(true);
    try {
      const [loadedProfiles, loadedSessions] = await Promise.all([loadProfiles(), loadSessions()]);
      void loadedProfiles;
      if (active?.session.id) {
        await loadSessionDetail(active.session.id);
      } else if (loadedSessions[0]?.session.id) {
        await loadSessionDetail(loadedSessions[0].session.id);
      }
      setLastActionLabel("Voice-Kontext aktualisiert");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : String(nextError));
    } finally {
      setIsBooting(false);
    }
  }, [active?.session.id, loadProfiles, loadSessionDetail, loadSessions]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncLayout = () => {
      setLayoutMode(window.innerWidth <= 900 ? "mobile" : "desktop");
    };

    syncLayout();
    window.addEventListener("resize", syncLayout);
    return () => window.removeEventListener("resize", syncLayout);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    setBrowserVoiceSupported(typeof RTCPeerConnection !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia));

    if (!("speechSynthesis" in window)) {
      setAvailableVoices([]);
      return;
    }

    const syncVoices = () => {
      setAvailableVoices(window.speechSynthesis.getVoices());
    };

    syncVoices();
    window.speechSynthesis.addEventListener?.("voiceschanged", syncVoices);

    return () => {
      window.speechSynthesis.removeEventListener?.("voiceschanged", syncVoices);
    };
  }, []);

  useEffect(() => {
    activeSessionIdRef.current = active?.session.id ?? null;
    isMutedRef.current = active?.session.isMuted ?? false;
    realtimeMediaStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = !(active?.session.isMuted ?? false);
    });
  }, [active?.session.id, active?.session.isMuted]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  useEffect(() => {
    const recognition = recognitionRef.current;
    return () => {
      shouldRestartRecognitionRef.current = false;
      recognitionHoldRef.current = false;
      isSubmittingRef.current = false;
      recognition?.stop();
      closeRealtimeConnection();
      assistantAudioRef.current?.pause();
      assistantAudioRef.current = null;
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [closeRealtimeConnection]);

  const createSession = useCallback(async (profileId: string) => {
    setError(null);
    setIsSubmitting(true);
    setLastActionLabel("Gespräch wird aufgebaut");
    try {
      const data = await readJson<VoiceSessionEnvelope>("/api/voice/sessions", {
        method: "POST",
        body: JSON.stringify({ profileId, transport: "web", autoGreeting: false }),
      });
      setActive(data);
      setDraft("");
      setTextFallbackOpen(false);
      setDetailsOpen(false);
      await loadSessions();
      setLastActionLabel(`Verbunden mit ${data.profile.label}`);
      await startVoiceMode(data.session.id);
    } catch (nextError) {
      closeRealtimeConnection();
      setIsVoiceModeEnabled(false);
      setVoiceMode("error");
      setError(nextError instanceof Error ? nextError.message : String(nextError));
    } finally {
      setIsSubmitting(false);
      setIsBooting(false);
    }
  }, [closeRealtimeConnection, loadSessions, startVoiceMode]);

  const selectSession = useCallback(async (sessionId: string) => {
    setError(null);
    setLastActionLabel("Lade Session");
    try {
      await loadSessionDetail(sessionId);
      setLastActionLabel("Session geladen");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : String(nextError));
    }
  }, [loadSessionDetail]);

  const submitTurn = useCallback(async () => {
    if (!active?.session.id || draft.trim().length === 0) return;
    await sendVoiceTurn(draft.trim());
  }, [active?.session.id, draft, sendVoiceTurn]);

  const replayAssistant = useCallback(() => {
    const lastAssistantText = active?.session.lastAssistantText?.trim();
    if (!lastAssistantText) return;
    void playAssistantResponse(lastAssistantText);
  }, [active?.session.lastAssistantText, playAssistantResponse]);

  const toggleMute = useCallback(async () => {
    if (!active?.session.id) return;
    const nextMuted = !active.session.isMuted;
    applyRealtimeMute(nextMuted);
    setLastActionLabel(nextMuted ? "Gemutet" : "Mikrofon wieder aktiv");
    setActive((current) => current
      ? { ...current, session: { ...current.session, isMuted: nextMuted } }
      : current);
    try {
      const result = await readJson<{ session: VoiceSessionSummary }>(`/api/voice/sessions/${active.session.id}/mute`, {
        method: "POST",
        body: JSON.stringify({ isMuted: nextMuted }),
      });
      setActive((current) => current
        ? { ...current, session: { ...current.session, ...result.session } }
        : current);
    } catch (nextError) {
      applyRealtimeMute(active.session.isMuted);
      setActive((current) => current
        ? { ...current, session: { ...current.session, isMuted: active.session.isMuted } }
        : current);
      setError(nextError instanceof Error ? nextError.message : String(nextError));
    }
  }, [active?.session.id, active?.session.isMuted, applyRealtimeMute]);

  const switchContext = useCallback(async (targetProfileSlug: string) => {
    if (!active?.session.id) return;
    setError(null);
    setIsSubmitting(true);
    setLastActionLabel(`Wechsle zu ${slugLabel(targetProfileSlug)}`);
    try {
      await readJson(`/api/voice/sessions/${active.session.id}/context-switch`, {
        method: "POST",
        body: JSON.stringify({ targetProfileSlug }),
      });
      await Promise.all([loadSessions(), loadSessionDetail(active.session.id)]);
      setLastActionLabel(`Kontext: ${slugLabel(targetProfileSlug)}`);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : String(nextError));
    } finally {
      setIsSubmitting(false);
    }
  }, [active?.session.id, loadSessionDetail, loadSessions]);

  const activeSession = active?.session ?? null;
  const activeProfile = active?.profile ?? null;
  const contextSummary = active?.contextSummary ?? null;
  const turns = useMemo(() => active?.turns ?? [], [active?.turns]);
  const switchTargets = active?.switchTargets ?? [];
  const workOrders = active?.workOrders ?? [];
  const handoff = active?.handoff ?? null;

  return (
    <VoiceConsoleView
      profiles={profiles}
      sessions={sessions}
      activeSession={activeSession}
      activeProfile={activeProfile}
      contextSummary={contextSummary}
      turns={turns}
      switchTargets={switchTargets}
      workOrders={workOrders}
      handoff={handoff}
      draft={draft}
      isBooting={isBooting}
      isSubmitting={isSubmitting}
      error={error}
      lastActionLabel={lastActionLabel}
      voiceMode={voiceMode}
      browserVoiceSupported={browserVoiceSupported}
      liveTranscript={liveTranscript}
      isVoiceModeEnabled={isVoiceModeEnabled}
      layoutMode={layoutMode}
      canReplayAssistant={Boolean(activeSession?.lastAssistantText?.trim())}
      textFallbackOpen={textFallbackOpen}
      detailsOpen={detailsOpen}
      onDraftChange={setDraft}
      onCreateSession={createSession}
      onSelectSession={selectSession}
      onRefresh={refreshAll}
      onSubmitTurn={submitTurn}
      onSwitchContext={switchContext}
      onToggleVoiceMode={toggleVoiceMode}
      onToggleMute={toggleMute}
      onToggleTextFallback={() => setTextFallbackOpen((open) => !open)}
      onToggleDetails={() => setDetailsOpen((open) => !open)}
      onReplayAssistant={replayAssistant}
    />
  );
}
