import type { Channel } from "@/lib/types";

type IconProps = { className?: string };

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function ShieldIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.4 7.5 9.5 4.3-1.1 7.5-4.9 7.5-9.5V6L12 3Z" />
      <path d="m8.8 12 2.2 2.2 4.2-4.4" />
    </svg>
  );
}

export function CheckIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className} strokeWidth={2.4}>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  );
}

export function XIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className} strokeWidth={2.4}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

export function ArrowRightIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className} strokeWidth={2.2}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function FlameIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12 21c3.9 0 6.5-2.6 6.5-6.3 0-3.4-2.3-5.6-3.9-7.6-.4 1.7-1.3 2.9-2.6 3.5.2-3.1-1.1-5.8-3.6-7.6.2 3-1.6 4.9-3.2 7C4.2 11.5 5.5 14 5.5 14.7 5.5 18.4 8.1 21 12 21Z" />
    </svg>
  );
}

export function PlayIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor">
      <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.4-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" />
    </svg>
  );
}

export function ChannelIcon({ channel, className }: IconProps & { channel: Channel }) {
  switch (channel) {
    case "email":
      return (
        <svg {...base} className={className}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m3.5 6.5 8.5 6.5 8.5-6.5" />
        </svg>
      );
    case "sms":
      return (
        <svg {...base} className={className}>
          <path d="M20 12a8 8 0 0 1-11.6 7.1L4 20l1.1-4A8 8 0 1 1 20 12Z" />
        </svg>
      );
    case "voicemail":
      return (
        <svg {...base} className={className}>
          <circle cx="6.5" cy="12" r="3.5" />
          <circle cx="17.5" cy="12" r="3.5" />
          <path d="M6.5 15.5h11" />
        </svg>
      );
    case "chat":
      return (
        <svg {...base} className={className}>
          <path d="M4 5h16v10H9l-5 4V5Z" />
          <path d="M8 9h8M8 12h5" />
        </svg>
      );
    case "payment_request":
      return (
        <svg {...base} className={className}>
          <rect x="3" y="6" width="18" height="12" rx="2" />
          <circle cx="12" cy="12" r="2.5" />
          <path d="M6.5 9.5v.01M17.5 14.5v.01" />
        </svg>
      );
    case "calendar_invite":
      return (
        <svg {...base} className={className}>
          <rect x="3.5" y="5" width="17" height="15" rx="2" />
          <path d="M3.5 10h17M8 3v4M16 3v4" />
        </svg>
      );
  }
}
