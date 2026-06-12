import React from "react";
import { X } from "lucide-react";

export function Section({ title, icon, children }) {
  return (
    <div className="section">
      <div className="section-title">{icon} {title}</div>
      <div className="section-body">{children}</div>
    </div>
  );
}

export function StageBlock({ label, children }) {
  return (
    <div className="stage-block">
      <div className="stage-label">{label}</div>
      {children}
    </div>
  );
}

export function Field({ icon, v, href }) {
  if (!v) return null;
  return (
    <div className="field">
      {icon}
      {href ? <a href={href}>{v}</a> : <span>{v}</span>}
    </div>
  );
}

export function Modal({ title, icon, children, onClose, wide }) {
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className={`modal ${wide ? "wide" : ""}`}>
        <div className="modal-head">
          <div className="mh-title">{icon} {title}</div>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </>
  );
}
