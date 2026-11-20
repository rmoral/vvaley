"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { SHARE_NETWORKS, shareLinks, withUtm, type ShareNetwork } from "@/lib/event-presenters";

declare global {
  interface Window {
    plausible?: (event: string, options?: { props?: Record<string, string> }) => void;
  }
}

const LABEL: Record<ShareNetwork, string> = {
  whatsapp: "WhatsApp",
  linkedin: "LinkedIn",
  x: "X",
  facebook: "Facebook",
  telegram: "Telegram",
  email: "Email",
};

const button =
  "inline-flex h-10 items-center justify-center rounded-md border border-bg3 bg-white px-4 text-[0.82rem] font-semibold text-text-2 no-underline transition-colors hover:border-river hover:text-river";

/**
 * Botones para compartir el evento. Cada red lleva su UTM (Plausible separa
 * lo que llega de cada una) y cada clic se cuenta como evento «Compartir».
 * En móvil aparece además el menú nativo de compartir, que incluye
 * Instagram y cualquier app instalada.
 */
export function ShareEvent({ url, text, campaign }: { url: string; text: string; campaign: string }) {
  const t = useTranslations("eventDetail");
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const links = shareLinks(url, text, campaign);

  useEffect(() => setCanShare(typeof navigator !== "undefined" && "share" in navigator), []);

  const track = (network: string) =>
    window.plausible?.("Compartir", { props: { red: network, evento: campaign } });

  async function nativeShare() {
    track("nativo");
    try {
      await navigator.share({ title: text, text, url: withUtm(url, "nativo", campaign) });
    } catch {
      // La persona cerró el menú: no hay nada que hacer.
    }
  }

  async function copy() {
    track("copiar");
    try {
      await navigator.clipboard.writeText(withUtm(url, "copiar", campaign));
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt(t("share_copy"), url);
    }
  }

  return (
    <section aria-labelledby="compartir-title" className="mt-14 rounded-lg border border-bg3 bg-bg2 px-5 py-6">
      <h2 id="compartir-title" className="font-display text-[1.25rem] font-bold text-text">
        {t("share_title")}
      </h2>
      <p className="mt-1 text-[0.9rem] leading-[1.6] text-text-2">{t("share_lead")}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {canShare && (
          <button type="button" onClick={nativeShare} className={`${button} border-river text-river`}>
            {t("share_native")}
          </button>
        )}
        {SHARE_NETWORKS.map((network) => (
          <a
            key={network}
            href={links[network]}
            target={network === "email" ? undefined : "_blank"}
            rel="noopener noreferrer"
            onClick={() => track(network)}
            className={button}
          >
            {network === "email" ? t("share_email") : LABEL[network]}
          </a>
        ))}
        <button type="button" onClick={copy} className={button} aria-live="polite">
          {copied ? t("share_copied") : t("share_copy")}
        </button>
      </div>
    </section>
  );
}
