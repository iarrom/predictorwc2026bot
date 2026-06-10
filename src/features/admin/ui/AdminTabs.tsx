"use client";

import { useTranslations } from "next-intl";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

interface AdminTabsProps {
  picksSlot: React.ReactNode;
  usersSlot: React.ReactNode;
}

export function AdminTabs({ picksSlot, usersSlot }: AdminTabsProps) {
  const t = useTranslations("admin.tabs");

  return (
    <Tabs defaultValue="picks" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="picks">{t("picks")}</TabsTrigger>
        <TabsTrigger value="users">{t("users")}</TabsTrigger>
      </TabsList>
      <TabsContent value="picks" className="mt-4">
        {picksSlot}
      </TabsContent>
      <TabsContent value="users" className="mt-4">
        {usersSlot}
      </TabsContent>
    </Tabs>
  );
}
