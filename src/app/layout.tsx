import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HALKA — Atomik N-Taraflı Takas Motoru | Monad Blitz Ankara v4",
  description:
    "Üç veya daha fazla kişinin yer ya da eşya değiştirmesini tek işlemde, atomik olarak gerçekleştiren MTTC (Top Trading Cycles) takas motoru.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="tr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-[#07070c] text-zinc-100">
        {children}
      </body>
    </html>
  );
}
