import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { readSessionToken, verifySessionToken } from "@/lib/session";
import { getUserById, type UserRole, type WebUser } from "@/lib/users";

/**
 * Secure auth check. The cookie is verified for signature/expiry, then the user
 * is re-loaded and checked against the database, so deactivating an account or
 * bumping `token_version` immediately revokes a live session.
 *
 * `cache` memoises this per render pass, so many components can call it without
 * hammering the database.
 */
export const getCurrentUser = cache(async (): Promise<WebUser | null> => {
  const token = await readSessionToken();
  const payload = await verifySessionToken(token);
  if (!payload) return null;

  const user = await getUserById(payload.uid);
  if (!user) return null;
  if (!user.is_active) return null;
  if (user.token_version !== payload.ver) return null;

  return user;
});

/** Like `getCurrentUser`, but sends an unauthenticated visitor to /login. */
export const requireUser = cache(async (): Promise<WebUser> => {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
});

export async function requireRole(
  roles: readonly UserRole[],
): Promise<WebUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) {
    redirect("/?forbidden=1");
  }
  return user;
}

export function canEdit(user: WebUser): boolean {
  return user.role === "admin" || user.role === "dispatcher";
}
