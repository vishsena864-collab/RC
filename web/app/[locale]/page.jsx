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
          <section style={{background:"#dff977",color:"#121a10",padding:"clamp(30px,6vw,80px)",margin:"0 auto 32px",maxWidth:"1200px",borderRadius:"4px"}}><div style={{font:"800 12px monospace",letterSpacing:".15em"}}>✳ NEW FREQUENCY / CHATSPARK AFTERHOURS</div><h2 style={{fontFamily:"Impact,Arial,sans-serif",letterSpacing:"-.03em",fontSize:"clamp(36px,6vw,74px)",lineHeight:1,margin:"20px 0"}}>GOOD MUSIC.<br/>STRANGE PEOPLE.</h2><p style={{maxWidth:"530px",lineHeight:1.7}}>Listen to independent artists with random strangers. Pass the AUX. Keep the conversation going. No uploads, no profiles, no recordings.</p><a href={`/${locale}/underground`} style={{display:"inline-block",marginTop:18,padding:"16px 25px",font:"900 13px monospace",background:"#151b11",color:"#e2fa83",textDecoration:"none"}}>TUNE INTO UNDERGROUND FM ↗</a></section>
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
