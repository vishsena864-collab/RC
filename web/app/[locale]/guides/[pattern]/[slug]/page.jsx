import "../../../../pseo-pilot.css";
import Link from "next/link";
import { notFound } from "next/navigation";
import JsonLd from "@/components/JsonLd";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { PILOT_ROUTES, getPilotGuide, pilotGuidePath, pilotRobots } from "@/lib/pseo-pilot";

export const dynamicParams = false;

// Only six explicitly reviewed route definitions can be built. No arbitrary
// location, language, question or keyword combinations create indexable URLs.
export function generateStaticParams() {
  return PILOT_ROUTES;
}

export async function generateMetadata({ params }) {
  const { locale, pattern, slug } = await params;
  const guide = locale === "en" ? getPilotGuide(pattern, slug) : null;
  if (!guide) return { robots: pilotRobots() };
  return {
    title: guide.title,
    description: guide.description,
    robots: pilotRobots(),
    // Canonical/hreflang/sitemap publication intentionally deferred.
    // No other locale is translated; never assert language alternates.
    openGraph: {
      type: "website",
      title: guide.title,
      description: guide.description,
      url: SITE_URL + pilotGuidePath(guide),
      siteName: SITE_NAME
    },
  };
}

function EvidenceLink({ item }) {
  if (item.href.startsWith("https://")) {
    return <a href={item.href} target="_blank" rel="noopener noreferrer">{item.label} ↗</a>;
  }
  return <Link href={item.href}>{item.label} ↗</Link>;
}

function StartersContent({ guide }) {
  return (
    <>
      <section aria-labelledby="pilot-approach">
        <h2 id="pilot-approach">A better way to use these prompts</h2>
        <ul className="pilot-tips">{guide.approach.map(tip=><li key={tip}>{tip}</li>)}</ul>
      </section>
      <section aria-labelledby="pilot-examples">
        <h2 id="pilot-examples">Seven questions you can actually use</h2>
        <ol className="pilot-questions">
          {guide.prompts.map((item,i)=>(
            <li key={item.question}>
              <span className="pilot-number">{String(i+1).padStart(2,"0")}</span>
              <h3>{item.question}</h3>
              <p><strong>Follow-up:</strong> {item.followUp}</p>
              <p><strong>Why it helps:</strong> {item.reason}</p>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}

function SafetyContent({ guide }) {
  return (
    <>
      <section aria-labelledby="pilot-approach">
        <h2 id="pilot-approach">Keep these boundaries in mind</h2>
        <ul className="pilot-tips">{guide.approach.map(tip=><li key={tip}>{tip}</li>)}</ul>
      </section>
      <section aria-labelledby="pilot-checklist">
        <h2 id="pilot-checklist">A practical step-by-step guide</h2>
        <ol className="pilot-questions">
          {guide.steps.map((step,i)=>(
            <li key={step.heading}>
              <span className="pilot-number">{String(i+1).padStart(2,"0")}</span>
              <h3>{step.heading}</h3>
              <p>{step.explanation}</p>
            </li>
          ))}
        </ol>
      </section>
      <section aria-labelledby="pilot-examples">
        <h2 id="pilot-examples">Examples: safer wording</h2>
        <div className="pilot-comparison">
          {guide.examples.map((item,i)=>(
            <div className="pilot-pair" key={i}>
              <p><span>AVOID</span>{item.unsafe}</p>
              <p><span>INSTEAD</span>{item.safer}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

export default async function PilotGuidePage({ params }) {
  const { locale, pattern, slug } = await params;
  const guide = locale === "en" ? getPilotGuide(pattern, slug) : null;
  if (!guide) notFound();
  const url = SITE_URL + pilotGuidePath(guide);
  const schema = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id": url + "#webpage",
      url, name: guide.title, description: guide.description, inLanguage: "en",
      isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL + "/en" }
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "ChatSpark", item: SITE_URL + "/en" },
        { "@type": "ListItem", position: 2, name: guide.pattern==="chat-safety"?"Chat safety":"Conversation starters", item: url }
      ]
    }
  ];
  return (
    <article className="pilot-guide" aria-labelledby="pilot-title">
      <JsonLd data={schema} />
      <div className="pilot-container">
        <nav className="pilot-breadcrumb" aria-label="Breadcrumb">
          <Link href="/en">ChatSpark</Link><span aria-hidden="true">/</span>
          <span>{guide.pattern==="chat-safety"?"Chat safety":"Conversation starters"}</span>
        </nav>
        <p className="pilot-draft" role="status">DRAFT / CONTENT TEST / NOT INDEXED — NOT HUMAN REVIEWED</p>
        <header className="pilot-hero">
          <span className="pilot-label">CHATSPARK / GUIDE LAB · FOR ADULTS 18+</span>
          <h1 id="pilot-title">{guide.h1}</h1>
          <p className="pilot-dek">{guide.dek}</p>
          <p>{guide.intro}</p>
        </header>
        {guide.pattern==="conversation-starters" ? <StartersContent guide={guide}/> : <SafetyContent guide={guide}/>}
        <section className="pilot-outro" aria-labelledby="pilot-next">
          <h2 id="pilot-next">What to do next</h2>
          <p>{guide.closing}</p>
          <Link href="/en/start" className="pilot-cta">Start a text-only chat ↗</Link>
          <Link href="/en/safety" className="pilot-secondary">Read the safety rules</Link>
        </section>
        <section className="pilot-sources" aria-labelledby="pilot-references">
          <h2 id="pilot-references">Explore related information</h2>
          <ul>{guide.sourceLinks.map(item=><li key={item.href}><EvidenceLink item={item}/></li>)}</ul>
          <p>These are unreviewed editorial drafts. They are not evidence of tested outcomes, and they are intentionally excluded from search results.</p>
        </section>
      </div>
    </article>
  );
}
