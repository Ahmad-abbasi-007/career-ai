import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CareerAI",
  description: "AI-Powered Job & Career Management Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}