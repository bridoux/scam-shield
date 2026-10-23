import type { UiStrings } from "@/lib/content";
import { flagsByField, type CardField, type NumberedFlag } from "@/lib/highlight";
import type { Channel, Scenario } from "@/lib/types";
import type { ComponentType } from "react";
import { CalendarInviteCard } from "./CalendarInviteCard";
import { ChatCard } from "./ChatCard";
import { EmailCard } from "./EmailCard";
import { PaymentRequestCard } from "./PaymentRequestCard";
import type { CardProps } from "./shared";
import { SmsCard } from "./SmsCard";
import { VoicemailCard } from "./VoicemailCard";

const RENDERERS: Record<Channel, ComponentType<CardProps>> = {
  email: EmailCard,
  sms: SmsCard,
  voicemail: VoicemailCard,
  chat: ChatCard,
  payment_request: PaymentRequestCard,
  calendar_invite: CalendarInviteCard,
};

const NO_FLAGS: Record<CardField, NumberedFlag[]> = { senderName: [], senderAddress: [], subject: [], body: [] };

interface CardViewProps {
  scenario: Scenario;
  strings: UiStrings;
  /** Show red-flag highlights (after the player answers). */
  revealed: boolean;
}

export function CardView({ scenario, strings, revealed }: CardViewProps) {
  const Renderer = RENDERERS[scenario.channel];
  return <Renderer scenario={scenario} strings={strings} flags={revealed ? flagsByField(scenario) : NO_FLAGS} />;
}
