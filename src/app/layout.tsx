/**
 * @file layout.tsx
 * @description Root layout — wraps every page.
 *
 * Responsibilities:
 * - Load and apply Google Fonts (Playfair Display + DM Sans)
 * - Set page metadata (title, OG tags, viewport)
 * - Skip-to-content link for keyboard accessibility
 * - Inject the persistent Header and Footer components
 */

import type { Metadata, Viewport } from "next";
import { Playfair_Display, DM_Sans } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

// ---------------------------------------------------------------------------
// Font configuration
// Playfair Display: classic serif for display headings
// DM Sans: geometric sans-serif for body text
// ---------------------------------------------------------------------------

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
  weight: ["300", "400", "500", "600"],
});

// ---------------------------------------------------------------------------
// Page metadata
// ---------------------------------------------------------------------------

export const metadata: Metadata = {
  title: {
    default: "NavYoga — Yoga Pose Estimation",
    template: "%s · NavYoga",
  },
  description:
    "Real-time yoga pose analysis and correction using your device camera. " +
    "See your skeleton, get instant feedback, and refine your practice — " +
    "entirely in your browser with zero data upload.",
  keywords: ["yoga", "pose estimation", "mediapipe", "body tracking", "fitness", "asana"],
  openGraph: {
    title: "NavYoga — Yoga Pose Estimation",
    description:
      "Real-time yoga pose correction in your browser. No account, no uploads.",
    type: "website",
    locale: "en_US",
    siteName: "NavYoga",
  },
  twitter: {
    card: "summary_large_image",
    title: "NavYoga — Yoga Pose Estimation",
    description: "Real-time yoga pose correction in your browser. No account, no uploads.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0C0F0A",
};

// ---------------------------------------------------------------------------
// Root layout
// ---------------------------------------------------------------------------

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${playfair.variable} ${dmSans.variable} h-full`}
    >
      <body className="min-h-full flex flex-col">
        {/* Skip-to-content link for keyboard/screen-reader users */}
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>

        {/* Persistent top navigation */}
        <Header />

        {/* Page content */}
        <main id="main-content" className="flex-1 flex flex-col" tabIndex={-1}>
          {children}
        </main>

        {/* Persistent footer */}
        <Footer />
      </body>
    </html>
  );
}
