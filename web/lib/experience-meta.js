import { EN_EXPERIENCE_SEO } from "./seo-copy.js";
import { SITE_NAME, SITE_URL } from "./site.js";

// The interactive experiences have English user-facing content today.
// Do not assert unverified hreflang alternatives until these pages are translated.
export function experienceMetadata(locale, slug) {
  const item = EN_EXPERIENCE_SEO[slug];
  if (!item) throw new Error("Unknown experience slug: " + slug);
  const url = SITE_URL + "/en/" + slug;
  const base = { title: item.title, description: item.description };
  // The three interactive experiences currently render their main content in
  // English in every route. Mark untranslated copies noindex until a native
  // language review and a full feature localization are complete.
  if (locale !== "en") {
    return { ...base, robots: { index: false, follow: true } };
  }
  return {
    ...base,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      title: item.title,
      description: item.description,
      url,
      siteName: SITE_NAME,
      locale: "en_US",
    },
    twitter: { card: "summary", title: item.title, description: item.description },
  };
}

export function experienceJsonLd(slug) {
  const item = EN_EXPERIENCE_SEO[slug];
  if (!item) throw new Error("Unknown experience slug: " + slug);
  const url = SITE_URL + "/en/" + slug;
  return [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id": url + "#webpage",
      url,
      name: item.title,
      description: item.description,
      inLanguage: "en",
      isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL + "/en" }
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL + "/en" },
        { "@type": "ListItem", position: 2, name: item.heading, item: url }
      ]
    }
  ];
}
