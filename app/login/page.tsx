"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        router.push("/");
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error ?? "Login fehlgeschlagen.");
      }
    } catch {
      setError("Verbindungsfehler.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "#0d0f12", fontFamily: "'Inter', -apple-system, sans-serif",
    }}>
      <div style={{
        width: "100%", maxWidth: 380, padding: "0 20px",
      }}>
        {/* Logo / Title */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🏔️</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#f0f2f5", letterSpacing: "-0.3px", margin: 0 }}>
            Mission Control
          </h1>
          <p style={{ fontSize: 13, color: "#4a5068", marginTop: 6 }}>
            mc.mehlhart.de
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: "#141720", border: "1px solid #1e2128", borderRadius: 16, padding: "28px 28px",
        }}>
          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ fontSize: 11, color: "#8b90a0", letterSpacing: "0.1em", textTransform: "uppercase", display: "block", marginBottom: 8 }}>
                Passwort
              </label>
              <input
                type="password"
                autoFocus
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: "100%", padding: "10px 14px", borderRadius: 10,
                  border: `1px solid ${error ? "#ef444450" : "#1e2128"}`,
                  background: "#0d0f12", color: "#f0f2f5", fontSize: 15,
                  outline: "none", boxSizing: "border-box",
                  transition: "border-color 0.15s",
                }}
                onFocus={e => { if (!error) e.target.style.borderColor = "#10B98150"; }}
                onBlur={e => { if (!error) e.target.style.borderColor = "#1e2128"; }}
              />
            </div>

            {error && (
              <div style={{
                padding: "8px 12px", borderRadius: 8,
                background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
                color: "#f87171", fontSize: 13,
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !password}
              style={{
                padding: "11px 0", borderRadius: 10, border: "none",
                background: loading || !password ? "#1a1d27" : "#10B981",
                color: loading || !password ? "#4a5068" : "#fff",
                fontSize: 14, fontWeight: 600, cursor: loading || !password ? "default" : "pointer",
                transition: "all 0.15s",
              }}
            >
              {loading ? "Einloggen…" : "Einloggen"}
            </button>
          </form>
        </div>

        <p style={{ textAlign: "center", fontSize: 11, color: "#2a2d38", marginTop: 20 }}>
          Session läuft 30 Tage
        </p>
      </div>
    </div>
  );
}
