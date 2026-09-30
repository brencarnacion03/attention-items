import type { Metadata } from "next";
import localFont from "next/font/local";
import { Fraunces, Playfair_Display } from "next/font/google";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});
// An elegant serif for headlines and big numbers, echoing the boutique,
// single-line-ink feel of the goal icons - everything else stays on the
// clean grotesque (Geist) so the pairing reads as considered, not decorative.
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600"],
  style: ["normal", "italic"],
});
// Used only for the dashboard's "N things need your attention" heading.
const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  weight: ["500", "600"],
});

export const metadata: Metadata = {
  title: "Attention Items",
  description: "What needs your attention today.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} ${playfairDisplay.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
