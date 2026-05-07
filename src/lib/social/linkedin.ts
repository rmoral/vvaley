import type { SocialAccount } from "@prisma/client";
import type {
  ConnectedAccount,
  PublishInput,
  PublishResult,
  SocialProviderImpl,
} from "./types";

const AUTHORIZE_URL = "https://www.linkedin.com/oauth/v2/authorization";
const TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken";
const USERINFO_URL = "https://api.linkedin.com/v2/userinfo";
const UGC_POSTS_URL = "https://api.linkedin.com/v2/ugcPosts";
const REGISTER_UPLOAD_URL =
  "https://api.linkedin.com/v2/assets?action=registerUpload";

/** Scopes for personal profile posting via OpenID Connect. */
const SCOPES = ["openid", "profile", "email", "w_member_social"];

const clientId = () => process.env.LINKEDIN_CLIENT_ID;
const clientSecret = () => process.env.LINKEDIN_CLIENT_SECRET;

export const linkedinProvider: SocialProviderImpl = {
  id: "LINKEDIN",
  get isAvailable() {
    return Boolean(clientId() && clientSecret());
  },

  buildAuthorizationUrl({ state, redirectUri }) {
    const cid = clientId();
    if (!cid) throw new Error("LINKEDIN_CLIENT_ID not configured");
    const params = new URLSearchParams({
      response_type: "code",
      client_id: cid,
      redirect_uri: redirectUri,
      state,
      scope: SCOPES.join(" "),
    });
    return `${AUTHORIZE_URL}?${params.toString()}`;
  },

  async exchangeCode({ code, redirectUri }): Promise<ConnectedAccount> {
    const cid = clientId();
    const cs = clientSecret();
    if (!cid || !cs) throw new Error("LinkedIn credentials missing");

    const tokenRes = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: cid,
        client_secret: cs,
      }),
    });
    if (!tokenRes.ok) {
      const body = await tokenRes.text();
      throw new Error(`LinkedIn token exchange failed: ${tokenRes.status} ${body}`);
    }
    const token = (await tokenRes.json()) as {
      access_token: string;
      expires_in: number;
      refresh_token?: string;
      refresh_token_expires_in?: number;
      scope?: string;
    };

    const userRes = await fetch(USERINFO_URL, {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });
    if (!userRes.ok) {
      const body = await userRes.text();
      throw new Error(`LinkedIn userinfo failed: ${userRes.status} ${body}`);
    }
    const user = (await userRes.json()) as {
      sub: string;
      name?: string;
      email?: string;
      picture?: string;
    };

    return {
      externalId: `urn:li:person:${user.sub}`,
      displayName: user.name ?? user.email ?? "LinkedIn",
      avatarUrl: user.picture ?? null,
      accessToken: token.access_token,
      refreshToken: token.refresh_token ?? null,
      expiresAt: new Date(Date.now() + token.expires_in * 1000),
      scope: token.scope ?? SCOPES.join(" "),
    };
  },

  async publish(account: SocialAccount, input: PublishInput): Promise<PublishResult> {
    try {
      const body = [input.body, input.sourceUrl ?? ""].filter(Boolean).join("\n\n");

      // If there are images, register + upload each, then attach as media.
      const media = await Promise.all(
        input.mediaUrls.map((url) => uploadImage(account, url)),
      );
      const validMedia = media.filter(
        (m): m is { asset: string; status: "READY" } => m !== null,
      );

      const payload: Record<string, unknown> = {
        author: account.externalId,
        lifecycleState: "PUBLISHED",
        specificContent: {
          "com.linkedin.ugc.ShareContent": {
            shareCommentary: { text: body },
            shareMediaCategory: validMedia.length > 0 ? "IMAGE" : "NONE",
            ...(validMedia.length > 0
              ? {
                  media: validMedia.map((m) => ({
                    status: "READY",
                    media: m.asset,
                  })),
                }
              : {}),
          },
        },
        visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
      };

      const res = await fetch(UGC_POSTS_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${account.accessToken}`,
          "Content-Type": "application/json",
          "X-Restli-Protocol-Version": "2.0.0",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.text();
        return { ok: false, error: `LinkedIn ${res.status}: ${body.slice(0, 400)}` };
      }
      // Either returns the URN in body, or in the x-restli-id header.
      const data = (await res.json().catch(() => ({}))) as { id?: string };
      const externalId = data.id ?? res.headers.get("x-restli-id") ?? "";
      const externalUrl = externalId
        ? `https://www.linkedin.com/feed/update/${encodeURIComponent(externalId)}`
        : null;
      return { ok: true, externalId, externalUrl };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "unknown" };
    }
  },
};

/**
 * LinkedIn requires a 2-step image upload:
 *  1. registerUpload → returns an asset URN + a one-time upload URL
 *  2. PUT the bytes to that URL
 * Returns the asset URN, or null if the upload failed (we still post the text).
 */
async function uploadImage(
  account: SocialAccount,
  imageUrl: string,
): Promise<{ asset: string; status: "READY" } | null> {
  try {
    const registerRes = await fetch(REGISTER_UPLOAD_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${account.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        registerUploadRequest: {
          recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
          owner: account.externalId,
          serviceRelationships: [
            {
              relationshipType: "OWNER",
              identifier: "urn:li:userGeneratedContent",
            },
          ],
        },
      }),
    });
    if (!registerRes.ok) return null;
    const reg = (await registerRes.json()) as {
      value: {
        asset: string;
        uploadMechanism: {
          "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest": {
            uploadUrl: string;
          };
        };
      };
    };
    const uploadUrl =
      reg.value.uploadMechanism[
        "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"
      ].uploadUrl;
    const asset = reg.value.asset;

    // Pull the source image bytes and PUT them into the upload URL.
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) return null;
    const buf = Buffer.from(await imgRes.arrayBuffer());
    const putRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${account.accessToken}`,
        "Content-Type": imgRes.headers.get("content-type") ?? "image/jpeg",
      },
      body: new Uint8Array(buf),
    });
    if (!putRes.ok) return null;
    return { asset, status: "READY" };
  } catch {
    return null;
  }
}
