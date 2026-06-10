import type { Locale } from "@/shared/types/database";
import { defaultLocale, toIntlLocale } from "@/i18n/config";

export function formatTiebreakerDeadline(
  deadlineAt: string,
  locale: Locale = defaultLocale,
): string {
  return new Intl.DateTimeFormat(toIntlLocale(locale), {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(deadlineAt));
}
