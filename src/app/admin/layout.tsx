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
        <main className="flex-1 overflow-y-auto pt-14 md:pt-0 flex flex-col">
          <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 md:px-8 md:py-8 flex-1">
            {children}
          </div>
          <div className="text-center py-3 space-y-0.5">
            <p className="text-[10px] text-gray-400">
              Product Extension of Chatmint
            </p>
            <p className="text-[10px] text-gray-300">
              Powered by Xava Web Services Pvt Ltd
            </p>
          </div>
        </main>
      </div>
    </SessionProvider>
  );
}
