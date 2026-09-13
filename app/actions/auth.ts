"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { verifyPassword } from "@/lib/password";
import { clearSessionCookie, setSessionCookie } from "@/lib/session";
import { getUserWithHash, touchLastLogin } from "@/lib/users";

export interface LoginState {
  error?: string;
}

const CredentialsSchema = z.object({
  username: z.string().trim().min(1, "Enter your username.").max(64),
  password: z.string().min(1, "Enter your password.").max(200),
});

/**
 * A hash of an unguessable value, used to burn the same CPU when the username
 * does not exist. Without this, response timing reveals which usernames are
 * real.
 */
const DUMMY_HASH = `scrypt$${"0".repeat(32)}$${"0".repeat(128)}`;

// Best-effort brute-force throttle. Per server instance only — good enough to
// slow a scripted attack on a single login form.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_FAILURES = 10;
const failures = new Map<string, { count: number; first: number }>();

function tooManyFailures(key: string): boolean {
  const entry = failures.get(key);
  if (!entry) return false;
  if (Date.now() - entry.first > WINDOW_MS) {
    failures.delete(key);
    return false;
  }
  return entry.count >= MAX_FAILURES;
}

function recordFailure(key: string): void {
  const now = Date.now();
  const entry = failures.get(key);
  if (!entry || now - entry.first > WINDOW_MS) {
    failures.set(key, { count: 1, first: now });
  } else {
    entry.count += 1;
  }
  if (failures.size > 5000) {
    for (const [k, v] of failures) {
      if (now - v.first > WINDOW_MS) failures.delete(k);
    }
  }
}

/** Only allow same-site relative paths, so `?next=` cannot be an open redirect. */
function safeNext(value: FormDataEntryValue | null): string {
  if (typeof value !== "string") return "/";
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

export async function loginAction(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = CredentialsSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid credentials." };
  }

  const { username, password } = parsed.data;
  const key = username.toLowerCase();

  if (tooManyFailures(key)) {
    return {
      error: "Too many failed attempts. Try again in a few minutes.",
    };
  }

  const user = await getUserWithHash(username);
  const passwordOk = await verifyPassword(
    password,
    user ? user.password_hash : DUMMY_HASH,
  );

  if (!user || !passwordOk || !user.is_active) {
    recordFailure(key);
    return { error: "Invalid username or password." };
  }

  failures.delete(key);
  await setSessionCookie({
    uid: user.id,
    role: user.role,
    ver: user.token_version,
  });
  await touchLastLogin(user.id);
  redirect(safeNext(formData.get("next")));
}

export async function logoutAction(): Promise<void> {
  await clearSessionCookie();
  redirect("/login");
}
