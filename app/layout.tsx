import type { Metadata } from "next";
import { Inter } from "next/font/google";

import PageFrame from "@/components/PageFrame";
import TemporaryClosureOverlay from "@/components/TemporaryClosureOverlay";
import "../styles/globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Kirkwood Steve's",
  description: "An experimental emporium of artifacts, signals, and AI tinkering.",
  icons: {
    icon: "/img/favicon.ico",
    shortcut: "/img/favicon.ico",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="bright" className="bg-slate-50">
      <body className={`${inter.className} overflow-hidden bg-slate-50 text-slate-900`}>
        <PageFrame>{children}</PageFrame>
        <TemporaryClosureOverlay />
      </body>
    </html>
  );
}
