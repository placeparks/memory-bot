import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Claw Club - Deploy Your Private AI Agent",
  description: "Members-only AI agent deployment. Private OpenClaw instances, Telegram & Discord channels, 24/7 uptime.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-[#050505]`} style={{ backgroundColor: '#050505' }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
