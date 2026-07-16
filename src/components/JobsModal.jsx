import React, { useState } from "react";
import { Briefcase, Plus, Check, Users, ChevronDown, ChevronUp, Link2, X, ShieldQuestion } from "lucide-react";
import { Modal } from "./primitives.jsx";
import { uid, now } from "../lib/helpers.js";

const STATUS_STYLE = {
  open:   { label: "Open",   bg: "rgba(74,124,89,.15)",   color: "var(--good)" },
  paused: { label: "Paused", bg: "rgba(200,136,30,.15)",  color: "var(--warn)" },
  closed: { label: "Closed", bg: "rgba(138,129,117,.15)", color: "var(--faint)" },
};

const BLANK = { title: "", department: "", hiringManager: "", headcount: 1, description: "", screeningQuestions: [] };

function careersUrl() {
  return `${window.location.origin}${window.location.pathname}?careers=1`;
}
function applyUrl(jobId) {
  return `${window.location.origin}${window.location.pathname}?apply=${jobId}`;
}

export default function JobsModal({ jobs, setJobs, candidates, onClose, flash }) {
  const [creating, setCreating] = useState(false);
  const [form, setForm]         = useState(BLANK);
  const [expanded, setExpanded] = useState(null);

  const copy = (text, msg) => {
    navigator.clipboard?.writeText(text).then(() => flash(msg)).catch(() => flash("Couldn't copy — copy manually"));
  };

  const addQuestion = () =>
    setForm((f) => ({ ...f, screeningQuestions: [...f.screeningQuestions, { id: uid(), text: "", requireYes: true }] }));
  const updateQuestion = (id, patch) =>
    setForm((f) => ({ ...f, screeningQuestions: f.screeningQuestions.map((q) => (q.id === id ? { ...q, ...patch } : q)) }));
  const removeQuestion = (id) =>
    setForm((f) => ({ ...f, screeningQuestions: f.screeningQuestions.filter((q) => q.id !== id) }));

  const save = () => {
    if (!form.title.trim()) { flash("Job title is required"); return; }
    const questions = form.screeningQuestions.filter((q) => q.text.trim());
    setJobs((p) => [{ id: uid(), ...form, screeningQuestions: questions, headcount: Number(form.headcount) || 1, status: "open", createdAt: now() }, ...p]);
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
            {j.screeningQuestions?.length > 0 && (
              <div className="screen-list">
                {j.screeningQuestions.map((q) => (
                  <div key={q.id} className="screen-item">
                    <ShieldQuestion size={12} />
                    <span>{q.text}</span>
                    <span className="screen-expect">requires: {q.requireYes ? "Yes" : "No"}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="row-btns" style={{ marginTop: 8 }}>
              {j.status === "open" && (
                <button className="btn xs ghost" onClick={() => copy(applyUrl(j.id), "Apply link copied")}>
                  <Link2 size={12} /> Copy apply link
                </button>
              )}
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
          <div className="row-btns" style={{ marginBottom: 16 }}>
            <button className="btn primary" onClick={() => setCreating(true)}>
              <Plus size={14} /> New position
            </button>
            <button className="btn ghost" onClick={() => copy(careersUrl(), "Careers page link copied")}>
              <Link2 size={14} /> Copy careers page link
            </button>
          </div>
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
                  rows={2} placeholder="Brief role summary… (also used to compute resume match score)" />
              </label>
            </div>

            <div className="screen-builder">
              <div className="screen-builder-head">
                <span><ShieldQuestion size={13} /> Screening questions</span>
                <button className="btn xs ghost" onClick={addQuestion}><Plus size={11} /> Add question</button>
              </div>
              {form.screeningQuestions.length === 0 && (
                <div className="an-empty" style={{ padding: "6px 0" }}>
                  None yet. Candidates who fail a required question are auto-rejected on application.
                </div>
              )}
              {form.screeningQuestions.map((q) => (
                <div key={q.id} className="screen-row">
                  <input
                    value={q.text}
                    placeholder="e.g. Are you authorized to work in this country?"
                    onChange={(e) => updateQuestion(q.id, { text: e.target.value })}
                  />
                  <select value={q.requireYes ? "yes" : "no"} onChange={(e) => updateQuestion(q.id, { requireYes: e.target.value === "yes" })}>
                    <option value="yes">Requires Yes</option>
                    <option value="no">Requires No</option>
                  </select>
                  <button className="icon-btn" onClick={() => removeQuestion(q.id)}><X size={14} /></button>
                </div>
              ))}
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
