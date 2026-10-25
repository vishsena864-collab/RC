import { categoryIds } from "@/lib/categories";
import { locales } from "@/lib/i18n";
import { languageAlternates } from "@/lib/seo";
import { SITE_URL } from "@/lib/site";

// Every translated page is listed once per language, each pointing at its siblings with hreflang.
// The chat app (/start) is deliberately absent; the English-only legal pages are listed in English only.
export default function sitemap() {
  const lastModified = new Date();
  const paths = ["", "/safety", ...categoryIds.map((id) => `/chat/${id}`)];

  const translated = paths.flatMap((path) =>
    locales.map((locale) => ({
      url: `${SITE_URL}/${locale}${path}`,
      lastModified,
      changeFrequency: path === "" ? "daily" : "weekly",
      priority: path === "" ? 1 : path === "/safety" ? 0.5 : 0.8,
      alternates: { languages: languageAlternates(path) },
    })),
  );

  const legal = ["/terms", "/privacy", "/cookies"].map((path) => ({
    url: `${SITE_URL}/en${path}`,
    lastModified,
    changeFrequency: "yearly",
    priority: 0.3,
  }));

  return [...translated, ...legal];
}
