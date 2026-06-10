"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
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
  const t = await getTranslations("common.errors");

  if (!(await isAdmin())) return { error: t("forbidden") };

  const currentUserId = await getCurrentUserId();
  if (!currentUserId) return { error: t("notAuthenticated") };

  const parsed = updateRoleSchema.safeParse({
    user_id: formData.get("user_id"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? t("invalidInput") };
  }

  const { user_id, role } = parsed.data;

  if (user_id === currentUserId && role !== "admin") {
    return { error: t("cantChangeOwnAdminRole") };
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
