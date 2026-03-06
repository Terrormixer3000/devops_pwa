import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/layout/Providers";
import { BottomNav } from "@/components/layout/BottomNav";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

// App-Metadaten fuer PWA und Browser
export const metadata: Metadata = {
  title: "Azure DevOps Mobile",
  description: "Mobiler Azure DevOps Client fuer iPhone",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "AzDevOps",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#1b1a19",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className="dark">
      <head>
        {/* iOS PWA Meta-Tags */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className={`${inter.variable} font-sans bg-slate-900 text-slate-100 antialiased`}>
        <Providers>
          {/* Hauptinhalt: oben AppBar + Notch, unten die tatsaechliche Bottom-Nav-Hoehe */}
          <main className="min-h-screen" style={{ paddingTop: "calc(var(--app-bar-height) + env(safe-area-inset-top))", paddingBottom: "var(--bottom-nav-height)" }}>
            {children}
          </main>
          <BottomNav />
        </Providers>
      </body>
    </html>
  );
}
