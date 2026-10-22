import de from "./dictionaries/de.js";
import en from "./dictionaries/en.js";
import es from "./dictionaries/es.js";
import fr from "./dictionaries/fr.js";
import pt from "./dictionaries/pt.js";

// To add a language: create lib/dictionaries/<code>.js, import it here and add it to both maps.
export const locales = ["en", "es", "pt", "fr", "de"];
export const defaultLocale = "en";
export const localeNames = { en: "English", es: "Español", pt: "Português", fr: "Français", de: "Deutsch" };

const dictionaries = { en, es, pt, fr, de };
const cache = new Map();

export function isLocale(value) {
  return locales.includes(value);
}

function merge(base, over) {
  if (!over) return base;
  const out = { ...base };
  for (const [key, value] of Object.entries(over)) {
    const isObject = value && typeof value === "object" && !Array.isArray(value);
    out[key] = isObject ? merge(base[key] || {}, value) : value;
  }
  return out;
}

/** The dictionary for a locale. Any missing string falls back to English. */
export function getDict(locale) {
  if (!cache.has(locale)) cache.set(locale, merge(en, dictionaries[locale] === en ? null : dictionaries[locale]));
  return cache.get(locale);
}

export { fmt } from "./format.js";
