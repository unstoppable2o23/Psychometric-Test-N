import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Psychometric Testing Platform",
  description: "Secure psychometric testing platform with server-side scoring, professional A4 PDF reports, and counsellor interpretation manuals.",
  keywords: ["psychometric", "assessment", "career", "personality", "testing", "counselling"],
  authors: [{ name: "Psychometric Testing Platform" }],
  openGraph: {
    title: "Psychometric Testing Platform",
    description: "Secure psychometric testing platform with server-side scoring and professional reports.",
    siteName: "Psychometric Testing Platform",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Psychometric Testing Platform",
    description: "Secure psychometric testing platform with server-side scoring and professional reports.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
