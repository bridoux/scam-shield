"use client";

import { animate, m, useMotionValue, useTransform, type PanInfo } from "framer-motion";
import { useEffect, useRef, type ReactNode } from "react";
import { SWIPE_THRESHOLD, verdictFromDrag } from "@/lib/swipe";
import type { Verdict } from "@/lib/types";

interface SwipeCardProps {
  children: ReactNode;
  /** The player's answer once given; locks dragging and colors the card edge. */
  answer: Verdict | null;
  correct: boolean | null;
  onSwipe: (verdict: Verdict) => void;
  labels: Record<Verdict, string>;
}

export function SwipeCard({ children, answer, correct, onSwipe, labels }: SwipeCardProps) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-260, 0, 260], [-9, 0, 9]);
  const legitOpacity = useTransform(x, [16, SWIPE_THRESHOLD], [0, 1]);
  const scamOpacity = useTransform(x, [-SWIPE_THRESHOLD, -16], [1, 0]);
  const answeredBySwipe = useRef(false);

  // Answers given with a button or key get a small nudge so the card still reacts.
  useEffect(() => {
    if (!answer) return;
    if (answeredBySwipe.current) {
      answeredBySwipe.current = false;
      return;
    }
    const direction = answer === "legit" ? 1 : -1;
    const controls = animate(x, [0, direction * 56, 0], { duration: 0.45, ease: "easeInOut" });
    return () => controls.stop();
  }, [answer, x]);

  function handleDragEnd(_event: unknown, info: PanInfo) {
    const verdict = verdictFromDrag(info.offset.x, info.velocity.x);
    if (verdict) {
      answeredBySwipe.current = true;
      onSwipe(verdict);
    }
  }

  const ring =
    correct === null ? "ring-slate-200" : correct ? "ring-safe ring-2" : "ring-danger ring-2";

  return (
    <m.div
      drag={answer ? false : "x"}
      dragSnapToOrigin
      dragElastic={0.7}
      onDragEnd={handleDragEnd}
      style={{ x, rotate }}
      whileDrag={{ cursor: "grabbing" }}
      className={`relative overflow-hidden rounded-2xl bg-white shadow-[0_6px_24px_-8px_rgba(15,23,42,0.25)] ring-1 ${ring} ${answer ? "" : "cursor-grab touch-pan-y"}`}
      data-testid="swipe-card"
    >
      {children}
      <m.div
        aria-hidden
        style={{ opacity: legitOpacity }}
        className="pointer-events-none absolute inset-0 flex items-start justify-start bg-safe/15 p-5"
      >
        <span className="-rotate-12 rounded-lg border-4 border-safe bg-white/90 px-3 py-1 text-2xl font-extrabold tracking-wider text-safe uppercase">
          {labels.legit}
        </span>
      </m.div>
      <m.div
        aria-hidden
        style={{ opacity: scamOpacity }}
        className="pointer-events-none absolute inset-0 flex items-start justify-end bg-danger/15 p-5"
      >
        <span className="rotate-12 rounded-lg border-4 border-danger bg-white/90 px-3 py-1 text-2xl font-extrabold tracking-wider text-danger uppercase">
          {labels.scam}
        </span>
      </m.div>
    </m.div>
  );
}
