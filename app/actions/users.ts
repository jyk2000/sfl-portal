"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/dal";
import { hashPassword } from "@/lib/password";
import {
  USER_ROLES,
  createUser,
  countActiveAdmins,
  getUserById,
  isUserRole,
  setPasswordHash,
  setUserRole,
  setUserActive,
  type UserRole,
} from "@/lib/users";

export interface UserActionState {
  ok?: boolean;
  error?: string;
  message?: string;
}

const MIN_PASSWORD = 8;
const USERNAME_RE = /^[A-Za-z0-9._-]{3,32}$/;

/**
 * Admin-only gate for these actions. Unlike `requireRole`, this returns a
 * message instead of redirecting, so a rejected action reports itself in the
 * form rather than bouncing the page.
 */
async function requireAdminAction(): Promise<
  { ok: true } | { ok: false; state: UserActionState }
> {
  const actor = await getCurrentUser();
  if (!actor) return { ok: false, state: { error: "Your session has expired. Sign in again." } };
  if (actor.role !== "admin") {
    return { ok: false, state: { error: "Only an administrator can manage users." } };
  }
  return { ok: true };
}

function readText(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function readPassword(formData: FormData, name: string): string {
  const value = formData.get(name);
  // Never trim a password.
  return typeof value === "string" ? value : "";
}

export async function createUserAction(
  _prev: UserActionState,
  formData: FormData,
): Promise<UserActionState> {
  const gate = await requireAdminAction();
  if (!gate.ok) return gate.state;

  const username = readText(formData, "username");
  const displayName = readText(formData, "displayName");
  const role = readText(formData, "role");
  const password = readPassword(formData, "password");
  const confirm = readPassword(formData, "confirmPassword");

  if (!USERNAME_RE.test(username)) {
    return {
      error:
        "Username must be 3-32 characters, using letters, digits, dot, dash or underscore.",
    };
  }
  if (!isUserRole(role)) {
    return { error: `Pick a role (${USER_ROLES.join(", ")}).` };
  }
  if (password.length < MIN_PASSWORD) {
    return { error: `The password must be at least ${MIN_PASSWORD} characters.` };
  }
  if (password !== confirm) {
    return { error: "The two passwords do not match." };
  }

  try {
    await createUser({
      username,
      display_name: displayName || null,
      role,
      password_hash: await hashPassword(password),
    });
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === "ER_DUP_ENTRY") {
      return { error: `The username "${username}" is already taken.` };
    }
    return {
      error: error instanceof Error ? error.message : "Could not create the user.",
    };
  }

  revalidatePath("/admin/users");
  return { ok: true, message: `Created ${username} as ${role}.` };
}

/** Change another account's role or active flag. */
export async function updateUserAction(
  _prev: UserActionState,
  formData: FormData,
): Promise<UserActionState> {
  const gate = await requireAdminAction();
  if (!gate.ok) return gate.state;

  const actor = await getCurrentUser();
  const userId = Number(readText(formData, "userId"));
  const role = readText(formData, "role");
  // An unticked checkbox posts nothing, so `isActive` is 1 only when ticked.
  const activeValues = formData.getAll("isActive");
  const isActive = activeValues[activeValues.length - 1] === "1";

  if (!Number.isFinite(userId)) return { error: "Unknown user." };
  if (!isUserRole(role)) {
    return { error: `Pick a role (${USER_ROLES.join(", ")}).` };
  }

  const target = await getUserById(userId);
  if (!target) return { error: "That user no longer exists." };

  if (target.id === actor?.id) {
    return {
      error:
        "You cannot change your own role or deactivate your own account. Ask another administrator.",
    };
  }

  const losesAdmin = target.role === "admin" && target.is_active === 1;
  const stillAdmin = role === "admin" && isActive;
  if (losesAdmin && !stillAdmin && (await countActiveAdmins()) <= 1) {
    return { error: "This is the last active administrator; the site would be locked out." };
  }

  try {
    if (role !== target.role) await setUserRole(target.id, role as UserRole);
    if ((isActive ? 1 : 0) !== target.is_active) {
      await setUserActive(target.id, isActive);
    }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Could not update the user.",
    };
  }

  revalidatePath("/admin/users");
  return { ok: true, message: `Updated ${target.username}.` };
}

/**
 * Set a password for any account. Resetting someone else's password also revokes
 * their live sessions; changing your own leaves you signed in.
 */
export async function resetPasswordAction(
  _prev: UserActionState,
  formData: FormData,
): Promise<UserActionState> {
  const gate = await requireAdminAction();
  if (!gate.ok) return gate.state;

  const actor = await getCurrentUser();
  const userId = Number(readText(formData, "userId"));
  const password = readPassword(formData, "password");
  const confirm = readPassword(formData, "confirmPassword");

  if (!Number.isFinite(userId)) return { error: "Unknown user." };
  if (password.length < MIN_PASSWORD) {
    return { error: `The password must be at least ${MIN_PASSWORD} characters.` };
  }
  if (password !== confirm) return { error: "The two passwords do not match." };

  const target = await getUserById(userId);
  if (!target) return { error: "That user no longer exists." };

  const selfService = target.id === actor?.id;

  try {
    await setPasswordHash(target.id, await hashPassword(password), !selfService);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Could not set the password.",
    };
  }

  revalidatePath("/admin/users");
  return {
    ok: true,
    message: selfService
      ? "Your password has been changed."
      : `Password reset for ${target.username}; their other sessions were signed out.`,
  };
}
