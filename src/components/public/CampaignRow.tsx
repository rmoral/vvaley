import { Link } from "@/i18n/navigation";

// Server Component. Fila del archivo de newsletter (/newsletter/archivo).
// Misma anatomía que NewsItem —fecha en columna, título, preheader— porque
// son el mismo tipo de objeto: una entrada fechada de un flujo.
// Añade el idioma de la campaña, que hoy se consulta pero no se muestra.

export function CampaignRow({
  campaign,
  locale,
}: {
  campaign: {
    id: string;
    subject: string;
    preheader?: string | null;
    sentAt?: Date | null;
    audienceLocale?: string | null;
  };
  locale: string;
}) {
  return (
    <Link
      href={`/newsletter/archivo/${campaign.id}`}
      className="vv-reveal group flex flex-col gap-2 rounded-lg border border-bg3 bg-white p-5 no-underline transition-all duration-250 ease-out-soft hover:-translate-y-0.5 hover:border-river-2 hover:shadow-lift sm:flex-row sm:items-baseline sm:gap-6"
    >
      {campaign.sentAt ? (
        <time
          dateTime={campaign.sentAt.toISOString()}
          className="shrink-0 text-[0.74rem] uppercase tracking-[0.1em] text-river sm:w-32"
        >
          {new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(campaign.sentAt)}
        </time>
      ) : null}

      <div className="flex-1">
        <h2 className="font-display text-[1.1rem] font-bold leading-tight text-text transition-colors duration-150 group-hover:text-river text-pretty">
          {campaign.subject}
        </h2>
        {campaign.preheader ? (
          <p className="mt-1 line-clamp-2 text-[0.9rem] leading-[1.55] text-text-2">
            {campaign.preheader}
          </p>
        ) : null}
      </div>

      {campaign.audienceLocale ? (
        <span className="shrink-0 rounded-chip border border-bg3 bg-bg2 px-2 py-0.5 text-[0.66rem] font-semibold uppercase tracking-[0.1em] text-text-2">
          {campaign.audienceLocale}
        </span>
      ) : null}
    </Link>
  );
}
