import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./styles/variables.css";
import "./globals.css";
import SessionProviderWrapper from "./SessionProviderWrapper";
import ToastProvider from "./components/ToastProvider";
import { getServerSession } from "next-auth/next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TestMe | Generate AI-powered quizzes from any content",
  description: "Create quizzes from YouTube videos, PDFs, images or text. Test yourself smarter with TestMe.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();

  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <SessionProviderWrapper session={session}>
          <ToastProvider />
          {children}
        </SessionProviderWrapper>
      </body>
    </html>
  );
}
