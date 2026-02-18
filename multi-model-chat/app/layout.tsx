import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Team AI Workspace",
  description: "Internal multi-model AI chat tool",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
