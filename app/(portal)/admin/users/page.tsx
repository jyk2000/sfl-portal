import { Card, PageHeader } from "@/components/ui";
import { requireRole } from "@/lib/dal";
import { USER_ROLES, listUsers } from "@/lib/users";

import { CreateUserForm, UserRow } from "./user-forms";

export const metadata = { title: "Users" };

const TH = "px-2 py-2 text-left font-semibold";

export default async function UsersPage() {
  const actor = await requireRole(["admin"]);
  const users = await listUsers();

  return (
    <div className="space-y-4">
      <PageHeader
        title="Users"
        description="Create accounts and set passwords. Changing a role, resetting someone else's password or deactivating an account signs that user out everywhere."
      />

      <Card
        title="Add a user"
        subtitle="The account can sign in as soon as it is created."
      >
        <CreateUserForm roles={USER_ROLES} />
      </Card>

      <Card
        title="Accounts"
        subtitle={`${users.length} account${users.length === 1 ? "" : "s"}. For safety you cannot change your own role or active flag — ask another administrator.`}
      >
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className={TH}>User</th>
                <th className={TH}>Role / status</th>
                <th className={TH}>Set password</th>
                <th className={TH}>Last sign-in</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((user) => (
                <UserRow
                  key={user.id}
                  user={user}
                  roles={USER_ROLES}
                  isSelf={user.id === actor.id}
                />
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
