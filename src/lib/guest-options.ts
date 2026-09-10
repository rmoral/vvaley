import { prisma } from "@/lib/prisma";

/**
 * Invitados que pueden asignarse a una edición, para el desplegable del
 * back-office.
 *
 * Se listan todos, no solo los públicos: al programar una edición el invitado
 * suele estar todavía en estado PROPOSED, y filtrar por isPublic dejaría el
 * desplegable vacío justo cuando hace falta. Lo que decide si se enseña en la
 * web es la propia ficha del invitado, no esta lista.
 */
export function guestOptions() {
  return prisma.guest.findMany({
    select: { id: true, fullName: true, company: true },
    orderBy: { fullName: "asc" },
  });
}
