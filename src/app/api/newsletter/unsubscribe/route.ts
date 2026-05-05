import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSiteUrl } from "@/lib/site-url";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") ?? "";

  if (!token) {
    return NextResponse.redirect(
      `${getSiteUrl()}/newsletter/error?reason=missing_token`,
      302,
    );
  }

  const subscriber = await prisma.newsletterSubscriber.findUnique({
    where: { confirmToken: token },
  });

  if (!subscriber) {
    return NextResponse.redirect(
      `${getSiteUrl()}/newsletter/error?reason=invalid_token`,
      302,
    );
  }

  await prisma.newsletterSubscriber.update({
    where: { id: subscriber.id },
    data: {
      status: "UNSUBSCRIBED",
      unsubscribedAt: new Date(),
    },
  });

  const localePrefix = subscriber.locale === "es" ? "" : `/${subscriber.locale}`;
  return NextResponse.redirect(
    `${getSiteUrl()}${localePrefix}/newsletter/baja`,
    302,
  );
}
