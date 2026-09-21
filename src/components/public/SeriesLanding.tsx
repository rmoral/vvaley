import type { Metadata } from "next";
import { getTranslations, getFormatter } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { pickTranslation } from "@/lib/translations";
import { renderMarkdown } from "@/lib/markdown";
import { registrationGate } from "@/lib/event-registration";
import {
  LANDINGS,
  proximaEdicion,
  formatearPrecio,
  type LandingVariant,
} from "@/lib/event-series";
import { EventGate } from "@/components/public/EventGate";
import { MeetupGuest } from "@/components/public/MeetupGuest";
import { NewsletterInline } from "@/components/public/NewsletterInline";
import { ProcessStep } from "@/components/public/ProcessStep";
import { RevealMount } from "@/components/public/RevealMount";
import { JsonLd } from "@/components/public/JsonLd";
import { Prose } from "@/components/public/DetailShell";
import { Button } from "@/components/ui/Button";
import { Divider } from "@/components/ui/Divider";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Link } from "@/i18n/navigation";
import { localizedUrls, ogLocale } from "@/lib/seo";
import type { AppLocale } from "@/i18n/routing";

// Plantilla de landing para una serie de eventos.
//
// La URL es fija y la edición es variable: por dentro busca el próximo Event
// con `series` igual a la serie y pinta esa. Ver el porqué en
// @/lib/event-series. Nació como la página de /meetup y se generalizó cuando
// llegó la segunda serie: lo que cambia entre una y otra es el bloque de
// textos en i18n y el estrato visual de la cabecera; la mecánica —edición,
// invitado, aforo, lista de espera, JSON-LD— es la misma y no tiene sentido
// tenerla dos veces.
//
// Lo que se edita desde el back-office es la edición (fecha, sede, aforo,
// precio, portada, invitado y el texto libre en markdown). Lo que vive en i18n
// es el formato, que no cambia de una edición a otra. Esa frontera es
// deliberada: si el escaparate dependiera de la base de datos habría que
// reescribirlo cada vez, y si la edición dependiera del código haría falta un
// despliegue para cambiar una fecha.

const INCLUIR = {
  translations: true,
  guest: true,
  _count: { select: { registrations: { where: { status: "CONFIRMED" as const } } } },
} as const;

/** Ediciones vivas de la serie: la de hoy sigue contando hasta que termina. */
async function edicionesProximas(series: string) {
  const desde = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return prisma.event.findMany({
    where: { series, status: "PUBLISHED", startsAt: { gte: desde } },
    orderBy: { startsAt: "asc" },
    take: 5,
    include: INCLUIR,
  });
}

function landing(series: string) {
  const l = LANDINGS[series];
  if (!l) throw new Error(`La serie "${series}" no tiene landing registrada`);
  return l;
}

// Cabecera por estrato. "ink" es el fondo oscuro del bloque comercial, el
// mismo de /servicios; "river" es el teal de marca a fondo completo, para las
// series que quieren destacar. Los anillos topográficos van en los dos, con
// menos presencia sobre el teal para que no compitan con el titular.
const HERO: Record<
  LandingVariant,
  { section: string; rings: string; lead: string; label: string; value: string; em: string }
> = {
  ink: {
    section: "grain relative overflow-hidden bg-ink px-6 pb-16 pt-32 md:px-16",
    rings: "topo-rings pointer-events-none absolute -inset-y-1/3 left-[35%] -right-[10%]",
    lead: "text-ink-2",
    label: "text-river-2",
    value: "text-white",
    em: "text-river-2",
  },
  river: {
    section: "grain relative overflow-hidden bg-river px-6 pb-16 pt-32 md:px-16",
    rings:
      "topo-rings topo-rings-light pointer-events-none absolute -inset-y-1/3 left-[35%] -right-[10%]",
    lead: "text-white/85",
    label: "text-white/70",
    value: "text-white",
    em: "text-bg",
  },
};

export async function seriesLandingMetadata(
  locale: string,
  series: string,
): Promise<Metadata> {
  const { path, ns } = landing(series);
  const t = await getTranslations(ns);
  const urls = localizedUrls(path, locale as AppLocale);

  // La portada de la próxima edición es la imagen que se comparte. Cambia con
  // la edición, que es justo lo que se quiere al pegar el enlace en LinkedIn
  // o en el email.
  const edicion = proximaEdicion(await edicionesProximas(series), new Date());

  return {
    title: t("meta_title"),
    description: t("meta_desc"),
    alternates: urls,
    openGraph: {
      type: "website",
      url: urls.canonical,
      title: t("meta_title"),
      description: t("meta_desc"),
      images: edicion?.coverImageUrl ? [edicion.coverImageUrl] : undefined,
      locale: ogLocale(locale as AppLocale),
    },
    twitter: {
      card: "summary_large_image",
      title: t("meta_title"),
      description: t("meta_desc"),
      images: edicion?.coverImageUrl ? [edicion.coverImageUrl] : undefined,
    },
  };
}

