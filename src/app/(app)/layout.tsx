import { BracketAppShell } from "@/features/brackets/ui/BracketAppShell";
import { AppNav } from "@/shared/ui/AppNav";
import { BottomTabBar } from "@/shared/ui/BottomTabBar";
import { isAdmin } from "@/shared/lib/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await isAdmin();

  return (
    <BracketAppShell>
      <div className="flex h-dvh flex-col overflow-hidden">
        <AppNav />
        <main className="mx-auto flex w-full max-w-md min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-4 pt-2 pb-[calc(var(--app-bottom-chrome)+1rem+env(safe-area-inset-bottom,0px))]">
          {children}
        </main>
        <BottomTabBar isAdmin={admin} />
      </div>
    </BracketAppShell>
  );
}
