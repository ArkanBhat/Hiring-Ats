import React, { useState, useRef } from "react";
import { Plus, Upload, Check, Loader, AlertCircle } from "lucide-react";
import { Modal } from "./primitives.jsx";
import { parseResume } from "../lib/parseResume.js";
import { scoreResume, scoreLabel } from "../lib/scoreResume.js";

export default function AddModal({ onClose, onSave, flash, jobs = [], candidates = [], prefill = null }) {
  const [d, setD]           = useState({
    name:       prefill?.name       || "",
    email:      prefill?.email      || "",
    phone:      prefill?.phone      || "",
    position:   prefill?.position   || "",
    source:     prefill?.source     || "Direct",
    referredBy: prefill?.referredBy || "",
  });
  const [resume, setResume] = useState(null);
  const [rawText, setRawText] = useState(prefill?.resumeText || "");
  const [parsing, setParsing] = useState(false);
  const [dupWarn, setDupWarn] = useState(null);
  const fileRef = useRef();

  const checkDup = (email) => {
    const ex = candidates.find((c) => c.email && email && c.email.toLowerCase() === email.toLowerCase());
    setDupWarn(ex ? `${ex.name} is already in the pipeline with this email.` : null);
  };

  const onFile = async (file) => {
    if (!file) return;
    if (file.size > 3.6 * 1024 * 1024) { flash("File too large (max ~3.5MB)"); return; }

    const reader = new FileReader();
    reader.onload = () => setResume({ name: file.name, type: file.type, data: reader.result });
    reader.readAsDataURL(file);

    setParsing(true);
    const extracted = await parseResume(file);
    setParsing(false);
    setRawText(extracted.rawText || "");

    setD((prev) => {
      const next = {
        ...prev,
        name:  extracted.name  || prev.name,
        email: extracted.email || prev.email,
        phone: extracted.phone || prev.phone,
      };
      if (extracted.email) checkDup(extracted.email);
      return next;
    });
  };

  // Compute fit score against the selected job's description
  const selectedJob = jobs.find((j) => j.title === d.position || j.id === d.position);
  const fitScore    = rawText && selectedJob?.description ? scoreResume(rawText, selectedJob.description) : null;
  const sl          = scoreLabel(fitScore);

  const submit = () => {
    if (!d.name || !d.email || !d.position) { flash("Name, email and role are required"); return; }
    onSave({ ...d, resumeText: rawText, fitScore }, resume);
  };

  const positionVal = d.position === "__custom" ? "" : d.position;

  return (
    <Modal title="New candidate" onClose={onClose} icon={<Plus size={16} />}>
      <div className="form-grid">
        <label className="span2">Full name *
          <input value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} placeholder="Auto-filled from resume" />
        </label>
        <label>Email *
          <input value={d.email} type="email" placeholder="Auto-filled from resume"
            onChange={(e) => { setD({ ...d, email: e.target.value }); checkDup(e.target.value); }} />
        </label>
        <label>Phone
          <input value={d.phone} onChange={(e) => setD({ ...d, phone: e.target.value })} placeholder="Auto-filled from resume" />
        </label>

        {dupWarn && <div className="dup-warn span2"><AlertCircle size={13} /> {dupWarn}</div>}

        <label>Role applied for *
          {jobs.length > 0 ? (
            <select value={d.position} onChange={(e) => setD({ ...d, position: e.target.value })}>
              <option value="">Select a position…</option>
              {jobs.map((j) => <option key={j.id} value={j.title}>{j.title}{j.department ? ` — ${j.department}` : ""}</option>)}
              <option value="__custom">Other / unlisted</option>
            </select>
          ) : (
            <input value={d.position} onChange={(e) => setD({ ...d, position: e.target.value })} placeholder="e.g. Frontend Engineer" />
          )}
        </label>
        {jobs.length > 0 && d.position === "__custom" && (
          <label>Custom role
            <input placeholder="Type role name…" onChange={(e) => setD({ ...d, position: e.target.value })} autoFocus />
          </label>
        )}

        <label>Source
          <select value={d.source} onChange={(e) => setD({ ...d, source: e.target.value, referredBy: "" })}>
            <option>Direct</option><option>Referral</option><option>LinkedIn</option><option>Job board</option><option>Agency</option>
          </select>
        </label>
        {d.source === "Referral" && (
          <label>Referred by
            <input value={d.referredBy} onChange={(e) => setD({ ...d, referredBy: e.target.value })}
              placeholder="Who referred this candidate?" />
          </label>
        )}

        <div className={`span2 dropzone${parsing ? " parsing" : ""}`} onClick={() => !parsing && fileRef.current?.click()}>
          <input ref={fileRef} type="file" hidden accept=".pdf,.doc,.docx,image/*"
            onChange={(e) => onFile(e.target.files[0])} />
          {parsing ? <Loader size={18} className="spin" /> : <Upload size={18} />}
          <span>
            {parsing ? "Reading resume…" : resume
              ? resume.name
              : "Upload resume first — name, email & phone will auto-fill (PDF/DOCX)"}
          </span>
          {sl && !parsing && (
            <span className="fit-badge" style={{ color: sl.color, background: sl.bg, marginLeft: "auto" }}>{sl.label}</span>
          )}
        </div>
      </div>

      <div className="modal-foot">
        <button className="btn ghost" onClick={onClose}>Cancel</button>
        <button className="btn primary" onClick={submit} disabled={parsing}>
          <Check size={15} /> Add candidate
        </button>
      </div>
    </Modal>
  );
}
