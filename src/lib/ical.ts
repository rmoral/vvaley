// Build a single-event iCalendar payload (RFC 5545) used to invite guests
// to a podcast recording. The text is intentionally hand-written rather
// than pulling in a library — the payload is small and the wire format
// is stable.

export type CalendarMethod = "REQUEST" | "CANCEL";

export type CalendarEvent = {
  uid: string;
  method?: CalendarMethod;
  summary: string;
  description?: string;
  location?: string;
  url?: string;
  start: Date;
  end: Date;
  organizer: { name: string; email: string };
  attendees: { name: string; email: string }[];
  status?: "CONFIRMED" | "CANCELLED" | "TENTATIVE";
  sequence?: number;
};

const fmt = (d: Date) =>
  d
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");

const escape = (s: string) =>
  s
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");

// Long lines must be folded at 75 octets (RFC 5545 §3.1).
function fold(line: string): string {
  if (line.length <= 75) return line;
  const out: string[] = [line.slice(0, 75)];
  let rest = line.slice(75);
  while (rest.length > 74) {
    out.push(" " + rest.slice(0, 74));
    rest = rest.slice(74);
  }
  if (rest.length > 0) out.push(" " + rest);
  return out.join("\r\n");
}

export function buildIcs(event: CalendarEvent): string {
  const method = event.method ?? "REQUEST";
  const status = event.status ?? "CONFIRMED";
  const sequence = event.sequence ?? 0;
  const now = new Date();

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Valira Valley//Podcast//ES",
    "CALSCALE:GREGORIAN",
    `METHOD:${method}`,
    "BEGIN:VEVENT",
    `UID:${event.uid}`,
    `DTSTAMP:${fmt(now)}`,
    `DTSTART:${fmt(event.start)}`,
    `DTEND:${fmt(event.end)}`,
    `SUMMARY:${escape(event.summary)}`,
    `STATUS:${status}`,
    `SEQUENCE:${sequence}`,
    `ORGANIZER;CN=${escape(event.organizer.name)}:MAILTO:${event.organizer.email}`,
    ...event.attendees.map(
      (a) =>
        `ATTENDEE;CN=${escape(a.name)};ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:MAILTO:${a.email}`,
    ),
  ];

  if (event.description) {
    lines.push(`DESCRIPTION:${escape(event.description)}`);
  }
  if (event.location) {
    lines.push(`LOCATION:${escape(event.location)}`);
  }
  if (event.url) {
    lines.push(`URL:${event.url}`);
  }

  lines.push("END:VEVENT", "END:VCALENDAR");

  return lines.map(fold).join("\r\n") + "\r\n";
}
