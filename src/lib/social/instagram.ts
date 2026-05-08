import type { SocialAccount } from "@prisma/client";
import type {
  AuthorizationStart,
  ConnectedAccount,
  PublishInput,
  PublishResult,
  SocialProviderImpl,
} from "./types";

const AUTHORIZE_URL = "https://www.facebook.com/v19.0/dialog/oauth";
const TOKEN_URL = "https://graph.facebook.com/v19.0/oauth/access_token";
const ACCOUNTS_URL = "https://graph.facebook.com/v19.0/me/accounts";
const GRAPH = "https://graph.facebook.com/v19.0";

/**
 * Permissions — all four require Meta App Review before they work for
 * accounts other than the dev's. `instagram_content_publish` is the
 * one that lets us post; the others are needed to discover the IG
 * Business account behind the editor's Facebook Page.
 */
const SCOPES = [
  "pages_show_list",
  "pages_read_engagement",
  "instagram_basic",
  "instagram_content_publish",
];

const clientId = () => process.env.META_APP_ID;
const clientSecret = () => process.env.META_APP_SECRET;

export const instagramProvider: SocialProviderImpl = {
  id: "INSTAGRAM",
  get isAvailable() {
    return Boolean(clientId() && clientSecret());
  },

  buildAuthorizationUrl({ state, redirectUri }): AuthorizationStart {
    const cid = clientId();
    if (!cid) throw new Error("META_APP_ID not configured");
    const params = new URLSearchParams({
      client_id: cid,
      redirect_uri: redirectUri,
      state,
      scope: SCOPES.join(","),
      response_type: "code",
    });
    return { url: `${AUTHORIZE_URL}?${params.toString()}` };
  },

  async exchangeCode({ code, redirectUri }): Promise<ConnectedAccount> {
    const cid = clientId();
    const cs = clientSecret();
    if (!cid || !cs) throw new Error("Meta credentials missing");

    // 1) Short-lived user token from the auth code.
    const shortRes = await fetch(
      `${TOKEN_URL}?` +
        new URLSearchParams({
          client_id: cid,
          client_secret: cs,
          redirect_uri: redirectUri,
          code,
        }),
    );
    if (!shortRes.ok) {
      throw new Error(
        `Meta token exchange failed: ${shortRes.status} ${await shortRes.text()}`,
      );
    }
    const short = (await shortRes.json()) as {
      access_token: string;
      expires_in?: number;
    };

    // 2) Trade for a long-lived user token (~60 days).
    const longRes = await fetch(
      `${TOKEN_URL}?` +
        new URLSearchParams({
          grant_type: "fb_exchange_token",
          client_id: cid,
          client_secret: cs,
          fb_exchange_token: short.access_token,
        }),
    );
    const longTok = longRes.ok
      ? ((await longRes.json()) as {
          access_token: string;
          expires_in?: number;
        })
      : { access_token: short.access_token, expires_in: short.expires_in };

    // 3) List the user's pages and pick the first one that has an IG
    //    Business account attached. Page tokens (returned here) are the
    //    credentials we actually need to publish — user tokens cannot
    //    POST to /{ig-user-id}/media on their own.
    const pagesRes = await fetch(
      `${ACCOUNTS_URL}?fields=id,name,access_token,instagram_business_account&access_token=${encodeURIComponent(
        longTok.access_token,
      )}`,
    );
    if (!pagesRes.ok) {
      throw new Error(
        `Meta /me/accounts failed: ${pagesRes.status} ${await pagesRes.text()}`,
      );
    }
    const pages = (await pagesRes.json()) as {
      data: Array<{
        id: string;
        name: string;
        access_token: string;
        instagram_business_account?: { id: string };
      }>;
    };
    const linked = pages.data.find((p) => p.instagram_business_account);
    if (!linked || !linked.instagram_business_account) {
      throw new Error(
        "No hay cuenta de Instagram Business vinculada a esta cuenta de Facebook.",
      );
    }
    const igUserId = linked.instagram_business_account.id;
    const pageToken = linked.access_token;

    // 4) Pull the IG profile so we have a friendly display name + avatar.
    const profRes = await fetch(
      `${GRAPH}/${igUserId}?fields=username,profile_picture_url&access_token=${encodeURIComponent(
        pageToken,
      )}`,
    );
    const prof = profRes.ok
      ? ((await profRes.json()) as {
          username?: string;
          profile_picture_url?: string;
        })
      : {};

    return {
      externalId: igUserId,
      displayName: prof.username ? `@${prof.username}` : linked.name,
      avatarUrl: prof.profile_picture_url ?? null,
      // Page tokens stay valid as long as the user token remains valid;
      // we keep expiresAt for visibility but Meta typically reports null.
      accessToken: pageToken,
      refreshToken: null,
      expiresAt: longTok.expires_in
        ? new Date(Date.now() + longTok.expires_in * 1000)
        : null,
      scope: SCOPES.join(","),
    };
  },

  async publish(account: SocialAccount, input: PublishInput): Promise<PublishResult> {
    try {
      if (input.mediaUrls.length === 0) {
        return {
          ok: false,
          error: "Instagram requiere al menos una imagen accesible por URL.",
        };
      }
      const imageUrl = input.mediaUrls[0];
      const caption = [input.body, input.sourceUrl ?? ""]
        .filter(Boolean)
        .join("\n\n")
        .slice(0, 2200);

      // 1) Create a media container with the image + caption.
      const containerRes = await fetch(`${GRAPH}/${account.externalId}/media`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          image_url: imageUrl,
          caption,
          access_token: account.accessToken,
        }),
      });
      if (!containerRes.ok) {
        const body = await containerRes.text();
        return {
          ok: false,
          error: `IG container ${containerRes.status}: ${body.slice(0, 400)}`,
        };
      }
      const container = (await containerRes.json()) as { id: string };

      // 2) Publish the container.
      const pubRes = await fetch(
        `${GRAPH}/${account.externalId}/media_publish`,
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            creation_id: container.id,
            access_token: account.accessToken,
          }),
        },
      );
      if (!pubRes.ok) {
        const body = await pubRes.text();
        return {
          ok: false,
          error: `IG publish ${pubRes.status}: ${body.slice(0, 400)}`,
        };
      }
      const pub = (await pubRes.json()) as { id: string };

      // 3) Best-effort permalink lookup.
      const permRes = await fetch(
        `${GRAPH}/${pub.id}?fields=permalink&access_token=${encodeURIComponent(
          account.accessToken,
        )}`,
      );
      const perm = permRes.ok
        ? ((await permRes.json()) as { permalink?: string })
        : {};

      return {
        ok: true,
        externalId: pub.id,
        externalUrl: perm.permalink ?? null,
      };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "unknown" };
    }
  },
};
