import type { SocialProvider as Provider } from "@prisma/client";
import { linkedinProvider } from "./linkedin";
import { xProvider } from "./x";
import type { SocialProviderImpl } from "./types";

/**
 * Stub providers for the platforms we haven't wired yet. They show up in
 * the admin UI as "Próximamente" so editors know they exist; the
 * connect flow refuses until isAvailable becomes true (i.e., until
 * someone fills in the credentials and a real impl ships).
 */
function stubProvider(id: Provider): SocialProviderImpl {
  return {
    id,
    isAvailable: false,
    buildAuthorizationUrl() {
      throw new Error(`${id} not implemented yet`);
    },
    async exchangeCode() {
      throw new Error(`${id} not implemented yet`);
    },
    async publish() {
      return { ok: false, error: `${id} not implemented yet` };
    },
  };
}

const instagramProvider: SocialProviderImpl = stubProvider("INSTAGRAM");
const tiktokProvider: SocialProviderImpl = stubProvider("TIKTOK");

export const PROVIDERS: Record<Provider, SocialProviderImpl> = {
  LINKEDIN: linkedinProvider,
  X: xProvider,
  INSTAGRAM: instagramProvider,
  TIKTOK: tiktokProvider,
};

export const PROVIDER_LABELS: Record<Provider, string> = {
  LINKEDIN: "LinkedIn",
  X: "X (Twitter)",
  INSTAGRAM: "Instagram",
  TIKTOK: "TikTok",
};

export function getProvider(id: Provider): SocialProviderImpl {
  return PROVIDERS[id];
}
