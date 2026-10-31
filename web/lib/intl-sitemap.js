import { categoryIds } from "./categories.js";
import { locales } from "./i18n.js";
import { languageAlternates } from "./seo.js";
import { SITE_URL } from "./site.js";

// The chat interface is a noindex application, not an acquisition landing page.
// The three creative/music experiences are still English-only. Never list
// non-English duplicates as translated alternates until their main UI exists
// in that language and a native-language reviewer has signed off.
export const ENGLISH_ONLY_EXPERIENCES = ["underground", "poem-wall", "graffiti-wall"];
export const ENGLISH_ONLY_LEGAL = ["terms", "privacy", "cookies"];

export function buildSitemap() {
  const translatedPaths = ["", "/safety", ...categoryIds.map(id => "/chat/" + id)];
  const translated = translatedPaths.flatMap(path =>
    locales.map(locale => ({
      url: SITE_URL + "/" + locale + path,
      changeFrequency: path === "" ? "weekly" : "monthly",
      priority: path === "" ? 1 : path === "/safety" ? 0.5 : 0.8,
      alternates: { languages: languageAlternates(path) }
    }))
  );
  const englishLegal = ENGLISH_ONLY_LEGAL.map(slug => ({
    url: SITE_URL + "/en/" + slug,
    changeFrequency: "yearly",
    priority: 0.3,
  }));
  const englishExperiences = ENGLISH_ONLY_EXPERIENCES.map(slug => ({
    url: SITE_URL + "/en/" + slug,
    changeFrequency: "monthly",
    priority: 0.7,
  }));
  // Deliberately omit lastModified. A fresh "now" on every request would falsely
  // claim meaningful content edits; provide dates only when independently tracked.
  return [...translated, ...englishLegal, ...englishExperiences];
}
