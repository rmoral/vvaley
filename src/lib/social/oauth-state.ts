import { cookies } from "next/headers";
import { randomToken } from "@/lib/tokens";
import { getSiteUrl } from "@/lib/site-url";
import type { SocialProvider as Provider } from "@prisma/client";

const STATE_COOKIE = "vv_social_oauth_state";
const TTL_SECONDS = 600; // 10 min — plenty for the provider redirect dance

type StatePayload = {
  provider: Provider;
  /** Random nonce; the value of `state` we send to the provider. */
  nonce: string;
  /** Where to send the editor after the callback succeeds. */
  returnTo: string;
};

export async function setOAuthState(payload: StatePayload): Promise<string> {
  const cookieStore = await cookies();
  const value = JSON.stringify(payload);
  cookieStore.set(STATE_COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: getSiteUrl().startsWith("https://"),
    maxAge: TTL_SECONDS,
    path: "/",
  });
  return payload.nonce;
}

export async function consumeOAuthState(): Promise<StatePayload | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(STATE_COOKIE)?.value;
  cookieStore.delete(STATE_COOKIE);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StatePayload;
  } catch {
    return null;
  }
}

export function newNonce() {
  return randomToken(24);
}

export function callbackUrl(provider: Provider): string {
  return `${getSiteUrl()}/api/social/${provider.toLowerCase()}/callback`;
}
