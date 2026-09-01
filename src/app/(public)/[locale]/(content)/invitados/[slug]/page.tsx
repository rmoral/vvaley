import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { GuestProfile } from "@/components/public/GuestProfile";
import { GuestSocialLinks } from "@/components/public/GuestSocialLinks";
import { Prose } from "@/components/public/DetailShell";
import { NewsletterInline } from "@/components/public/NewsletterInline";
import { JsonLd } from "@/components/public/JsonLd";
import { localizedUrls, ogLocale } from "@/lib/seo";
import type { AppLocale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const guest = await prisma.guest.findUnique({ where: { slug } });
  if (!guest || !guest.isPublic) return {};
  const urls = localizedUrls(`/invitados/${slug}`, locale as AppLocale);
  const description =
    guest.headline ??
    [guest.role, guest.company].filter(Boolean).join(" · ") ??
    undefined;
  return {
    title: guest.fullName,
    description,
    alternates: urls,
    openGraph: {
      type: "profile",
      url: urls.canonical,
      title: guest.fullName,
      description,
      images: guest.photoUrl ? [guest.photoUrl] : undefined,
      locale: ogLocale(locale as AppLocale),
    },
    twitter: {
      card: "summary",
      title: guest.fullName,
      description,
      images: guest.photoUrl ? [guest.photoUrl] : undefined,
    },
  };
}

export default async function GuestPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("guest");

  const guest = await prisma.guest.findUnique({
    where: { slug },
    include: {
      episodes: {
        include: { episode: true },
        orderBy: { episode: { publishedAt: "desc" } },
      },
    },
  });
  if (!guest || !guest.isPublic) notFound();

  const publishedEpisodes = guest.episodes.filter(
    (eg) => eg.episode.status === "PUBLISHED",
  );

  const url = localizedUrls(`/invitados/${slug}`, locale as AppLocale).canonical;
  const sameAs = [guest.website, guest.linkedin, guest.twitter, guest.instagram]
    .filter((v): v is string => Boolean(v));
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": url,
    url,
    name: guest.fullName,
    jobTitle: guest.role ?? undefined,
    description: guest.headline ?? guest.bio ?? undefined,
    image: guest.photoUrl ?? undefined,
    email: guest.email ?? undefined,
    worksFor: guest.company
      ? { "@type": "Organization", name: guest.company }
      : undefined,
    sameAs: sameAs.length > 0 ? sameAs : undefined,
  };

  // Esta página no usa <DetailShell>: la cabecera la compone <GuestProfile>,
  // que ya trae el h1 y el retrato. El resto de la cota (medida de lectura,
  // enlace de vuelta) se mantiene idéntico al del resto de detalles.
  return (
    <main className="mx-auto max-w-3xl px-6 pb-24 pt-32 md:px-16">
      <Link
        href="/invitados"
        className="mb-6 inline-block text-[0.78rem] uppercase tracking-[0.1em] text-river no-underline transition-colors duration-150 hover:text-text"
      >
        ← {t("back")}
      </Link>

      <GuestProfile guest={guest}>
        <GuestSocialLinks guest={guest} variant="compact" />
      </GuestProfile>

      {guest.bio ? (
        <div className="mt-10">
          <Prose text={guest.bio} />
        </div>
      ) : null}

      <section className="mt-12 border-t border-bg3 pt-10">
        <h2 className="mb-6 font-display text-sub font-bold text-text">
          {t("episodes")}
        </h2>
        {publishedEpisodes.length === 0 ? (
          <p className="text-[0.9rem] text-text-2">{t("noEpisodes")}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {publishedEpisodes.map(({ episode }) => (
              <li key={episode.id}>
                <Link
                  href={`/podcast/${episode.slug}`}
                  className="block rounded-lg border border-bg3 bg-white p-4 no-underline transition-all duration-250 ease-out-soft hover:-translate-y-0.5 hover:border-river-2 hover:shadow-lift"
                >
                  {episode.number !== null ? (
                    <p className="text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-text-2">
                      {String(episode.number).padStart(2, "0")}
                    </p>
                  ) : null}
                  <p className="mt-1 font-semibold text-text">{episode.title}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <NewsletterInline source={`guest:${guest.slug}`} />
      <JsonLd data={jsonLd} />
    </main>
  );
}
