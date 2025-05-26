import "./globals.css"
import Script from "next/script"

export const metadata = {
  title: "Sunny Spots",
  description:
    "A map to know when cafes, parks, restaurants and bars get sunlight.",
  generator: "v0.dev",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head></head>
      <body>{children}</body>
    </html>
  )
}
