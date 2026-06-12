import React, { useMemo } from "react";
import { BarChart2 } from "lucide-react";
import { STAGES } from "../config.js";
import { Modal } from "./primitives.jsx";

const STAGE_ORDER = ["applied", "interview", "decision", "documents", "offer", "hired"];
const STAGE_RANK = Object.fromEntries(STAGE_ORDER.map((id, i) => [id, i]));

function candidateRank(c) {
  if (c.status === "hired") return 5;
  if (c.status === "hold")  return STAGE_RANK["decision"] ?? 2;
  return STAGE_RANK[c.status] ?? 0;
}

export default function AnalyticsModal({ candidates, onClose }) {
  const stats = useMemo(() => {
    const total    = candidates.length;
    const hired    = candidates.filter((c) => c.status === "hired").length;
    const rejected = candidates.filter((c) => c.status === "rejected").length;
    const active   = total - hired - rejected;

    const hiredWithDates = candidates.filter(
      (c) => c.status === "hired" && c.createdAt && c.updatedAt
    );
    const avgDays = hiredWithDates.length
      ? Math.round(
          hiredWithDates.reduce(
            (s, c) => s + (new Date(c.updatedAt) - new Date(c.createdAt)) / 86400000,
            0
          ) / hiredWithDates.length
        )
      : null;

    // Funnel: count candidates that ever reached or passed each stage
    const funnelStages = STAGES.filter((s) => STAGE_ORDER.includes(s.id));
    const funnel = funnelStages.map((s) => ({
      ...s,
      count: candidates.filter((c) => candidateRank(c) >= STAGE_RANK[s.id]).length,
    }));
    const maxFunnel = funnel[0]?.count || 1;

    // Source breakdown + hire rate %
    const SOURCES = ["Direct", "Referral", "LinkedIn", "Job board", "Agency"];
    const bySource = SOURCES.map((src) => {
      const pool  = candidates.filter((c) => c.source === src);
      const hired = pool.filter((c) => c.status === "hired").length;
      return { label: src, count: pool.length, hired, hirePct: pool.length ? Math.round((hired / pool.length) * 100) : 0 };
    }).filter((s) => s.count > 0).sort((a, b) => b.count - a.count);
    const maxSource = Math.max(...bySource.map((s) => s.count), 1);

    // Role breakdown
    const roleMap = {};
    candidates.forEach((c) => { if (c.position) roleMap[c.position] = (roleMap[c.position] || 0) + 1; });
    const byRole = Object.entries(roleMap).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const maxRole = byRole[0]?.[1] || 1;

    // Stage conversion rates (applied→interview, interview→decision, etc.)
    const conversions = [];
    for (let i = 0; i < funnelStages.length - 1; i++) {
      const from = funnel[i].count;
      const to   = funnel[i + 1].count;
      if (from > 0) conversions.push({ from: funnelStages[i].label, to: funnelStages[i + 1].label, pct: Math.round((to / from) * 100) });
    }

    // Offer acceptance rate
    const reachedOffer  = candidates.filter((c) => candidateRank(c) >= STAGE_RANK["offer"]).length;
    const offerAcceptPct = reachedOffer > 0 ? Math.round((hired / reachedOffer) * 100) : null;

    // Pipeline health — stale (not touched in >7 days, not terminal)
    const staleCount = candidates.filter((c) =>
      !["hired","rejected"].includes(c.status) &&
      (Date.now() - new Date(c.updatedAt)) / 86400000 > 7
    ).length;

    // Referral conversion
    const referrals = candidates.filter((c) => c.source === "Referral").length;
    const referralHires = candidates.filter((c) => c.source === "Referral" && c.status === "hired").length;

    return { total, hired, rejected, active, avgDays, funnel, maxFunnel, bySource, maxSource, byRole, maxRole, conversions, offerAcceptPct, staleCount, referrals, referralHires };
  }, [candidates]);

  return (
    <Modal title="Pipeline analytics" onClose={onClose} icon={<BarChart2 size={16} />} wide>
      <div className="an-body">
        <div className="an-stats">
          <div className="an-stat"><div className="an-stat-val">{stats.total}</div><div className="an-stat-lbl">Total candidates</div></div>
          <div className="an-stat"><div className="an-stat-val" style={{ color: "var(--accent)" }}>{stats.active}</div><div className="an-stat-lbl">Active in pipeline</div></div>
          <div className="an-stat"><div className="an-stat-val" style={{ color: "var(--good)" }}>{stats.hired}</div><div className="an-stat-lbl">Hired{stats.total ? ` (${Math.round(stats.hired / stats.total * 100)}%)` : ""}</div></div>
          <div className="an-stat"><div className="an-stat-val">{stats.avgDays ?? "—"}</div><div className="an-stat-lbl">{stats.avgDays ? "Avg days to hire" : "No hires yet"}</div></div>
          <div className="an-stat"><div className="an-stat-val" style={{ color: stats.offerAcceptPct >= 70 ? "var(--good)" : stats.offerAcceptPct >= 40 ? "var(--warn)" : "var(--bad)" }}>{stats.offerAcceptPct != null ? `${stats.offerAcceptPct}%` : "—"}</div><div className="an-stat-lbl">Offer acceptance</div></div>
        </div>

        {/* Pipeline health */}
        {stats.staleCount > 0 && (
          <div className="an-health-bar">
            <span className="an-health-icon">⏰</span>
            <span><b>{stats.staleCount}</b> candidate{stats.staleCount !== 1 ? "s" : ""} haven't moved in over 7 days</span>
            <span className="an-health-hint">— check the pipeline for stuck candidates</span>
          </div>
        )}

        <div className="an-section">
          <div className="an-title">Hiring funnel</div>
          {stats.funnel.map((s) => (
            <div key={s.id} className="an-row">
              <div className="an-row-lbl">{s.label}</div>
              <div className="an-bar-wrap"><div className="an-bar" style={{ width: `${(s.count / stats.maxFunnel) * 100}%`, background: s.color }} /></div>
              <div className="an-row-val">{s.count}</div>
            </div>
          ))}
        </div>

        {stats.conversions.length > 0 && (
          <div className="an-section">
            <div className="an-title">Stage conversion</div>
            <div className="an-conv-grid">
              {stats.conversions.map((cv) => (
                <div key={cv.from} className="an-conv-card">
                  <div className="an-conv-pct" style={{ color: cv.pct >= 50 ? "var(--good)" : cv.pct >= 25 ? "var(--warn)" : "var(--bad)" }}>{cv.pct}%</div>
                  <div className="an-conv-lbl">{cv.from} → {cv.to}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="an-two-col">
          <div className="an-section">
            <div className="an-title">By source</div>
            {stats.bySource.length === 0 && <div className="an-empty">No data yet</div>}
            {stats.bySource.map((s) => (
              <div key={s.label} className="an-row">
                <div className="an-row-lbl">{s.label}</div>
                <div className="an-bar-wrap"><div className="an-bar" style={{ width: `${(s.count / stats.maxSource) * 100}%`, background: "var(--accent)" }} /></div>
                <div className="an-row-val">
                  {s.count}
                  {s.hired > 0 && <span className="an-hired"> {s.hirePct}%</span>}
                </div>
              </div>
            ))}
          </div>

          <div className="an-section">
            <div className="an-title">By role</div>
            {stats.byRole.length === 0 && <div className="an-empty">No data yet</div>}
            {stats.byRole.map(([role, count]) => (
              <div key={role} className="an-row">
                <div className="an-row-lbl" title={role}>{role.length > 22 ? role.slice(0, 20) + "…" : role}</div>
                <div className="an-bar-wrap"><div className="an-bar" style={{ width: `${(count / stats.maxRole) * 100}%`, background: "var(--good)" }} /></div>
                <div className="an-row-val">{count}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="modal-foot">
          <button className="btn ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </Modal>
  );
}
