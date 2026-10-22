import { defaultLocale, locales } from "./i18n.js";
import { SITE_NAME, SITE_URL } from "./site.js";

const OG_LOCALES = { en: "en_US", es: "es_ES", pt: "pt_BR", fr: "fr_FR", de: "de_DE" };

export const absoluteUrl = (path) => `${SITE_URL}${path}`;

/** hreflang map for a path that exists in every language, plus x-default. */
export function languageAlternates(path) {
  const languages = Object.fromEntries(locales.map((l) => [l, absoluteUrl(`/${l}${path}`)]));
  languages["x-default"] = absoluteUrl(`/${defaultLocale}${path}`);
  return languages;
}

/**
 * Metadata for a page.
 *  - Translated pages get a self canonical plus hreflang alternates.
 *  - `englishOnly` pages (legal text) are only indexed in English; other languages are noindex.
 *  - `noindex` pages (the chat app itself) are never indexed.
 */
export function pageMetadata({ locale, path, title, description, noindex = false, englishOnly = false }) {
  const base = { title, description };

  if (noindex || (englishOnly && locale !== defaultLocale)) {
    return { ...base, robots: { index: false, follow: true } };
  }

  const url = absoluteUrl(`/${locale}${path}`);
  return {
    ...base,
    alternates: { canonical: url, languages: englishOnly ? undefined : languageAlternates(path) },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title,
      description,
      url,
      locale: OG_LOCALES[locale],
    },
    twitter: { card: "summary_large_image", title, description },
  };
}
