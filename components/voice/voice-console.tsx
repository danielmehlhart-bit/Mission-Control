"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

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

type VoiceEvent = {
  id: string;
  eventType: string;
  sequence: number;
  createdAt: string;
  payload: Record<string, unknown> | null;
};

type VoiceSessionEnvelope = {
  session: VoiceSessionSummary;
  profile: VoiceProfileSummary;
  turns: VoiceTurn[];
  contextSummary: string;
  switchTargets: string[];
  lastError: string | null;
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
      return "Booting";
    case "hydrating_context":
      return "Hydrating";
    case "ready":
      return "Bereit";
    case "listening":
      return "Listening";
    case "thinking":
      return "Thinking";
    case "speaking":
      return "Speaking";
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
  onDraftChange: (value: string) => void;
  onCreateSession: (profileId: string) => void;
  onSelectSession: (sessionId: string) => void;
  onRefresh: () => void;
  onSubmitTurn: () => void;
  onSwitchContext: (targetProfileSlug: string) => void;
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
  onDraftChange,
  onCreateSession,
  onSelectSession,
  onRefresh,
  onSubmitTurn,
  onSwitchContext,
}: VoiceConsoleViewProps) {
  const activeColor = activeProfile?.color ?? "#10B981";

  return (
    <div style={{ padding: "20px 24px", maxWidth: 1180, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 12, letterSpacing: "0.16em", textTransform: "uppercase", color: "#10B981", marginBottom: 8 }}>Voice Workspace</div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "#f0f2f5", margin: 0 }}>Mission Control Voice</h1>
          <p style={{ marginTop: 8, marginBottom: 0, color: "#8b90a0", fontSize: 14, maxWidth: 780 }}>
            Starte kontextgebundene Calls, simuliere Turns gegen den live Voice-Backend-Stack und springe zwischen Hermes, Sales Support, LUMA und Fitness.
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

      <div style={{ display: "grid", gridTemplateColumns: "minmax(290px, 360px) minmax(0, 1fr)", gap: 18, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <section style={{ ...CARD_STYLE, padding: 18 }}>
            <div style={{ fontSize: 12, color: "#8b90a0", marginBottom: 12 }}>Wähle ein Voice-Profil</div>
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
                    <span style={{ fontSize: 11, color: profile.color ?? "#10B981" }}>Start</span>
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
            <div style={{ minHeight: 460, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", color: "#8b90a0", padding: 32 }}>
              <div style={{ fontSize: 42, marginBottom: 10 }}>🎙️</div>
              <div style={{ fontSize: 16, color: "#f0f2f5", fontWeight: 600, marginBottom: 8 }}>Noch keine Voice-Session aktiv</div>
              <div style={{ fontSize: 13, maxWidth: 420 }}>Starte links ein Profil. Danach siehst du hier Kontext, Verlauf, Session-Status und kannst direkt testweise Turns schicken.</div>
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
                <div style={{ display: "grid", gap: 4, fontSize: 11, color: "#8b90a0", minWidth: 170 }}>
                  <span>Session: {activeSession.id.slice(0, 8)}</span>
                  <span>Transport: {activeSession.transport}</span>
                  <span>Aktualisiert: {formatTimestamp(activeSession.updatedAt)}</span>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 260px", gap: 16, alignItems: "start" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ background: "#0f1219", border: "1px solid #1e2128", borderRadius: 14, minHeight: 320, maxHeight: 520, overflowY: "auto", padding: 14 }}>
                    <div style={{ fontSize: 11, color: "#4a5068", marginBottom: 12, letterSpacing: "0.14em", textTransform: "uppercase" }}>Transcript</div>
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
                    <div style={{ fontSize: 11, color: "#4a5068", marginBottom: 8, letterSpacing: "0.14em", textTransform: "uppercase" }}>Text Turn</div>
                    <textarea
                      value={draft}
                      onChange={(event) => onDraftChange(event.target.value)}
                      placeholder="Frag z. B. nach dem Status von LUMA oder bitte um einen nächsten Schritt."
                      style={{ width: "100%", minHeight: 110, resize: "vertical", borderRadius: 12, border: "1px solid #1e2128", background: "#141720", color: "#f0f2f5", padding: 12, fontSize: 13, outline: "none", boxSizing: "border-box" }}
                    />
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, gap: 12, flexWrap: "wrap" }}>
                      <div style={{ fontSize: 11, color: "#8b90a0" }}>Web-Transport live, Audio-Layer kommt als nächster Schritt oben drauf.</div>
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
                        }}
                      >
                        {isSubmitting ? "Sende …" : "Antwort senden"}
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

  const refreshAll = useCallback(async () => {
    setError(null);
    setIsBooting(true);
    try {
      const [_, loadedSessions] = await Promise.all([loadProfiles(), loadSessions()]);
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
    refreshAll();
  }, [refreshAll]);

  const createSession = useCallback(async (profileId: string) => {
    setError(null);
    setIsSubmitting(true);
    setLastActionLabel("Session wird aufgebaut");
    try {
      const data = await readJson<VoiceSessionEnvelope>("/api/voice/sessions", {
        method: "POST",
        body: JSON.stringify({ profileId, transport: "web" }),
      });
      setActive(data);
      setDraft("");
      await loadSessions();
      setLastActionLabel(`Session aktiv: ${data.profile.label}`);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : String(nextError));
    } finally {
      setIsSubmitting(false);
      setIsBooting(false);
    }
  }, [loadSessions]);

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
    setError(null);
    setIsSubmitting(true);
    setLastActionLabel("Turn wird verarbeitet");
    try {
      await readJson<{ session: VoiceSessionSummary }>(`/api/voice/sessions/${active.session.id}/complete-turn`, {
        method: "POST",
        body: JSON.stringify({ userText: draft.trim() }),
      });
      setDraft("");
      await Promise.all([loadSessions(), loadSessionDetail(active.session.id)]);
      setLastActionLabel("Antwort empfangen");
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : String(nextError));
    } finally {
      setIsSubmitting(false);
    }
  }, [active?.session.id, draft, loadSessionDetail, loadSessions]);

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
      onDraftChange={setDraft}
      onCreateSession={createSession}
      onSelectSession={selectSession}
      onRefresh={refreshAll}
      onSubmitTurn={submitTurn}
      onSwitchContext={switchContext}
    />
  );
}
