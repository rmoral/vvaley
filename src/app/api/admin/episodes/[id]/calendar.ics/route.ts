import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { buildEpisodeIcs } from "@/lib/calendar-invites";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) return new Response("Unauthorized", { status: 401 });

  const { id } = await ctx.params;
  const episode = await prisma.episode.findUnique({
    where: { id },
    include: {
      guests: { orderBy: { position: "asc" }, include: { guest: true } },
    },
  });
  if (!episode) return new Response("Not found", { status: 404 });
  if (!episode.recordingAt) {
    return new Response("Episode has no recording date", { status: 400 });
  }

  const ics = buildEpisodeIcs(episode);
  const filename = `vvaley-${episode.slug}.ics`;

  return new Response(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
