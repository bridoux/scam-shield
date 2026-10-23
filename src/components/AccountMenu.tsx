import Link from "next/link";
import { signOut } from "@/app/actions/auth";
import type { Member } from "@/lib/auth";
import type { UiStrings } from "@/lib/content";

/** Company name, team link for owners/admins, and sign out. Uses <details> so it works without JS. */
export function AccountMenu({ member, strings }: { member: Member; strings: UiStrings }) {
  const h = strings.home;
  return (
    <details className="relative">
      <summary className="flex cursor-pointer list-none items-center gap-1 rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-slate-800 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent [&::-webkit-details-marker]:hidden">
        <span className="max-w-[9rem] truncate">{member.organizationName}</span>
        <span aria-hidden className="text-slate-500">▾</span>
      </summary>
      <div className="absolute right-0 z-10 mt-2 w-60 rounded-xl bg-white p-2 shadow-lg ring-1 ring-slate-200">
        <p className="truncate px-2 py-1.5 text-xs text-slate-600">{member.displayName}</p>
        <Link href="/team" className="block rounded-lg px-2 py-2 text-sm font-medium text-slate-900 hover:bg-slate-100">
          {h.team}
        </Link>
        <form action={signOut}>
          <button type="submit" className="block w-full rounded-lg px-2 py-2 text-left text-sm font-medium text-slate-900 hover:bg-slate-100">
            {h.signOut}
          </button>
        </form>
      </div>
    </details>
  );
}
