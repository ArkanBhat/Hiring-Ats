import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  ClipboardList, Search, Settings as Cog, Plus, FileText, Star,
  Calendar, BarChart2, Briefcase, X as XIcon, CheckSquare,
  Download, ThumbsDown, ChevronDown, Users, Clock, Globe, ShieldAlert,
  Upload, ThumbsUp,
} from "lucide-react";
import { STAGES, stageMeta, DEFAULT_SETTINGS, TAGS } from "./config.js";
import { uid, now, fmtDate, initials, fill, download, daysSince } from "./lib/helpers.js";
import { sGet, sSet, sDel } from "./lib/storage.js";
import { scoreLabel } from "./lib/scoreResume.js";
import CandidateDrawer  from "./components/CandidateDrawer.jsx";
import AddModal         from "./components/AddModal.jsx";
import BulkUploadModal  from "./components/BulkUploadModal.jsx";
import EmailModal       from "./components/EmailModal.jsx";
import OfferModal       from "./components/OfferModal.jsx";
import OfferPreviewModal from "./components/OfferPreviewModal.jsx";
import SettingsModal    from "./components/SettingsModal.jsx";
import AnalyticsModal   from "./components/AnalyticsModal.jsx";
import JobsModal        from "./components/JobsModal.jsx";
import TalentPool       from "./components/TalentPool.jsx";
import DocumentPortal  from "./components/DocumentPortal.jsx";
import CareersPortal   from "./components/CareersPortal.jsx";
import ApplyPortal     from "./components/ApplyPortal.jsx";

const BLANK_FILTERS = { source: "", position: "", tag: "", sort: "newest" };

