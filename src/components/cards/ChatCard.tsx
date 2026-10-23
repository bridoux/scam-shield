import { Avatar, CardChrome, Field, type CardProps } from "./shared";

export function ChatCard(props: CardProps) {
  const { scenario, strings } = props;
  return (
    <>
      <CardChrome channel="chat" label={strings.channels.chat} />
      <div className="px-4 pt-4 pb-5">
        <div className="flex items-start gap-3">
          <Avatar name={scenario.sender.name} />
          <div className="min-w-0 flex-1">
            <p className="leading-tight">
              <span className="font-semibold text-slate-900">
                <Field field="senderName" {...props} />
              </span>{" "}
              <span className="text-xs text-slate-500">{strings.cards.today}</span>
            </p>
            <p className="text-xs break-all text-slate-600">
              <Field field="senderAddress" {...props} />
            </p>
            <div className="mt-2 rounded-xl rounded-tl-sm bg-accent-soft px-3 py-2.5 text-[15px] leading-relaxed break-words whitespace-pre-line text-slate-900">
              <Field field="body" {...props} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
