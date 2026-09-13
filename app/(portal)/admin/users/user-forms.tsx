"use client";

import { useActionState } from "react";

import {
  createUserAction,
  resetPasswordAction,
  updateUserAction,
  type UserActionState,
} from "@/app/actions/users";

/** The subset of a user row these forms need (kept client-safe on purpose). */
export interface ManagedUser {
  id: number;
  username: string;
  display_name: string | null;
  role: string;
  is_active: number;
  last_login_at: string | null;
}

const INPUT =
  "rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none";
const LABEL = "block text-xs font-medium text-slate-600";
const BUTTON =
  "rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-700 disabled:opacity-50";

function Feedback({ state }: { state: UserActionState }) {
  if (state.error) return <p className="text-xs text-red-600">{state.error}</p>;
  if (state.message) return <p className="text-xs text-emerald-600">{state.message}</p>;
  return null;
}

export function CreateUserForm({ roles }: { roles: readonly string[] }) {
  const [state, formAction, pending] = useActionState<UserActionState, FormData>(
    createUserAction,
    {},
  );

  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <div>
        <label className={LABEL} htmlFor="new-username">
          Username
        </label>
        <input
          id="new-username"
          name="username"
          required
          autoComplete="off"
          placeholder="e.g. jkim"
          className={`${INPUT} mt-1 w-full`}
        />
      </div>

      <div>
        <label className={LABEL} htmlFor="new-display">
          Display name
        </label>
        <input
          id="new-display"
          name="displayName"
          autoComplete="off"
          placeholder="optional"
          className={`${INPUT} mt-1 w-full`}
        />
      </div>

      <div>
        <label className={LABEL} htmlFor="new-role">
          Role
        </label>
        <select
          id="new-role"
          name="role"
          defaultValue="dispatcher"
          className={`${INPUT} mt-1 w-full`}
        >
          {roles.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={LABEL} htmlFor="new-password">
          Password
        </label>
        <input
          id="new-password"
          name="password"
          type="password"
          required
          autoComplete="new-password"
          className={`${INPUT} mt-1 w-full`}
        />
      </div>

      <div>
        <label className={LABEL} htmlFor="new-confirm">
          Confirm password
        </label>
        <input
          id="new-confirm"
          name="confirmPassword"
          type="password"
          required
          autoComplete="new-password"
          className={`${INPUT} mt-1 w-full`}
        />
      </div>

      <div className="flex items-end gap-3">
        <button type="submit" className={BUTTON} disabled={pending}>
          {pending ? "Creating…" : "Create user"}
        </button>
        <Feedback state={state} />
      </div>
    </form>
  );
}

export function UserRow({
  user,
  roles,
  isSelf,
}: {
  user: ManagedUser;
  roles: readonly string[];
  isSelf: boolean;
}) {
  const [updateState, updateAction, updating] = useActionState<
    UserActionState,
    FormData
  >(updateUserAction, {});
  const [pwState, pwAction, settingPassword] = useActionState<
    UserActionState,
    FormData
  >(resetPasswordAction, {});

  return (
    <tr className="align-top hover:bg-slate-50">
      <td className="px-2 py-3">
        <div className="font-medium text-slate-800">{user.username}</div>
        <div className="text-xs text-slate-500">{user.display_name ?? "—"}</div>
        {isSelf ? (
          <div className="mt-0.5 text-[11px] font-medium text-indigo-600">
            this is you
          </div>
        ) : null}
      </td>

      <td className="px-2 py-3">
        <form action={updateAction} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="userId" value={user.id} />
          <select
            name="role"
            defaultValue={user.role}
            disabled={isSelf}
            aria-label={`Role for ${user.username}`}
            className={INPUT}
          >
            {roles.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-1 text-xs text-slate-600">
            <input
              type="checkbox"
              name="isActive"
              value="1"
              defaultChecked={user.is_active === 1}
              disabled={isSelf}
            />
            active
          </label>
          <button type="submit" className={BUTTON} disabled={updating || isSelf}>
            {updating ? "Saving…" : "Save"}
          </button>
          <Feedback state={updateState} />
        </form>
      </td>

      <td className="px-2 py-3">
        <form action={pwAction} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="userId" value={user.id} />
          <input
            name="password"
            type="password"
            placeholder="New password"
            autoComplete="new-password"
            aria-label={`New password for ${user.username}`}
            className={INPUT}
          />
          <input
            name="confirmPassword"
            type="password"
            placeholder="Repeat"
            autoComplete="new-password"
            aria-label={`Repeat new password for ${user.username}`}
            className={INPUT}
          />
          <button type="submit" className={BUTTON} disabled={settingPassword}>
            {settingPassword ? "Setting…" : "Set"}
          </button>
          <Feedback state={pwState} />
        </form>
      </td>

      <td className="px-2 py-3 text-xs text-slate-500">
        {user.last_login_at ?? "never"}
      </td>
    </tr>
  );
}
