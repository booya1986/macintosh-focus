import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mac Focus",
  description: "Pomodoro focus app for the Macintosh creature on your Pi.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#c6c6c6",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-desktop min-h-screen text-ink antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
