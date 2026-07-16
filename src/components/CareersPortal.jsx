import React, { useState, useEffect } from "react";
import { Briefcase, MapPin, Users, Loader } from "lucide-react";
import { sGet } from "../lib/storage.js";

function applyUrl(jobId) {
  return `${window.location.origin}${window.location.pathname}?apply=${jobId}`;
}

export default function CareersPortal() {
  const [jobs, setJobs]         = useState([]);
  const [settings, setSettings] = useState({});
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    (async () => {
      const [j, s] = await Promise.all([sGet("jobs", []), sGet("settings", {})]);
      setJobs(j.filter((x) => x.status === "open"));
      setSettings(s);
      setLoading(false);
    })();
  }, []);

  const company = settings.company || "Hiring Team";

  if (loading) return (
    <div className="portal-wrap">
      <div className="portal-loading"><Loader size={26} className="spin" /></div>
    </div>
  );

  return (
    <div className="portal-wrap">
      <header className="portal-header">
        <div className="portal-brand-mark">{company.slice(0, 2).toUpperCase()}</div>
        <div>
          <div className="portal-brand">{company}</div>
          <div className="portal-header-sub">Open positions</div>
        </div>
      </header>

      <div className="portal-card">
        {jobs.length === 0 ? (
          <div className="portal-center" style={{ padding: "24px 8px" }}>
            <Briefcase size={40} style={{ color: "var(--faint)", marginBottom: 12 }} />
            <h2 className="portal-title">No open roles right now</h2>
            <p className="portal-body">Please check back soon — we're always growing.</p>
          </div>
        ) : (
          <div className="careers-list">
            {jobs.map((j) => (
              <div className="careers-job" key={j.id}>
                <div className="careers-job-main">
                  <div className="careers-job-title">{j.title}</div>
                  <div className="careers-job-meta">
                    {j.department && <span><MapPin size={11} /> {j.department}</span>}
                    <span><Users size={11} /> {j.headcount} opening{j.headcount !== 1 ? "s" : ""}</span>
                  </div>
                  {j.description && <p className="careers-job-desc">{j.description}</p>}
                </div>
                <a className="btn primary" href={applyUrl(j.id)}>Apply</a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
