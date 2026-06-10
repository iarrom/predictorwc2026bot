import { createClient } from "@/shared/lib/supabase/server";
import type { UserRole } from "@/shared/types/database";

export async function getCurrentUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const sub = data?.claims?.sub;
  return typeof sub === "string" ? sub : null;
}

export async function getCurrentUserRole(): Promise<UserRole | null> {
  const userId = await getCurrentUserId();
  if (!userId) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  return (data?.role as UserRole | undefined) ?? null;
}

export async function isAdmin(): Promise<boolean> {
  const role = await getCurrentUserRole();
  return role === "admin";
}

export async function isParticipant(): Promise<boolean> {
  const role = await getCurrentUserRole();
  return role === "participant" || role === "admin";
}
