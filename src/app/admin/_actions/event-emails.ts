"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { RegistrationStatus } from "@prisma/client";
import { requireAdmin, requireSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { eventMessageFrom } from "@/lib/email-config";
import { asEmailLocale } from "@/lib/email-copy";
import { sampleRegistration } from "@/lib/email-samples";
import { requiresOnlinePayment } from "@/lib/event-registration";
import { getKunfupayConfig } from "@/lib/kunfupay";
import { paymentLinkSecret, paymentLinkUrl } from "@/lib/payment-links";
import {
  buildEventMessage,
  unknownPlaceholders,
  usesPlaceholder,
} from "@/lib/event-message-emails";

// Correos personalizados a los inscritos de un evento: plantillas (crear y
// editar con sesión, borrar solo ADMIN) y envíos (salen del sitio: ADMIN).

const text = (formData: FormData, name: string) => {
  const v = formData.get(name);
  return typeof v === "string" ? v.trim() : "";
};

// ---------- Plantillas ---------- //

type TemplateFields = { name: string; locale: string; subject: string; body: string };

function templateFields(formData: FormData): TemplateFields | string {
  const fields = {
    name: text(formData, "name"),
    locale: asEmailLocale(text(formData, "locale")),
    subject: text(formData, "subject"),
    body: text(formData, "body"),
  };
  if (!fields.name || !fields.subject || !fields.body) return "missing";
  if (unknownPlaceholders(fields.subject, fields.body).length > 0) return "unknown_placeholder";
  return fields;
}

export async function createEventEmailTemplate(formData: FormData) {
  await requireSession();
  const fields = templateFields(formData);
  if (typeof fields === "string") redirect(`/admin/eventos/plantillas/nueva?error=${fields}`);
  const template = await prisma.eventEmailTemplate.create({ data: fields });
  revalidatePath("/admin/eventos/plantillas");
  redirect(`/admin/eventos/plantillas/${template.id}?saved=1`);
}

export async function updateEventEmailTemplate(id: string, formData: FormData) {
  await requireSession();
  const fields = templateFields(formData);
  if (typeof fields === "string") redirect(`/admin/eventos/plantillas/${id}?error=${fields}`);
  await prisma.eventEmailTemplate.update({ where: { id }, data: fields });
  revalidatePath("/admin/eventos/plantillas");
  redirect(`/admin/eventos/plantillas/${id}?saved=1`);
}

export async function deleteEventEmailTemplate(id: string) {
  await requireAdmin();
  await prisma.eventEmailTemplate.delete({ where: { id } }).catch(() => null);
  revalidatePath("/admin/eventos/plantillas");
  redirect("/admin/eventos/plantillas");
}

// ---------- Redactar y enviar ---------- //

export type ComposeState = {
  error?: string;
  /** Vista previa: HTML del correo para la primera persona. */
  preview?: { to: string; subject: string; html: string };
  /** Personas a las que saldría (o salió) el correo. */
  recipients?: number;
  result?: { sent: number; failed: number; reason?: string; test?: boolean };
};

type Draft = {
  templateId: string | null;
  locale: string;
  subject: string;
  body: string;
  reason: string;
  registrationId: string | null;
  statuses: RegistrationStatus[];
  /** El texto lleva {{enlace_pago}}: solo a quien puede pagar y no ha pagado. */
  paymentLink: boolean;
};

/** Estados a los que sirve el enlace de pago (ver paymentLinkState). */
const PAYABLE: RegistrationStatus[] = ["CONFIRMED", "PENDING_PAYMENT"];

const STATUSES = Object.values(RegistrationStatus) as string[];

function readDraft(formData: FormData): Draft | string {
  const draft: Draft = {
    templateId: text(formData, "templateId") || null,
    locale: asEmailLocale(text(formData, "locale")),
    subject: text(formData, "subject"),
    body: text(formData, "body"),
    reason: text(formData, "reason"),
    registrationId: text(formData, "registrationId") || null,
    statuses: formData
      .getAll("status")
      .map(String)
      .filter((s): s is RegistrationStatus => STATUSES.includes(s)),
    paymentLink: false,
  };
  draft.paymentLink = usesPlaceholder("enlace_pago", draft.subject, draft.body);
  if (!draft.subject || !draft.body) return "Falta el asunto o el texto del correo.";
  const unknown = unknownPlaceholders(draft.subject, draft.body);
  if (unknown.length > 0) {
    return `Hay huecos que no existen: ${unknown.map((u) => `{{${u}}}`).join(", ")}.`;
  }
  const hasReasonHole = usesPlaceholder("motivo", draft.subject, draft.body);
  if (hasReasonHole && !draft.reason) {
    return "El texto usa {{motivo}}: escribe el motivo del correo.";
  }
  if (!hasReasonHole && draft.reason) {
    return "Has escrito un motivo, pero el texto no tiene el hueco {{motivo}}: añádelo donde deba ir.";
  }
  if (!draft.registrationId && draft.statuses.length === 0) {
    return "Elige al menos un estado de inscripción.";
  }
  if (draft.paymentLink && draft.statuses.some((s) => !PAYABLE.includes(s))) {
    return "El enlace de pago solo sirve a confirmados y pendientes de pago: desmarca lista de espera y cancelados.";
  }
  return draft;
}

/** Si el texto lleva {{enlace_pago}}, que el evento y el servidor puedan cobrar. */
function paymentLinkProblem(
  event: Parameters<typeof requiresOnlinePayment>[0],
  draft: Draft,
): string | null {
  if (!draft.paymentLink) return null;
  if (!requiresOnlinePayment(event)) {
    return "Este evento no cobra online (precio y «Cobrar la inscripción online»): el hueco {{enlace_pago}} no tendría enlace.";
  }
  if (!getKunfupayConfig()) return "Kunfupay no está configurado en el servidor (KUNFUPAY_API_KEY).";
  if (!paymentLinkSecret()) return "Falta PAYMENT_LINK_SECRET o AUTH_SECRET para firmar los enlaces de pago.";
  return null;
}

async function loadEvent(eventId: string) {
  return prisma.event.findUnique({ where: { id: eventId }, include: { translations: true } });
}

type LoadedEvent = NonNullable<Awaited<ReturnType<typeof loadEvent>>>;

async function recipientsFor(eventId: string, draft: Draft) {
  return prisma.eventRegistration.findMany({
    where: {
      eventId,
      ...(draft.registrationId ? { id: draft.registrationId } : { status: { in: draft.statuses } }),
      // Con enlace de pago, nunca a quien ya ha pagado (paymentStatus null
      // cuenta como no pagado: hay que nombrarlo, `not` excluye los null).
      ...(draft.paymentLink
        ? {
            status: { in: draft.registrationId ? PAYABLE : draft.statuses },
            OR: [{ paymentStatus: null }, { paymentStatus: { not: "PAID" as const } }],
          }
        : {}),
    },
    orderBy: { createdAt: "asc" },
  });
}

type Person = Parameters<typeof buildEventMessage>[0]["registration"] & { locale: string };

function messageFor(draft: Draft, event: LoadedEvent, person: Person) {
  return buildEventMessage({
    ...draft,
    event,
    registration: person,
    paymentUrl: draft.paymentLink ? (paymentLinkUrl(person, event) ?? "") : undefined,
  });
}

const noPayableRecipient = (draft: Draft) =>
  draft.paymentLink && draft.registrationId
    ? "Esta persona ya ha pagado o no puede pagar con enlace (lista de espera o cancelada)."
    : null;

/** Cuenta destinatarios y pinta el correo de la primera persona. No envía nada. */
export async function previewEventEmail(
  eventId: string,
  _prev: ComposeState,
  formData: FormData,
): Promise<ComposeState> {
  await requireSession();
  const draft = readDraft(formData);
  if (typeof draft === "string") return { error: draft };
  const event = await loadEvent(eventId);
  if (!event) return { error: "El evento ya no existe." };
  const problem = paymentLinkProblem(event, draft);
  if (problem) return { error: problem };

  const recipients = await recipientsFor(eventId, draft);
  if (recipients.length === 0 && noPayableRecipient(draft)) return { error: noPayableRecipient(draft)! };
  const person = recipients[0] ?? sampleRegistration(asEmailLocale(draft.locale));
  const { subject, html } = messageFor(draft, event, person);
  return {
    recipients: recipients.length,
    preview: {
      to: recipients[0] ? `${person.fullName} <${person.email}>` : "Persona de ejemplo",
      subject,
      html,
    },
  };
}

/** Envía al admin que lo pide, y solo a él, el correo de la primera persona. */
export async function sendEventEmailTest(
  eventId: string,
  _prev: ComposeState,
  formData: FormData,
): Promise<ComposeState> {
  const session = await requireAdmin();
  const draft = readDraft(formData);
  if (typeof draft === "string") return { error: draft };
  if (!session.user.email) return { error: "Tu usuario no tiene email." };
  const event = await loadEvent(eventId);
  if (!event) return { error: "El evento ya no existe." };
  const problem = paymentLinkProblem(event, draft);
  if (problem) return { error: problem };

  const recipients = await recipientsFor(eventId, draft);
  if (recipients.length === 0 && noPayableRecipient(draft)) return { error: noPayableRecipient(draft)! };
  // Con enlace de pago, la prueba lleva el de la primera persona: abrirlo
  // crea un checkout real para ella (no se cobra nada si no se paga).
  const person = recipients[0] ?? sampleRegistration(asEmailLocale(draft.locale));
  const message = messageFor(draft, event, person);
  const from = eventMessageFrom();
  const res = await sendEmail({
    to: session.user.email,
    from,
    replyTo: from,
    subject: `[Prueba] ${message.subject}`,
    html: message.html,
    text: message.text,
  });
  return {
    recipients: recipients.length,
    result: res.ok
      ? { sent: 1, failed: 0, test: true, reason: res.dryRun ? "dry_run" : undefined }
      : { sent: 0, failed: 1, test: true, reason: res.error },
  };
}

/** Errores de configuración: no tiene sentido seguir con el resto de la lista. */
const FATAL = new Set(["not_configured", "smtp_config", "smtp_EAUTH"]);

/**
 * Un correo por persona, con sus datos. Se envían de uno en uno: son pocas
 * decenas y así un fallo no arrastra a los demás. Queda registro del envío.
 */
export async function sendEventEmail(
  eventId: string,
  _prev: ComposeState,
  formData: FormData,
): Promise<ComposeState> {
  const session = await requireAdmin();
  const draft = readDraft(formData);
  if (typeof draft === "string") return { error: draft };
  const event = await loadEvent(eventId);
  if (!event) return { error: "El evento ya no existe." };
  const problem = paymentLinkProblem(event, draft);
  if (problem) return { error: problem };

  const recipients = await recipientsFor(eventId, draft);
  if (recipients.length === 0) {
    return {
      error:
        noPayableRecipient(draft) ??
        (draft.paymentLink
          ? "No hay nadie sin pagar con esos estados."
          : "No hay nadie inscrito con esos estados."),
    };
  }

  const from = eventMessageFrom();
  let sent = 0;
  let failed = 0;
  let reason: string | undefined;
  for (const person of recipients) {
    const message = messageFor(draft, event, person);
    const res = await sendEmail({
      to: person.email,
      from,
      replyTo: from,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });
    if (res.ok) {
      sent++;
      if (res.dryRun) reason = "dry_run";
      continue;
    }
    failed++;
    reason = res.error;
    if (FATAL.has(res.error)) {
      failed = recipients.length - sent;
      break;
    }
  }

  const template = draft.templateId
    ? await prisma.eventEmailTemplate.findUnique({ where: { id: draft.templateId } })
    : null;
  await prisma.eventEmailSend.create({
    data: {
      eventId,
      templateId: template?.id ?? null,
      subject: draft.subject,
      reason: draft.reason || null,
      statuses: draft.registrationId ? [] : draft.statuses,
      recipients: recipients.length,
      sent,
      failed,
      sentById: session.user.id,
    },
  });
  revalidatePath(`/admin/eventos/${eventId}/correo`);
  return { recipients: recipients.length, result: { sent, failed, reason } };
}
