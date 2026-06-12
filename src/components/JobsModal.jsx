import React, { useState } from "react";
import { Briefcase, Plus, Check, Users, ChevronDown, ChevronUp } from "lucide-react";
import { Modal } from "./primitives.jsx";
import { uid, now } from "../lib/helpers.js";

const STATUS_STYLE = {
  open:   { label: "Open",   bg: "rgba(74,124,89,.15)",   color: "var(--good)" },
  paused: { label: "Paused", bg: "rgba(200,136,30,.15)",  color: "var(--warn)" },
  closed: { label: "Closed", bg: "rgba(138,129,117,.15)", color: "var(--faint)" },
};

const BLANK = { title: "", department: "", hiringManager: "", headcount: 1, description: "" };

export default function JobsModal({ jobs, setJobs, candidates, onClose, flash }) {
  const [creating, setCreating] = useState(false);
  const [form, setForm]         = useState(BLANK);
  const [expanded, setExpanded] = useState(null);

  const save = () => {
    if (!form.title.trim()) { flash("Job title is required"); return; }
    setJobs((p) => [{ id: uid(), ...form, headcount: Number(form.headcount) || 1, status: "open", createdAt: now() }, ...p]);
    setForm(BLANK);
    setCreating(false);
    flash("Position created");
  };

  const setStatus = (id, status) => setJobs((p) => p.map((j) => (j.id === id ? { ...j, status } : j)));

  const pipelineCount = (title) => candidates.filter((c) => c.position === title && !["hired", "rejected"].includes(c.status)).length;
  const hiredCount    = (title) => candidates.filter((c) => c.position === title && c.status === "hired").length;

  const open   = jobs.filter((j) => j.status === "open");
  const others = jobs.filter((j) => j.status !== "open");

  const JobCard = ({ j }) => {
    const sc = STATUS_STYLE[j.status] || STATUS_STYLE.open;
    const isExp = expanded === j.id;
    return (
      <div className={`job-card${j.status !== "open" ? " job-dim" : ""}`}>
        <div className="job-card-head" onClick={() => setExpanded(isExp ? null : j.id)}>
          <div className="job-card-left">
            <div className="job-title">{j.title}</div>
            <div className="job-meta">
              {j.department && <span>{j.department}</span>}
              {j.hiringManager && <span>· {j.hiringManager}</span>}
              <span>· {j.headcount} headcount</span>
            </div>
          </div>
          <div className="job-card-right">
            <span className="job-badge" style={{ background: sc.bg, color: sc.color }}>{sc.label}</span>
            <span className="chip"><Users size={11} /> {pipelineCount(j.title)} active · {hiredCount(j.title)} hired</span>
            {isExp ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </div>
        </div>
        {isExp && (
          <div className="job-expanded">
            {j.description && <p className="job-desc">{j.description}</p>}
            <div className="row-btns" style={{ marginTop: 8 }}>
              {j.status !== "open"   && <button className="btn xs good" onClick={() => setStatus(j.id, "open")}>Reopen</button>}
              {j.status === "open"   && <button className="btn xs warn" onClick={() => setStatus(j.id, "paused")}>Pause</button>}
              {j.status !== "closed" && <button className="btn xs bad"  onClick={() => setStatus(j.id, "closed")}>Close</button>}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <Modal title="Open positions" onClose={onClose} icon={<Briefcase size={16} />} wide>
      <div className="jobs-body">
        {!creating ? (
          <button className="btn primary" style={{ marginBottom: 16 }} onClick={() => setCreating(true)}>
            <Plus size={14} /> New position
          </button>
        ) : (
          <div className="job-form">
            <div className="form-grid">
              <label className="span2">Job title *
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Senior Frontend Engineer" autoFocus />
              </label>
              <label>Department
                <input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} placeholder="Engineering" />
              </label>
              <label>Hiring manager
                <input value={form.hiringManager} onChange={(e) => setForm({ ...form, hiringManager: e.target.value })} placeholder="Name" />
              </label>
              <label>Headcount
                <input type="number" min={1} value={form.headcount} onChange={(e) => setForm({ ...form, headcount: e.target.value })} />
              </label>
              <label className="span2">Description
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2} placeholder="Brief role summary…" />
              </label>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button className="btn primary" onClick={save}><Check size={14} /> Save</button>
              <button className="btn ghost" onClick={() => { setCreating(false); setForm(BLANK); }}>Cancel</button>
            </div>
          </div>
        )}

        {jobs.length === 0 && !creating && (
          <div className="an-empty" style={{ padding: "32px 0", textAlign: "center" }}>
            No positions yet. Create one and candidates will be linked to it.
          </div>
        )}

        {open.length > 0 && (
          <div className="jobs-group">
            <div className="jobs-group-title">Active ({open.length})</div>
            {open.map((j) => <JobCard key={j.id} j={j} />)}
          </div>
        )}

        {others.length > 0 && (
          <div className="jobs-group">
            <div className="jobs-group-title">Paused / Closed ({others.length})</div>
            {others.map((j) => <JobCard key={j.id} j={j} />)}
          </div>
        )}

        <div className="modal-foot">
          <button className="btn ghost" onClick={onClose}>Done</button>
        </div>
      </div>
    </Modal>
  );
}
