const STOP = new Set([
  'the','and','for','with','this','that','will','have','from','they',
  'their','about','which','when','your','should','would','could','must',
  'been','also','into','more','than','some','such','each','then','over',
  'work','team','role','job','position','candidate','apply','require',
  'experience','years','good','strong','well','able','help','use','make',
  'able','across','within','including','ensure','support','related',
]);

/** Score resume text against a job description (0–100). Returns null if either is missing. */
export function scoreResume(resumeText, jobDescription) {
  if (!resumeText || !jobDescription) return null;

  // Extract keywords from JD
  const jdWords = jobDescription
    .toLowerCase()
    .replace(/[^a-z0-9\s#+.\-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOP.has(w));

  const keywords = [...new Set(jdWords)];
  if (keywords.length === 0) return null;

  const resume = resumeText.toLowerCase();
  const hits   = keywords.filter((k) => resume.includes(k)).length;

  return Math.min(Math.round((hits / keywords.length) * 100), 99);
}

export function scoreLabel(score) {
  if (score == null) return null;
  if (score >= 70) return { label: `${score}% match`, color: '#16A34A', bg: 'rgba(22,163,74,.1)' };
  if (score >= 45) return { label: `${score}% match`, color: '#D97706', bg: 'rgba(217,119,6,.1)' };
  return           { label: `${score}% match`, color: '#DC2626', bg: 'rgba(220,38,38,.1)' };
}
