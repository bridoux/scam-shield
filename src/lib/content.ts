import scenariosEnUS from "@/data/scenarios.en-US.json";
import uiEnUS from "@/data/ui.en-US.json";
import type { Locale, Scenario } from "./types";

export type UiStrings = typeof uiEnUS;

const scenariosByLocale: Record<Locale, Scenario[]> = {
  "en-US": scenariosEnUS as Scenario[],
};

const stringsByLocale: Record<Locale, UiStrings> = {
  "en-US": uiEnUS,
};

export function getScenarios(locale: Locale): Scenario[] {
  return scenariosByLocale[locale];
}

export function getStrings(locale: Locale): UiStrings {
  return stringsByLocale[locale];
}

/** Replaces {name} placeholders in a UI string. */
export function format(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}

export function scamTypeLabel(strings: UiStrings, scamType: string): string {
  return (strings.scamTypes as Record<string, string>)[scamType] ?? scamType.replace(/_/g, " ");
}
