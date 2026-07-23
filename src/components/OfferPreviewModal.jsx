import React from "react";
import { Award, ClipboardList, Download, Mail } from "lucide-react";
import { Modal } from "./primitives.jsx";
import { download } from "../lib/helpers.js";

export default function OfferPreviewModal({ c, onClose, onSendEmail, flash }) {
  const letter = c.offer?.letter || "";

  const copy = async () => {
    try { await navigator.clipboard.writeText(letter); flash("Letter copied"); }
    catch { flash("Copy failed"); }
  };

  return (
    <Modal title={`Offer letter — ${c.name}`} onClose={onClose} icon={<Award size={16} />} wide>
      <pre className="letter-preview" style={{ maxHeight: "62vh" }}>{letter}</pre>
      <div className="modal-foot">
        <button className="btn ghost" onClick={copy}><ClipboardList size={14} /> Copy</button>
        <button className="btn ghost" onClick={() => download(new Blob([letter], { type: "text/plain" }), `Offer_${c.name.replace(/\s+/g, "_")}.txt`)}>
          <Download size={14} /> Download
        </button>
        <button className="btn primary" onClick={onSendEmail}><Mail size={14} /> Email to candidate</button>
      </div>
    </Modal>
  );
}
