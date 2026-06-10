"use client";

import { useTranslations } from "next-intl";
import { AppErrorFallback } from "@/shared/ui/AppErrorFallback";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errors");

  return (
    <AppErrorFallback
      error={error}
      reset={reset}
      title={t("title")}
      description={t("description")}
      reloadLabel={t("reload")}
    />
  );
}
