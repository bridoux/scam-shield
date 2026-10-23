export type Locale = "en-US";

export type Channel =
  | "email"
  | "sms"
  | "voicemail"
  | "chat"
  | "payment_request"
  | "calendar_invite";

export type Verdict = "legit" | "scam";

export type Industry =
  | "general"
  | "auto_dealer"
  | "tax_cpa"
  | "mortgage_title"
  | "insurance";

export interface RedFlag {
  id: string;
  label: string;
  explanation: string;
  /** Exact substring of the sender, subject or body to highlight. */
  target: string;
}

/** A link shown in the body. Tapping it previews the real destination instead of opening it. */
export interface CardLink {
  /** Exact substring of the body rendered as the link. */
  text: string;
  /** Where the link really goes. */
  url: string;
}

export interface Scenario {
  id: string;
  locale: Locale;
  channel: Channel;
  industry: Industry;
  scamType: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  verdict: Verdict;
  sender: { name: string; address: string };
  subject?: string;
  body: string;
  links?: CardLink[];
  redFlags: RedFlag[];
  legitReason?: string;
  tip: string;
}

/** Everything that would give the answer away before the player commits. */
export type RevealField = "id" | "scamType" | "verdict" | "redFlags" | "legitReason" | "tip";

/** What the player sees before answering. Contains nothing that reveals the verdict. */
export type PublicCard = Omit<Scenario, RevealField>;

/** Sent back once the player has answered. */
export type CardReveal = Pick<Scenario, RevealField>;

export const REVEAL_FIELDS: readonly RevealField[] = ["id", "scamType", "verdict", "redFlags", "legitReason", "tip"];

/** Copies only the public fields, so a field added to Scenario later is never sent by accident. */
export function toPublicCard(scenario: Scenario): PublicCard {
  const { locale, channel, industry, difficulty, sender, subject, body, links } = scenario;
  return {
    locale,
    channel,
    industry,
    difficulty,
    sender: { name: sender.name, address: sender.address },
    ...(subject === undefined ? {} : { subject }),
    body,
    ...(links === undefined ? {} : { links: links.map((l) => ({ text: l.text, url: l.url })) }),
  };
}

export function toReveal(scenario: Scenario): CardReveal {
  const { id, scamType, verdict, redFlags, legitReason, tip } = scenario;
  return legitReason === undefined
    ? { id, scamType, verdict, redFlags, tip }
    : { id, scamType, verdict, redFlags, legitReason, tip };
}
