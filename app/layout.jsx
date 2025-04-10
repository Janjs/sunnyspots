import "./globals.css";
import Script from "next/script";

export const metadata = {
  title: "Terras Map",
  description: "A map to know when restaurants and bars get sunlight.",
  generator: "v0.dev",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head></head>
      <body>{children}</body>
    </html>
  );
}
