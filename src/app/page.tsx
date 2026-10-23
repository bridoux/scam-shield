import { Game } from "@/components/Game";
import { getScenarios, getStrings } from "@/lib/content";

export default function Home() {
  const locale = "en-US";
  return <Game scenarios={getScenarios(locale)} strings={getStrings(locale)} />;
}
