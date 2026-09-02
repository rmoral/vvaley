import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { CoverArt } from "./CoverArt";

// Server Component. Cáscara común de TODAS las páginas de detalle:
// episodio, artículo, noticia, evento y edición de newsletter.
//
// Hoy cada detalle repite la misma estructura con clases ligeramente
// distintas (max-w-3xl, back link, h1 en clamp, metadatos, prose). Esto la
// unifica: una sola medida de lectura, un solo tratamiento de portada y un
// solo bloque de prosa. Las páginas siguen resolviendo sus propios datos.

export function DetailShell({
  backHref,
  backLabel,
  eyebrow,
  numeral,
  title,
  subtitle,
  meta,
  coverUrl,
  coverAlt = "",
  coverTreatment = "duotone",
  notice,
  children,
  aside,
  footer,
}: {
  backHref: string;
  backLabel: string;
  /** Antetítulo: fecha larga del evento, sección, etc. */
  eyebrow?: string;
  /** Número de episodio en Fraunces Black. Decorativo. */
  numeral?: string;
  title: string;
  subtitle?: string | null;
  /** Metadatos ya formateados: fecha, duración, ubicación… */
  meta?: ReactNode;
  coverUrl?: string | null;
  coverAlt?: string;
  /** "plate" cuando la portada es la imagen por defecto de temática. */
  coverTreatment?: "duotone" | "plate";
  /** Aviso de traducción de respaldo (fallback_notice) u otro banner. */
  notice?: ReactNode;
  /** Cuerpo: prosa renderizada, reproductor, lo que toque. */
  children: ReactNode;
  /** Bloque final antes del footer: invitados, inscripción, tags… */
  aside?: ReactNode;
  /** NewsletterInline, JsonLd, etc. */
  footer?: ReactNode;
}) {
  return (
    <main className="mx-auto max-w-3xl px-6 pb-24 pt-32 md:px-16">
      <Link
        href={backHref}
        className="mb-6 inline-block text-[0.78rem] uppercase tracking-[0.1em] text-river no-underline transition-colors duration-150 hover:text-text"
      >
        ← {backLabel}
      </Link>

      {/* <Eyebrow> es inline-flex: sin este envoltorio de bloque se coloca en
          la misma línea que el enlace de vuelta, que es inline-block. */}
      {eyebrow ? (
        <div>
          <Eyebrow>{eyebrow}</Eyebrow>
        </div>
      ) : null}

      {numeral ? (
        <p aria-hidden className="mt-4 font-display text-[2rem] font-black leading-none text-bg3">
          {numeral}
        </p>
      ) : null}

      <h1 className="mt-4 font-display text-page font-black text-text text-pretty">
        {title}
      </h1>

      {subtitle ? (
        <p className="mt-4 text-[1.05rem] font-light leading-[1.6] text-text-2">{subtitle}</p>
      ) : null}

      {meta ? (
        <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-[0.78rem] text-text-2">
          {meta}
        </div>
      ) : null}

      {coverUrl !== undefined ? (
        <CoverArt
          src={coverUrl}
          alt={coverAlt}
          priority
          variant="contour"
          treatment={coverTreatment}
          sizes="(max-width: 768px) 100vw, 768px"
          className="mt-10 aspect-video w-full overflow-hidden rounded-lg"
        />
      ) : null}

      {notice ? (
        <div className="mt-6 rounded-field border border-stone/30 bg-stone/[0.07] px-4 py-3 text-[0.85rem] leading-[1.6] text-text-2">
          {notice}
        </div>
      ) : null}

      <div className="mt-10">{children}</div>

      {aside ? <section className="mt-12 border-t border-bg3 pt-10">{aside}</section> : null}
      {footer}
    </main>
  );
}

// Bloque de prosa del sistema. Sustituye a la cadena larga de [&_h2]:… que
// hoy está copiada en cuatro páginas de detalle.
export function Prose({ html, text }: { html?: string; text?: string | null }) {
  const cls =
    "max-w-none text-[1rem] leading-[1.75] text-text-2 " +
    "[&_a]:text-river [&_a:hover]:text-text " +
    "[&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:font-display [&_h2]:text-[1.5rem] [&_h2]:font-bold [&_h2]:text-text " +
    "[&_h3]:mt-8 [&_h3]:mb-2 [&_h3]:font-display [&_h3]:text-[1.2rem] [&_h3]:font-semibold [&_h3]:text-text " +
    "[&_p]:mb-4 [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:mb-4 [&_ol]:list-decimal [&_ol]:pl-6 " +
    "[&_blockquote]:my-6 [&_blockquote]:border-l-2 [&_blockquote]:border-river [&_blockquote]:pl-5 [&_blockquote]:font-display " +
    "[&_blockquote]:text-[1.15rem] [&_blockquote]:italic [&_blockquote]:text-text " +
    // Tablas. Cada una va envuelta por renderMarkdown en .vv-scroll-x, que es
    // lo único que se desplaza en horizontal: la página nunca.
    "[&_.vv-scroll-x]:my-6 [&_.vv-scroll-x]:overflow-x-auto " +
    "[&_table]:w-full [&_table]:min-w-[34rem] [&_table]:border-collapse [&_table]:text-[0.86rem] " +
    "[&_thead]:border-b-2 [&_thead]:border-text " +
    "[&_th]:py-2.5 [&_th]:pr-5 [&_th]:text-left [&_th]:align-bottom [&_th]:text-[0.68rem] " +
    "[&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-[0.14em] [&_th]:text-text-2 " +
    "[&_td]:border-b [&_td]:border-bg3 [&_td]:py-2.5 [&_td]:pr-5 [&_td]:align-top [&_td]:leading-[1.55] " +
    "[&_th:last-child]:pr-0 [&_td:last-child]:pr-0 " +
    "[&_code]:rounded [&_code]:bg-bg2 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[0.92em]";

  if (html) return <article className={cls} dangerouslySetInnerHTML={{ __html: html }} />;
  return <article className={`${cls} whitespace-pre-wrap`}>{text}</article>;
}
