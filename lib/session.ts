import { cookies } from "next/headers";

import { getSessionTtlHours } from "@/lib/env";
import {
  SESSION_COOKIE,
  signSession,
  verifySessionToken,
  type SessionPayload,
} from "@/lib/session-token";

export { SESSION_COOKIE, signSession, verifySessionToken };
export type { SessionPayload };

export async function readSessionToken(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value;
}

export async function setSessionCookie(payload: SessionPayload): Promise<void> {
  const ttlHours = getSessionTtlHours();
  const token = await signSession(payload);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(Date.now() + ttlHours * 60 * 60 * 1000),
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
