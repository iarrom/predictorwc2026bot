"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/shared/lib/supabase/server";
import { getCurrentUserId, isAdmin } from "@/shared/lib/auth";

const updateRoleSchema = z.object({
  user_id: z.string().uuid(),
  role: z.enum(["guest", "participant", "admin"]),
});

export async function updateUserRole(
  _prev: { error?: string; success?: boolean } | null,
  formData: FormData,
): Promise<{ error?: string; success?: boolean }> {
  if (!(await isAdmin())) return { error: "Forbidden" };

  const currentUserId = await getCurrentUserId();
  if (!currentUserId) return { error: "Not authenticated" };

  const parsed = updateRoleSchema.safeParse({
    user_id: formData.get("user_id"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { user_id, role } = parsed.data;

  if (user_id === currentUserId && role !== "admin") {
    return { error: "You can't change your own admin role" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ role, updated_at: new Date().toISOString() })
    .eq("id", user_id);

  if (error) return { error: error.message };

  revalidatePath("/admin");
  revalidatePath("/leaderboard");
  return { success: true };
}
