import type { SocialAccount } from "@prisma/client";
import type {
  AuthorizationStart,
  ConnectedAccount,
  PublishInput,
  PublishResult,
  SocialProviderImpl,
} from "./types";
import { generatePkce } from "./pkce";

const AUTHORIZE_URL = "https://twitter.com/i/oauth2/authorize";
const TOKEN_URL = "https://api.twitter.com/2/oauth2/token";
const ME_URL =
  "https://api.twitter.com/2/users/me?user.fields=profile_image_url,username,name";
const TWEET_URL = "https://api.twitter.com/2/tweets";

const SCOPES = ["tweet.read", "tweet.write", "users.read", "offline.access"];

const clientId = () => process.env.X_CLIENT_ID;
const clientSecret = () => process.env.X_CLIENT_SECRET;

function basicAuth(): string {
  const cid = clientId();
  const cs = clientSecret();
  if (!cid || !cs) throw new Error("X credentials missing");
  return "Basic " + Buffer.from(`${cid}:${cs}`).toString("base64");
}

export const xProvider: SocialProviderImpl = {
  id: "X",
  get isAvailable() {
    return Boolean(clientId() && clientSecret());
  },

  buildAuthorizationUrl({ state, redirectUri }): AuthorizationStart {
    const cid = clientId();
    if (!cid) throw new Error("X_CLIENT_ID not configured");
    const { verifier, challenge } = generatePkce();
    const params = new URLSearchParams({
      response_type: "code",
      client_id: cid,
      redirect_uri: redirectUri,
      state,
      scope: SCOPES.join(" "),
      code_challenge: challenge,
      code_challenge_method: "S256",
    });
    return {
      url: `${AUTHORIZE_URL}?${params.toString()}`,
      extras: { codeVerifier: verifier },
    };
  },

  async exchangeCode({ code, redirectUri, extras }): Promise<ConnectedAccount> {
    const verifier = extras?.codeVerifier;
    if (!verifier) throw new Error("X PKCE verifier missing");

    const tokenRes = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: basicAuth(),
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        code_verifier: verifier,
      }),
    });
    if (!tokenRes.ok) {
      throw new Error(
        `X token exchange failed: ${tokenRes.status} ${await tokenRes.text()}`,
      );
    }
    const token = (await tokenRes.json()) as {
      token_type: string;
      access_token: string;
      refresh_token?: string;
      expires_in: number;
      scope?: string;
    };

    const meRes = await fetch(ME_URL, {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });
    if (!meRes.ok) {
      throw new Error(
        `X /users/me failed: ${meRes.status} ${await meRes.text()}`,
      );
    }
    const me = (await meRes.json()) as {
      data: {
        id: string;
        name: string;
        username: string;
        profile_image_url?: string;
      };
    };

    return {
      externalId: me.data.id,
      displayName: `@${me.data.username}`,
      avatarUrl: me.data.profile_image_url ?? null,
      accessToken: token.access_token,
      refreshToken: token.refresh_token ?? null,
      expiresAt: new Date(Date.now() + token.expires_in * 1000),
      scope: token.scope ?? SCOPES.join(" "),
    };
  },

  async refreshAccessToken(refreshToken) {
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: basicAuth(),
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });
    if (!res.ok) {
      throw new Error(`X refresh failed: ${res.status} ${await res.text()}`);
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
      // X v2 caps at 280 chars and counts t.co URLs as ~23 regardless of
      // the original length. Append the source URL only if there's room.
      const URL_BUDGET = 24;
      const baseText = input.body.trim();
      let text = baseText;
      if (input.sourceUrl && baseText.length + 2 + URL_BUDGET <= 280) {
        text = `${baseText}\n\n${input.sourceUrl}`;
      }
      if (text.length > 280) text = `${text.slice(0, 277)}...`;

      // Media on the v2 endpoint requires media_ids uploaded via v1.1
      // (OAuth 1.0a), which isn't worth the surface area for the typical
      // text-link teaser we use this for. We post text only and ignore
      // mediaUrls — editors who need an image use LinkedIn / IG.
      const res = await fetch(TWEET_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${account.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) {
        const body = await res.text();
        return {
          ok: false,
          error: `X ${res.status}: ${body.slice(0, 400)}`,
        };
      }
      const data = (await res.json()) as { data: { id: string; text: string } };
      const tweetId = data.data.id;
      const username = account.displayName.replace(/^@/, "");
      return {
        ok: true,
        externalId: tweetId,
        externalUrl: `https://x.com/${username}/status/${tweetId}`,
      };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "unknown" };
    }
  },
};
