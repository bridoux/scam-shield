"use client";

import { ErrorScreen } from "@/components/ErrorScreen";
import uiEnUS from "@/data/ui.en-US.json";
import "./globals.css";

/** Replaces the root layout when the layout itself fails, so it brings its own document and styles. */
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang={uiEnUS.locale} className="h-full antialiased">
      <body className="min-h-full font-sans">
        <title>{`${uiEnUS.appName} · ${uiEnUS.errorPage.heading}`}</title>
        <ErrorScreen error={error} onRetry={retry} />
      </body>
    </html>
  );
}
