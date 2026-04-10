import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CLANKER NEWS NETWORK — $CNN | AI-Powered Live News",
  description: "Clanker News Network ($CNN) — The world's first AI-powered blockchain news network. Live news, AI anchor, real-time analysis.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full" style={{ background: '#0A1628', color: 'white' }}>
        {children}
      </body>
    </html>
  );
}
