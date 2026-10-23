"use client";

import { useState } from "react";
import { answerDemoAction, startDemoAction } from "@/app/actions/demo";
import type { UiStrings } from "@/lib/content";
import { Game } from "../Game";
import { createDemoSource } from "./source";

/** The public demo: no sign-in, saves nothing, and still never ships answers ahead of time. */
export function DemoGame({ strings }: { strings: UiStrings }) {
  const [source] = useState(() => createDemoSource({ start: startDemoAction, answer: answerDemoAction }));
  return <Game source={source} strings={strings} variant="demo" startNote={strings.start.demoNote} />;
}
