"use client";

import { usePathname } from "next/navigation";

export function AppPageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div
      key={pathname}
      className="app-page-enter flex min-h-0 flex-1 flex-col motion-reduce:animate-none"
    >
      {children}
    </div>
  );
}