export async function SeriesLanding({
  locale,
  series,
}: {
  locale: string;
  series: string;
}) {
  const { path, ns, variant } = landing(series);
  const t = await getTranslations(ns);
  const fmt = await getFormatter();
  const ahora = new Date();
  const hero = HERO[variant];

  const edicion = proximaEdicion(await edicionesProximas(series), ahora);
  const tr = edicion ? pickTranslation(edicion, locale as AppLocale) : null;

  const anteriores = await prisma.event.findMany({
    where: {
      series,
      status: { in: ["PUBLISHED", "COMPLETED"] },
      startsAt: { lt: ahora },
      ...(edicion ? { id: { not: edicion.id } } : {}),
    },
    orderBy: { startsAt: "desc" },
    take: 3,
    include: { translations: true, guest: true },
  });

  const precio = formatearPrecio(edicion?.priceCents, locale);
  const gate = edicion ? registrationGate(edicion) : null;
  const plazasLibres =
    edicion?.capacity != null
      ? Math.max(0, edicion.capacity - edicion._count.registrations)
      : null;

  const html = tr?.description ? renderMarkdown(tr.description) : "";

  const escaleta = [
    { t: t("f1_title"), d: t("f1_desc") },
    { t: t("f2_title"), d: t("f2_desc") },
    { t: t("f3_title"), d: t("f3_desc") },
    { t: t("f4_title"), d: t("f4_desc") },
  ];

  const url = localizedUrls(path, locale as AppLocale).canonical;
  const jsonLd = edicion
    ? {
        "@context": "https://schema.org",
        "@type": "Event",
        "@id": url,
        url,
        name: tr?.title ?? t("meta_title"),
        description: tr?.summary ?? t("meta_desc"),
        image: edicion.coverImageUrl ?? undefined,
        startDate: edicion.startsAt.toISOString(),
        endDate: edicion.endsAt?.toISOString(),
        eventStatus: "https://schema.org/EventScheduled",
        eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
        location: {
          "@type": "Place",
          name: edicion.venueName ?? "Andorra",
          address: edicion.venueAddress ?? "Andorra",
        },
        organizer: { "@type": "Organization", name: "Valira Valley" },
        ...(edicion.guest
          ? { performer: { "@type": "Person", name: edicion.guest.fullName } }
          : {}),
        ...(edicion.capacity != null
          ? { maximumAttendeeCapacity: edicion.capacity }
          : {}),
        ...(edicion.priceCents != null
          ? {
              offers: {
                "@type": "Offer",
                price: (edicion.priceCents / 100).toFixed(2),
                priceCurrency: "EUR",
                url: edicion.ticketUrl ?? url,
                availability:
                  plazasLibres === 0
                    ? "https://schema.org/SoldOut"
                    : "https://schema.org/InStock",
              },
            }
          : {}),
      }
    : null;

  return (
    <main>
      <RevealMount />

      <header className={hero.section}>
        <div aria-hidden className={hero.rings} />
        <div className="relative mx-auto max-w-5xl">
          <Eyebrow invert>{t("eyebrow")}</Eyebrow>
          <h1 className="mt-6 font-display text-page font-black text-white text-pretty">
            {t("title_1")}{" "}
            <em className={`font-bold italic ${hero.em}`}>{t("title_2")}</em>
          </h1>
          <p className={`vv-reveal mt-6 max-w-[640px] text-[1.08rem] font-light leading-[1.75] ${hero.lead}`}>
            {t("lead")}
          </p>

          {edicion ? (
            <div className="vv-reveal mt-9 flex flex-wrap items-center gap-x-8 gap-y-4">
              <div>
                <p className={`text-[0.7rem] font-semibold uppercase tracking-[0.16em] ${hero.label}`}>
                  {t("when_label")}
                </p>
                <p className={`mt-1 font-display text-[1.05rem] font-bold ${hero.value}`}>
                  {fmt.dateTime(edicion.startsAt, { dateStyle: "long", timeStyle: "short" })}
                </p>
              </div>
              {edicion.venueName ? (
                <div>
                  <p className={`text-[0.7rem] font-semibold uppercase tracking-[0.16em] ${hero.label}`}>
                    {t("where_label")}
                  </p>
                  <p className={`mt-1 font-display text-[1.05rem] font-bold ${hero.value}`}>
                    {edicion.venueName}
                  </p>
                </div>
              ) : null}
              <div>
                <p className={`text-[0.7rem] font-semibold uppercase tracking-[0.16em] ${hero.label}`}>
                  {t("price_label")}
                </p>
                <p className={`mt-1 font-display text-[1.05rem] font-bold ${hero.value}`}>
                  {/* 0 € es una decisión y se dice «gratuito»; null es que aún
                      no se ha decidido, y entonces no se promete nada. */}
                  {edicion.priceCents === 0
                    ? t("price_free")
                    : (precio ?? t("price_tba"))}
                </p>
              </div>
              {/* El aforo fijo es parte del producto, no un detalle logístico:
                  se enseña arriba, junto a la fecha, y no solo en el formulario. */}
              {edicion.capacity != null ? (
                <div>
                  <p className={`text-[0.7rem] font-semibold uppercase tracking-[0.16em] ${hero.label}`}>
                    {t("seats_label")}
                  </p>
                  <p className={`mt-1 font-display text-[1.05rem] font-bold ${hero.value}`}>
                    {plazasLibres === 0
                      ? t("seats_full_short")
                      : t("seats_value", { count: edicion.capacity })}
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="vv-reveal mt-9">
            {edicion?.ticketUrl ? (
              <Button href={edicion.ticketUrl} external variant="invert" fullWidthMobile>
                {t("cta_tickets")}
              </Button>
            ) : (
              <Button href={`${path}#inscripcion`} variant="invert" fullWidthMobile>
                {edicion ? t("cta_primary") : t("cta_none")}
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Edición: invitado y texto libre. Todo esto sale del back-office. */}
      {edicion ? (
        <section className="px-6 py-20 md:px-16">
          <div className="mx-auto max-w-5xl">
            <SectionLabel>{t("next_tag")}</SectionLabel>
            <h2 className="vv-reveal mb-10 mt-6 font-display text-section font-bold text-text text-pretty">
              {tr?.title ?? t("meta_title")}
            </h2>

            {edicion.guest ? (
              <MeetupGuest
                guest={edicion.guest}
                label={t("guest_label")}
                linkLabel={t("guest_link")}
              />
            ) : (
              <div className="vv-reveal rounded-lg border border-dashed border-bg3 bg-bg2 p-8 text-center">
                <p className="font-display text-sub font-bold text-text">{t("guest_tba_title")}</p>
                <p className="mt-2 text-[0.95rem] leading-[1.7] text-text-2">{t("guest_tba_body")}</p>
              </div>
            )}

            {html ? (
              <div className="vv-reveal mt-10">
                <Prose html={html} />
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      <Divider />

      {/* Formato. Fijo en i18n: la escaleta no cambia de una edición a otra. */}
      <section className="bg-bg2 px-6 py-20 md:px-16">
        <div className="mx-auto max-w-5xl">
          <SectionLabel>{t("format_tag")}</SectionLabel>
          <h2 className="vv-reveal mb-10 mt-6 font-display text-section font-bold text-text text-pretty">
            {t("format_title")}
          </h2>
          <div className="vv-seq grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {escaleta.map((paso, i) => (
              <ProcessStep key={paso.t} num={String(i + 1)} title={paso.t} desc={paso.d} />
            ))}
          </div>
        </div>
      </section>

      <Divider />

      {/* Inscripción. Con edición abierta, el formulario propio; con venta
          externa, el botón se queda arriba y aquí solo se explica. */}
      <section id="inscripcion" className="scroll-mt-24 px-6 py-20 md:px-16">
        <div className="mx-auto max-w-3xl">
          <SectionLabel>{t("register_tag")}</SectionLabel>
          <h2 className="vv-reveal mb-3 mt-6 font-display text-section font-bold text-text text-pretty">
            {edicion ? t("register_title") : t("none_title")}
          </h2>
          <p className="vv-reveal mb-8 text-[1rem] font-light leading-[1.7] text-text-2">
            {edicion ? t("register_sub") : t("none_body")}
          </p>

          {edicion && gate ? (
            edicion.ticketUrl ? (
              <Button href={edicion.ticketUrl} external fullWidthMobile>
                {t("cta_tickets")}
              </Button>
            ) : (
              <EventGate
                slug={edicion.slug}
                open={gate.open}
                reason={gate.open ? undefined : gate.reason}
                seatsLeft={plazasLibres}
              />
            )
          ) : (
            // Sin edición publicada no hay a qué inscribirse, pero sí hay algo
            // que hacer: recoger el email para avisar de la siguiente.
            <NewsletterInline source={series} />
          )}
        </div>
      </section>

      {anteriores.length > 0 ? (
        <>
          <Divider />
          <section className="px-6 py-20 md:px-16">
            <div className="mx-auto max-w-5xl">
              <SectionLabel>{t("past_tag")}</SectionLabel>
              <h2 className="vv-reveal mb-10 mt-6 font-display text-section font-bold text-text text-pretty">
                {t("past_title")}
              </h2>
              <ul className="vv-seq flex flex-col gap-px overflow-hidden rounded-lg border border-bg3 bg-bg3">
                {anteriores.map((e) => {
                  const et = pickTranslation(e, locale as AppLocale);
                  return (
                    <li key={e.id}>
                      <Link
                        href={`/eventos/${e.slug}`}
                        className="group flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 bg-white px-5 py-4 no-underline transition-colors duration-150 hover:bg-river/[0.05]"
                      >
                        <span className="text-[0.95rem] leading-[1.5] text-text transition-colors duration-150 group-hover:text-river">
                          {et?.title ?? e.slug}
                        </span>
                        <span className="text-[0.8rem] text-text-2">
                          {fmt.dateTime(e.startsAt, { dateStyle: "medium" })}
                          {e.guest ? ` · ${e.guest.fullName}` : ""}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </section>
        </>
      ) : null}

      {jsonLd ? <JsonLd data={jsonLd} /> : null}
    </main>
  );
}
