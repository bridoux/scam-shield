import { Avatar, CardChrome, Field, type CardProps } from "./shared";

export function EmailCard(props: CardProps) {
  const { scenario, strings } = props;
  return (
    <>
      <CardChrome channel="email" label={strings.channels.email} />
      <div className="px-4 pt-4 pb-5">
        <h2 className="text-lg leading-snug font-semibold text-slate-900">
          <Field field="subject" {...props} />
        </h2>
        <div className="mt-3 flex items-start gap-3">
          <Avatar name={scenario.sender.name} />
          <div className="min-w-0 text-sm">
            <p className="font-semibold text-slate-900">
              <Field field="senderName" {...props} />
            </p>
            <p className="break-all text-slate-600">
              &lt;<Field field="senderAddress" {...props} />&gt;
            </p>
            <p className="text-slate-500">{strings.cards.toMe}</p>
          </div>
        </div>
        <div className="mt-4 text-[15px] leading-relaxed break-words whitespace-pre-line text-slate-800">
          <Field field="body" {...props} />
        </div>
      </div>
    </>
  );
}
