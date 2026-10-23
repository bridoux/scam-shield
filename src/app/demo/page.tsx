import type { Metadata } from "next";
import { DemoGame } from "@/components/game/DemoGame";
import { getStrings } from "@/lib/content";

const strings = getStrings("en-US");

export const metadata: Metadata = {
  title: `${strings.appName} · Demo round`,
};

/** Public demo for buyer calls: no sign-in, nothing saved. Cards come from the approved scenarios. */
export default function DemoPage() {
  return <DemoGame strings={strings} />;
}
