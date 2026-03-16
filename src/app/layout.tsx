import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Casezy Admin",
  description: "Casezy WhatsApp Commerce Admin Panel",
  icons: {
    icon: "https://casezy.in/cdn/shop/files/Group_1000005871.png?crop=center&height=32&v=1767080874&width=32",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-white text-gray-900 antialiased">{children}</body>
    </html>
  );
}
