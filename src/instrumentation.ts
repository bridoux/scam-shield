import type { Instrumentation } from "next";

/**
 * Every server error Next.js catches (pages, server actions, route handlers, the proxy) goes to the
 * error log and, when it is new, to the operator by email (docs/sprints/error-alerts.md).
 * Next.js already prints the error itself, so this only reports it.
 */
export const onRequestError: Instrumentation.onRequestError = async (error, _request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { reportError } = await import("./lib/errors/report");
  await reportError({ source: "server", scope: `${context.routeType} ${context.routePath}`, error, route: context.routePath });
};
