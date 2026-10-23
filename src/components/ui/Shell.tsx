import Link from "next/link";
import type { ReactNode } from "react";
import { ShieldIcon } from "../icons";

interface ShellProps {
  appName: string;
  children: ReactNode;
  /** Right side of the top bar. */
  accessory?: ReactNode;
}

/** Page frame for the non-game screens: brand bar, then a narrow column of content. */
export function Shell({ appName, children, accessory }: ShellProps) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pt-8 pb-10">
      <div className="flex items-center gap-2">
        <Link href="/" className="flex items-center gap-2 rounded-md text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
          <ShieldIcon className="size-7" />
          <span className="text-lg font-bold tracking-tight text-slate-900">{appName}</span>
        </Link>
        {accessory ? <div className="ml-auto">{accessory}</div> : null}
      </div>
      {children}
    </main>
  );
}

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 ${className}`}>{children}</section>;
}

export function Notice({ tone, children }: { tone: "error" | "success" | "info"; children: ReactNode }) {
  const styles = {
    error: "bg-danger-soft text-danger",
    success: "bg-safe-soft text-safe",
    info: "bg-accent-soft text-accent-strong",
  }[tone];
  return (
    <p role={tone === "error" ? "alert" : "status"} className={`rounded-xl p-3 text-sm font-medium ${styles}`}>
      {children}
    </p>
  );
}
