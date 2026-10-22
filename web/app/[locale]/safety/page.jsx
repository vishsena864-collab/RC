import { fmt } from "@/lib/format";
import { getDict } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";
import { SITE_NAME } from "@/lib/site";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const dict = getDict(locale);
  return pageMetadata({
    locale,
    path: "/safety",
    title: `${dict.meta.safetyTitle} | ${SITE_NAME}`,
    description: fmt(dict.meta.safetyDescription, { name: SITE_NAME }),
  });
}

export default async function SafetyPage({ params }) {
  const { locale } = await params;
  const safety = getDict(locale).safety;

  return (
    <div className="container prose">
      <h1>{safety.h1}</h1>
      <p className="lead">{fmt(safety.intro, { name: SITE_NAME })}</p>
      <ol className="rules">
        {safety.rules.map((r) => (
          <li key={r.t}>
            <h2>{r.t}</h2>
            <p>{fmt(r.d, { name: SITE_NAME })}</p>
          </li>
        ))}
      </ol>
      <p className="callout">{safety.emergency}</p>
    </div>
  );
}
