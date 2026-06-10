import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
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
import { toIntlLocale } from "@/i18n/config";
import type { Locale } from "@/shared/types/database";
import { MemberRoleControls } from "@/features/admin/ui/MemberRoleControls";

export default async function AdminPage() {
  if (!(await isAdmin())) redirect("/matches");

  const t = await getTranslations("admin");
  const locale = (await getLocale()) as Locale;
  const currentUserId = await getCurrentUserId();
  const supabase = await createClient();
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name, role, created_at")
    .order("created_at", { ascending: false });

  const allUsers = profiles ?? [];
  const guests = allUsers.filter((p) => p.role === "guest");
  const members = allUsers.filter((p) => p.role !== "guest");

  const dateFormatter = new Intl.DateTimeFormat(toIntlLocale(locale), {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-300 fill-mode-both motion-reduce:animate-none">
      <div>
        <h1 className="text-xl font-bold">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("description")}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("pendingApproval")}</CardTitle>
          <CardDescription>{t("pendingDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          {!guests.length ? (
            <p className="text-sm text-muted-foreground">{t("noNewGuests")}</p>
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
          <CardTitle>{t("members")}</CardTitle>
          <CardDescription>{t("membersDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          {!members.length ? (
            <p className="text-sm text-muted-foreground">{t("noMembers")}</p>
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
          <CardTitle>{t("allUsers")}</CardTitle>
          <CardDescription>
            {t("allUsersSummary", {
              total: allUsers.length,
              admins: members.filter((m) => m.role === "admin").length,
              participants: members.filter((m) => m.role === "participant").length,
              guests: guests.length,
            })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!allUsers.length ? (
            <p className="text-sm text-muted-foreground">{t("noUsers")}</p>
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
                          {t("you")}
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {t("joined", {
                        date: dateFormatter.format(new Date(user.created_at)),
                      })}
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
          <CardTitle>{t("dataImport")}</CardTitle>
          <CardDescription>{t("dataImportDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-muted-foreground">
          <p>
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
              pnpm import:schedule
            </code>{" "}
            {t("importSchedule")}
          </p>
          <p>
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
              pnpm import:squads
            </code>{" "}
            {t("importSquads")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
