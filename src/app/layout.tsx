import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { PwaRegister } from "@/components/pwa-register";
import { SplashScreen } from "@/components/splash-screen";
import { themeInitScript, THEME_COOKIE } from "@/components/theme-script";
import { cookies } from "next/headers";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Market Arena",
  description:
    "Market Arena — the financial simulation arena. Trade live markets, run businesses, lend, borrow, and climb the leaderboard with zero real-world risk.",
  manifest: "/manifest.json",
  icons: [
    { rel: "icon", url: "/favicon.png", sizes: "32x32" },
    { rel: "apple-touch-icon", url: "/icon-192.png", sizes: "192x192" },
  ],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0A0A0B" },
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Read theme cookie server-side so the very first paint has the right class.
  const cookieStore = await cookies();
  const raw = cookieStore.get(THEME_COOKIE)?.value;
  const theme = raw === "light" || raw === "dark" ? raw : "dark";

  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} ${theme} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full flex flex-col bg-bg text-text">
        <SplashScreen />
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
