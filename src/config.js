export const TAGS = [
  { id: "strong-fit",    label: "Strong fit",    color: "#4A7C59" },
  { id: "culture-fit",   label: "Culture fit",   color: "#3E6B89" },
  { id: "follow-up",     label: "Follow-up",     color: "#C8881E" },
  { id: "overqualified", label: "Overqualified", color: "#8A8175" },
  { id: "passive",       label: "Passive",       color: "#7B5EA7" },
  { id: "top-pick",      label: "Top pick",      color: "#B5482E" },
];

export const REJECTION_REASONS = [
  "Not qualified",
  "Overqualified",
  "Culture mismatch",
  "Position filled",
  "Candidate withdrew",
  "No response",
  "Budget constraint",
  "Better candidate selected",
];

export const STAGES = [
  { id: "applied",   label: "Applied",   color: "#6366F1", hint: "Resume received" },
  { id: "interview", label: "Interview", color: "#3B82F6", hint: "Slot scheduled" },
  { id: "decision",  label: "Decision",  color: "#F59E0B", hint: "Awaiting feedback" },
  { id: "documents", label: "Documents", color: "#10B981", hint: "Collecting docs" },
  { id: "offer",     label: "Offer Out", color: "#8B5CF6", hint: "Offer released" },
  { id: "hired",     label: "Hired",     color: "#16A34A", hint: "Joined" },
  { id: "hold",      label: "On Hold",   color: "#F97316", hint: "Parked" },
  { id: "rejected",  label: "Rejected",  color: "#EF4444", hint: "Closed" },
];

export const stageMeta = (id) => STAGES.find((s) => s.id === id) || STAGES[0];

export const DEFAULT_SETTINGS = {
  company: "Urbanebolt",
  signature: "The People Team\nUrbanebolt",
  emailjsServiceId: "",
  emailjsTemplateId: "",
  emailjsPublicKey: "",
  defaultDocs: [
    "Government-issued photo ID",
    "Educational certificates",
    "Previous employment / relieving letter",
    "Last 3 months' payslips",
    "Address proof",
    "Passport-size photograph",
  ],
  interviewSubject: "Interview invitation — {{position}} at {{company}}",
  interviewBody: `Hi {{name}},

Thank you for applying for the {{position}} role at {{company}}. We'd like to invite you to an interview.

  • Date: {{date}}
  • Time: {{time}}
  • Mode: {{mode}}
  • {{locationLine}}
  • Interviewer: {{interviewer}}

Please reply to confirm the slot works for you. Your submitted resume is attached for our records.

Best regards,
{{signature}}`,
  rejectionSubject: "Update on your application — {{position}}",
  rejectionBody: `Hi {{name}},

Thank you for taking the time to interview for the {{position}} role at {{company}} and for sharing your experience with us.

After careful consideration, we've decided to move forward with other candidates for this position. This was a difficult decision and reflects our current needs rather than your abilities.

We'd be glad to stay in touch for future openings. Wishing you the very best.

Warm regards,
{{signature}}`,
};
