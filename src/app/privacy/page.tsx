import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";
import { getStrings } from "@/lib/content";
import { getLegalDoc } from "@/lib/legal";

export const metadata: Metadata = { title: `${getStrings("en-US").appName} · ${getLegalDoc("en-US", "privacy").title}` };

export default function PrivacyPage() {
  return <LegalPage name="privacy" />;
}
