import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AuthProvider } from "@/lib/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI学职同伴",
  description: "面向双非学生的 AI Copilot 式学职陪伴助手",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <head>
      </head>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
