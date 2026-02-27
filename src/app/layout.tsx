import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({ variable: "--font-outfit", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "Homie",
  description: "Home management for roommates",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${outfit.variable} antialiased min-h-screen flex flex-col`}
      >
        {children}
      </body>
    </html>
  );
}
