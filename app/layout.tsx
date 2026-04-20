import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Manrope } from "next/font/google";

import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Postly.mn",
  description: "Postly контент үүсгэх платформ",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Postly",
  },
  icons: {
    icon: [{ url: "/postly-icon.png", type: "image/png" }],
    shortcut: [{ url: "/postly-icon.png", type: "image/png" }],
    apple: [{ url: "/postly-icon.png", type: "image/png" }],
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#020617",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="mn" className="dark" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${manrope.variable} ${jetBrainsMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
