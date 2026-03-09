// EditProjectModal Component
function EditProjectModal({ project, onClose, onSaved }: {
  project: Project; onClose: () => void; onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: project.name,
    client: project.client,
    status: project.status,
    description: project.description ?? "",
    repo: project.repo ?? "",
    color: project.color,
  });
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const router = useRouter();

  const save = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    await fetch(`/api/projects?id=${project.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setSaving(false);
    onSaved();
  };

  const deleteProject = async () => {
    await fetch(`/api/projects?id=${project.id}`, { method: "DELETE" });
    router.push("/projects");
  };

  const IS = { width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #1e2128", background: "#0d0f12", color: "#f0f2f5", fontSize: 13, outline: "none" };
  const LS = { fontSize: 11, color: "#8b90a0", marginBottom: 4, display: "block" as const };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300, padding: 20 }} onClick={onClose}>
      <div style={{ background: "#141720", border: "1px solid #1e2128", borderRadius: 16, padding: 24, width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Projekt bearbeiten</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12}}>
            <div><label style={LS}>Name *</label><input style={IS} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div><label style={LS}>Client *</label><input style={IS} value={form.client} onChange={e => setForm(f => ({ ...f, client: e.target.value }))} /></div>
          </div>
          <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12}}>
            <div>
              <label style={LS}>Status</label>
              <select style={{ ...IS, cursor: "pointer" }} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                <option value="active">Aktiv</option>
                <option value="paused">Pausiert</option>
                <option value="done">Abgeschlossen</option>
              </select>
            </div>
            <div><label style={LS}>Farbe</label><input style={{...IS, padding: "4px 8px"}} type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} /></div>
          </div>
          <div><label style={LS}>Repo</label><input style={IS} value={form.repo} onChange={e => setForm(f => ({ ...f, repo: e.target.value }))} placeholder="user/repo" /></div>
          <div><label style={LS}>Beschreibung</label><textarea style={{ ...IS, resize: "vertical" }} rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 20, alignItems: "center", justifyContent: "space-between" }}>
          {deleteConfirm ? (
            <div style={{display: "flex", gap: 8}}>
              <button onClick={deleteProject} style={{ padding: "9px 16px", borderRadius: 8, border: "1px solid #ef4444", background: "#ef444420", color: "#ef4444", fontSize: 13, cursor: "pointer", fontWeight: 600 }}>Wirklich löschen?</button>
              <button onClick={() => setDeleteConfirm(false)} style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid #1e2128", background: "transparent", color: "#8b90a0", fontSize: 13, cursor: "pointer" }}>✕</button>
            </div>
          ) : (
            <button onClick={() => setDeleteConfirm(true)} style={{ padding: "9px 12px", borderRadius: 8, border: "none", background: "transparent", color: "#4a5068", fontSize: 13, cursor: "pointer" }}>🗑️ Löschen</button>
          )}
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onClose} style={{ padding: "9px 16px", borderRadius: 8, border: "1px solid #1e2128", background: "transparent", color: "#8b90a0", fontSize: 13, cursor: "pointer" }}>Abbrechen</button>
            <button onClick={save} disabled={saving || !form.name.trim()} style={{ padding: "9px 20px", borderRadius: 8, border: "none", background: saving ? "#0a7a50" : "#10B981", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{saving ? "Speichern…" : "Speichern"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
