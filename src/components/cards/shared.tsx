import type { ReactNode } from "react";
import { format, type UiStrings } from "@/lib/content";
import { fieldText, type CardField, type NumberedFlag } from "@/lib/highlight";
import type { CardLink, Channel, PublicCard } from "@/lib/types";
import { Highlight } from "../Highlight";
import { ChannelIcon } from "../icons";

export interface CardProps {
  scenario: PublicCard;
  /** Red flags to highlight per field; all empty until the player has answered. */
  flags: Record<CardField, NumberedFlag[]>;
  strings: UiStrings;
  /** Opens the link preview for a link in the body. */
  onLink: (link: CardLink) => void;
}

/** One field of the message, with any red flags (and, in the body, links) in it. */
export function Field({ field, scenario, flags, strings, onLink }: CardProps & { field: CardField }) {
  return (
    <Highlight
      text={fieldText(scenario, field)}
      flags={flags[field]}
      links={field === "body" ? scenario.links : undefined}
      onLink={onLink}
      srLabel={(flag) => format(strings.feedback.redFlag, { number: flag.number })}
      linkLabel={(link) => format(strings.links.linkLabel, { text: link.text })}
    />
  );
}

/** True when the sender has a separate address worth showing under the name. */
export function hasDistinctAddress(scenario: PublicCard): boolean {
  return scenario.sender.address !== scenario.sender.name;
}

export function CardChrome({ channel, label, children }: { channel: Channel; label: string; children?: ReactNode }) {
  return (
    <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold tracking-wide text-slate-600 uppercase">
      <ChannelIcon channel={channel} className="size-4" />
      <span>{label}</span>
      {children ? <span className="ml-auto font-normal normal-case">{children}</span> : null}
    </div>
  );
}

const AVATAR_COLORS = ["bg-sky-700", "bg-emerald-700", "bg-violet-700", "bg-amber-700", "bg-rose-700", "bg-teal-700"];

export function Avatar({ name, size = "md" }: { name: string; size?: "md" | "lg" }) {
  const letters = name.replace(/[^A-Za-z ]/g, "").trim();
  const initials = letters
    ? letters
        .split(/\s+/)
        .slice(0, 2)
        .map((w) => w[0]!.toUpperCase())
        .join("")
    : "#";
  const hash = [...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  const sizing = size === "lg" ? "size-14 text-lg" : "size-10 text-sm";
  return (
    <span
      aria-hidden
      className={`${sizing} ${AVATAR_COLORS[hash % AVATAR_COLORS.length]} inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white`}
    >
      {initials}
    </span>
  );
}
