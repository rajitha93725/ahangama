import type { Metadata } from "next";
import { Geist, Dancing_Script } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "next-auth/react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const dancingScript = Dancing_Script({
  variable: "--font-dancing",
  subsets: ["latin"],
  weight: ["700"],
});

export const metadata: Metadata = {
  title: "Visit Sri Lanka — Tourism Marketplace",
  description: "Discover and book unique accommodations across Sri Lanka with flexible pricing",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${dancingScript.variable} h-full`}>
      <body className="min-h-full flex flex-col antialiased">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
