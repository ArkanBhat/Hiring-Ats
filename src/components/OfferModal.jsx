import React, { useState, useMemo } from "react";
import { Award, ClipboardList, Download } from "lucide-react";
import { Modal } from "./primitives.jsx";
import { fmtDate, now, download } from "../lib/helpers.js";

export default function OfferModal({ c, settings, onClose, patch, flash }) {
  const [o, setO] = useState(c.offer || {
    title: c.position, salary: "", currency: "₹", startDate: "", manager: "", notes: "",
  });

  const letter = useMemo(() => (
`${settings.company}

${fmtDate(now())}

Dear ${c.name},

We are delighted to offer you the position of ${o.title || c.position} at ${settings.company}. We were impressed by your background and believe you will be a valuable addition to our team.

Offer details:
  • Position:        ${o.title || c.position}
  • Compensation:    ${o.currency} ${o.salary || "—"} per annum
  • Reporting to:    ${o.manager || "—"}
  • Proposed start:  ${o.startDate ? fmtDate(o.startDate) : "—"}
${o.notes ? "\n" + o.notes + "\n" : ""}
This offer is contingent on successful verification of the documents you have provided. Please confirm your acceptance by replying to this letter.

We look forward to welcoming you aboard.

Warm regards,
${settings.signature}`
  ), [c, o, settings]);

  const release = () => {
    if (!o.salary || !o.startDate) { flash("Add compensation and start date"); return; }
    patch(c.id, { offer: { ...o, releasedAt: now() }, status: "offer" }, "Offer letter released");
    flash("Offer released");
    onClose();
  };

  const copy = async () => {
    try { await navigator.clipboard.writeText(letter); flash("Letter copied"); }
    catch { flash("Copy failed"); }
  };

  return (
    <Modal title="Offer letter" onClose={onClose} icon={<Award size={16} />} wide>
      <div className="offer-split">
        <div className="form-grid compact">
          <label>Title<input value={o.title} onChange={(e) => setO({ ...o, title: e.target.value })} /></label>
          <label>Reports to<input value={o.manager} onChange={(e) => setO({ ...o, manager: e.target.value })} /></label>
          <label>Currency
            <select value={o.currency} onChange={(e) => setO({ ...o, currency: e.target.value })}>
              <option>₹</option><option>$</option><option>€</option><option>£</option>
            </select>
          </label>
          <label>Annual CTC<input value={o.salary} onChange={(e) => setO({ ...o, salary: e.target.value })} placeholder="e.g. 18,00,000" /></label>
          <label className="span2">Start date<input type="date" value={o.startDate} onChange={(e) => setO({ ...o, startDate: e.target.value })} /></label>
          <label className="span2">Extra clauses<textarea rows={3} value={o.notes} onChange={(e) => setO({ ...o, notes: e.target.value })} placeholder="Bonus, probation, benefits…" /></label>
        </div>
        <pre className="letter-preview">{letter}</pre>
      </div>
      <div className="modal-foot">
        <button className="btn ghost" onClick={copy}><ClipboardList size={14} /> Copy</button>
        <button className="btn ghost" onClick={() => download(new Blob([letter], { type: "text/plain" }), `Offer_${c.name.replace(/\s+/g, "_")}.txt`)}>
          <Download size={14} /> Download
        </button>
        <button className="btn primary" onClick={release}><Award size={14} /> Release offer</button>
      </div>
    </Modal>
  );
}
