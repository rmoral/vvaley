import { prisma } from "@/lib/prisma";
import { getSiteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

const escape = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

function durationFmt(seconds: number | null | undefined): string | null {
  if (!seconds || seconds <= 0) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

export async function GET() {
  const base = getSiteUrl();
  const channelLink = `${base}/es/podcast`;
  const feedSelf = `${base}/feed.xml`;

  const episodes = await prisma.episode.findMany({
    where: { status: "PUBLISHED", publishedAt: { not: null } },
    orderBy: { publishedAt: "desc" },
    take: 100,
    include: { guests: { include: { guest: true } } },
  });

  const lastBuild = (
    episodes[0]?.publishedAt ?? new Date()
  ).toUTCString();

  const items = episodes
    .map((ep) => {
      const url = `${base}/es/podcast/${ep.slug}`;
      const pubDate = ep.publishedAt!.toUTCString();
      const guestNames = ep.guests
        .filter(({ guest }) => guest.isPublic)
        .map(({ guest }) => guest.fullName)
        .join(", ");
      const duration = durationFmt(ep.durationSec);
      const enclosure = ep.audioUrl
        ? `<enclosure url="${escape(ep.audioUrl)}" type="audio/mpeg" length="0" />`
        : "";
      const summary = ep.summary ?? "";
      const description = [summary, guestNames && `Invitados: ${guestNames}`]
        .filter(Boolean)
        .join("\n\n");

      return `    <item>
      <title>${escape(ep.title)}</title>
      <link>${escape(url)}</link>
      <guid isPermaLink="true">${escape(url)}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${escape(description)}</description>
      <itunes:summary>${escape(summary)}</itunes:summary>
      ${duration ? `<itunes:duration>${duration}</itunes:duration>` : ""}
      ${ep.coverImageUrl ? `<itunes:image href="${escape(ep.coverImageUrl)}" />` : ""}
      ${enclosure}
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
     xmlns:atom="http://www.w3.org/2005/Atom"
     xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">
  <channel>
    <title>Valira Valley</title>
    <link>${escape(channelLink)}</link>
    <atom:link href="${escape(feedSelf)}" rel="self" type="application/rss+xml" />
    <description>El podcast sobre empresa, economía, emprendimiento y tecnología desde Andorra.</description>
    <language>es</language>
    <lastBuildDate>${lastBuild}</lastBuildDate>
    <itunes:author>Valira Valley</itunes:author>
    <itunes:summary>El podcast sobre empresa, economía, emprendimiento y tecnología desde Andorra.</itunes:summary>
    <itunes:explicit>false</itunes:explicit>
    <itunes:category text="Business" />
    <itunes:category text="Technology" />
    <itunes:owner>
      <itunes:name>Valira Valley</itunes:name>
      <itunes:email>${escape(process.env.EMAIL_FROM?.match(/<([^>]+)>/)?.[1] ?? "noreply@valiravalley.com")}</itunes:email>
    </itunes:owner>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=300",
    },
  });
}
