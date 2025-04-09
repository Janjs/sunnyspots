import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Terras Map",
  description: "A map to know when restaurants and bars get sunlight.",
  generator: "v0.dev",
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
