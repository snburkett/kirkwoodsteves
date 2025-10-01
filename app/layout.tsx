import type { Metadata } from "next";
import { Inter } from "next/font/google";

import PageFrame from "@/components/PageFrame";
import "../styles/globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Kirkwood Steve's",
  description: "An experimental emporium of artifacts, signals, and AI tinkering.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="bright" className="bg-slate-50">
      <body className={`${inter.className} bg-slate-50 text-slate-900`}>
        <PageFrame>{children}</PageFrame>
      </body>
    </html>
  );
}
