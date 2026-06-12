import React, { useState } from "react";
import { Calendar, Check, Star, Plus, X } from "lucide-react";
import { fmtDate } from "../lib/helpers.js";

export function InterviewForm({ c, patch, flash, onScheduled }) {
  const [d, setD] = useState({
    date: c.interview?.date || "",
    time: c.interview?.time || "",
    mode: c.interview?.mode || "Video call",
    location: c.interview?.location || "",
    interviewer: c.interview?.interviewer || "",
  });

  const save = () => {
    if (!d.date || !d.time) { flash("Pick a date and time"); return; }
    patch(c.id, { interview: d, status: "interview" }, `Interview scheduled for ${fmtDate(d.date)} ${d.time}`);
    // Auto-open invite email with the just-scheduled interview data
    if (onScheduled) onScheduled(d);
  };

  return (
    <div className="form-grid">
      <label>Date<input type="date" value={d.date} onChange={(e) => setD({ ...d, date: e.target.value })} /></label>
      <label>Time<input type="time" value={d.time} onChange={(e) => setD({ ...d, time: e.target.value })} /></label>
      <label>Mode
        <select value={d.mode} onChange={(e) => setD({ ...d, mode: e.target.value })}>
          <option>Video call</option><option>Phone</option><option>In-person</option>
        </select>
      </label>
      <label>Interviewer<input value={d.interviewer} onChange={(e) => setD({ ...d, interviewer: e.target.value })} placeholder="Name" /></label>
      {d.mode === "Phone" ? (
        <label className="span2">Candidate phone
          <input value={c.phone || ""} readOnly style={{ background: "var(--bg)", color: "var(--muted)" }} />
        </label>
      ) : (
        <label className="span2">{d.mode === "In-person" ? "Location" : "Meeting link"}
          <input value={d.location} onChange={(e) => setD({ ...d, location: e.target.value })}
            placeholder={d.mode === "In-person" ? "Office address" : "https://…"} />
        </label>
      )}
      <button className="btn primary span2" onClick={save}><Calendar size={14} /> Schedule interview</button>
    </div>
  );
}

export function FeedbackForm({ c, patch, flash }) {
  const [f, setF] = useState(c.feedback || { rating: 0, strengths: "", concerns: "", recommendation: "Maybe", by: "" });

  const save = () => {
    if (!f.rating) { flash("Give a rating"); return; }
    patch(c.id, { feedback: f }, `Feedback recorded (${f.rating}/5)`);
    flash("Feedback saved");
  };

  return (
    <div className="form-grid">
      <div className="span2 rate">
        <span className="lbl">Rating</span>
        <div className="stars big">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} onClick={() => setF({ ...f, rating: n })}>
              <Star size={20} fill={n <= f.rating ? "#B5832E" : "none"} color="#B5832E" />
            </button>
          ))}
        </div>
      </div>
      <label className="span2">Strengths<textarea value={f.strengths} onChange={(e) => setF({ ...f, strengths: e.target.value })} rows={2} /></label>
      <label className="span2">Concerns<textarea value={f.concerns} onChange={(e) => setF({ ...f, concerns: e.target.value })} rows={2} /></label>
      <label>Recommendation
        <select value={f.recommendation} onChange={(e) => setF({ ...f, recommendation: e.target.value })}>
          <option>Strong yes</option><option>Yes</option><option>Maybe</option><option>No</option>
        </select>
      </label>
      <label>Interviewer<input value={f.by} onChange={(e) => setF({ ...f, by: e.target.value })} placeholder="Your name" /></label>
      <button className="btn span2" onClick={save}><Check size={14} /> Save feedback</button>
    </div>
  );
}

export function DocChecklist({ c, patch }) {
  const [adding, setAdding] = useState("");

  const toggle = (i) =>
    patch(c.id, (x) => ({ ...x, documents: x.documents.map((d, j) => (j === i ? { ...d, collected: !d.collected } : d)) }));

  const add = () => {
    if (!adding.trim()) return;
    patch(c.id, (x) => ({ ...x, documents: [...x.documents, { name: adding.trim(), collected: false }] }));
    setAdding("");
  };

  const remove = (i) => patch(c.id, (x) => ({ ...x, documents: x.documents.filter((_, j) => j !== i) }));

  const done = c.documents.filter((d) => d.collected).length;

  return (
    <div>
      <div className="doc-progress"><span style={{ width: `${(done / Math.max(1, c.documents.length)) * 100}%` }} /></div>
      <div className="doc-count">{done}/{c.documents.length} collected</div>
      <ul className="doc-list">
        {c.documents.map((d, i) => (
          <li key={i} className={d.collected ? "got" : ""}>
            <button className="chk" onClick={() => toggle(i)}>{d.collected && <Check size={12} />}</button>
            <span>{d.name}</span>
            <button className="x" onClick={() => remove(i)}><X size={12} /></button>
          </li>
        ))}
      </ul>
      <div className="doc-add">
        <input value={adding} onChange={(e) => setAdding(e.target.value)} placeholder="Add a document…"
          onKeyDown={(e) => e.key === "Enter" && add()} />
        <button className="btn xs" onClick={add}><Plus size={13} /></button>
      </div>
    </div>
  );
}
