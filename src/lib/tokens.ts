import { randomBytes } from "node:crypto";

export function randomToken(byteLen = 24): string {
  return randomBytes(byteLen).toString("base64url");
}
