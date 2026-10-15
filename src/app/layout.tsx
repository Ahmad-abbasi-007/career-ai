import type { Metadata } from "next";
import "./globals.css";
import StudentNavigation from "@/components/StudentNavigation";

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
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <StudentNavigation>{children}</StudentNavigation>
      </body>
    </html>
  );
}