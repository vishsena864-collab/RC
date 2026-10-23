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
          <section className="creative-feature-grid" aria-label="Creative side features">
            <a className="creative-feature-card creative-poem-card" href={`/${locale}/poem-wall`}>
              <div className="creative-card-header"><span>CHATSPARK / 002</span><span>✳ COMMUNITY CURATED</span></div>
              <div className="creative-poem-art" aria-hidden="true"><span>“</span><em>Some words deserve to outlive the stranger who wrote them.</em></div>
              <div className="creative-card-footer"><div><small>THE WRITTEN WALL</small><h3>Poem Wall</h3><p>Anonymous poems. Your likes decide which five survive the week.</p></div><span className="creative-arrow" aria-hidden="true">↗</span></div>
            </a>
            <a className="creative-feature-card creative-graffiti-card" href={`/${locale}/graffiti-wall`}>
              <div className="creative-card-header"><span>CHATSPARK / 003</span><span>↗ MAKE YOUR MARK</span></div>
              <div className="creative-graffiti-art" aria-hidden="true"><span className="creative-paint-splash">✳</span><strong>STAY<br/>WEIRD.</strong><span className="creative-stencil-text">SPRAY / DRAW / VOTE / REPEAT</span></div>
              <div className="creative-card-footer"><div><small>THE ART WALL</small><h3>Graffiti Wall</h3><p>Paint with neon spray, earn likes and download a signed art card.</p></div><span className="creative-arrow" aria-hidden="true">↗</span></div>
            </a>
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
