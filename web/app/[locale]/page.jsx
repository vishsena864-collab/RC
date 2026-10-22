import Hero from "@/components/Hero";
import ScrollMotion from "@/components/ScrollMotion";
import JsonLd from "@/components/JsonLd";
import { CategoryGrid, FaqList, GlobeCard, SparkShowcase, Steps, TaglineBand, WhyGrid } from "@/components/Sections";
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
      <div className="home-entertainment">
        <ScrollMotion />
        <Hero locale={locale} dict={dict} />
        <div className="home-content">
          <SparkShowcase locale={locale} dict={dict} />
          <CategoryGrid locale={locale} dict={dict} title={home.catsTitle} sub={home.catsSub} />
          <section className="extra-feature" aria-labelledby="music-room-title">
            <div className="extra-feature-copy">
              <span className="extra-feature-kicker"><span aria-hidden="true">✳</span> OPTIONAL SIDE ROOM · UNDERGROUND FM</span>
              <h2 id="music-room-title">Same strangers. Different soundtrack.</h2>
              <p>ChatSpark is still about meeting new people. If you feel like sharing a track instead of breaking the ice, explore independent music with strangers in a separate room.</p>
            </div>
            <a className="extra-feature-link" href={`/${locale}/underground`}>Explore music rooms <span aria-hidden="true">↗</span></a>
          </section>
          <GlobeCard locale={locale} dict={dict} />
          <Steps title={home.stepsTitle} steps={home.steps} />
          <WhyGrid title={home.whyTitle} items={home.why} />
          <FaqList title={home.faqTitle} items={home.faq} />
        </div>
        <TaglineBand locale={locale} dict={dict} />
      </div>
    </>
  );
}
