import React, { useState } from "react";
import { Mail, FileText, ClipboardList, Send, CalendarPlus, Loader, CheckCircle } from "lucide-react";
import { Modal } from "./primitives.jsx";
import { dataUrlToBlob, download } from "../lib/helpers.js";
import { sGet } from "../lib/storage.js";
import { buildICS, downloadICS } from "../lib/ics.js";
import { sendViaEmailJS, isEmailJSConfigured } from "../lib/sendEmail.js";

export default function EmailModal({ payload, onClose, patch, flash, settings }) {
  const [subject, setSubject] = useState(payload.subject);
  const [body,    setBody]    = useState(payload.body);
  const [sending, setSending] = useState(false);
  const [sent,    setSent]    = useState(false);

  const [ivSubject, setIvSubject] = useState(payload.interviewerMail?.subject || "");
  const [ivBody,    setIvBody]    = useState(payload.interviewerMail?.body    || "");

  const isInterview = payload.kind === "interview";
  const canSendJS   = isEmailJSConfigured(settings);

  const downloadResume = async () => {
    const r = await sGet(`resume:${payload.candidateId}`, null);
    if (!r) { flash("No resume on file"); return; }
    download(dataUrlToBlob(r.data), r.name);
  };

  const copyAll = async () => {
    try { await navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`); flash("Copied to clipboard"); }
    catch { flash("Copy failed — select manually"); }
  };

  const openMail = () => {
    window.open(`mailto:${payload.to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, "_blank");
    patch(payload.candidateId, {}, `${isInterview ? "Interview" : "Rejection"} email opened`);
  };

  const copyInterviewer = async () => {
    try { await navigator.clipboard.writeText(`Subject: ${ivSubject}\n\n${ivBody}`); flash("Copied to clipboard"); }
    catch { flash("Copy failed — select manually"); }
  };

  const openInterviewerMail = () => {
    window.open(`mailto:${payload.interviewerMail.to}?subject=${encodeURIComponent(ivSubject)}&body=${encodeURIComponent(ivBody)}`, "_blank");
    patch(payload.candidateId, {}, "Interviewer notified");
  };

  const addToCalendar = () => {
    if (!payload.interview) { flash("No interview details found"); return; }
    const iv = payload.interview;
    const ics = buildICS({
      candidateName:  payload.candidateName || "Candidate",
      position:       payload.position || "",
      date:           iv.date,
      time:           iv.time,
      mode:           iv.mode,
      location:       iv.location,
      interviewer:    iv.interviewer,
      candidateEmail: payload.to,
      organizerEmail: "",
    });
    if (!ics) { flash("Interview date/time missing"); return; }
    downloadICS(ics, `interview-${(payload.candidateName || "candidate").replace(/\s+/g, "-").toLowerCase()}.ics`);
    flash("Calendar invite downloaded — attach it to your email");
  };

  const sendEmail = async () => {
    setSending(true);
    try {
      await sendViaEmailJS({
        serviceId:  settings.emailjsServiceId,
        templateId: settings.emailjsTemplateId,
        publicKey:  settings.emailjsPublicKey,
        to:         payload.to,
        subject,
        body,
        fromName:   settings.company || "Hiring Team",
      });
      setSent(true);
      patch(payload.candidateId, {}, `${isInterview ? "Interview" : "Rejection"} email sent via EmailJS`);
      flash("Email sent successfully!");
      setTimeout(onClose, 1500);
    } catch (err) {
      flash(err.message || "Email failed — check EmailJS settings");
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal title={isInterview ? "Interview invitation" : "Rejection email"} onClose={onClose} icon={<Mail size={16} />}>
      <div className="form-grid">
        <label className="span2">To<input value={payload.to} readOnly style={{ background: "var(--bg)", color: "var(--muted)" }} /></label>
        <label className="span2">Subject<input value={subject} onChange={(e) => setSubject(e.target.value)} /></label>
        <label className="span2">Body<textarea rows={11} value={body} onChange={(e) => setBody(e.target.value)} /></label>
      </div>

      {payload.attach && (
        <div className="attach-note">
          <FileText size={13} />
          Resume on file —
          <button className="link" onClick={downloadResume}>download it</button>
          and attach before sending.
          {isInterview && (
            <>
              {" · "}
              <CalendarPlus size={13} style={{ verticalAlign: -2 }} />
              <button className="link" onClick={addToCalendar}>Download .ics invite</button>
              to attach too.
            </>
          )}
        </div>
      )}

      {isInterview && !payload.attach && (
        <div className="attach-note">
          <CalendarPlus size={13} />
          <button className="link" onClick={addToCalendar}>Download .ics calendar invite</button>
          — attach it to the email so the candidate can add it to their calendar.
        </div>
      )}

      {payload.interviewerMail && (
        <div className="interviewer-block">
          <div className="settings-section-head" style={{ marginBottom: 10 }}>
            <Mail size={13} />
            <span>Also notify the interviewer — {payload.interviewerMail.to}</span>
          </div>
          <div className="form-grid">
            <label className="span2">Subject<input value={ivSubject} onChange={(e) => setIvSubject(e.target.value)} /></label>
            <label className="span2">Body<textarea rows={6} value={ivBody} onChange={(e) => setIvBody(e.target.value)} /></label>
          </div>
          <div className="row-btns" style={{ marginTop: 10 }}>
            <button className="btn ghost xs" onClick={copyInterviewer}><ClipboardList size={12} /> Copy</button>
            <button className="btn xs" onClick={openInterviewerMail}><Mail size={12} /> Open mail app</button>
          </div>
        </div>
      )}

      {sent ? (
        <div className="modal-foot">
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--good)", fontWeight: 500 }}>
            <CheckCircle size={16} /> Email sent!
          </div>
        </div>
      ) : (
        <div className="modal-foot">
          <button className="btn ghost" onClick={copyAll}><ClipboardList size={14} /> Copy</button>
          <button className="btn ghost" onClick={openMail}><Mail size={14} /> Open mail app</button>
          {canSendJS ? (
            <button className="btn primary" onClick={sendEmail} disabled={sending}>
              {sending ? <Loader size={14} className="spin" /> : <Send size={14} />}
              {sending ? "Sending…" : "Send email"}
            </button>
          ) : (
            <div className="emailjs-hint">
              Configure EmailJS in Settings to send directly
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
