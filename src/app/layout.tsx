import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StreamSync — Multi-Stream Watch Party",
  description:
    "Watch multiple video streams simultaneously. Create, share, and enjoy watch parties with friends using a single shareable URL. Supports YouTube, Twitch, Vimeo, and direct video links.",
  keywords: [
    "watch party",
    "multi stream",
    "twitch multistream",
    "youtube multistream",
    "stream sync",
    "watch together",
    "multi view",
    "video grid",
  ],
  authors: [{ name: "StreamSync" }],
  creator: "StreamSync",
  publisher: "StreamSync",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    title: "StreamSync — Multi-Stream Watch Party",
    description:
      "Watch multiple video streams simultaneously. Create and share watch parties with a single URL.",
    siteName: "StreamSync",
  },
  twitter: {
    card: "summary_large_image",
    title: "StreamSync — Multi-Stream Watch Party",
    description:
      "Watch multiple video streams simultaneously. Create and share watch parties with a single URL.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0f0f14" },
    { media: "(prefers-color-scheme: light)", color: "#0f0f14" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-surface text-text-primary antialiased">
        {children}
      </body>
    </html>
  );
}
