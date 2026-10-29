import legalEnUS from "@/data/legal.en-US.json";
import type { Locale } from "./types";

export type LegalDocName = "privacy" | "terms" | "dpa";

export interface LegalSection {
  heading: string;
  paragraphs?: string[];
  items?: string[];
}

export interface LegalDoc {
  title: string;
  effective: string;
  intro: string[];
  sections: LegalSection[];
}

const legalByLocale: Record<Locale, Record<LegalDocName, LegalDoc>> = {
  "en-US": legalEnUS,
};

export function getLegalDoc(locale: Locale, name: LegalDocName): LegalDoc {
  return legalByLocale[locale][name];
}

/** "[COMPANY NAME]"-style blanks still to be filled in before launch. */
const PLACEHOLDER = /(\[[A-Z][A-Z ]*[A-Z]\])/;

/** Splits text into plain parts and placeholders, so placeholders can be highlighted. */
export function splitPlaceholders(text: string): { text: string; placeholder: boolean }[] {
  return text
    .split(PLACEHOLDER)
    .filter((part) => part !== "")
    .map((part) => ({ text: part, placeholder: PLACEHOLDER.test(part) }));
}
