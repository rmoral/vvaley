import { NextResponse } from "next/server";
import type { SocialProvider as Provider } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getProvider } from "@/lib/social/registry";
import { callbackUrl, consumeOAuthState } from "@/lib/social/oauth-state";

export const runtime = "nodejs";

const VALID: ReadonlySet<string> = new Set(["linkedin", "x", "instagram", "tiktok"]);

export async function GET(
  req: Request,
  ctx: { params: Promise<{ provider: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }

  const { provider: providerParam } = await ctx.params;
  if (!VALID.has(providerParam)) {
    return NextResponse.redirect(
      new URL("/admin/social?error=unknown_provider", req.url),
    );
  }
  const provider = providerParam.toUpperCase() as Provider;

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateParam = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  if (oauthError) {
    return NextResponse.redirect(
      new URL(`/admin/social?error=${encodeURIComponent(oauthError)}`, req.url),
    );
  }
  if (!code || !stateParam) {
    return NextResponse.redirect(
      new URL("/admin/social?error=missing_params", req.url),
    );
  }

  const state = await consumeOAuthState();
  if (!state || state.nonce !== stateParam || state.provider !== provider) {
    return NextResponse.redirect(
      new URL("/admin/social?error=state_mismatch", req.url),
    );
  }

  try {
    const impl = getProvider(provider);
    const account = await impl.exchangeCode({
      code,
      redirectUri: callbackUrl(provider),
    });

    await prisma.socialAccount.upsert({
      where: {
        provider_externalId: { provider, externalId: account.externalId },
      },
      update: {
        displayName: account.displayName,
        avatarUrl: account.avatarUrl,
        accessToken: account.accessToken,
        refreshToken: account.refreshToken,
        expiresAt: account.expiresAt,
        scope: account.scope,
        isActive: true,
      },
      create: {
        provider,
        externalId: account.externalId,
        displayName: account.displayName,
        avatarUrl: account.avatarUrl,
        accessToken: account.accessToken,
        refreshToken: account.refreshToken,
        expiresAt: account.expiresAt,
        scope: account.scope,
        connectedById: session.user.id,
      },
    });

    return NextResponse.redirect(new URL(state.returnTo, req.url));
  } catch (e) {
    const msg = e instanceof Error ? e.message : "exchange_failed";
    return NextResponse.redirect(
      new URL(`/admin/social?error=${encodeURIComponent(msg.slice(0, 200))}`, req.url),
    );
  }
}
