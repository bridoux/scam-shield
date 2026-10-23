import type { Verdict } from "./types";

/** Distance (px) a card must be dragged to count as an answer. */
export const SWIPE_THRESHOLD = 110;
/** A fast flick also counts, as long as it moved at least this far. */
export const FLICK_VELOCITY = 600;
export const FLICK_MIN_DISTANCE = 40;

/** Right = legit, left = scam; returns null when the drag should snap back. */
export function verdictFromDrag(offsetX: number, velocityX: number): Verdict | null {
  const flick = Math.abs(offsetX) >= FLICK_MIN_DISTANCE && Math.abs(velocityX) >= FLICK_VELOCITY;
  if (offsetX >= SWIPE_THRESHOLD || (flick && velocityX > 0 && offsetX > 0)) return "legit";
  if (offsetX <= -SWIPE_THRESHOLD || (flick && velocityX < 0 && offsetX < 0)) return "scam";
  return null;
}
