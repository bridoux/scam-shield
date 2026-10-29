import { Shell } from "@/components/ui/Shell";
import { getStrings } from "@/lib/content";
import { getLegalDoc, splitPlaceholders, type LegalDocName } from "@/lib/legal";

const strings = getStrings("en-US");

/** Text with "[COMPANY NAME]"-style blanks highlighted, so unfinished wording is obvious. */
function Text({ value }: { value: string }) {
  return (
    <>
      {splitPlaceholders(value).map((part, i) =>
        part.placeholder ? (
          <mark key={i} className="rounded bg-flag px-0.5 text-slate-900">
            {part.text}
          </mark>
        ) : (
          part.text
        ),
      )}
    </>
  );
}

export function LegalPage({ name }: { name: LegalDocName }) {
  const doc = getLegalDoc("en-US", name);
  return (
    <Shell appName={strings.appName}>
      <article className="mt-10 text-slate-800" data-testid={`legal-${name}`}>
        <h1 className="text-[1.75rem] leading-tight font-bold tracking-tight text-slate-900">{doc.title}</h1>
        <p className="mt-1 text-sm text-slate-600">
          <Text value={doc.effective} />
        </p>
        {doc.intro.map((p, i) => (
          <p key={i} className="mt-4 leading-relaxed">
            <Text value={p} />
          </p>
        ))}
        {doc.sections.map((section) => (
          <section key={section.heading} className="mt-8">
            <h2 className="text-lg font-semibold text-slate-900">{section.heading}</h2>
            {section.paragraphs?.map((p, i) => (
              <p key={i} className="mt-2 leading-relaxed">
                <Text value={p} />
              </p>
            ))}
            {section.items ? (
              <ul className="mt-2 list-disc space-y-1.5 pl-5 leading-relaxed">
                {section.items.map((item, i) => (
                  <li key={i}>
                    <Text value={item} />
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}
      </article>
    </Shell>
  );
}
