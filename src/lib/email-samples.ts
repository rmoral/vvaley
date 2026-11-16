import type { AppLocale } from "@/i18n/routing";
import { getSiteUrl } from "@/lib/site-url";
import {
  buildPaidTeamNotice,
  buildRegistrationEmail,
  type EventForEmail,
  type RegistrationForEmail,
} from "@/lib/event-registration-emails";
import { buildConfirmEmail } from "@/lib/newsletter-emails";
import { renderCampaign } from "@/lib/campaign-emails";
import { buildContactNotice } from "@/lib/contact-emails";
import { buildEpisodeInviteEmail } from "@/lib/calendar-invites";

// Ejemplos de todos los correos de la web, para la página /admin/correos y
// para «Enviarme los correos de prueba». Datos ficticios y marcados como tales:
// nunca salen hacia nadie más que el admin que los pide.

export function sampleRegistration(locale: AppLocale): RegistrationForEmail {
  return {
    id: "sample0000000000000demo1",
    fullName: "Persona de prueba",
    email: "persona.de.prueba@example.com",
    company: "Empresa de ejemplo",
    notes: "Correo de prueba enviado desde el admin; no hay inscripción ni pago real.",
    locale,
    status: "CONFIRMED",
  };
}

/** Evento de ejemplo cuando no hay ninguno real que usar. */
export function sampleEvent(): EventForEmail {
  const startsAt = new Date(Date.now() + 14 * 24 * 3600 * 1000);
  startsAt.setUTCHours(17, 30, 0, 0);
  return {
    id: "sample-event",
    slug: "evento-de-ejemplo",
    startsAt,
    endsAt: new Date(startsAt.getTime() + 2 * 3600 * 1000),
    timezone: "Europe/Andorra",
    locationType: "INPERSON",
    venueName: "Sala de ejemplo",
    venueAddress: "Andorra la Vella",
    onlineUrl: null,
    capacity: 40,
    translations: [{ locale: "es", title: "Evento de ejemplo" }],
  };
}

export type EmailSample = {
  id: string;
  name: string;
  audience: string;
  subject: string;
  html: string;
};

/** Todos los correos, con un evento real (si se da) o el de ejemplo. */
export function allEmailSamples(locale: AppLocale, event: EventForEmail = sampleEvent()): EmailSample[] {
  const reg = sampleRegistration(locale);
  const paid = { cents: 3000, currency: "EUR" };
  const site = getSiteUrl();

  const list: (Omit<EmailSample, "subject" | "html"> & { mail: { subject: string; html: string } })[] = [
    {
      id: "registration-paid",
      name: "Inscripción pagada",
      audience: "Quien paga un evento",
      mail: buildRegistrationEmail({ locale, event, registration: reg, kind: "confirmed", paid }),
    },
    {
      id: "registration-free",
      name: "Inscripción gratuita",
      audience: "Quien se apunta a un evento gratuito",
      mail: buildRegistrationEmail({ locale, event, registration: reg, kind: "confirmed" }),
    },
    {
      id: "registration-waitlist",
      name: "Lista de espera",
      audience: "Quien se apunta con el aforo completo",
      mail: buildRegistrationEmail({ locale, event, registration: reg, kind: "waitlist" }),
    },
    {
      id: "team-paid",
      name: "Aviso de pago al equipo",
      audience: "EVENT_NOTIFY_EMAIL",
      mail: buildPaidTeamNotice({ event, registration: reg, paid, confirmedCount: 12 }),
    },
    {
      id: "newsletter-confirm",
      name: "Confirmación de la newsletter",
      audience: "Quien se suscribe (doble opt-in)",
      mail: buildConfirmEmail(locale, `${site}/api/newsletter/confirm?token=ejemplo`),
    },
    {
      id: "campaign",
      name: "Campaña de newsletter",
      audience: "Suscriptores confirmados",
      mail: renderCampaign(
        {
          subject: "Asunto de la campaña de ejemplo",
          preheader: "Texto de vista previa",
          bodyMarkdown:
            "Hola {{name}},\n\nEste es el cuerpo de una campaña escrita en Markdown desde el admin.\n\n## Una sección\n\nCon **negritas**, [un enlace](https://valiravalley.com) y una lista:\n\n- Primer punto\n- Segundo punto\n\n— El equipo de Valira Valley",
        },
        { email: "persona.de.prueba@example.com", name: "Persona", locale, confirmToken: "ejemplo" },
      ),
    },
    {
      id: "contact",
      name: "Aviso de contacto",
      audience: "CONTACT_NOTIFY_EMAIL",
      mail: buildContactNotice({
        topic: "SERVICES",
        name: "Persona de prueba",
        email: "persona.de.prueba@example.com",
        company: "Empresa de ejemplo",
        phone: "+376 000 000",
        message: "Mensaje de ejemplo del formulario de contacto.\nSegunda línea del mensaje.",
        locale,
      }),
    },
    {
      id: "episode-invite",
      name: "Invitación a grabar",
      audience: "Invitados del pódcast (con .ics)",
      mail: buildEpisodeInviteEmail({
        guestName: "Persona de prueba",
        episodeTitle: "Episodio de ejemplo",
        whenLabel: "Martes, 1 de diciembre de 2026, 10:00",
        recordingUrl: "https://riverside.fm/studio/ejemplo",
      }),
    },
  ];
  return list.map(({ mail, ...rest }) => ({ ...rest, subject: mail.subject, html: mail.html }));
}
