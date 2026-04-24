/**
 * @file layout.tsx
 * @description Root layout — wraps every page.
 *
 * Responsibilities:
 * - Load and apply Google Fonts (Playfair Display + DM Sans)
 * - Set page metadata (title template, description, viewport)
 * - Inject the global Header component
 * - Expose CSS custom-property variables for fonts to globals.css
 */

import type { Metadata, Viewport } from "next";
import { Playfair_Display, DM_Sans } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";

// ---------------------------------------------------------------------------
// Font configuration
// Playfair Display: classic serif for display headings — evokes yoga studio elegance
// DM Sans: geometric sans-serif for body text — clean and readable at all sizes
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
    default: "Asana — Yoga Pose Estimation",
    template: "%s · Asana",
  },
  description:
    "Real-time yoga pose analysis and correction using your device camera. " +
    "See your skeleton, get instant feedback, and refine your practice.",
  keywords: ["yoga", "pose estimation", "mediapipe", "body tracking", "fitness"],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
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
      // Expose font CSS variables and enable antialiasing
      className={`${playfair.variable} ${dmSans.variable} h-full`}
    >
      <body className="min-h-full flex flex-col">
        {/* Persistent top navigation across all pages */}
        <Header />

        {/* Page content renders here */}
        <main className="flex-1 flex flex-col">{children}</main>
      </body>
    </html>
  );
}
