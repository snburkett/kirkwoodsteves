import type { Metadata } from "next";
import { Inter } from "next/font/google";

import HeaderTitle from "./(components)/HeaderTitle";
import "../styles/globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Kirkwood Steve's",
  description: "An experimental emporium of artifacts, signals, and AI tinkering.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="bright" className="bg-slate-50">
      <body className={`${inter.className} flex min-h-screen flex-col bg-slate-50`}>
        <header className="sticky top-0 z-50 border-b border-slate-200 bg-slate-50/95 backdrop-blur">
          <div className="mx-auto flex h-[72px] w-full max-w-[1100px] items-center justify-between px-6">
            <HeaderTitle />
            <nav className="flex items-center gap-4 text-sm text-slate-500">{/* Future nav */}</nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1100px] flex-1 px-6 py-12">{children}</main>
      </body>
    </html>
  );
}
