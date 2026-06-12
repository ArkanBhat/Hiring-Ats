import React, { useState } from "react";
import {
  X, User, Mail, Phone, Briefcase, FileText, Download, Sparkles, Check,
  ThumbsUp, ThumbsDown, PauseCircle, RotateCcw, AlertCircle, Award, Star,
  Clock, Trash2, Calendar, Tag, StickyNote, Plus,
} from "lucide-react";
import { Section, StageBlock, Field } from "./primitives.jsx";
import { InterviewForm, FeedbackForm, DocChecklist } from "./forms.jsx";
import { TAGS, REJECTION_REASONS, stageMeta } from "../config.js";
import { initials, fmtDate, fmtDateTime, dataUrlToBlob, download, now } from "../lib/helpers.js";
import { sGet } from "../lib/storage.js";

export default function CandidateDrawer({
  c, settings, patch, flash, onClose, onDelete,
  onInterviewEmail, onRejectEmail, onOffer, onDocEmail,
}) {
  const meta = stageMeta(c.status);
  const moveTo = (status, note) => patch(c.id, { status }, note);

  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason]     = useState("");
  const [showTagPicker, setShowTagPicker]   = useState(false);

  const getResume = async () => {
    const r = await sGet(`resume:${c.id}`, null);
    if (!r) { flash("No resume on file"); return; }
    download(dataUrlToBlob(r.data), r.name);
  };

  const addTag = (tagId) => {
    if ((c.tags || []).includes(tagId)) return;
    patch(c.id, (x) => ({ ...x, tags: [...(x.tags || []), tagId] }));
  };
  const removeTag = (tagId) => patch(c.id, (x) => ({ ...x, tags: (x.tags || []).filter((t) => t !== tagId) }));

  const doReject = (reason) => {
    const note = reason ? `Rejected — ${reason}` : "Rejected";
    patch(c.id, { status: "rejected", rejectionReason: reason || null }, note);
    setShowRejectForm(false);
    setRejectReason("");
    onRejectEmail();
  };

  const availableTags = TAGS.filter((t) => !(c.tags || []).includes(t.id));

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <aside className="drawer">
        <div className="drawer-head">
          <div className="dh-id">
            <span className="avatar lg" style={{ background: meta.color }}>{initials(c.name)}</span>
            <div>
              <div className="dh-name">{c.name}</div>
              <div className="dh-role">{c.position} · {c.source}</div>
            </div>
          </div>
          <div style={{ display:"flex", gap:4, alignItems:"center" }}>
            <button
              className="icon-btn"
              title={c.priority ? "Remove priority" : "Mark high priority"}
              onClick={() => patch(c.id, (x) => ({ ...x, priority: !x.priority }), c.priority ? "Priority removed" : "Marked high priority")}
            >
              <Star size={16} fill={c.priority ? "#F59E0B" : "none"} color={c.priority ? "#F59E0B" : "var(--faint)"} />
            </button>
            <button className="icon-btn" onClick={onClose}><X size={18} /></button>
          </div>
        </div>

        <div className="stage-pill" style={{ "--c": meta.color }}>{meta.label}</div>

        <div className="drawer-body">

          {/* ── Tags ───────────────────────────────────────── */}
          <div className="tags-row">
            {(c.tags || []).map((tid) => {
              const tm = TAGS.find((t) => t.id === tid);
              if (!tm) return null;
              return (
                <span key={tid} className="tag-chip" style={{ "--tc": tm.color }}>
                  {tm.label}
                  <button className="tag-rm" onClick={() => removeTag(tid)}><X size={9} /></button>
                </span>
              );
            })}
            {availableTags.length > 0 && (
              <div style={{ position: "relative" }}>
                <button className="tag-add-btn" onClick={() => setShowTagPicker((p) => !p)}>
                  <Plus size={10} /> Tag
                </button>
                {showTagPicker && (
                  <div className="tag-picker">
                    {availableTags.map((t) => (
                      <button key={t.id} className="tag-picker-item" style={{ "--tc": t.color }}
                        onClick={() => { addTag(t.id); setShowTagPicker(false); }}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Contact ────────────────────────────────────── */}
          <Section title="Contact" icon={<User size={14} />}>
            <Field icon={<Mail size={13} />}     v={c.email}    href={`mailto:${c.email}`} />
            <Field icon={<Phone size={13} />}    v={c.phone}    href={`tel:${c.phone}`} />
            <Field icon={<Briefcase size={13} />} v={c.position} />
            {c.referredBy && <Field icon={<User size={13} />} v={`Referred by ${c.referredBy}`} />}
            <div className="resume-row">
              <span className="muted"><FileText size={13} /> {c.resumeName || "No resume uploaded"}</span>
              {c.resumeName && <button className="btn xs" onClick={getResume}><Download size={13} /> Download</button>}
            </div>
          </Section>

          {/* ── Actions ────────────────────────────────────── */}
          <Section title="Actions" icon={<Sparkles size={14} />}>
            {c.status === "applied" && (
              <StageBlock label="Fill in the details and click Schedule — the invite email will open automatically.">
                <InterviewForm c={c} patch={patch} flash={flash}
                  onScheduled={(interviewData) => onInterviewEmail({ ...c, interview: interviewData })} />
              </StageBlock>
            )}

            {c.status === "interview" && (
              <StageBlock label="Interview scheduled. Send the invite email or move to feedback.">
                <div className="row-btns">
                  <button className="btn" onClick={onInterviewEmail}><Mail size={14} /> Send invite + CV</button>
                  <button className="btn primary" onClick={() => moveTo("decision", "Interview completed — awaiting decision")}>
                    <Check size={14} /> Interview done
                  </button>
                </div>
                <button className="btn ghost xs mt" onClick={() => moveTo("applied", "Moved back to Applied")}>
                  <RotateCcw size={12} /> Back to Applied
                </button>
              </StageBlock>
            )}

            {c.status === "decision" && (
              <StageBlock label="Record feedback, then decide.">
                <FeedbackForm c={c} patch={patch} flash={flash} />
                <div className="decision-grid">
                  <button className="btn good" disabled={!c.feedback}
                    onClick={() => patch(c.id, (x) => ({
                      ...x, status: "documents",
                      documents: x.documents?.length ? x.documents : settings.defaultDocs.map((d) => ({ name: d, collected: false })),
                    }), "Selected — collecting documents")}>
                    <ThumbsUp size={14} /> Select
                  </button>
                  <button className="btn warn" onClick={() => moveTo("hold", "Put on hold")}>
                    <PauseCircle size={14} /> Hold
                  </button>
                  <button className="btn bad" onClick={() => setShowRejectForm(true)}>
                    <ThumbsDown size={14} /> Reject
                  </button>
                </div>
                {!c.feedback && <div className="note"><AlertCircle size={12} /> Add feedback to enable Select.</div>}
                {showRejectForm && <RejectForm reason={rejectReason} setReason={setRejectReason} onConfirm={doReject} onCancel={() => setShowRejectForm(false)} />}
              </StageBlock>
            )}

            {c.status === "documents" && (
              <StageBlock label="Send the candidate a secure upload link, then track docs below.">
                <button className="btn full" style={{ marginBottom: 10 }} onClick={onDocEmail}>
                  <Mail size={14} /> Send document request email
                </button>
                <DocChecklist c={c} patch={patch} />
                <button className="btn primary mt"
                  disabled={!(c.documents?.length && c.documents.every((d) => d.collected))}
                  onClick={onOffer}>
                  <Award size={14} /> Release offer letter
                </button>
              </StageBlock>
            )}

            {c.status === "offer" && (
              <StageBlock label="Offer released. Update once the candidate responds.">
                {c.offer && (
                  <div className="offer-recap">
                    <div><b>{c.offer.title}</b> · {c.offer.currency} {c.offer.salary}</div>
                    <div className="muted">Start: {fmtDate(c.offer.startDate)} · Released {fmtDate(c.offer.releasedAt)}</div>
                  </div>
                )}
                <div className="row-btns">
                  <button className="btn good" onClick={() => moveTo("hired", "Offer accepted — hired")}><Check size={14} /> Accepted</button>
                  <button className="btn bad"  onClick={() => setShowRejectForm(true)}><X size={14} /> Declined</button>
                </div>
                <button className="btn ghost xs mt" onClick={onOffer}><FileText size={12} /> View / regenerate letter</button>
                {showRejectForm && <RejectForm reason={rejectReason} setReason={setRejectReason} onConfirm={doReject} onCancel={() => setShowRejectForm(false)} label="Reason offer was declined" />}
              </StageBlock>
            )}

            {c.status === "hired" && (
              <div className="celebrate"><Award size={28} /> Hired — welcome aboard 🎉</div>
            )}

            {c.status === "hold" && (
              <StageBlock label="Parked. Resume the process or close out.">
                <div className="row-btns">
                  <button className="btn primary" onClick={() => moveTo("decision", "Reopened from hold")}><RotateCcw size={14} /> Reconsider</button>
                  <button className="btn bad" onClick={() => setShowRejectForm(true)}><ThumbsDown size={14} /> Reject</button>
                </div>
                {showRejectForm && <RejectForm reason={rejectReason} setReason={setRejectReason} onConfirm={doReject} onCancel={() => setShowRejectForm(false)} />}
              </StageBlock>
            )}

            {c.status === "rejected" && (
              <StageBlock label="Closed.">
                {c.rejectionReason && <div className="rejection-reason-badge">Reason: {c.rejectionReason}</div>}
                <div className="row-btns">
                  <button className="btn ghost" onClick={onRejectEmail}><Mail size={14} /> Rejection email</button>
                  <button className="btn ghost" onClick={() => moveTo("decision", "Reopened")}><RotateCcw size={14} /> Reopen</button>
                </div>
              </StageBlock>
            )}
          </Section>

          {/* ── Notes ──────────────────────────────────────── */}
          <Section title="Notes" icon={<StickyNote size={14} />}>
            <NotesLog c={c} patch={patch} />
          </Section>

          {/* ── Feedback recap ─────────────────────────────── */}
          {c.feedback && (
            <Section title="Feedback" icon={<Star size={14} />}>
              <div className="fb-recap">
                <div className="stars">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star key={n} size={15} fill={n <= c.feedback.rating ? "#B5832E" : "none"} color="#B5832E" />
                  ))}
                </div>
                {c.feedback.strengths  && <p><b>Strengths:</b> {c.feedback.strengths}</p>}
                {c.feedback.concerns   && <p><b>Concerns:</b> {c.feedback.concerns}</p>}
                {c.feedback.recommendation && <p className="muted">Rec: {c.feedback.recommendation}</p>}
                {c.feedback.by         && <p className="muted small">— {c.feedback.by}</p>}
              </div>
            </Section>
          )}

          {/* ── Activity ───────────────────────────────────── */}
          <Section title="Activity" icon={<Clock size={14} />}>
            <ul className="activity">
              {(c.activity || []).map((a, i) => (
                <li key={i}><span className="act-dot" /><span>{a.text}</span><time>{fmtDateTime(a.at)}</time></li>
              ))}
            </ul>
          </Section>

          <button className="btn danger-ghost full" onClick={onDelete}><Trash2 size={14} /> Delete candidate</button>
        </div>
      </aside>
    </>
  );
}

function NotesLog({ c, patch }) {
  const [input, setInput] = useState("");
  const notes = Array.isArray(c.notes) ? c.notes : [];

  const add = () => {
    const text = input.trim();
    if (!text) return;
    patch(c.id, (x) => ({ ...x, notes: [{ text, at: now() }, ...(Array.isArray(x.notes) ? x.notes : [])] }));
    setInput("");
  };

  return (
    <div className="notes-log">
      <div className="note-add-row">
        <textarea className="notes-area" rows={2} placeholder="Add a note… (Ctrl+Enter to save)"
          value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && e.ctrlKey) add(); }} />
        <button className="btn xs primary" onClick={add} disabled={!input.trim()}>Add</button>
      </div>
      {notes.length === 0 && <div className="notes-empty">No notes yet</div>}
      {notes.map((n, i) => (
        <div key={i} className="note-entry">
          <div className="note-text">{n.text}</div>
          <time className="note-time">{fmtDateTime(n.at)}</time>
        </div>
      ))}
    </div>
  );
}

function RejectForm({ reason, setReason, onConfirm, onCancel, label = "Reason for rejection" }) {
  return (
    <div className="reject-form">
      <div className="reject-form-label">{label}</div>
      <select value={reason} onChange={(e) => setReason(e.target.value)}>
        <option value="">Select a reason (optional)</option>
        {REJECTION_REASONS.map((r) => <option key={r}>{r}</option>)}
      </select>
      {reason === "Other" && (
        <input style={{ marginTop: 6 }} placeholder="Specify reason…" onChange={(e) => setReason(e.target.value)} autoFocus />
      )}
      <div style={{ display: "flex", gap: 7, marginTop: 10 }}>
        <button className="btn bad xs" onClick={() => onConfirm(reason)}><ThumbsDown size={12} /> Confirm rejection</button>
        <button className="btn ghost xs" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}
