import React, { useState } from "react";
import { Settings as Cog, Check, Mail, ExternalLink } from "lucide-react";
import { Modal } from "./primitives.jsx";

export default function SettingsModal({ settings, setSettings, onClose }) {
  const [s,    setS]    = useState(settings);
  const [docs, setDocs] = useState(settings.defaultDocs.join("\n"));

  const save = () => {
    setSettings({ ...s, defaultDocs: docs.split("\n").map((x) => x.trim()).filter(Boolean) });
    onClose();
  };

  return (
    <Modal title="Settings & templates" onClose={onClose} icon={<Cog size={16} />} wide>
      <div className="form-grid">
        {/* ── Company ──────────────────────────── */}
        <label>Company name
          <input value={s.company} onChange={(e) => setS({ ...s, company: e.target.value })} />
        </label>
        <label>Email signature
          <textarea rows={2} value={s.signature} onChange={(e) => setS({ ...s, signature: e.target.value })} />
        </label>
        <label className="span2">Default document checklist (one per line)
          <textarea rows={5} value={docs} onChange={(e) => setDocs(e.target.value)} />
        </label>

        {/* ── Email templates ───────────────────── */}
        <label className="span2">Interview email — subject
          <input value={s.interviewSubject} onChange={(e) => setS({ ...s, interviewSubject: e.target.value })} />
        </label>
        <label className="span2">Interview email — body
          <textarea rows={6} value={s.interviewBody} onChange={(e) => setS({ ...s, interviewBody: e.target.value })} />
        </label>
        <label className="span2">Offer email — subject
          <input value={s.offerSubject} onChange={(e) => setS({ ...s, offerSubject: e.target.value })} />
        </label>
        <div className="tpl-hint span2" style={{ marginTop: -6 }}>
          The offer email body is the generated offer letter itself — edit its content per-candidate from the Offer letter screen.
        </div>
        <label className="span2">Interviewer notification — subject
          <input value={s.interviewerSubject} onChange={(e) => setS({ ...s, interviewerSubject: e.target.value })} />
        </label>
        <label className="span2">Interviewer notification — body
          <textarea rows={5} value={s.interviewerBody} onChange={(e) => setS({ ...s, interviewerBody: e.target.value })} />
        </label>
        <label className="span2">Rejection email — subject
          <input value={s.rejectionSubject} onChange={(e) => setS({ ...s, rejectionSubject: e.target.value })} />
        </label>
        <label className="span2">Rejection email — body
          <textarea rows={6} value={s.rejectionBody} onChange={(e) => setS({ ...s, rejectionBody: e.target.value })} />
        </label>
      </div>

      <div className="tpl-hint" style={{ marginBottom: 20 }}>
        Placeholders: {"{{name}} {{position}} {{company}} {{date}} {{time}} {{mode}} {{locationLine}} {{interviewer}} {{signature}}"}
      </div>

      {/* ── EmailJS Integration ───────────────── */}
      <div className="settings-section">
        <div className="settings-section-head">
          <Mail size={13} />
          <span>EmailJS — Direct email sending</span>
          <a href="https://www.emailjs.com" target="_blank" rel="noopener" className="settings-section-link">
            Setup guide <ExternalLink size={11} />
          </a>
        </div>
        <div className="settings-section-hint">
          Connect your Gmail or Outlook to send emails directly from the app without opening a mail client.
          Create a free account at emailjs.com → add an Email Service → create a Template with variables:
          <code>{"{{to_email}}"}</code>, <code>{"{{subject}}"}</code>, <code>{"{{message}}"}</code>, <code>{"{{from_name}}"}</code>.
        </div>
        <div className="form-grid" style={{ marginTop: 10 }}>
          <label>Service ID
            <input value={s.emailjsServiceId || ""} onChange={(e) => setS({ ...s, emailjsServiceId: e.target.value })}
              placeholder="e.g. service_xxxxxxx" />
          </label>
          <label>Template ID
            <input value={s.emailjsTemplateId || ""} onChange={(e) => setS({ ...s, emailjsTemplateId: e.target.value })}
              placeholder="e.g. template_xxxxxxx" />
          </label>
          <label className="span2">Public Key
            <input value={s.emailjsPublicKey || ""} onChange={(e) => setS({ ...s, emailjsPublicKey: e.target.value })}
              placeholder="e.g. aBcDeFgHiJkLmNoPqR" />
          </label>
        </div>
      </div>

      <div className="modal-foot">
        <button className="btn ghost" onClick={onClose}>Cancel</button>
        <button className="btn primary" onClick={save}><Check size={15} /> Save settings</button>
      </div>
    </Modal>
  );
}
