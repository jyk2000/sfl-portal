/**
 * Session token primitives — pure crypto, no cookies, no `next/headers`.
 *
 * `proxy.ts` runs before the request context exists, so it must be able to
 * verify a token without importing the cookie helpers. `lib/session.ts` layers
 * the cookie API on top of this module.
 */
import { SignJWT, jwtVerify } from "jose";

import { getSessionSecret, getSessionTtlHours } from "@/lib/env";

export const SESSION_COOKIE = "sfl_session";

export interface SessionPayload {
  /** web_users.id */
  uid: number;
  role: string;
  /** Token version; bumped to invalidate existing sessions. */
  ver: number;
}

function secretKey(): Uint8Array {
  return new TextEncoder().encode(getSessionSecret());
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ role: payload.role, ver: payload.ver })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(payload.uid))
    .setIssuedAt()
    .setExpirationTime(`${getSessionTtlHours()}h`)
    .sign(secretKey());
}

/**
 * Verifies signature and expiry only. This is deliberately *optimistic*: the
 * caller must still confirm the user is active and `ver` still matches (see
 * `lib/dal.ts`).
 */
export async function verifySessionToken(
  token: string | undefined | null,
): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      algorithms: ["HS256"],
    });
    const uid = Number(payload.sub);
    if (!Number.isFinite(uid)) return null;
    return {
      uid,
      role: typeof payload.role === "string" ? payload.role : "",
      ver: Number(payload.ver ?? 0),
    };
  } catch {
    return null;
  }
}
