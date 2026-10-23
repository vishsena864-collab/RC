import NostalgiaHome from "@/components/NostalgiaHome";
import JsonLd from "@/components/JsonLd";
import { CategoryGrid, FaqList, GlobeCard, SparkShowcase, Steps, WhyGrid } from "@/components/Sections";
import Link from "next/link";
import { fmt } from "@/lib/format";
import { getDict } from "@/lib/i18n";
import { absoluteUrl, pageMetadata } from "@/lib/seo";
import { SITE_NAME } from "@/lib/site";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const dict = getDict(locale);
  return pageMetadata({
    locale,
    path: "",
    title: fmt(dict.meta.homeTitle, { name: SITE_NAME }),
    description: fmt(dict.meta.homeDescription, { name: SITE_NAME }),
  });
}

export default async function HomePage({ params }) {
  const { locale } = await params;
  const dict = getDict(locale);
  const home = dict.home;

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: SITE_NAME,
      url: absoluteUrl(`/${locale}`),
      inLanguage: locale,
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: home.faq.map((f) => ({
        "@type": "Question",
        name: fmt(f.q, { name: SITE_NAME }),
        acceptedAnswer: { "@type": "Answer", text: fmt(f.a, { name: SITE_NAME }) },
      })),
    },
  ];

  return (
    <>
      <JsonLd data={structuredData} />
      <div className="home-entertainment nostalgia-home">
        <NostalgiaHome locale={locale} dict={dict} />
        <div className="home-content nostalgia-lower">
          <section className="nostalgia-letterhead" aria-label="Explore ChatSpark"><span>NO ALGORITHMS. NO PROFILES. NO SCROLLING FOREVER.</span><h2>A little more human.<br/><em>A lot less ordinary.</em></h2><p>Sometimes a conversation is all you need. Sometimes a song, a game, or a few words can start something unexpected. The choice is yours.</p></section>
          <SparkShowcase locale={locale} dict={dict} />
          <CategoryGrid locale={locale} dict={dict} title={home.catsTitle} sub={home.catsSub} />
          <GlobeCard locale={locale} dict={dict} />
          <Steps title={home.stepsTitle} steps={home.steps} />
          <WhyGrid title={home.whyTitle} items={home.why} />
          <FaqList title={home.faqTitle} items={home.faq} />
        </div>
        <section className="nostalgia-closing" aria-labelledby="nostalgia-closing-heading"><span>THE END? NOT REALLY.</span><h2 id="nostalgia-closing-heading">A stranger today.<br/><em>A story tomorrow.</em></h2><p>Start with hello. The rest is up to the two of you.</p><Link href={`/${locale}/start`}>MEET SOMEONE NEW <span aria-hidden="true">→</span></Link></section>
      </div>
    </>
  );
}
