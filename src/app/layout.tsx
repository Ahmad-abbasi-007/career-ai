import type { Metadata } from "next";
import "./globals.css";
import StudentNavigation from "@/components/StudentNavigation";

export const metadata: Metadata = {
  title: "CareerAI",
  description:
    "Explore career opportunities and manage your job applications with CareerAI.",
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any", type: "image/x-icon" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
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