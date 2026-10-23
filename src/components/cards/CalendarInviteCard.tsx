import { CardChrome, Field, type CardProps } from "./shared";

/** Pulls "Oct 30" style dates from the body for the calendar tile. */
function dateTile(body: string): { month: string; day: string } | null {
  const match = body.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+(\d{1,2})\b/);
  return match ? { month: match[1], day: match[2] } : null;
}

export function CalendarInviteCard(props: CardProps) {
  const { scenario, strings } = props;
  const tile = dateTile(scenario.body);
  return (
    <>
      <CardChrome channel="calendar_invite" label={strings.channels.calendar_invite} />
      <div className="px-4 pt-4 pb-5">
        <div className="flex items-start gap-3">
          {tile ? (
            <div aria-hidden className="w-12 shrink-0 overflow-hidden rounded-lg border border-slate-200 text-center">
              <div className="bg-danger py-0.5 text-[10px] font-bold text-white uppercase">{tile.month}</div>
              <div className="py-1 text-lg font-semibold text-slate-900">{tile.day}</div>
            </div>
          ) : null}
          <h2 className="text-lg leading-snug font-semibold text-slate-900">
            <Field field="subject" {...props} />
          </h2>
        </div>
        <p className="mt-3 text-sm text-slate-600">
          <span className="text-slate-500">{strings.cards.organizer}: </span>
          <span className="font-medium text-slate-900">
            <Field field="senderName" {...props} />
          </span>{" "}
          <span className="break-all">
            &lt;<Field field="senderAddress" {...props} />&gt;
          </span>
        </p>
        <div className="mt-4 border-l-4 border-accent/40 pl-3 text-[15px] leading-relaxed break-words whitespace-pre-line text-slate-800">
          <Field field="body" {...props} />
        </div>
        <div aria-hidden className="mt-5 flex gap-2">
          {strings.cards.rsvp.map((label) => (
            <span key={label} className="rounded-full border border-slate-300 px-3 py-1 text-xs text-slate-600">
              {label}
            </span>
          ))}
        </div>
      </div>
    </>
  );
}
