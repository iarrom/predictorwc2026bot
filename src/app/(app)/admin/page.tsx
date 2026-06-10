import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { isAdmin } from "@/shared/lib/auth";
import { createClient } from "@/shared/lib/supabase/server";

export default async function AdminPage() {
  if (!(await isAdmin())) redirect("/matches");

  const supabase = await createClient();
  const { data: guests } = await supabase
    .from("profiles")
    .select("id, display_name, role, created_at")
    .eq("role", "guest")
    .order("created_at", { ascending: false })
    .limit(10);

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
            Guests who can be promoted to participant (moderation UI coming in a
            later phase).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!guests?.length ? (
            <p className="text-sm text-muted-foreground">No new guests.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {guests.map((guest) => (
                <li key={guest.id} className="flex justify-between gap-2">
                  <span>{guest.display_name}</span>
                  <span className="text-muted-foreground">{guest.role}</span>
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
