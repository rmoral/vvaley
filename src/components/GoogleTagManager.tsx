// Google Tag Manager container for the whole site, following Google's
// standard install snippet. The App Router owns <head> (no literal script
// tags can be injected there), so the loader renders as the first element
// of <body> instead — a raw parse-time <script>, which executes at the
// same point a head script would, before any framework code.
const GTM_ID = "GTM-N6QMFX2H";

const GTM_SNIPPET = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');`;

export function GoogleTagManager() {
  return <script dangerouslySetInnerHTML={{ __html: GTM_SNIPPET }} />;
}

export function GoogleTagManagerNoScript() {
  return (
    <noscript>
      <iframe
        src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
        height="0"
        width="0"
        style={{ display: "none", visibility: "hidden" }}
        title="Google Tag Manager"
      />
    </noscript>
  );
}
