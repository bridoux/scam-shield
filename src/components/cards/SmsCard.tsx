import { Avatar, CardChrome, Field, hasDistinctAddress, type CardProps } from "./shared";

export function SmsCard(props: CardProps) {
  const { scenario, strings } = props;
  return (
    <>
      <CardChrome channel="sms" label={strings.channels.sms} />
      <div className="px-4 pt-5 pb-6">
        <div className="flex flex-col items-center text-center">
          <Avatar name={scenario.sender.name} size="lg" />
          <p className="mt-2 font-semibold break-all text-slate-900">
            <Field field="senderName" {...props} />
          </p>
          {hasDistinctAddress(scenario) ? (
            <p className="text-sm break-all text-slate-600">
              <Field field="senderAddress" {...props} />
            </p>
          ) : null}
          <p className="mt-1 text-xs text-slate-500">
            {strings.cards.textMessage} · {strings.cards.today}
          </p>
        </div>
        <div className="mt-5 max-w-[88%] rounded-2xl rounded-bl-md bg-slate-200/80 px-4 py-3 text-[15px] leading-relaxed break-words whitespace-pre-line text-slate-900">
          <Field field="body" {...props} />
        </div>
      </div>
    </>
  );
}
