import type { SocialProvider as Provider } from "@prisma/client";
import { linkedinProvider } from "./linkedin";
import { xProvider } from "./x";
import { instagramProvider } from "./instagram";
import { tiktokProvider } from "./tiktok";
import type { SocialProviderImpl } from "./types";

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
