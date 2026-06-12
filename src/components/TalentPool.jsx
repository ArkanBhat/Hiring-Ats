import React, { useState, useMemo } from "react";
import {
  X, Search, Users, RotateCcw, Download, Filter,
  Star, FileText, ChevronRight,
} from "lucide-react";
import { TAGS, stageMeta } from "../config.js";
import { initials, fmtDate, download } from "../lib/helpers.js";
import { scoreLabel } from "../lib/scoreResume.js";

export default function TalentPool({ candidates, onClose, onReengage, flash }) {
  const [query, setQuery]   = useState("");
  const [status, setStatus] = useState("all");   // all | hired | rejected
  const [role,   setRole]   = useState("");

  const pool = useMemo(() => {
    let list = candidates.filter((c) => ["hired", "rejected"].includes(c.status));

    const q = query.trim().toLowerCase();
    if (q) list = list.filter((c) =>
      [c.name, c.email, c.position, c.phone].some((v) => (v || "").toLowerCase().includes(q))
    );
    if (status !== "all") list = list.filter((c) => c.status === status);
    if (role)             list = list.filter((c) => c.position === role);

    return list.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }, [candidates, query, status, role]);

  const uniqueRoles = [...new Set(
    candidates.filter((c) => ["hired", "rejected"].includes(c.status)).map((c) => c.position).filter(Boolean)
  )].sort();

  const exportCSV = () => {
    const cols = ["Name", "Email", "Phone", "Role", "Source", "Status", "Rejection Reason", "Date"];
    const rows = pool.map((c) =>
      [c.name, c.email, c.phone, c.position, c.source, c.status, c.rejectionReason || "", fmtDate(c.updatedAt)]
        .map((v) => `"${(v || "").replace(/"/g, '""')}"`)
        .join(",")
    );
    const blob = new Blob([[cols.join(","), ...rows].join("\n")], { type: "text/csv" });
    download(blob, "talent-pool.csv");
    flash("Exported talent pool CSV");
  };

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="tp-panel">
        {/* Header */}
        <div className="tp-head">
          <div className="tp-head-left">
            <Users size={18} style={{ color: "var(--accent)" }} />
            <div>
              <div className="tp-title">Talent Pool</div>
              <div className="tp-sub">{pool.length} of {candidates.filter(c => ["hired","rejected"].includes(c.status)).length} candidates</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button className="btn xs ghost" onClick={exportCSV}><Download size={12} /> Export CSV</button>
            <button className="icon-btn" onClick={onClose}><X size={18} /></button>
          </div>
        </div>

        {/* Filters */}
        <div className="tp-filters">
          <div className="search" style={{ flex: 1, maxWidth: 280 }}>
            <Search size={14} />
            <input placeholder="Search name, role, email…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <div className="tp-filter-tabs">
            {["all","hired","rejected"].map((s) => (
              <button key={s} className={`tp-tab${status === s ? " active" : ""}`} onClick={() => setStatus(s)}>
                {s === "all" ? "All" : s === "hired" ? "Hired" : "Rejected"}
              </button>
            ))}
          </div>
          <select value={role} onChange={(e) => setRole(e.target.value)} className="tp-select">
            <option value="">All roles</option>
            {uniqueRoles.map((r) => <option key={r}>{r}</option>)}
          </select>
        </div>

        {/* List */}
        <div className="tp-body">
          {pool.length === 0 && (
            <div className="tp-empty">
              <Users size={32} style={{ color: "var(--faint)" }} />
              <div>No candidates in the talent pool yet.</div>
              <div style={{ fontSize: 12, color: "var(--faint)" }}>Hired and rejected candidates will appear here.</div>
            </div>
          )}
          {pool.map((c) => {
            const meta = stageMeta(c.status);
            const sl   = scoreLabel(c.fitScore);
            return (
              <div key={c.id} className="tp-row">
                <span className="avatar" style={{ background: meta.color, flexShrink: 0 }}>{initials(c.name)}</span>

                <div className="tp-info">
                  <div className="tp-name">{c.name}</div>
                  <div className="tp-meta">
                    {c.position && <span>{c.position}</span>}
                    {c.source   && <span>· {c.source}</span>}
                    {c.email    && <span>· {c.email}</span>}
                  </div>
                  <div className="tp-tags">
                    {(c.tags || []).map((tid) => {
                      const tm = TAGS.find((t) => t.id === tid);
                      return tm ? (
                        <span key={tid} className="tag-chip" style={{ "--tc": tm.color, fontSize: 11 }}>{tm.label}</span>
                      ) : null;
                    })}
                    {c.rejectionReason && (
                      <span className="tp-reason">Reason: {c.rejectionReason}</span>
                    )}
                  </div>
                </div>

                <div className="tp-right">
                  {sl && (
                    <span className="fit-badge" style={{ color: sl.color, background: sl.bg }}>{sl.label}</span>
                  )}
                  {c.feedback?.rating > 0 && (
                    <span className="chip"><Star size={10} /> {c.feedback.rating}/5</span>
                  )}
                  <span
                    className="tp-status-pill"
                    style={{ background: meta.color + "18", color: meta.color }}
                  >
                    {meta.label}
                  </span>
                  <span className="tp-date">{fmtDate(c.updatedAt)}</span>
                  {c.status === "rejected" && (
                    <button className="btn xs primary" onClick={() => onReengage(c)}>
                      <RotateCcw size={11} /> Re-engage
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
