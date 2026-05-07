// Inject Schema.org structured data so Google can pick up rich
// results (podcast cards, articles, events, etc.). Each detail page
// composes its own object and passes it here.
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // The object is built server-side from trusted data; JSON.stringify
      // is sufficient. We HTML-escape `<` defensively to avoid breaking
      // the surrounding script tag if a user typed it in a description.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
