import type { Episode, Guest } from "@prisma/client";
import { sendEmail } from "@/lib/email";
import { addressOf, mailFrom } from "@/lib/email-config";
import { buildIcs } from "@/lib/ical";
import { getSiteUrl } from "@/lib/site-url";
import { renderEmail, type EmailDetail } from "@/lib/email-layout";

const ORGANIZER_NAME = "Valira Valley";

const subject = (episodeTitle: string) =>
  `Grabación Valira Valley: ${episodeTitle}`;

/**
 * Invitación a grabar, con la plantilla común. Solo en castellano, como hasta
 * ahora. Pura: la usa también la previsualización del admin.
 */
export function buildEpisodeInviteEmail(input: {
  guestName: string;
  episodeTitle: string;
  whenLabel: string;
  recordingUrl: string | null;
}) {
  const firstName = input.guestName.trim().split(/\s+/)[0] || input.guestName;
  const details: EmailDetail[] = [
    { label: "Episodio", value: input.episodeTitle },
    { label: "Fecha", value: input.whenLabel },
  ];
  if (input.recordingUrl) {
    details.push({ label: "Conexión", value: input.recordingUrl, href: input.recordingUrl });
  }
  const mailSubject = subject(input.episodeTitle);
  const { html, text } = renderEmail({
    lang: "es",
    subject: mailSubject,
    preheader: `Grabación confirmada: ${input.whenLabel}.`,
    headerTag: "Podcast",
    eyebrow: "Grabación confirmada",
    title: input.episodeTitle,
    paragraphs: [
      `Hola, ${firstName}:`,
      "Confirmamos la grabación del podcast. Te adjuntamos un evento de calendario (.ics) para que lo añadas a Google Calendar, Outlook o Apple Calendar.",
    ],
    details,
    cta: input.recordingUrl ? { label: "Unirse a la grabación", url: input.recordingUrl } : undefined,
    afterCta: ["Si necesitas cambiar la fecha, responde a este correo."],
    footer: {
      sign: "El equipo de Valira Valley",
      place: "Andorra",
      note: "Recibes este correo porque vas a participar en un episodio de Valira Valley.",
    },
  });
  return { subject: mailSubject, html, text };
}

export type EpisodeForInvite = Episode & {
  guests: { guest: Guest }[];
};

/** Build the .ics text for an episode's recording. */
export function buildEpisodeIcs(episode: EpisodeForInvite, sequence = 0): string {
  if (!episode.recordingAt) {
    throw new Error("Episode has no recordingAt");
  }
  const durationSec = episode.durationSec ?? 60 * 60; // default 1h
  const start = episode.recordingAt;
  const end = new Date(start.getTime() + durationSec * 1000);

  const organizerEmail = addressOf(mailFrom());

  const description = [
    episode.summary ?? "",
    episode.recordingUrl ? `\nConexión: ${episode.recordingUrl}` : "",
    `\n${getSiteUrl()}/admin/episodios/${episode.id}`,
  ]
    .filter(Boolean)
    .join("");

  return buildIcs({
    uid: `episode-${episode.id}@valiravalley.com`,
    method: "REQUEST",
    summary: `Grabación: ${episode.title}`,
    description,
    location: episode.recordingUrl ?? undefined,
    url: episode.recordingUrl ?? undefined,
    start,
    end,
    organizer: { name: ORGANIZER_NAME, email: organizerEmail },
    attendees: episode.guests
      .filter((eg) => eg.guest.email)
      .map((eg) => ({ name: eg.guest.fullName, email: eg.guest.email! })),
    status: "CONFIRMED",
    sequence,
  });
}

/** Send the iCal invite to every guest of the episode that has an email. */
export async function sendEpisodeInvites(episode: EpisodeForInvite) {
  if (!episode.recordingAt) return { sent: 0, skipped: "no_date" as const };

  const guestsWithEmail = episode.guests.filter((eg) => eg.guest.email);
  if (guestsWithEmail.length === 0) {
    return { sent: 0, skipped: "no_guests_with_email" as const };
  }

  // Bump the SEQUENCE every time we resend so calendar clients update the
  // existing event instead of treating it as a duplicate.
  const sequence = episode.inviteSentAt ? 1 : 0;
  const ics = buildEpisodeIcs(episode, sequence);

  const whenLabel = new Intl.DateTimeFormat("es", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Europe/Andorra",
  }).format(episode.recordingAt);

  let sent = 0;
  for (const { guest } of guestsWithEmail) {
    const mail = buildEpisodeInviteEmail({
      guestName: guest.fullName,
      episodeTitle: episode.title,
      whenLabel,
      recordingUrl: episode.recordingUrl,
    });
    const result = await sendEmail({
      to: guest.email!,
      ...mail,
      attachments: [
        {
          filename: "valira-valley.ics",
          content: ics,
          contentType: "text/calendar; charset=utf-8; method=REQUEST",
        },
      ],
    });
    if (result.ok) sent += 1;
  }

  return { sent, skipped: null };
}
