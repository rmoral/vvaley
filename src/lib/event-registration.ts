import type { Event } from "@prisma/client";

export type RegistrationGate =
  | { open: true }
  | {
      open: false;
      reason: "not_open_yet" | "closed" | "event_passed" | "not_published";
    };

export function registrationGate(
  event: Pick<
    Event,
    "status" | "registrationOpensAt" | "registrationClosesAt" | "startsAt"
  >,
  now: Date = new Date(),
): RegistrationGate {
  if (event.status !== "PUBLISHED") {
    return { open: false, reason: "not_published" };
  }
  if (event.startsAt.getTime() < now.getTime()) {
    return { open: false, reason: "event_passed" };
  }
  if (event.registrationOpensAt && event.registrationOpensAt > now) {
    return { open: false, reason: "not_open_yet" };
  }
  if (event.registrationClosesAt && event.registrationClosesAt < now) {
    return { open: false, reason: "closed" };
  }
  return { open: true };
}
