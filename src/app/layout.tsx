import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/layout/Providers";
import { BottomNav } from "@/components/layout/BottomNav";
import { OfflineBanner } from "@/components/ui/OfflineBanner";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const APPLE_TOUCH_ICON = "/apple-touch-icon.png";
const APP_ICON = "/icons/icon-192.png";

// App-Metadaten fuer PWA und Browser
export const metadata: Metadata = {
  title: "Azure DevOps Mobile",
  description: "Mobiler Azure DevOps Client fuer iPhone",
  manifest: "/manifest.json",
  icons: {
    icon: [{ url: APP_ICON, sizes: "192x192", type: "image/png" }],
    shortcut: [APP_ICON],
    apple: [{ url: APPLE_TOUCH_ICON, sizes: "180x180", type: "image/png" }],
  },
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

/** Root-Layout der App: setzt HTML-Lang, PWA-Meta-Tags und bindet BottomNav sowie Provider ein. */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" data-theme="dark">
      <head>
        {/* iOS PWA Meta-Tags */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" sizes="180x180" href={APPLE_TOUCH_ICON} />
      </head>
      <body className={`${inter.variable} font-sans bg-slate-900 text-slate-100 antialiased`}>
        <Providers>
          <OfflineBanner />
          {/* Hauptinhalt scrollt innerhalb des eingefrorenen body, damit position:fixed
              auf dem iPhone in der installierten App wirklich fixiert bleibt. */}
          <main
            className="absolute inset-0 overflow-y-auto"
            style={{ paddingTop: "var(--app-bar-height)", paddingBottom: "var(--bottom-nav-height)" }}
          >
            {children}
          </main>
          <BottomNav />
        </Providers>
      </body>
    </html>
  );
}
