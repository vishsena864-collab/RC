import { fmt } from "@/lib/format";
import Link from "next/link";
import { getDict } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";
import { SITE_NAME } from "@/lib/site";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const dict = getDict(locale);
  return pageMetadata({
    locale,
    path: "/safety",
    title: locale === "en" ? "Anonymous Chat Safety Tips & Rules | ChatSpark" : `${dict.meta.safetyTitle} | ${SITE_NAME}`,
    description: locale === "en"
      ? "Learn how to protect your privacy in random chats, use Skip and Report, and understand ChatSpark\'s 18+ community rules."
      : fmt(dict.meta.safetyDescription, { name: SITE_NAME }),
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
      {locale === "en" ? (
        <section aria-labelledby="safety-recap">
          <h2 id="safety-recap">Before your next random chat</h2>
          <p>Keep your phone number, address, workplace and other personal details private. If a conversation becomes uncomfortable, use Skip or Report. ChatSpark is intended for adults aged 18 and over.</p>
          <p><Link href="/en/start">Start a text-only chat after reading the safety rules ↗</Link></p>
        </section>
      ) : null}
    </div>
  );
}
