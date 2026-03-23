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
          <div className="text-center py-3 space-y-1.5">
            <a href="https://chatmint.in" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 transition-opacity hover:opacity-80">
              <span className="text-[10px] text-gray-400">Product Extension of Chatmint</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="https://cloudmediastorage.s3.ap-south-1.amazonaws.com/white-label/logo/chatmint.in/30c1e327-f8ac-4965-8309-a0664dbf054b-Green%20Minimalist%20Chat%20Logo%20Design%20(7).png" alt="Chatmint" className="h-4" />
            </a>
            <br />
            <a href="https://xava.co.in" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 transition-opacity hover:opacity-80">
              <span className="text-[10px] text-gray-300">Powered by Xava Web Services Pvt Ltd</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="https://xava.co.in/wp-content/uploads/2021/10/logoxavanew.png" alt="Xava" className="h-4" />
            </a>
          </div>
        </main>
      </div>
    </SessionProvider>
  );
}
