import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthHeader } from "@/components/auth/AuthHeader";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI 할 일 관리 서비스",
  description: "AI가 도와주는 똑똑한 할일 관리 서비스",
  keywords: [
    "AI",
    "할 일 관리",
    "투두리스트",
    "생산성",
    "Todo",
    "스마트 플래너",
  ],
  openGraph: {
    title: "AI 할 일 관리 서비스",
    description: "AI가 도와주는 똑똑한 할일 관리 서비스",
    type: "website",
    locale: "ko_KR",
    siteName: "AI Todo Manager",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI 할 일 관리 서비스",
    description: "AI가 도와주는 똑똑한 할일 관리 서비스",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthHeader />
        {children}
      </body>
    </html>
  );
}
