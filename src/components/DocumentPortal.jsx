import React, { useState, useEffect } from "react";
import { Upload, Check, FileText, AlertCircle, Loader, CheckCircle, Lock } from "lucide-react";
import { sGet, sSet } from "../lib/storage.js";

function readAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload  = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export default function DocumentPortal({ token }) {
  const [candidate,   setCandidate]   = useState(null);
  const [settings,    setSettings]    = useState({});
  const [phase,       setPhase]       = useState("loading"); // loading | ready | not_found | submitted
  const [uploads,     setUploads]     = useState({});        // { docIndex: File }
  const [submitting,  setSubmitting]  = useState(false);
  const [error,       setError]       = useState("");

  useEffect(() => {
    (async () => {
      const [candidates, s] = await Promise.all([
        sGet("candidates", []),
        sGet("settings",   {}),
      ]);
      setSettings(s);
      const c = candidates.find((x) => x.documentToken === token);
      if (!c) { setPhase("not_found"); return; }
      if (c.documents?.length && c.documents.every((d) => d.collected)) {
        setCandidate(c); setPhase("submitted"); return;
      }
      setCandidate(c);
      setPhase("ready");
    })();
  }, [token]);

  const handleFile = (index, file) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setError("File too large — max 10 MB per document."); return; }
    setError("");
    setUploads((prev) => ({ ...prev, [index]: file }));
  };

  const submit = async () => {
    setError("");
    setSubmitting(true);
    try {
      for (const [idx, file] of Object.entries(uploads)) {
        const data = await readAsDataURL(file);
        await sSet(`portal_doc:${candidate.id}:${idx}`, { name: file.name, data, type: file.type });
      }

      const candidates = await sGet("candidates", []);
      const updated = candidates.map((c) => {
        if (c.id !== candidate.id) return c;
        return {
          ...c,
          documents: c.documents.map((d, i) => ({
            ...d,
            collected: d.collected || !!uploads[i],
          })),
          updatedAt: new Date().toISOString(),
          activity: [
            { at: new Date().toISOString(), text: "Documents submitted via candidate portal" },
            ...(c.activity || []),
          ],
        };
      });
      await sSet("candidates", updated);
      setPhase("submitted");
    } catch (err) {
      setError("Something went wrong. Please try again.");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const company = settings.company || "Hiring Team";
  const docs     = candidate?.documents || [];
  const doneCount = docs.filter((d, i) => d.collected || !!uploads[i]).length;
  const allReady  = docs.length > 0 && doneCount === docs.length;

  /* ── phases ─────────────────────────────────── */
  if (phase === "loading") return (
    <div className="portal-wrap">
      <div className="portal-loading"><Loader size={26} className="spin" /></div>
    </div>
  );

  if (phase === "not_found") return (
    <div className="portal-wrap">
      <div className="portal-card portal-center">
        <AlertCircle size={44} style={{ color: "var(--bad)", marginBottom: 14 }} />
        <h2 className="portal-title">Link not found</h2>
        <p className="portal-body">This upload link is invalid or has already been used. Please contact the hiring team for assistance.</p>
      </div>
    </div>
  );

  if (phase === "submitted") return (
    <div className="portal-wrap">
      <div className="portal-card portal-center">
        <CheckCircle size={52} style={{ color: "var(--good)", marginBottom: 16 }} />
        <h2 className="portal-title" style={{ color: "var(--good)" }}>All done!</h2>
        <p className="portal-body">
          Thank you, <strong>{candidate?.name}</strong>. Your documents have been successfully submitted to <strong>{company}</strong>.
          We'll review them and be in touch with next steps shortly.
        </p>
      </div>
    </div>
  );

  /* ── main upload view ────────────────────────── */
  return (
    <div className="portal-wrap">
      <header className="portal-header">
        <div className="portal-brand-mark">{company.slice(0, 2).toUpperCase()}</div>
        <div>
          <div className="portal-brand">{company}</div>
          <div className="portal-header-sub">Candidate Document Portal</div>
        </div>
        <div className="portal-secure"><Lock size={11} /> Secure upload</div>
      </header>

      <div className="portal-card">
        <div className="portal-greeting">
          <h2 className="portal-title">Hi {candidate.name} 👋</h2>
          <p className="portal-body">
            We're excited to move forward with your application for <strong>{candidate.position}</strong>.
            Please upload all the required documents listed below to complete the process.
            <br /><span style={{ fontSize: 12, color: "var(--muted)", marginTop: 4, display: "block" }}>
              All documents marked with <span style={{ color: "var(--bad)" }}>*</span> are mandatory.
            </span>
          </p>
        </div>

        <div className="portal-progress-bar">
          <div className="portal-progress-fill" style={{ width: `${docs.length ? (doneCount / docs.length) * 100 : 0}%` }} />
        </div>
        <div className="portal-progress-label">{doneCount} of {docs.length} documents ready</div>

        <div className="portal-docs">
          {docs.map((doc, i) => {
            const done = doc.collected || !!uploads[i];
            return (
              <div key={i} className={`portal-doc-row${done ? " done" : ""}`}>
                <div className="portal-doc-icon">
                  {done
                    ? <CheckCircle size={20} style={{ color: "var(--good)" }} />
                    : <FileText    size={20} style={{ color: "var(--faint)" }} />}
                </div>
                <div className="portal-doc-info">
                  <div className="portal-doc-name">
                    {doc.name} <span style={{ color: "var(--bad)", fontSize: 13 }}>*</span>
                  </div>
                  {uploads[i]     && <div className="portal-doc-file">📎 {uploads[i].name}</div>}
                  {doc.collected  && <div className="portal-doc-file" style={{ color: "var(--good)" }}>✓ Already received</div>}
                </div>
                {!doc.collected && (
                  <label className={`btn xs${uploads[i] ? " good" : ""}`} style={{ cursor: "pointer", flexShrink: 0 }}>
                    <Upload size={12} /> {uploads[i] ? "Change" : "Choose file"}
                    <input type="file" hidden
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,.zip"
                      onChange={(e) => handleFile(i, e.target.files[0])} />
                  </label>
                )}
              </div>
            );
          })}
        </div>

        {error && (
          <div className="portal-error-msg"><AlertCircle size={13} /> {error}</div>
        )}

        <div className="portal-submit-row">
          <p className="portal-submit-note">
            By submitting, you confirm these documents are accurate and belong to you.
          </p>
          <button className="btn primary" style={{ minWidth: 180 }}
            onClick={submit} disabled={!allReady || submitting}>
            {submitting
              ? <><Loader size={14} className="spin" /> Submitting…</>
              : <><Check size={14} /> Submit all documents</>}
          </button>
        </div>
      </div>

      <div className="portal-footer-note">
        <Lock size={11} /> Your files are securely stored and accessible only to the hiring team.
      </div>
    </div>
  );
}
