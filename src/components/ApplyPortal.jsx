import React, { useState, useEffect } from "react";
import { Upload, Check, AlertCircle, Loader, CheckCircle, Briefcase } from "lucide-react";
import { sGet, sSet } from "../lib/storage.js";
import { parseResume } from "../lib/parseResume.js";
import { scoreResume } from "../lib/scoreResume.js";

const uid = () => `c_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
const now = () => new Date().toISOString();

export default function ApplyPortal({ jobId }) {
  const [job, setJob]           = useState(null);
  const [settings, setSettings] = useState({});
  const [phase, setPhase]       = useState("loading"); // loading | ready | not_found | submitted | duplicate

  const [d, setD]             = useState({ name: "", email: "", phone: "" });
  const [resume, setResume]   = useState(null);
  const [rawText, setRawText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [answers, setAnswers] = useState({});
  const [error, setError]     = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const [jobs, s] = await Promise.all([sGet("jobs", []), sGet("settings", {})]);
      const j = jobs.find((x) => x.id === jobId);
      if (!j || j.status !== "open") { setPhase("not_found"); return; }
      setJob(j);
      setSettings(s);
      setPhase("ready");
    })();
  }, [jobId]);

  const onFile = async (file) => {
    if (!file) return;
    if (file.size > 3.6 * 1024 * 1024) { setError("File too large — max ~3.5MB."); return; }
    setError("");

    const reader = new FileReader();
    reader.onload = () => setResume({ name: file.name, type: file.type, data: reader.result });
    reader.readAsDataURL(file);

    setParsing(true);
    const extracted = await parseResume(file);
    setParsing(false);
    setRawText(extracted.rawText || "");
    setD((prev) => ({
      name:  prev.name  || extracted.name  || "",
      email: prev.email || extracted.email || "",
      phone: prev.phone || extracted.phone || "",
    }));
  };

  const setAnswer = (qid, val) => setAnswers((prev) => ({ ...prev, [qid]: val }));

  const submit = async () => {
    setError("");
    if (!d.name.trim() || !d.email.trim()) { setError("Name and email are required."); return; }
    const unanswered = (job.screeningQuestions || []).find((q) => answers[q.id] == null);
    if (unanswered) { setError("Please answer all screening questions."); return; }

    setSubmitting(true);
    try {
      const candidates = await sGet("candidates", []);
      const dup = candidates.find(
        (c) => c.email && c.email.toLowerCase() === d.email.toLowerCase() && c.position === job.title
      );
      if (dup) { setPhase("duplicate"); setSubmitting(false); return; }

      const fitScore = rawText && job.description ? scoreResume(rawText, job.description) : null;

      const failed = (job.screeningQuestions || []).find(
        (q) => (answers[q.id] === "yes") !== q.requireYes
      );
      const knockedOut = !!failed;

      const id = uid();
      const candidate = {
        id, name: d.name.trim(), email: d.email.trim(), phone: d.phone.trim(),
        position: job.title, source: "Careers page",
        status: knockedOut ? "rejected" : "applied",
        rejectionReason: knockedOut ? `Auto-rejected — screening: "${failed.text}"` : null,
        knockedOut,
        screeningAnswers: (job.screeningQuestions || []).map((q) => ({ text: q.text, answer: answers[q.id] })),
        resumeName: resume ? resume.name : null,
        resumeText: rawText || "",
        fitScore, priority: false, referredBy: "",
        tags: [], notes: [], interview: null, feedback: null, documents: [], offer: null,
        activity: [{ at: now(), text: "Application submitted via careers page" }],
        createdAt: now(), updatedAt: now(),
      };

      if (resume) await sSet(`resume:${id}`, resume);
      await sSet("candidates", [candidate, ...candidates]);
      setPhase("submitted");
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const company = settings.company || "Hiring Team";

  if (phase === "loading") return (
    <div className="portal-wrap">
      <div className="portal-loading"><Loader size={26} className="spin" /></div>
    </div>
  );

  if (phase === "not_found") return (
    <div className="portal-wrap">
      <div className="portal-card portal-center">
        <AlertCircle size={44} style={{ color: "var(--bad)", marginBottom: 14 }} />
        <h2 className="portal-title">Role not found</h2>
        <p className="portal-body">This position is no longer accepting applications. Please check the careers page for current openings.</p>
      </div>
    </div>
  );

  if (phase === "duplicate") return (
    <div className="portal-wrap">
      <div className="portal-card portal-center">
        <CheckCircle size={52} style={{ color: "var(--good)", marginBottom: 16 }} />
        <h2 className="portal-title">Already applied</h2>
        <p className="portal-body">
          We already have an application on file from <strong>{d.email}</strong> for the <strong>{job.title}</strong> role.
          Our team will be in touch.
        </p>
      </div>
    </div>
  );

  if (phase === "submitted") return (
    <div className="portal-wrap">
      <div className="portal-card portal-center">
        <CheckCircle size={52} style={{ color: "var(--good)", marginBottom: 16 }} />
        <h2 className="portal-title" style={{ color: "var(--good)" }}>Application received!</h2>
        <p className="portal-body">
          Thank you, <strong>{d.name}</strong>. Your application for <strong>{job.title}</strong> at <strong>{company}</strong> has
          been submitted. We'll review it and be in touch with next steps.
        </p>
      </div>
    </div>
  );

  return (
    <div className="portal-wrap">
      <header className="portal-header">
        <div className="portal-brand-mark">{company.slice(0, 2).toUpperCase()}</div>
        <div>
          <div className="portal-brand">{company}</div>
          <div className="portal-header-sub"><Briefcase size={11} style={{ verticalAlign: -1 }} /> Applying for {job.title}</div>
        </div>
      </header>

      <div className="portal-card">
        <div className="portal-greeting">
          <h2 className="portal-title">Apply for {job.title}</h2>
          {job.description && <p className="portal-body">{job.description}</p>}
        </div>

        <div className="form-grid">
          <label className="span2">Full name *
            <input value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} placeholder="Your name" />
          </label>
          <label>Email *
            <input type="email" value={d.email} onChange={(e) => setD({ ...d, email: e.target.value })} placeholder="you@example.com" />
          </label>
          <label>Phone
            <input value={d.phone} onChange={(e) => setD({ ...d, phone: e.target.value })} placeholder="Optional" />
          </label>

          <div className={`span2 dropzone${parsing ? " parsing" : ""}`} onClick={() => !parsing && document.getElementById("apply-file")?.click()}>
            <input id="apply-file" type="file" hidden accept=".pdf,.doc,.docx"
              onChange={(e) => onFile(e.target.files[0])} />
            {parsing ? <Loader size={18} className="spin" /> : <Upload size={18} />}
            <span>{parsing ? "Reading resume…" : resume ? resume.name : "Upload your resume (PDF/DOCX) — optional but recommended"}</span>
          </div>
        </div>

        {job.screeningQuestions?.length > 0 && (
          <div className="screen-builder" style={{ marginTop: 18 }}>
            <div className="screen-builder-head"><span>Screening questions</span></div>
            {job.screeningQuestions.map((q) => (
              <div key={q.id} className="apply-q">
                <div className="apply-q-text">{q.text}</div>
                <div className="apply-q-opts">
                  <label className={`apply-opt${answers[q.id] === "yes" ? " sel" : ""}`}>
                    <input type="radio" name={q.id} checked={answers[q.id] === "yes"} onChange={() => setAnswer(q.id, "yes")} /> Yes
                  </label>
                  <label className={`apply-opt${answers[q.id] === "no" ? " sel" : ""}`}>
                    <input type="radio" name={q.id} checked={answers[q.id] === "no"} onChange={() => setAnswer(q.id, "no")} /> No
                  </label>
                </div>
              </div>
            ))}
          </div>
        )}

        {error && <div className="portal-error-msg" style={{ marginTop: 14 }}><AlertCircle size={13} /> {error}</div>}

        <div className="portal-submit-row" style={{ marginTop: 18 }}>
          <p className="portal-submit-note">By submitting, you confirm the information above is accurate.</p>
          <button className="btn primary" style={{ minWidth: 180 }} onClick={submit} disabled={submitting || parsing}>
            {submitting ? <><Loader size={14} className="spin" /> Submitting…</> : <><Check size={14} /> Submit application</>}
          </button>
        </div>
      </div>
    </div>
  );
}
