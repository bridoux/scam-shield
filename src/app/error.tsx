"use client";

import { ErrorScreen } from "@/components/ErrorScreen";

export default function PageError({ error, retry }: { error: unknown; retry: () => void }) {
  return <ErrorScreen error={error} onRetry={retry} />;
}
