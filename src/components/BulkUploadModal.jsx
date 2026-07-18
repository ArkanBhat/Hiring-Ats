import React, { useState, useRef } from "react";
import { Upload, Check, Loader, X, FileText } from "lucide-react";
import { Modal } from "./primitives.jsx";
import { parseResume } from "../lib/parseResume.js";
import { scoreResume, scoreLabel } from "../lib/scoreResume.js";

const uid = () => `row_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

export default function BulkUploadModal({ onClose, onSave, flash, jobs = [] }) {
  const [position, setPosition] = useState(jobs[0]?.title || "");
  const [rows, setRows]         = useState([]); // { rowId, file, resume, name, email, phone, rawText, error, parsing }
  const [saving, setSaving]     = useState(false);
  const fileRef = useRef();

  const selectedJob = jobs.find((j) => j.title === position);

  const readAsDataURL = (file) => new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });

  const onFiles = async (fileList) => {
    const files = [...fileList].filter((f) => f.size <= 3.6 * 1024 * 1024);
    if (files.length < fileList.length) flash("Some files were skipped — max ~3.5MB each");
    if (files.length === 0) return;

    const initial = files.map((file) => ({ rowId: uid(), file, name: "", email: "", phone: "", rawText: "", parsing: true, error: "" }));
    setRows((prev) => [...prev, ...initial]);

    for (const row of initial) {
      try {
        const data = await readAsDataURL(row.file);
        const extracted = await parseResume(row.file);
        setRows((prev) => prev.map((r) => r.rowId === row.rowId
          ? { ...r, parsing: false, resume: { name: row.file.name, type: row.file.type, data },
              name: extracted.name || "", email: extracted.email || "", phone: extracted.phone || "",
              rawText: extracted.rawText || "" }
          : r));
      } catch (err) {
        console.error(err);
        setRows((prev) => prev.map((r) => r.rowId === row.rowId ? { ...r, parsing: false, error: "Couldn't read this file" } : r));
      }
    }
  };

  const updateRow = (rowId, patch) => setRows((prev) => prev.map((r) => r.rowId === rowId ? { ...r, ...patch } : r));
  const removeRow  = (rowId) => setRows((prev) => prev.filter((r) => r.rowId !== rowId));

  const readyRows = rows.filter((r) => !r.parsing && r.name.trim() && r.email.trim());
  const parsingCount = rows.filter((r) => r.parsing).length;

  const submit = async () => {
    if (!position.trim()) { flash("Select or enter a role for this batch"); return; }
    if (readyRows.length === 0) { flash("No candidates ready — fill in name and email"); return; }

    setSaving(true);
    const entries = readyRows.map((r) => {
      const fitScore = r.rawText && selectedJob?.description ? scoreResume(r.rawText, selectedJob.description) : null;
      return {
        data: { name: r.name.trim(), email: r.email.trim(), phone: r.phone.trim(), position, source: "Direct", resumeText: r.rawText, fitScore },
        resume: r.resume || null,
      };
    });
    await onSave(entries);
    setSaving(false);
  };

  return (
    <Modal title="Bulk upload resumes" onClose={onClose} icon={<Upload size={16} />} wide>
      <div className="form-grid" style={{ marginBottom: 14 }}>
        <label className="span2">Role applied for *
          {jobs.length > 0 ? (
            <select value={position} onChange={(e) => setPosition(e.target.value)}>
              <option value="">Select a position…</option>
              {jobs.map((j) => <option key={j.id} value={j.title}>{j.title}{j.department ? ` — ${j.department}` : ""}</option>)}
            </select>
          ) : (
            <input value={position} onChange={(e) => setPosition(e.target.value)} placeholder="e.g. Frontend Engineer" />
          )}
        </label>
      </div>

      <div className="dropzone span2" onClick={() => fileRef.current?.click()}>
        <input ref={fileRef} type="file" hidden multiple accept=".pdf,.doc,.docx"
          onChange={(e) => { onFiles(e.target.files); e.target.value = ""; }} />
        <Upload size={18} />
        <span>Click to select multiple resumes (PDF/DOCX) — each becomes a candidate</span>
      </div>

      {rows.length > 0 && (
        <div className="bulk-table">
          <div className="bulk-table-head">
            <span>File</span><span>Name</span><span>Email</span><span>Phone</span><span>Fit</span><span></span>
          </div>
          {rows.map((r) => {
            const fitScore = r.rawText && selectedJob?.description ? scoreResume(r.rawText, selectedJob.description) : null;
            const sl = scoreLabel(fitScore);
            return (
              <div className="bulk-row" key={r.rowId}>
                <span className="bulk-file" title={r.file.name}><FileText size={12} /> {r.file.name}</span>
                {r.parsing ? (
                  <span className="bulk-parsing"><Loader size={13} className="spin" /> Reading…</span>
                ) : r.error ? (
                  <span className="bulk-error">{r.error}</span>
                ) : (
                  <>
                    <input value={r.name} onChange={(e) => updateRow(r.rowId, { name: e.target.value })} placeholder="Name" />
                    <input value={r.email} onChange={(e) => updateRow(r.rowId, { email: e.target.value })} placeholder="Email" />
                    <input value={r.phone} onChange={(e) => updateRow(r.rowId, { phone: e.target.value })} placeholder="Phone" />
                    <span>{sl ? <span className="fit-badge-sm" style={{ color: sl.color, background: sl.bg }}>{fitScore}%</span> : "—"}</span>
                  </>
                )}
                <button className="icon-btn" onClick={() => removeRow(r.rowId)}><X size={14} /></button>
              </div>
            );
          })}
        </div>
      )}

      <div className="modal-foot">
        <span className="bulk-summary">
          {rows.length === 0 ? "No files selected" : `${readyRows.length} ready${parsingCount ? ` · ${parsingCount} parsing…` : ""}`}
        </span>
        <button className="btn ghost" onClick={onClose}>Cancel</button>
        <button className="btn primary" onClick={submit} disabled={saving || parsingCount > 0 || readyRows.length === 0}>
          {saving ? <Loader size={14} className="spin" /> : <Check size={14} />} Add {readyRows.length || ""} candidate{readyRows.length !== 1 ? "s" : ""}
        </button>
      </div>
    </Modal>
  );
}
