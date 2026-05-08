import type { SocialAccount } from "@prisma/client";
import type {
  AuthorizationStart,
  ConnectedAccount,
  PublishInput,
  PublishResult,
  SocialProviderImpl,
} from "./types";
import { generatePkce } from "./pkce";

const AUTHORIZE_URL = "https://www.tiktok.com/v2/auth/authorize/";
const TOKEN_URL = "https://open.tiktokapis.com/v2/oauth/token/";
const USERINFO_URL =
  "https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name";
const PUBLISH_INIT_URL =
  "https://open.tiktokapis.com/v2/post/publish/video/init/";

const SCOPES = ["user.info.basic", "video.publish"];

const clientKey = () => process.env.TIKTOK_CLIENT_KEY;
const clientSecret = () => process.env.TIKTOK_CLIENT_SECRET;

export const tiktokProvider: SocialProviderImpl = {
  id: "TIKTOK",
  get isAvailable() {
    return Boolean(clientKey() && clientSecret());
  },

  buildAuthorizationUrl({ state, redirectUri }): AuthorizationStart {
    const ck = clientKey();
    if (!ck) throw new Error("TIKTOK_CLIENT_KEY not configured");
    const { verifier, challenge } = generatePkce();
    const params = new URLSearchParams({
      client_key: ck,
      response_type: "code",
      scope: SCOPES.join(","),
      redirect_uri: redirectUri,
      state,
      code_challenge: challenge,
      code_challenge_method: "S256",
    });
    return {
      url: `${AUTHORIZE_URL}?${params.toString()}`,
      extras: { codeVerifier: verifier },
    };
  },

  async exchangeCode({ code, redirectUri, extras }): Promise<ConnectedAccount> {
    const ck = clientKey();
    const cs = clientSecret();
    if (!ck || !cs) throw new Error("TikTok credentials missing");
    const verifier = extras?.codeVerifier;
    if (!verifier) throw new Error("TikTok PKCE verifier missing");

    const tokRes = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Cache-Control": "no-cache",
      },
      body: new URLSearchParams({
        client_key: ck,
        client_secret: cs,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
        code_verifier: verifier,
      }),
    });
    if (!tokRes.ok) {
      throw new Error(
        `TikTok token exchange failed: ${tokRes.status} ${await tokRes.text()}`,
      );
    }
    const tok = (await tokRes.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
      open_id: string;
      scope?: string;
    };

    const userRes = await fetch(USERINFO_URL, {
      headers: { Authorization: `Bearer ${tok.access_token}` },
    });
    const user = userRes.ok
      ? ((await userRes.json()) as {
          data?: {
            user?: {
              open_id?: string;
              union_id?: string;
              avatar_url?: string;
              display_name?: string;
            };
          };
        })
      : null;
    const u = user?.data?.user;

    return {
      externalId: tok.open_id,
      displayName: u?.display_name ?? "TikTok",
      avatarUrl: u?.avatar_url ?? null,
      accessToken: tok.access_token,
      refreshToken: tok.refresh_token ?? null,
      expiresAt: new Date(Date.now() + tok.expires_in * 1000),
      scope: tok.scope ?? SCOPES.join(","),
    };
  },

  async refreshAccessToken(refreshToken) {
    const ck = clientKey();
    const cs = clientSecret();
    if (!ck || !cs) throw new Error("TikTok credentials missing");

    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Cache-Control": "no-cache",
      },
      body: new URLSearchParams({
        client_key: ck,
        client_secret: cs,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });
    if (!res.ok) {
      throw new Error(
        `TikTok refresh failed: ${res.status} ${await res.text()}`,
      );
    }
    const tok = (await res.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
    };
    return {
      accessToken: tok.access_token,
      refreshToken: tok.refresh_token,
      expiresAt: new Date(Date.now() + tok.expires_in * 1000),
    };
  },

  async publish(account: SocialAccount, input: PublishInput): Promise<PublishResult> {
    try {
      if (input.mediaUrls.length === 0) {
        return {
          ok: false,
          error: "TikTok requiere un vídeo (mp4) accesible por URL pública.",
        };
      }
      const videoUrl = input.mediaUrls[0];
      const title = [input.body, input.sourceUrl ?? ""]
        .filter(Boolean)
        .join("\n\n")
        .slice(0, 2200);

      const res = await fetch(PUBLISH_INIT_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${account.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          post_info: {
            title,
            privacy_level: "PUBLIC_TO_EVERYONE",
            disable_duet: false,
            disable_comment: false,
            disable_stitch: false,
            video_cover_timestamp_ms: 1000,
          },
          source_info: {
            source: "PULL_FROM_URL",
            video_url: videoUrl,
          },
        }),
      });
      if (!res.ok) {
        const body = await res.text();
        return {
          ok: false,
          error: `TikTok ${res.status}: ${body.slice(0, 400)}`,
        };
      }
      const data = (await res.json()) as {
        data?: { publish_id?: string };
        error?: { code?: string; message?: string };
      };
      if (data.error && data.error.code && data.error.code !== "ok") {
        return {
          ok: false,
          error: `TikTok ${data.error.code}: ${data.error.message ?? "(sin mensaje)"}`,
        };
      }
      if (!data.data?.publish_id) {
        return { ok: false, error: "TikTok respondió sin publish_id" };
      }

      // The PULL_FROM_URL ingest happens async on TikTok's side; the
      // publish_id is enough to consider the submission accepted. The
      // editor can confirm the final state in the TikTok app. A status
      // poller against /v2/post/publish/status/fetch could be added in
      // a follow-up worker if we need stricter accounting here.
      return {
        ok: true,
        externalId: data.data.publish_id,
        externalUrl: null,
      };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "unknown" };
    }
  },
};
