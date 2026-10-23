import type { Metadata, Viewport } from "next";
import { getStrings } from "@/lib/content";
import "./globals.css";

const strings = getStrings("en-US");

export const metadata: Metadata = {
  title: `${strings.appName} · Daily round`,
  description: strings.metaDescription,
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f4f5f7",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang={strings.locale} className="h-full antialiased">
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
