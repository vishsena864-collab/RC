import "../../../social-motion.css";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/Art";
import JsonLd from "@/components/JsonLd";
import { CategoryGrid, Steps } from "@/components/Sections";
import { categoryIds, getCategory, isCategory } from "@/lib/categories";
import { fmt } from "@/lib/format";
import { getDict, locales } from "@/lib/i18n";
import { absoluteUrl, pageMetadata } from "@/lib/seo";
import { SITE_NAME } from "@/lib/site";
import { EN_TOPIC_SEO } from "@/lib/seo-copy";

export const dynamicParams = false;

export function generateStaticParams() {
  return locales.flatMap((locale) => categoryIds.map((category) => ({ locale, category })));
}

export async function generateMetadata({ params }) {
  const { locale, category } = await params;
  if (!isCategory(category)) return {};
  const cat = getDict(locale).cats[category];
  const english = locale === "en" ? EN_TOPIC_SEO[category] : null;
  return pageMetadata({
    locale,
    path: `/chat/${category}`,
    title: english?.title || `${cat.title} | ${SITE_NAME}`,
    description: english?.description || cat.intro,
  });
}

export default async function CategoryPage({ params }) {
  const { locale, category } = await params;
  if (!isCategory(category)) notFound();
  const dict = getDict(locale);
  const cat = dict.cats[category];
  const meta = getCategory(category);

  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: dict.categoryPage.breadcrumbHome, item: absoluteUrl(`/${locale}`) },
      { "@type": "ListItem", position: 2, name: cat.name, item: absoluteUrl(`/${locale}/chat/${category}`) },
    ],
  };

  return (
    <>
      <JsonLd data={breadcrumbs} />
      <div className="container">
        <nav aria-label="Breadcrumb" className="crumbs">
          <Link href={`/${locale}`}>{dict.categoryPage.breadcrumbHome}</Link> <span aria-hidden="true">/</span> <span>{cat.name}</span>
        </nav>

        <section className="hero-card compact" style={{ "--accent": meta.accent }} aria-labelledby="cat-h">
          <span className="card-avatar big">
            <Avatar n={meta.avatar} size={120} priority />
            <span className="card-emoji" aria-hidden="true">
              {meta.icon}
            </span>
          </span>
          <h1 id="cat-h">{cat.h1}</h1>
          <p className="lead">{cat.intro}</p>
          <Link href={`/${locale}/start?category=${category}`} className="btn btn-glow btn-large">
            {fmt(dict.categoryPage.startIn, { category: cat.name })}
          </Link>
          <p className="note">{dict.home.ctaNote}</p>
        </section>

        <Steps title={fmt(dict.categoryPage.howTitle, { category: cat.name })} steps={dict.home.steps} />
        {locale === "en" && EN_TOPIC_SEO[category] ? (
          <section className="container topic-conversation-guide" aria-labelledby="conversation-guide-heading">
            <h2 id="conversation-guide-heading">{EN_TOPIC_SEO[category].heading}</h2>
            <p>{EN_TOPIC_SEO[category].introduction}</p>
            <ul>
              {EN_TOPIC_SEO[category].prompts.map((prompt) => <li key={prompt}>{prompt}</li>)}
            </ul>
            {EN_TOPIC_SEO[category].links?.length ? (
              <p className="topic-related-links">
                {EN_TOPIC_SEO[category].links.map((link) => (
                  <Link key={link.href} href={`/${locale}${link.href}`}>{link.text} ↗</Link>
                ))}
              </p>
            ) : null}
            <Link href={`/${locale}/start?category=${category}`} className="topic-guide-cta">
              Start a {cat.name.toLowerCase()} text chat ↗
            </Link>
          </section>
        ) : null}
        <CategoryGrid locale={locale} dict={dict} title={dict.categoryPage.otherTopics} exclude={category} />
      </div>
    </>
  );
}
