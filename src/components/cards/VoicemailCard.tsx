import { PlayIcon } from "../icons";
import { Avatar, CardChrome, Field, hasDistinctAddress, type CardProps } from "./shared";

/** Approximate spoken length of a transcript (about 2.6 words per second). */
function duration(text: string): string {
  const seconds = Math.max(5, Math.round(text.split(/\s+/).length / 2.6));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

/** Deterministic pseudo-waveform so the card looks like a voicemail player. */
function bars(seed: string, count = 36): number[] {
  let h = [...seed].reduce((a, c) => (a * 33 + c.charCodeAt(0)) >>> 0, 5381);
  return Array.from({ length: count }, () => {
    h = (h * 1103515245 + 12345) >>> 0;
    return 25 + (h % 75);
  });
}

export function VoicemailCard(props: CardProps) {
  const { scenario, strings } = props;
  return (
    <>
      <CardChrome channel="voicemail" label={strings.channels.voicemail}>
        {strings.cards.today}
      </CardChrome>
      <div className="px-4 pt-4 pb-5">
        <div className="flex items-center gap-3">
          <Avatar name={scenario.sender.name} />
          <div className="min-w-0">
            <p className="font-semibold text-slate-900">
              <Field field="senderName" {...props} />
            </p>
            {hasDistinctAddress(scenario) ? (
              <p className="text-sm text-slate-600">
                <Field field="senderAddress" {...props} />
              </p>
            ) : null}
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3 rounded-xl bg-slate-100 px-3 py-3" aria-hidden>
          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-white">
            <PlayIcon className="size-4" />
          </span>
          <span className="flex h-8 flex-1 items-center gap-[3px] overflow-hidden">
            {bars(scenario.sender.address + scenario.body.slice(0, 40)).map((h, i) => (
              <span key={i} className="w-[3px] shrink-0 rounded-full bg-slate-400" style={{ height: `${h}%` }} />
            ))}
          </span>
          <span className="text-xs text-slate-600 tabular-nums">{duration(scenario.body)}</span>
        </div>
        <p className="mt-4 text-xs font-semibold tracking-wide text-slate-500 uppercase">{strings.cards.transcript}</p>
        <p className="mt-1 text-[15px] leading-relaxed break-words whitespace-pre-line text-slate-800">
          <Field field="body" {...props} />
        </p>
      </div>
    </>
  );
}
