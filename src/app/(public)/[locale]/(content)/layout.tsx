import { NewsletterStrip } from "@/components/public/NewsletterStrip";

// Wraps all "content" pages (home, podcast, blog, invitados) so they share
// the universal newsletter CTA strip just before the footer. Pages that
// don't make sense (newsletter/{confirmado,baja,error}) live outside this
// group and won't render the strip.
export default function ContentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <NewsletterStrip source="strip" />
    </>
  );
}
