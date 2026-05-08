import Script from "next/script";

// Lightweight, privacy-friendly analytics. Render only when one of the
// providers is configured. Both expose pageviews — set the relevant env
// pair and that script ships; otherwise nothing renders.
//
// Plausible: PLAUSIBLE_DOMAIN required; PLAUSIBLE_SCRIPT_URL optional
// (defaults to the hosted script). Use the script URL to point at a
// self-hosted Plausible instance.
//
// Umami: UMAMI_WEBSITE_ID + UMAMI_SCRIPT_URL both required (Umami is
// always self-hosted/cloud-specific).
export function Analytics() {
  const plausibleDomain = process.env.PLAUSIBLE_DOMAIN;
  const plausibleSrc =
    process.env.PLAUSIBLE_SCRIPT_URL || "https://plausible.io/js/script.js";

  if (plausibleDomain) {
    return (
      <Script
        defer
        data-domain={plausibleDomain}
        src={plausibleSrc}
        strategy="afterInteractive"
      />
    );
  }

  const umamiId = process.env.UMAMI_WEBSITE_ID;
  const umamiSrc = process.env.UMAMI_SCRIPT_URL;
  if (umamiId && umamiSrc) {
    return (
      <Script
        defer
        data-website-id={umamiId}
        src={umamiSrc}
        strategy="afterInteractive"
      />
    );
  }

  return null;
}