export default function App() {
  // Detect public-facing routes — these render standalone and skip the full ATS
  const params      = new URLSearchParams(window.location.search);
  const portalToken = params.get("upload");
  const careersMode = params.get("careers");
  const applyJobId  = params.get("apply");

  const [loaded, setLoaded]         = useState(false);
  const [candidates, setCandidates] = useState([]);
  const [jobs,       setJobs]       = useState([]);
  const [settings,   setSettings]   = useState(DEFAULT_SETTINGS);
  const [query,      setQuery]      = useState("");
  const [filters,    setFilters]    = useState(BLANK_FILTERS);
  const [openId,     setOpenId]     = useState(null);

  // modals
  const [showAdd,        setShowAdd]        = useState(false);
  const [showBulkAdd,    setShowBulkAdd]    = useState(false);
  const [showSettings,   setShowSettings]   = useState(false);
  const [showAnalytics,  setShowAnalytics]  = useState(false);
  const [showJobs,       setShowJobs]       = useState(false);
  const [showTalentPool, setShowTalentPool] = useState(false);
  const [email,          setEmail]          = useState(null);
  const [offerFor,       setOfferFor]       = useState(null);
  const [previewOfferFor, setPreviewOfferFor] = useState(null);

  // bulk select
  const [selectMode,   setSelectMode]   = useState(false);
  const [selectedIds,  setSelectedIds]  = useState(new Set());

  // re-engage prefill
  const [reengagePrefill, setReengagePrefill] = useState(null);

  const [toast, setToast] = useState(null);

  /* ── load ────────────────────────────────────── */
  useEffect(() => {
    (async () => {
      const raw = await sGet("candidates", []);
      // Migrate: convert string notes → [{text,at}] array; seed priority/referredBy
      setCandidates(raw.map((c) => ({
        ...c,
        notes: typeof c.notes === "string"
          ? (c.notes.trim() ? [{ text: c.notes.trim(), at: c.createdAt }] : [])
          : (Array.isArray(c.notes) ? c.notes : []),
        priority:   c.priority   ?? false,
        referredBy: c.referredBy ?? "",
      })));
      setJobs(await sGet("jobs", []));
      setSettings({ ...DEFAULT_SETTINGS, ...(await sGet("settings", {})) });
      setLoaded(true);
    })();
  }, []);

  useEffect(() => { if (loaded) sSet("candidates", candidates); }, [candidates, loaded]);
  useEffect(() => { if (loaded) sSet("jobs",       jobs);       }, [jobs,       loaded]);
  useEffect(() => { if (loaded) sSet("settings",   settings);   }, [settings,   loaded]);

  const flash = useCallback((msg) => { setToast(msg); setTimeout(() => setToast(null), 2800); }, []);

  /* ── patch ───────────────────────────────────── */
  const patch = useCallback((id, fn, note) =>
    setCandidates((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const next = typeof fn === "function" ? fn(c) : { ...c, ...fn };
        next.updatedAt = now();
        if (note) next.activity = [{ at: now(), text: note }, ...(next.activity || [])];
        return next;
      })
    ), []);

  /* ── add candidate ───────────────────────────── */
  const buildCandidate = (data, resume) => ({
    id: uid(), name: data.name, email: data.email, phone: data.phone,
    position: data.position, source: data.source || "Direct",
    status: "applied", resumeName: resume ? resume.name : null,
    resumeText: data.resumeText || "",
    fitScore: data.fitScore ?? null,
    priority: false, referredBy: data.referredBy || "", shortlisted: false,
    tags: [], notes: [], rejectionReason: null,
    interview: null, feedback: null, documents: [], offer: null,
    activity: [{ at: now(), text: "Application created" }],
    createdAt: now(), updatedAt: now(),
  });

  const addCandidate = async (data, resume) => {
    const dup = candidates.find(
      (c) => c.email && data.email && c.email.toLowerCase() === data.email.toLowerCase()
    );
    if (dup) { flash(`${dup.name} already exists with this email`); return; }

    const c = buildCandidate(data, resume);
    if (resume) await sSet(`resume:${c.id}`, resume);
    setCandidates((p) => [c, ...p]);
    setShowAdd(false);
    setReengagePrefill(null);
    flash("Candidate added");
  };

  /* ── bulk add candidates (from Bulk upload modal) ────────── */
  const addCandidatesBulk = async (entries) => {
    const existingEmails = new Set(candidates.map((c) => (c.email || "").toLowerCase()).filter(Boolean));
    const added = [];
    const skipped = [];

    for (const entry of entries) {
      const emailLc = (entry.data.email || "").toLowerCase();
      if (emailLc && existingEmails.has(emailLc)) { skipped.push(entry.data.name || entry.data.email); continue; }
      const c = buildCandidate(entry.data, entry.resume);
      if (entry.resume) await sSet(`resume:${c.id}`, entry.resume);
      added.push(c);
      if (emailLc) existingEmails.add(emailLc);
    }

    if (added.length) setCandidates((p) => [...added, ...p]);
    setShowBulkAdd(false);
    if (skipped.length) flash(`Added ${added.length} · skipped ${skipped.length} duplicate${skipped.length !== 1 ? "s" : ""}`);
    else flash(`Added ${added.length} candidate${added.length !== 1 ? "s" : ""}`);
  };

  const removeCandidate = async (id) => {
    await sDel(`resume:${id}`);
    setCandidates((p) => p.filter((c) => c.id !== id));
    setOpenId(null);
    flash("Candidate removed");
  };

  /* ── bulk actions ────────────────────────────── */
  const toggleSelect = (id) =>
    setSelectedIds((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const bulkMove = (status) => {
    const n = selectedIds.size;
    selectedIds.forEach((id) => patch(id, { status }, `Bulk moved to ${stageMeta(status).label}`));
    setSelectedIds(new Set());
    flash(`${n} candidate${n !== 1 ? "s" : ""} moved to ${stageMeta(status).label}`);
  };

  const bulkReject = () => {
    const n = selectedIds.size;
    selectedIds.forEach((id) => patch(id, { status: "rejected" }, "Bulk rejected"));
    setSelectedIds(new Set());
    setSelectMode(false);
    flash(`${n} candidate${n !== 1 ? "s" : ""} rejected`);
  };

  const exportCSV = (ids) => {
    const pool = ids ? candidates.filter((c) => ids.has(c.id)) : candidates;
    const cols = ["Name", "Email", "Phone", "Role", "Source", "Stage", "Fit Score", "Applied Date"];
    const rows = pool.map((c) =>
      [c.name, c.email, c.phone, c.position, c.source, c.status, c.fitScore ?? "", fmtDate(c.createdAt)]
        .map((v) => `"${(v ?? "").toString().replace(/"/g, '""')}"`)
        .join(",")
    );
    const blob = new Blob([[cols.join(","), ...rows].join("\n")], { type: "text/csv" });
    download(blob, "candidates.csv");
    flash(`Exported ${pool.length} candidates`);
  };

  /* ── talent pool re-engage ───────────────────── */
  const handleReengage = (c) => {
    setReengagePrefill(c);
    setShowTalentPool(false);
    setShowAdd(true);
  };

  /* ── filters + sort ──────────────────────────── */
  const uniquePositions = useMemo(
    () => [...new Set(candidates.map((c) => c.position).filter(Boolean))].sort(),
    [candidates]
  );

  const filtered = useMemo(() => {
    let list = [...candidates];
    const q = query.trim().toLowerCase();
    if (q) list = list.filter((c) =>
      [c.name, c.email, c.position, c.phone].some((v) => (v || "").toLowerCase().includes(q))
    );
    if (filters.source)   list = list.filter((c) => c.source   === filters.source);
    if (filters.position) list = list.filter((c) => c.position === filters.position);
    if (filters.tag)      list = list.filter((c) => (c.tags || []).includes(filters.tag));

    if (filters.sort === "oldest") list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    else if (filters.sort === "name")   list.sort((a, b) => a.name.localeCompare(b.name));
    else if (filters.sort === "rating") list.sort((a, b) => (b.feedback?.rating || 0) - (a.feedback?.rating || 0));
    else if (filters.sort === "score")  list.sort((a, b) => (b.fitScore || 0) - (a.fitScore || 0));
    else list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return list;
  }, [candidates, query, filters]);

  const open   = candidates.find((c) => c.id === openId);
  const counts = STAGES.reduce((a, s) => ({ ...a, [s.id]: candidates.filter((c) => c.status === s.id).length }), {});
  const activeFilters = Object.entries(filters).filter(([k, v]) => k !== "sort" && v).length;
  const talentCount   = candidates.filter((c) => ["hired", "rejected"].includes(c.status)).length;

  /* ── email builders ──────────────────────────── */
  const buildInterviewEmail = (c = open) => {
    const locationLine = c.interview?.mode === "Phone"
      ? `Phone: ${c.phone || "TBD"}`
      : c.interview?.mode === "In-person"
        ? `Location: ${c.interview?.location || "TBD"}`
        : `Meeting link: ${c.interview?.location || "TBD"}`;
    const v = {
      name: c.name, position: c.position, company: settings.company,
      date: fmtDate(c.interview?.date), time: c.interview?.time || "TBD",
      mode: c.interview?.mode || "TBD", locationLine,
      interviewer: c.interview?.interviewer || "TBD",
      signature:   settings.signature,
    };

    let interviewerMail = null;
    const interviewerEmails = (c.interview?.interviewerEmail || "")
      .split(",").map((e) => e.trim()).filter(Boolean).join(", ");
    if (interviewerEmails) {
      interviewerMail = {
        to: interviewerEmails,
        subject: fill(settings.interviewerSubject, v),
        body:    fill(settings.interviewerBody,    v),
      };
    }

    setEmail({
      candidateId: c.id, candidateName: c.name, position: c.position,
      to: c.email, attach: !!c.resumeName,
      interview: c.interview, interviewerMail,
      subject: fill(settings.interviewSubject, v),
      body:    fill(settings.interviewBody,    v),
      kind: "interview",
    });
  };

  const buildDocumentEmail = (c) => {
    const token = c.documentToken || `doc_${uid()}`;
    if (!c.documentToken) patch(c.id, { documentToken: token }, "Document request link generated");
    const uploadLink = `${window.location.origin}${window.location.pathname}?upload=${token}`;
    const docList    = (c.documents || []).map((d) => `  • ${d.name}`).join("\n");
    const v = { name: c.name, position: c.position, company: settings.company, uploadLink, documentList: docList, signature: settings.signature };
    setEmail({
      candidateId: c.id, to: c.email, attach: false,
      subject: fill(settings.docRequestSubject, v),
      body:    fill(settings.docRequestBody,    v),
      kind: "documents",
    });
  };

  /* ── quick sourcing actions (Applied column cards) ───────── */
  const quickShortlist = (c) => {
    patch(c.id, { shortlisted: true }, "Shortlisted");
    flash(`${c.name} shortlisted`);
  };

  const quickReject = (c) => {
    patch(c.id, { status: "rejected", rejectionReason: "Not qualified" }, "Rejected at sourcing stage");
    buildRejectionEmail(c);
  };

  const buildRejectionEmail = (c) => {
    const v = { name: c.name, position: c.position, company: settings.company, signature: settings.signature };
    setEmail({
      candidateId: c.id, to: c.email, attach: false,
      subject: fill(settings.rejectionSubject, v),
      body:    fill(settings.rejectionBody,    v),
      kind: "rejection",
    });
  };

  const buildOfferEmail = (c, letterText) => {
    const v = { name: c.name, position: c.position, company: settings.company };
    setEmail({
      candidateId: c.id, to: c.email, attach: false,
      subject: fill(settings.offerSubject, v),
      body: letterText,
      kind: "offer",
    });
  };

  /* ── open a candidate profile from the Talent Pool ───────── */
  const openFromPool = (id) => { setShowTalentPool(false); setOpenId(id); };

  // ── Public routes — render before full ATS mounts ─────────
  if (portalToken) return <DocumentPortal token={portalToken} />;
  if (careersMode) return <CareersPortal />;
  if (applyJobId)  return <ApplyPortal jobId={applyJobId} />;

  if (!loaded) return <div className="ats-root"><div className="loading">Loading workspace…</div></div>;

  return (
    <div className="ats-root" onKeyDown={(e) => e.key === "Escape" && selectMode && setSelectMode(false)}>

      {/* ── Top bar ──────────────────────────────── */}
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark"><ClipboardList size={18} /></div>
          <div>
            <div className="brand-title">{settings.company} · Hiring</div>
            <div className="brand-sub">{candidates.length} candidate{candidates.length !== 1 ? "s" : ""} in pipeline</div>
          </div>
        </div>
        <div className="topbar-actions">
          <div className="search">
            <Search size={15} />
            <input placeholder="Search name, role, email…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <button className="btn ghost" onClick={() => setShowAnalytics(true)}><BarChart2 size={15} /> Analytics</button>
          <button className="btn ghost" onClick={() => setShowJobs(true)}>
            <Briefcase size={15} /> Jobs
            {jobs.filter((j) => j.status === "open").length > 0 &&
              <span className="jobs-badge">{jobs.filter((j) => j.status === "open").length}</span>}
          </button>
          <a className="btn ghost" href={`${window.location.pathname}?careers=1`} target="_blank" rel="noopener noreferrer">
            <Globe size={15} /> Careers page
          </a>
          <button className="btn ghost" onClick={() => setShowTalentPool(true)}>
            <Users size={15} /> Pool
            {talentCount > 0 && <span className="jobs-badge" style={{ background: "var(--muted)" }}>{talentCount}</span>}
          </button>
          <button className={`btn ghost${selectMode ? " btn-select-active" : ""}`}
            onClick={() => { setSelectMode((p) => !p); setSelectedIds(new Set()); }}>
            <CheckSquare size={15} /> {selectMode ? "Cancel" : "Select"}
          </button>
          <button className="btn ghost" onClick={() => setShowSettings(true)}><Cog size={15} /> Settings</button>
          <button className="btn ghost" onClick={() => setShowBulkAdd(true)}>
            <Upload size={15} /> Bulk upload
          </button>
          <button className="btn primary" onClick={() => { setReengagePrefill(null); setShowAdd(true); }}>
            <Plus size={16} /> New candidate
          </button>
        </div>
      </header>

      {/* ── Filter bar ───────────────────────────── */}
      <div className="filter-bar">
        <select value={filters.source} onChange={(e) => setFilters({ ...filters, source: e.target.value })}>
          <option value="">All sources</option>
          <option>Direct</option><option>Referral</option><option>LinkedIn</option><option>Job board</option><option>Agency</option>
        </select>
        <select value={filters.position} onChange={(e) => setFilters({ ...filters, position: e.target.value })}>
          <option value="">All roles</option>
          {uniquePositions.map((p) => <option key={p}>{p}</option>)}
        </select>
        <select value={filters.tag} onChange={(e) => setFilters({ ...filters, tag: e.target.value })}>
          <option value="">All tags</option>
          {TAGS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
        <select value={filters.sort} onChange={(e) => setFilters({ ...filters, sort: e.target.value })}>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="name">Name A–Z</option>
          <option value="rating">Highest rated</option>
          <option value="score">Best fit score</option>
        </select>
        {activeFilters > 0 && (
          <button className="btn xs ghost" onClick={() => setFilters(BLANK_FILTERS)}>
            <XIcon size={11} /> Clear {activeFilters}
          </button>
        )}
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          <button className="btn xs ghost" onClick={() => exportCSV(null)}>
            <Download size={12} /> Export all
          </button>
        </div>
      </div>

      {/* ── Board ────────────────────────────────── */}
      <div className="board">
        {STAGES.map((s) => {
          const items = filtered.filter((c) => c.status === s.id);
          return (
            <section className="column" key={s.id}>
              <div className="col-head" style={{ "--c": s.color }}>
                <span className="col-dot" />
                <span className="col-name">{s.label}</span>
                <span className="col-count">{counts[s.id]}</span>
              </div>
              <div className="col-hint">{s.hint}</div>
              <div className="col-body">
                {items.length === 0 && <div className="col-empty">—</div>}
                {items.map((c) => {
                  const sl       = scoreLabel(c.fitScore);
                  const selected = selectedIds.has(c.id);
                  const stale    = daysSince(c.updatedAt) > 6 && !["hired","rejected"].includes(c.status);
                  const showQuick = s.id === "applied" && !selectMode && !c.shortlisted;
                  return (
                    <div className="card-wrap" key={c.id}>
                      <button
                        className={`card${selected ? " card-selected" : ""}`}
                        onClick={() => selectMode ? toggleSelect(c.id) : setOpenId(c.id)}
                      >
                        {selectMode && (
                          <div className={`card-checkbox${selected ? " checked" : ""}`}>
                            {selected && <span>✓</span>}
                          </div>
                        )}
                        <div className="card-top">
                          <span className="avatar" style={{ background: s.color }}>{initials(c.name)}</span>
                          <div className="card-id">
                            <div className="card-name">{c.name}</div>
                            <div className="card-role">{c.position}</div>
                          </div>
                          {c.priority && <span className="priority-badge" title="High priority"><Star size={11} fill="#F59E0B" color="#F59E0B" /></span>}
                          {c.knockedOut && <span className="priority-badge" title="Failed screening question" style={{ color: "var(--bad)" }}><ShieldAlert size={11} /></span>}
                          {sl && <span className="fit-badge-sm" style={{ color: sl.color, background: sl.bg }}>{c.fitScore}%</span>}
                        </div>
                        <div className="card-meta">
                          {c.resumeName && <span className="chip"><FileText size={11} /> CV</span>}
                          {c.shortlisted && <span className="chip good-chip"><ThumbsUp size={10} /> Shortlisted</span>}
                          {c.feedback?.rating > 0 && <span className="chip"><Star size={11} /> {c.feedback.rating}/5</span>}
                          {c.interview?.date && <span className="chip"><Calendar size={11} /> {fmtDate(c.interview.date)}</span>}
                          {stale && <span className="stale-badge"><Clock size={9} /> {daysSince(c.updatedAt)}d</span>}
                          {(c.tags || []).slice(0, 2).map((tid) => {
                            const tm = TAGS.find((t) => t.id === tid);
                            return tm ? <span key={tid} className="chip tag-chip-sm" style={{ "--tc": tm.color }}>{tm.label}</span> : null;
                          })}
                        </div>
                      </button>
                      {showQuick && (
                        <div className="card-quick-actions">
                          <button className="btn xs good" onClick={() => quickShortlist(c)}><ThumbsUp size={11} /> Shortlist</button>
                          <button className="btn xs bad" onClick={() => quickReject(c)}><ThumbsDown size={11} /> Reject</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      {/* ── Bulk action bar ──────────────────────── */}
      {selectMode && (
        <div className="bulk-bar">
          <span className="bulk-count">
            {selectedIds.size > 0 ? `${selectedIds.size} selected` : "Click cards to select"}
          </span>
          {selectedIds.size > 0 && (
            <div className="bulk-actions">
              <div className="bulk-move-wrap">
                <select className="bulk-select" defaultValue=""
                  onChange={(e) => { if (e.target.value) { bulkMove(e.target.value); e.target.value = ""; } }}>
                  <option value="" disabled>Move to stage…</option>
                  {STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
                <ChevronDown size={12} className="bulk-select-icon" />
              </div>
              <button className="btn xs bad" onClick={bulkReject}><ThumbsDown size={12} /> Reject all</button>
              <button className="btn xs ghost" style={{ color: "#fff", borderColor: "rgba(255,255,255,.2)" }}
                onClick={() => exportCSV(selectedIds)}>
                <Download size={12} /> Export
              </button>
            </div>
          )}
          <button className="icon-btn" style={{ color: "#fff" }}
            onClick={() => { setSelectMode(false); setSelectedIds(new Set()); }}>
            <XIcon size={16} />
          </button>
        </div>
      )}

      {/* ── Drawers & modals ─────────────────────── */}
      {open && (
        <CandidateDrawer
          c={open} settings={settings} patch={patch} flash={flash}
          jobs={jobs.filter((j) => j.status === "open")}
          onClose={() => setOpenId(null)}
          onDelete={() => removeCandidate(open.id)}
          onInterviewEmail={(cOverride) => buildInterviewEmail(cOverride || open)}
          onDocEmail={() => buildDocumentEmail(open)}
          onRejectEmail={() => buildRejectionEmail(open)}
          onOffer={() => setOfferFor(open.id)}
          onPreviewOffer={() => setPreviewOfferFor(open.id)}
        />
      )}

      {showAdd && (
        <AddModal
          onClose={() => { setShowAdd(false); setReengagePrefill(null); }}
          onSave={addCandidate} flash={flash}
          jobs={jobs.filter((j) => j.status === "open")}
          candidates={candidates}
          prefill={reengagePrefill}
        />
      )}

      {showBulkAdd && (
        <BulkUploadModal
          onClose={() => setShowBulkAdd(false)}
          onSave={addCandidatesBulk} flash={flash}
          jobs={jobs.filter((j) => j.status === "open")}
        />
      )}

      {showSettings   && <SettingsModal settings={settings} setSettings={setSettings} onClose={() => setShowSettings(false)} />}
      {showAnalytics  && <AnalyticsModal candidates={candidates} onClose={() => setShowAnalytics(false)} />}
      {showJobs       && <JobsModal jobs={jobs} setJobs={setJobs} candidates={candidates} onClose={() => setShowJobs(false)} flash={flash} />}
      {showTalentPool && (
        <TalentPool candidates={candidates} onClose={() => setShowTalentPool(false)}
          onReengage={handleReengage} onOpenCandidate={openFromPool} flash={flash} />
      )}

      {email && (
        <EmailModal payload={email} onClose={() => setEmail(null)} patch={patch} flash={flash} settings={settings} />
      )}
      {offerFor && (
        <OfferModal
          c={candidates.find((x) => x.id === offerFor)} settings={settings}
          onClose={() => setOfferFor(null)} patch={patch} flash={flash}
          onReleased={(letterText) => buildOfferEmail(candidates.find((x) => x.id === offerFor), letterText)}
        />
      )}
      {previewOfferFor && (
        <OfferPreviewModal
          c={candidates.find((x) => x.id === previewOfferFor)} flash={flash}
          onClose={() => setPreviewOfferFor(null)}
          onSendEmail={() => {
            const c = candidates.find((x) => x.id === previewOfferFor);
            buildOfferEmail(c, c.offer.letter);
            setPreviewOfferFor(null);
          }}
        />
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
