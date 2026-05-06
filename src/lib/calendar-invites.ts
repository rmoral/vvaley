import type { Episode, Guest } from "@prisma/client";
import { sendEmail } from "@/lib/email";
import { buildIcs } from "@/lib/ical";
import { getSiteUrl } from "@/lib/site-url";

const ORGANIZER_NAME = "Valira Valley";

const subject = (episodeTitle: string) =>
  `Grabación Valira Valley: ${episodeTitle}`;

const bodyText = (
  guestName: string,
  episodeTitle: string,
  whenLabel: string,
  recordingUrl: string | null,
) => {
  const lines = [
    `Hola ${guestName},`,
    "",
    `Confirmamos la grabación del podcast "${episodeTitle}".`,
    `Fecha: ${whenLabel}`,
  ];
  if (recordingUrl) lines.push(`Conexión: ${recordingUrl}`);
  lines.push(
    "",
    "Adjuntamos un evento de calendario para que lo añadas a Google Calendar / Outlook / Apple Calendar.",
    "",
    "— Equipo de Valira Valley",
  );
  return lines.join("\n");
};

const bodyHtml = (
  guestName: string,
  episodeTitle: string,
  whenLabel: string,
  recordingUrl: string | null,
) => `<!doctype html>
<html><body style="font-family:system-ui,sans-serif;background:#F4F8F8;padding:32px;color:#142E30;">
  <div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #C8D8DA;border-radius:8px;padding:32px;">
    <div style="font-family:Georgia,serif;font-weight:900;font-size:18px;letter-spacing:.05em;">
      VALIRA<span style="color:#2E8B8F"> · </span>VALLEY
    </div>
    <p style="margin-top:24px;line-height:1.6;color:#3A5557;">Hola ${guestName},</p>
    <p style="line-height:1.6;color:#3A5557;">Confirmamos la grabación del podcast <strong>${episodeTitle}</strong>.</p>
    <p style="line-height:1.6;color:#3A5557;"><strong>Fecha:</strong> ${whenLabel}</p>
    ${recordingUrl ? `<p style="line-height:1.6;color:#3A5557;"><strong>Conexión:</strong> <a href="${recordingUrl}" style="color:#2E8B8F">${recordingUrl}</a></p>` : ""}
    <p style="line-height:1.6;color:#3A5557;margin-top:24px;">Adjuntamos un evento de calendario (.ics) para que lo añadas a Google Calendar, Outlook o Apple Calendar.</p>
    <p style="font-size:13px;color:#6A8688;margin-top:32px;">— Equipo de Valira Valley</p>
  </div>
</body></html>`;

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

  const fromEnv = process.env.EMAIL_FROM ?? "Valira Valley <noreply@valiravalley.com>";
  const organizerEmail =
    /<([^>]+)>/.exec(fromEnv)?.[1] ?? "noreply@valiravalley.com";

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
    const result = await sendEmail({
      to: guest.email!,
      subject: subject(episode.title),
      text: bodyText(
        guest.fullName,
        episode.title,
        whenLabel,
        episode.recordingUrl,
      ),
      html: bodyHtml(
        guest.fullName,
        episode.title,
        whenLabel,
        episode.recordingUrl,
      ),
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
