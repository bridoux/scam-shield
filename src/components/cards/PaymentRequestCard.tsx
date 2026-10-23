import { Avatar, CardChrome, Field, type CardProps } from "./shared";

export function PaymentRequestCard(props: CardProps) {
  const { scenario, strings } = props;
  return (
    <>
      <CardChrome channel="payment_request" label={strings.channels.payment_request} />
      <div className="px-4 pt-4 pb-5">
        <h2 className="text-xl font-semibold text-slate-900 tabular-nums">
          <Field field="subject" {...props} />
        </h2>
        <div className="mt-3 flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5">
          <Avatar name={scenario.sender.name} />
          <div className="min-w-0 text-sm">
            <p className="text-xs text-slate-500">{strings.cards.from}</p>
            <p className="font-semibold text-slate-900">
              <Field field="senderName" {...props} />
            </p>
            <p className="break-all text-slate-600">
              <Field field="senderAddress" {...props} />
            </p>
          </div>
        </div>
        <div className="mt-4 text-[15px] leading-relaxed break-words whitespace-pre-line text-slate-800">
          <Field field="body" {...props} />
        </div>
      </div>
    </>
  );
}
