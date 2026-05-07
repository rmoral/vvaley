import type { SocialAccount, SocialProvider as Provider } from "@prisma/client";

export type ConnectedAccount = {
  externalId: string;
  displayName: string;
  avatarUrl: string | null;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
  scope: string | null;
};

export type PublishInput = {
  body: string;
  /** Public URLs to images (the provider fetches them). */
  mediaUrls: string[];
  /** Optional permalink that goes after the body for context. */
  sourceUrl: string | null;
};

export type PublishResult =
  | { ok: true; externalId: string; externalUrl: string | null }
  | { ok: false; error: string };

export interface SocialProviderImpl {
  readonly id: Provider;
  /** Build the URL the editor should be redirected to to start OAuth. */
  buildAuthorizationUrl(args: { state: string; redirectUri: string }): string;
  /** Exchange the code we receive on the callback for tokens + profile. */
  exchangeCode(args: {
    code: string;
    redirectUri: string;
  }): Promise<ConnectedAccount>;
  /** Optional: refresh the token before publish if expired. */
  refreshAccessToken?(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresAt: Date | null;
  }>;
  /** Push the post to the provider. */
  publish(account: SocialAccount, input: PublishInput): Promise<PublishResult>;
  /** Whether this provider is wired in this build. Skip from the UI otherwise. */
  readonly isAvailable: boolean;
}
