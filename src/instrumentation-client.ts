import { messageOf, reportBrowserError } from "./lib/errors/browser";

// Errors that escape React's error boundaries, e.g. in a click handler (docs/sprints/error-alerts.md).
// Only our own scripts count: errors from browser extensions or injected code are not ours to fix.
window.addEventListener("error", (event) => {
  if (!event.filename?.startsWith(window.location.origin)) return;
  reportBrowserError("error", messageOf(event.error ?? event.message));
});

window.addEventListener("unhandledrejection", (event) => {
  // A failed server action arrives with a digest: the server has already reported it.
  if (event.reason && typeof event.reason === "object" && "digest" in event.reason) return;
  reportBrowserError("rejection", messageOf(event.reason));
});
