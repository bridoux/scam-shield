"use client";

import { useState, type ComponentType } from "react";
import type { UiStrings } from "@/lib/content";
import { flagsByField, type CardField, type NumberedFlag } from "@/lib/highlight";
import type { CardLink, Channel, PublicCard, RedFlag } from "@/lib/types";
import { LinkPreview } from "../LinkPreview";
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
  card: PublicCard;
  strings: UiStrings;
  /** Red flags to highlight; null until the player has answered. */
  redFlags: readonly RedFlag[] | null;
}

export function CardView({ card, strings, redFlags }: CardViewProps) {
  const [preview, setPreview] = useState<CardLink | null>(null);
  const Renderer = RENDERERS[card.channel];
  return (
    <>
      <Renderer
        scenario={card}
        strings={strings}
        flags={redFlags ? flagsByField(card, redFlags) : NO_FLAGS}
        onLink={setPreview}
      />
      <LinkPreview link={preview} strings={strings} onClose={() => setPreview(null)} />
    </>
  );
}
