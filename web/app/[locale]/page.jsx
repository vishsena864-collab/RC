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
