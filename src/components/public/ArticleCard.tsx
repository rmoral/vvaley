import { Link } from "@/i18n/navigation";
import { CoverArt } from "./CoverArt";
import { TagChips } from "./TagChips";

// Server Component. Listado de /blog. Misma anatomía que EpisodeCard pero
// con autor y chips de etiqueta en lugar de invitados y duración.
// Sustituye la tarjeta inline de blog/page.tsx.

export function ArticleCard({
  post,
  locale,
  byLabel,
  priority = false,
}: {
  post: {
    slug: string;
    title: string;
    summary?: string | null;
    coverImageUrl?: string | null;
    publishedAt?: Date | null;
    authorName?: string | null;
    tags?: { slug: string; name: string }[];
  };
  locale: string;
  /** t("by") de blogList. */
  byLabel: string;
  priority?: boolean;
}) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="vv-reveal group flex h-full flex-col overflow-hidden rounded-lg border border-bg3 bg-white no-underline transition-all duration-250 ease-out-soft hover:-translate-y-1 hover:border-river-2 hover:shadow-lift"
    >
      <CoverArt
        src={post.coverImageUrl}
        alt=""
        priority={priority}
        variant="contour"
        className="aspect-video w-full"
      />

      <div className="flex flex-1 flex-col p-6">
        {post.publishedAt ? (
          <time
            dateTime={post.publishedAt.toISOString()}
            className="text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-river"
          >
            {new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(post.publishedAt)}
          </time>
        ) : null}

        <h2 className="mt-2.5 font-display text-[1.3rem] font-bold leading-tight text-text transition-colors duration-150 group-hover:text-river text-pretty">
          {post.title}
        </h2>

        {post.summary ? (
          <p className="mt-2 line-clamp-3 text-[0.9rem] leading-[1.6] text-text-2">
            {post.summary}
          </p>
        ) : null}

        {post.tags && post.tags.length > 0 ? (
          <div className="mt-3">
            <TagChips tags={post.tags} size="sm" linked={false} />
          </div>
        ) : null}

        {post.authorName ? (
          <p className="mt-auto pt-4 text-[0.74rem] uppercase tracking-[0.08em] text-text-2">
            {byLabel} {post.authorName}
          </p>
        ) : null}
      </div>
    </Link>
  );
}
