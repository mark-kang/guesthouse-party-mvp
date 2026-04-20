// Mocking Next.js main layout with Party theme styling
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Guesthouse Party",
  description: "Real-time communication for guesthouse parties",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={`${inter.className} bg-slate-950 text-white min-h-screen max-w-md mx-auto relative overflow-hidden`}>
        {children}
      </body>
    </html>
  );
}
