import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Kankotri Studio — Premium AI photoshoots for wedding cards",
    template: "%s · Kankotri Studio",
  },
  description:
    "Upload a plain photo of a kankotri (wedding invitation) and get a premium, editorial-quality product shot in seconds. Built for Indian wedding-card studios.",
  applicationName: "Kankotri Studio",
  metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
  openGraph: {
    title: "Kankotri Studio",
    description:
      "Turn a phone photo of a wedding card into a premium photoshoot, matched to your region and style.",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
