import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCurrentUserId, isAdmin } from "@/shared/lib/auth";
import { createClient } from "@/shared/lib/supabase/server";
import type { UserRole } from "@/shared/types/database";
import { MemberRoleControls } from "@/features/admin/ui/MemberRoleControls";

export default async function AdminPage() {
  if (!(await isAdmin())) redirect("/matches");

  const currentUserId = await getCurrentUserId();
  const supabase = await createClient();
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name, role, created_at")
    .order("created_at", { ascending: false });

  const allUsers = profiles ?? [];
  const guests = allUsers.filter((p) => p.role === "guest");
  const members = allUsers.filter((p) => p.role !== "guest");

  const dateFormatter = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-300 fill-mode-both motion-reduce:animate-none">
      <div>
        <h1 className="text-xl font-bold">Admin</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage participants, match results, and schedule data.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending approval</CardTitle>
          <CardDescription>
            New guests waiting to be promoted to participant.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!guests.length ? (
            <p className="text-sm text-muted-foreground">No new guests.</p>
          ) : (
            <ul className="space-y-3 text-sm">
              {guests.map((guest) => (
                <li
                  key={guest.id}
                  className="flex items-center justify-between gap-3"
                >
                  <span className="min-w-0 truncate font-medium">
                    {guest.display_name}
                  </span>
                  <MemberRoleControls
                    userId={guest.id}
                    currentRole={guest.role as UserRole}
                    isSelf={guest.id === currentUserId}
                  />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <CardDescription>
            Participants and admins. Change roles or revoke access.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!members.length ? (
            <p className="text-sm text-muted-foreground">No members yet.</p>
          ) : (
            <ul className="space-y-3 text-sm">
              {members.map((member) => (
                <li
                  key={member.id}
                  className="flex items-center justify-between gap-3"
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-medium">
                      {member.display_name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {member.role}
                    </span>
                  </span>
                  <MemberRoleControls
                    userId={member.id}
                    currentRole={member.role as UserRole}
                    isSelf={member.id === currentUserId}
                  />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All users</CardTitle>
          <CardDescription>
            {allUsers.length} total · {members.filter((m) => m.role === "admin").length}{" "}
            admins · {members.filter((m) => m.role === "participant").length}{" "}
            participants · {guests.length} guests
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!allUsers.length ? (
            <p className="text-sm text-muted-foreground">No users yet.</p>
          ) : (
            <ul className="divide-y divide-foreground/10 text-sm">
              {allUsers.map((user) => (
                <li
                  key={user.id}
                  className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0"
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-medium">
                      {user.display_name}
                      {user.id === currentUserId && (
                        <span className="ml-1 text-xs text-muted-foreground">
                          (you)
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      joined {dateFormatter.format(new Date(user.created_at))}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {user.role}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data import</CardTitle>
          <CardDescription>
            Load schedule and squads from external sources.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-muted-foreground">
          <p>
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
              pnpm import:schedule
            </code>{" "}
            — schedule (OpenFootball)
          </p>
          <p>
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
              pnpm import:squads
            </code>{" "}
            — squads (Wikipedia)
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
