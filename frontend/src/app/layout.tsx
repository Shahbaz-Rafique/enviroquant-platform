import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CompanyName",
  description: "Regenerative design and living systems for a restorative future"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-gradient text-white antialiased">{children}</body>
    </html>
  );
}
