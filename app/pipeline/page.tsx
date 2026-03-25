"use client";

import { useEffect, useState, useRef, useCallback } from "react";

type Deal = {
  id: string; accountId: string; accountName?: string; accountColor?: string;
  title: string; value?: number; stage: string; probability: number;
  expectedClose?: string; notes?: string; createdAt: string;
};

const STAGES = [
  { key: "lead", label: "Lead", color: "#6366f1" },
  { key: "qualified", label: "Qualified", color: "#8B5CF6" },
  { key: "discovery", label: "Discovery", color: "#3B82F6" },
  { key: "proposal", label: "Proposal", color: "#F59E0B" },
  { key: "negotiation", label: "Negotiation", color: "#EC4899" },
  { key: "closed-won", label: "Won", color: "#10B981" },
  { key: "closed-lost", label: "Lost", color: "#ef4444" },
];

const IS = { width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #1e2128", background: "#0d0f12", color: "#f0f2f5", fontSize: 13, outline: "none", boxSizing: "border-box" as const };
const LS = { fontSize: 11, color: "#8b90a0", marginBottom: 4, display: "block" as const };

type Account = { id: string; name: string; color: string };

export default function PipelinePage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ title: "", accountId: "", value: "", stage: "lead", probability: "50", expectedClose: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [editDeal, setEditDeal] = useState<Deal | null>(null);
  const [editForm, setEditForm] = useState({ title: "", accountId: "", value: "", stage: "lead", probability: "50", expectedClose: "", notes: "" });
  const [editSaving, setEditSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const dragOverStage = useRef<string | null>(null);

  const load = useCallback(async () => {
    const [dealRes, accRes] = await Promise.all([fetch("/api/deals"), fetch("/api/accounts")]);
    const [dealData, accData] = await Promise.all([dealRes.json(), accRes.json()]);
    setDeals(dealData.deals ?? []);
    setAccounts(accData.accounts ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const moveStage = async (dealId: string, newStage: string) => {
    const deal = deals.find(d => d.id === dealId);
    if (!deal || deal.stage === newStage) return;
    // Optimistic update
    setDeals(prev => prev.map(d => d.id === dealId ? { ...d, stage: newStage } : d));
    await fetch(`/api/deals?id=${dealId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stage: newStage }) });
    load();
  };

  const onDragStart = (e: React.DragEvent, dealId: string) => {
    setDraggingId(dealId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", dealId);
  };

  const onDragOver = (e: React.DragEvent, stageKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    dragOverStage.current = stageKey;
  };

  const onDrop = (e: React.DragEvent, stageKey: string) => {
    e.preventDefault();
    const dealId = e.dataTransfer.getData("text/plain");
    if (dealId) moveStage(dealId, stageKey);
    setDraggingId(null);
    dragOverStage.current = null;
  };

  const openEditModal = (deal: Deal) => {
    setEditDeal(deal);
    setEditForm({
      title: deal.title,
      accountId: deal.accountId,
      value: deal.value != null ? String(deal.value) : "",
      stage: deal.stage,
      probability: String(deal.probability),
      expectedClose: deal.expectedClose ?? "",
      notes: deal.notes ?? "",
    });
    setDeleteConfirm(false);
    setEditModal(true);
  };

  const saveEdit = async () => {
    if (!editDeal || !editForm.title.trim()) return;
    setEditSaving(true);
    await fetch(`/api/deals?id=${editDeal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: editForm.title,
        accountId: editForm.accountId,
        value: editForm.value ? parseInt(editForm.value) : null,
        stage: editForm.stage,
        probability: parseInt(editForm.probability) || 0,
        expectedClose: editForm.expectedClose || null,
        notes: editForm.notes || null,
      }),
    });
    setEditSaving(false);
    setEditModal(false);
    setEditDeal(null);
    load();
  };

  const deleteDeal = async () => {
    if (!editDeal) return;
    await fetch(`/api/deals?id=${editDeal.id}`, { method: "DELETE" });
    setEditModal(false);
    setEditDeal(null);
    load();
  };

  const saveDeal = async () => {
    if (!form.title.trim() || !form.accountId) return;
    setSaving(true);
    await fetch("/api/deals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
      accountId: form.accountId, title: form.title, value: form.value ? parseInt(form.value) : null,
      stage: form.stage, probability: parseInt(form.probability) || 0,
      expectedClose: form.expectedClose || null, notes: form.notes || null,
    }) });
    setSaving(false); setModal(false);
    setForm({ title: "", accountId: "", value: "", stage: "lead", probability: "50", expectedClose: "", notes: "" });
    load();
  };

  const openDeals = deals.filter(d => !d.stage.startsWith("closed-"));
  const totalPipeline = openDeals.reduce((s, d) => s + (d.value ?? 0), 0);
  const weightedPipeline = openDeals.reduce((s, d) => s + ((d.value ?? 0) * d.probability / 100), 0);

  return (
    <div style={{ padding: "20px 24px", height: "calc(100vh - 52px)", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.3px" }}>Pipeline</h1>
          <div style={{ display: "flex", gap: 16, marginTop: 4, fontSize: 13, color: "#8b90a0" }}>
            <span>Total: <strong style={{ color: "#10B981" }}>€{totalPipeline.toLocaleString("de-DE")}</strong></span>
            <span>Weighted: <strong style={{ color: "#f0f2f5" }}>€{Math.round(weightedPipeline).toLocaleString("de-DE")}</strong></span>
            <span>{openDeals.length} open deals</span>
          </div>
        </div>
        <button onClick={() => setModal(true)} style={{
          padding: "8px 16px", borderRadius: 8, border: "none",
          background: "#10B981", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
        }}>+ Deal</button>
      </div>

      {/* Kanban */}
      {loading ? <p style={{ color: "#8b90a0" }}>Loading…</p> : (
        <div style={{ display: "flex", gap: 12, flex: 1, overflowX: "auto", paddingBottom: 16 }}>
          {STAGES.map(stage => {
            const stageDeals = deals.filter(d => d.stage === stage.key);
            const stageValue = stageDeals.reduce((s, d) => s + (d.value ?? 0), 0);
            const isOver = draggingId && dragOverStage.current === stage.key;
            return (
              <div
                key={stage.key}
                onDragOver={e => onDragOver(e, stage.key)}
                onDragLeave={() => { if (dragOverStage.current === stage.key) dragOverStage.current = null; }}
                onDrop={e => onDrop(e, stage.key)}
                style={{
                  minWidth: 220, width: 220, flexShrink: 0,
                  background: isOver ? "#1a1d27" : "#111318",
                  border: `1px solid ${isOver ? stage.color + "40" : "#1e2128"}`,
                  borderRadius: 12, display: "flex", flexDirection: "column",
                  transition: "border-color 0.15s, background 0.15s",
                }}>
                {/* Column Header */}
                <div style={{ padding: "12px 14px 8px", borderBottom: "1px solid #1e2128" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: stage.color }} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#f0f2f5" }}>{stage.label}</span>
                    <span style={{ fontSize: 10, color: "#4a5068", marginLeft: "auto", padding: "1px 6px", borderRadius: 999, background: "#0d0f12" }}>{stageDeals.length}</span>
                  </div>
                  {stageValue > 0 && <div style={{ fontSize: 11, color: stage.color, fontWeight: 600 }}>€{stageValue.toLocaleString("de-DE")}</div>}
                </div>

                {/* Cards */}
                <div style={{ flex: 1, padding: "8px 8px", display: "flex", flexDirection: "column", gap: 8, overflowY: "auto" }}>
                  {stageDeals.map(deal => {
                    const accColor = deal.accountColor ?? "#4a5068";
                    return (
                      <div
                        key={deal.id}
                        draggable
                        onDragStart={e => onDragStart(e, deal.id)}
                        onDragEnd={() => setDraggingId(null)}
                        onClick={() => openEditModal(deal)}
                        style={{
                          background: "#141720", border: `1px solid ${draggingId === deal.id ? stage.color + "50" : "#1e2128"}`,
                          borderRadius: 10, padding: "10px 12px", cursor: "grab",
                          opacity: draggingId === deal.id ? 0.5 : 1,
                          transition: "opacity 0.15s, border-color 0.15s",
                        }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                          <div style={{ width: 3, height: 14, borderRadius: 2, background: accColor, flexShrink: 0 }} />
                          <span style={{ fontSize: 10, color: accColor, fontWeight: 500 }}>{deal.accountName ?? "–"}</span>
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "#f0f2f5", marginBottom: 4, lineHeight: 1.3 }}>{deal.title}</div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          {deal.value != null && <span style={{ fontSize: 12, fontWeight: 700, color: stage.color }}>€{deal.value.toLocaleString("de-DE")}</span>}
                          <span style={{ fontSize: 10, color: "#4a5068" }}>{deal.probability}%</span>
                        </div>
                        {deal.expectedClose && <div style={{ fontSize: 10, color: "#4a5068", marginTop: 4 }}>Close: {deal.expectedClose}</div>}
                      </div>
                    );
                  })}
                  {stageDeals.length === 0 && (
                    <div style={{ padding: "16px 8px", textAlign: "center", fontSize: 11, color: "#2a2d38" }}>Empty</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Deal Modal */}
      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, padding: 20 }} onClick={() => setModal(false)}>
          <div style={{ background: "#141720", border: "1px solid #1e2128", borderRadius: 16, padding: 24, width: "100%", maxWidth: 480, display: "flex", flexDirection: "column", gap: 14 }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: 16, fontWeight: 700 }}>Neuen Deal anlegen</h2>
            <div>
              <label style={LS}>Account *</label>
              <select style={{ ...IS, cursor: "pointer" }} value={form.accountId} onChange={e => setForm(f => ({ ...f, accountId: e.target.value }))}>
                <option value="">Account wählen…</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div><label style={LS}>Titel *</label><input style={IS} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="z.B. ModulAI Implementation" /></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div><label style={LS}>Wert (€)</label><input style={IS} type="number" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} /></div>
              <div>
                <label style={LS}>Stage</label>
                <select style={{ ...IS, cursor: "pointer" }} value={form.stage} onChange={e => setForm(f => ({ ...f, stage: e.target.value }))}>
                  {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div><label style={LS}>Probability (%)</label><input style={IS} type="number" min="0" max="100" value={form.probability} onChange={e => setForm(f => ({ ...f, probability: e.target.value }))} /></div>
              <div><label style={LS}>Expected Close</label><input style={IS} type="date" value={form.expectedClose} onChange={e => setForm(f => ({ ...f, expectedClose: e.target.value }))} /></div>
            </div>
            <div><label style={LS}>Notes</label><textarea style={{ ...IS, resize: "vertical" }} rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
            <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
              <button onClick={() => setModal(false)} style={{ flex: 1, padding: "9px 0", borderRadius: 8, border: "1px solid #1e2128", background: "transparent", color: "#8b90a0", fontSize: 13, cursor: "pointer" }}>Abbrechen</button>
              <button onClick={saveDeal} disabled={saving || !form.title.trim() || !form.accountId} style={{ flex: 2, padding: "9px 0", borderRadius: 8, border: "none", background: saving ? "#0a7a50" : "#10B981", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{saving ? "Speichern…" : "Speichern"}</button>
            </div>
          </div>
        </div>
      )}
      {/* Edit Deal Modal */}
      {editModal && editDeal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, padding: 20 }} onClick={() => setEditModal(false)}>
          <div style={{ background: "#141720", border: "1px solid #1e2128", borderRadius: 16, padding: 24, width: "100%", maxWidth: 480, display: "flex", flexDirection: "column", gap: 14 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h2 style={{ fontSize: 16, fontWeight: 700 }}>Deal bearbeiten</h2>
              <button onClick={() => setEditModal(false)} style={{ background: "none", border: "none", color: "#8b90a0", fontSize: 18, cursor: "pointer", lineHeight: 1 }}>×</button>
            </div>
            <div>
              <label style={LS}>Account</label>
              <select style={{ ...IS, cursor: "pointer" }} value={editForm.accountId} onChange={e => setEditForm(f => ({ ...f, accountId: e.target.value }))}>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div><label style={LS}>Titel *</label><input style={IS} value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div><label style={LS}>Wert (€)</label><input style={IS} type="number" value={editForm.value} onChange={e => setEditForm(f => ({ ...f, value: e.target.value }))} /></div>
              <div>
                <label style={LS}>Stage</label>
                <select style={{ ...IS, cursor: "pointer" }} value={editForm.stage} onChange={e => setEditForm(f => ({ ...f, stage: e.target.value }))}>
                  {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div><label style={LS}>Probability (%)</label><input style={IS} type="number" min="0" max="100" value={editForm.probability} onChange={e => setEditForm(f => ({ ...f, probability: e.target.value }))} /></div>
              <div><label style={LS}>Expected Close</label><input style={IS} type="date" value={editForm.expectedClose} onChange={e => setEditForm(f => ({ ...f, expectedClose: e.target.value }))} /></div>
            </div>
            <div><label style={LS}>Notes</label><textarea style={{ ...IS, resize: "vertical" }} rows={2} value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} /></div>
            <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
              {deleteConfirm ? (
                <>
                  <span style={{ fontSize: 12, color: "#ef4444", display: "flex", alignItems: "center", flex: 1 }}>Wirklich löschen?</span>
                  <button onClick={() => setDeleteConfirm(false)} style={{ padding: "9px 14px", borderRadius: 8, border: "1px solid #1e2128", background: "transparent", color: "#8b90a0", fontSize: 13, cursor: "pointer" }}>Nein</button>
                  <button onClick={deleteDeal} style={{ padding: "9px 14px", borderRadius: 8, border: "none", background: "#ef4444", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Löschen</button>
                </>
              ) : (
                <>
                  <button onClick={() => setDeleteConfirm(true)} style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid #ef444440", background: "transparent", color: "#ef4444", fontSize: 13, cursor: "pointer" }}>🗑</button>
                  <button onClick={() => setEditModal(false)} style={{ flex: 1, padding: "9px 0", borderRadius: 8, border: "1px solid #1e2128", background: "transparent", color: "#8b90a0", fontSize: 13, cursor: "pointer" }}>Abbrechen</button>
                  <button onClick={saveEdit} disabled={editSaving || !editForm.title.trim()} style={{ flex: 2, padding: "9px 0", borderRadius: 8, border: "none", background: editSaving ? "#0a7a50" : "#10B981", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{editSaving ? "Speichern…" : "Speichern"}</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
