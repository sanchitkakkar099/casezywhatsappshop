"use client";

import { usePathname } from "next/navigation";
import { SessionProvider } from "next-auth/react";
import { Sidebar } from "@/components/admin/Sidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/admin/login";

  if (isLoginPage) {
    return <SessionProvider>{children}</SessionProvider>;
  }

  return (
    <SessionProvider>
      <div className="flex h-screen h-[100dvh] bg-gray-50">
        <Sidebar />
        <main className="flex-1 overflow-y-auto pt-14 md:pt-0">
          <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 md:px-8 md:py-8">
            {children}
          </div>
        </main>
      </div>
    </SessionProvider>
  );
}
