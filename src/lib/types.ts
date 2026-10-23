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
  redFlags: RedFlag[];
  legitReason?: string;
  tip: string;
}
