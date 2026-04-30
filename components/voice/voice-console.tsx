"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { pickPreferredSpeechSynthesisVoice } from "@/lib/voice/browser-voice";

type VoiceProfileSummary = {
  id: string;
  slug: string;
  label: string;
  description: string | null;
  color: string | null;
};

type VoiceSessionSummary = {
  id: string;
  profileId: string;
  state: string;
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

type VoiceSessionEnvelope = {
  session: VoiceSessionSummary;
  profile: VoiceProfileSummary;
  turns: VoiceTurn[];
  contextSummary: string;
  switchTargets: string[];
  lastError: string | null;
};

type BrowserVoiceMode = "idle" | "listening" | "thinking" | "speaking" | "error";
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

type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

type BrowserWindowWithSpeech = Window & typeof globalThis & {
  SpeechRecognition?: BrowserSpeechRecognitionConstructor;
  webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
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

function getSpeechRecognitionConstructor(): BrowserSpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const browserWindow = window as BrowserWindowWithSpeech;
  return browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition ?? null;
}

function getVoiceModeLabel(mode: BrowserVoiceMode) {
  switch (mode) {
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
  onDraftChange: (value: string) => void;
  onCreateSession: (profileId: string) => void;
  onSelectSession: (sessionId: string) => void;
  onRefresh: () => void;
  onSubmitTurn: () => void;
  onSwitchContext: (targetProfileSlug: string) => void;
  onToggleVoiceMode: () => void;
  onReplayAssistant: () => void;
};

export function VoiceConsoleView({
  profiles,
  sessions,
  activeSession,
  activeProfile,
  contextSummary,
  turns,
  switchTargets,
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
  onDraftChange,
  onCreateSession,
  onSelectSession,
  onRefresh,
  onSubmitTurn,
  onSwitchContext,
  onToggleVoiceMode,
  onReplayAssistant,
}: VoiceConsoleViewProps) {
  const activeColor = activeProfile?.color ?? "#10B981";
  const isMobileLayout = layoutMode === "mobile";

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
                        ? "Einmal Gespräch starten und dann natürlich sprechen. Hermes antwortet automatisch und geht danach wieder zurück ins Zuhören."
                        : "Für den freihändigen Call-Modus brauchst du einen Browser mit SpeechRecognition + SpeechSynthesis."}
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
  const [layoutMode, setLayoutMode] = useState<VoiceConsoleLayoutMode>(() => {
    if (typeof window === "undefined") return "desktop";
    return window.innerWidth <= 900 ? "mobile" : "desktop";
  });
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const shouldRestartRecognitionRef = useRef(false);
  const recognitionHoldRef = useRef(false);
  const assistantAudioRef = useRef<HTMLAudioElement | null>(null);
  const activeSessionIdRef = useRef<string | null>(null);
  const isSubmittingRef = useRef(false);

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

  const pushInterimTranscript = useCallback(async (text: string) => {
    if (!activeSessionIdRef.current || text.trim().length === 0) return;
    try {
      await readJson<{ session: VoiceSessionSummary }>(`/api/voice/sessions/${activeSessionIdRef.current}/transcript`, {
        method: "POST",
        body: JSON.stringify({ text: text.trim(), isFinal: false, source: "browser-voice-interim" }),
      });
    } catch {
      // best effort only
    }
  }, []);

  const stopVoiceMode = useCallback(() => {
    shouldRestartRecognitionRef.current = false;
    recognitionHoldRef.current = false;
    isSubmittingRef.current = false;
    recognitionRef.current?.stop();
    assistantAudioRef.current?.pause();
    assistantAudioRef.current = null;
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsVoiceModeEnabled(false);
    setVoiceMode("idle");
    setLiveTranscript("");
    setLastActionLabel("Gespräch beendet");
  }, []);

  const startVoiceMode = useCallback(async () => {
    if (!activeSessionIdRef.current) {
      setError("Starte zuerst eine Voice-Session.");
      return;
    }
    const SpeechRecognitionCtor = getSpeechRecognitionConstructor();
    if (!SpeechRecognitionCtor) {
      setBrowserVoiceSupported(false);
      setError("Sprachmodus in diesem Browser nicht unterstützt.");
      return;
    }

    if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    }
    primeSpeechSynthesis();

    recognitionRef.current?.stop();
    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "de-DE";

    recognition.onstart = () => {
      setVoiceMode("listening");
      setLastActionLabel("Hermes hört zu");
    };
    recognition.onend = () => {
      if (shouldRestartRecognitionRef.current && !recognitionHoldRef.current) {
        recognition.start();
        return;
      }
      if (!recognitionHoldRef.current) {
        setVoiceMode("idle");
      }
    };
    recognition.onerror = (event) => {
      setVoiceMode("error");
      setError(event.error ?? event.message ?? "Spracherkennung fehlgeschlagen.");
      shouldRestartRecognitionRef.current = false;
      recognitionHoldRef.current = false;
      setIsVoiceModeEnabled(false);
    };
    recognition.onresult = (event) => {
      if (recognitionHoldRef.current || isSubmittingRef.current) {
        return;
      }

      const { finalTranscript, interimTranscript } = extractRecognitionTranscripts(event);

      if (finalTranscript) {
        setDraft(finalTranscript);
        pauseRecognitionForAssistant();
        void sendVoiceTurn(finalTranscript);
        return;
      }

      if (interimTranscript) {
        setLiveTranscript(interimTranscript);
        void pushInterimTranscript(interimTranscript);
      }
    };

    recognitionRef.current = recognition;
    shouldRestartRecognitionRef.current = true;
    recognitionHoldRef.current = false;
    setError(null);
    setIsVoiceModeEnabled(true);
    recognition.start();
  }, [pauseRecognitionForAssistant, primeSpeechSynthesis, pushInterimTranscript, sendVoiceTurn]);

  const toggleVoiceMode = useCallback(async () => {
    if (isVoiceModeEnabled) {
      stopVoiceMode();
      return;
    }
    try {
      await startVoiceMode();
    } catch (nextError) {
      setVoiceMode("error");
      setIsVoiceModeEnabled(false);
      setError(nextError instanceof Error ? nextError.message : String(nextError));
    }
  }, [isVoiceModeEnabled, startVoiceMode, stopVoiceMode]);

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

    setBrowserVoiceSupported(Boolean(getSpeechRecognitionConstructor()) && "speechSynthesis" in window);

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
  }, [active?.session.id]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  useEffect(() => {
    return () => {
      shouldRestartRecognitionRef.current = false;
      recognitionHoldRef.current = false;
      isSubmittingRef.current = false;
      recognitionRef.current?.stop();
      assistantAudioRef.current?.pause();
      assistantAudioRef.current = null;
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const createSession = useCallback(async (profileId: string) => {
    setError(null);
    setIsSubmitting(true);
    setLastActionLabel("Gespräch wird aufgebaut");
    try {
      const data = await readJson<VoiceSessionEnvelope>("/api/voice/sessions", {
        method: "POST",
        body: JSON.stringify({ profileId, transport: "web", autoGreeting: true }),
      });
      setActive(data);
      setDraft("");
      await loadSessions();
      setLastActionLabel(`Verbunden mit ${data.profile.label}`);
      const greeting = data.session.lastAssistantText?.trim();
      if (greeting) {
        await playAssistantResponse(greeting);
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : String(nextError));
    } finally {
      setIsSubmitting(false);
      setIsBooting(false);
    }
  }, [loadSessions, playAssistantResponse]);

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

  return (
    <VoiceConsoleView
      profiles={profiles}
      sessions={sessions}
      activeSession={activeSession}
      activeProfile={activeProfile}
      contextSummary={contextSummary}
      turns={turns}
      switchTargets={switchTargets}
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
      onDraftChange={setDraft}
      onCreateSession={createSession}
      onSelectSession={selectSession}
      onRefresh={refreshAll}
      onSubmitTurn={submitTurn}
      onSwitchContext={switchContext}
      onToggleVoiceMode={toggleVoiceMode}
      onReplayAssistant={replayAssistant}
    />
  );
}
