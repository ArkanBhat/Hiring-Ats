/** Generate an RFC 5545 .ics calendar file for an interview invite. */
export function buildICS({ candidateName, position, date, time, mode, location, interviewer, candidateEmail, organizerEmail }) {
  const fmt = (d) => d.toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z';

  // Parse "2026-06-10" + "10:30" into a UTC Date
  const [y, mo, d2] = (date || '').split('-').map(Number);
  const [h, m]      = (time || '00:00').split(':').map(Number);
  if (!y || !mo || !d2) return null;

  const start = new Date(Date.UTC(y, mo - 1, d2, h - 0, m));   // keep as local-ish UTC
  const end   = new Date(start.getTime() + 60 * 60 * 1000);     // +1 hour

  const locationLine = mode === 'Phone'     ? `Phone: ${candidateEmail}`
                     : mode === 'In-person' ? (location || 'Office')
                     :                        (location || 'Online');

  const desc = [
    `Interview for: ${position}`,
    `Interviewer: ${interviewer || 'TBD'}`,
    `Mode: ${mode || 'TBD'}`,
    locationLine,
  ].join('\\n');

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Urbanebolt ATS//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:interview-${Date.now()}@urbanebolt`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:Interview — ${candidateName} · ${position}`,
    `DESCRIPTION:${desc}`,
    `LOCATION:${locationLine}`,
    organizerEmail ? `ORGANIZER;CN=Hiring Team:mailto:${organizerEmail}` : '',
    candidateEmail ? `ATTENDEE;RSVP=TRUE;CN=${candidateName}:mailto:${candidateEmail}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n');

  return lines;
}

export function downloadICS(content, filename = 'interview.ics') {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
