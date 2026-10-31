import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { locales, getDict } from "./i18n.js";
import { SITE_URL } from "./site.js";
import { NOSTALGIA_LOCALE_COPY, getNostalgiaCopy } from "./nostalgia-locales.js";
import { buildSitemap, ENGLISH_ONLY_EXPERIENCES } from "./intl-sitemap.js";
import { pageMetadata, languageAlternates } from "./seo.js";
import { experienceMetadata } from "./experience-meta.js";

const shape = (obj) => {
  if (Array.isArray(obj)) return obj.map(shape);
  if (obj && typeof obj === "object") return Object.fromEntries(
    Object.entries(obj).map(([k,v]) => [k,shape(v)])
  );
  return typeof obj;
};

test("All five editorial homepages have complete locale copy, not English fallbacks", () => {
  assert.deepEqual(Object.keys(NOSTALGIA_LOCALE_COPY).sort(), [...locales].sort());
  const en = shape(getNostalgiaCopy("en"));
  for (const locale of locales) {
    const copy = getNostalgiaCopy(locale);
    assert.deepEqual(shape(copy), en, "Missing localized key or card in " + locale);
    assert.equal(copy.hero.lines.length, 5);
    assert.equal(copy.terminal.length, 6);
    assert.equal(Object.keys(copy.hero.cards).length, 5);
    assert.ok(copy.lower.faqP.length >= 15);
    assert.ok(getDict(locale).home.faq.length >= 3);
    for (const line of copy.hero.lines) assert.ok(line.length > 0);
    if (locale !== "en") {
      assert.notEqual(copy.lower.introP, getNostalgiaCopy("en").lower.introP);
      assert.notEqual(copy.hero.status, getNostalgiaCopy("en").hero.status);
    }
  }
});

test("Sitemap entries are unique and hreflang clusters are reciprocal", () => {
  const rows = buildSitemap();
  assert.equal(rows.length, 56, "50 localized pages + 6 English-only pages");
  const urls = new Set(rows.map(row => row.url));
  assert.equal(urls.size, rows.length);
  const languages = Object.keys(languageAlternates(""));
  assert.deepEqual(languages.sort(), [...locales,"x-default"].sort());
  for (const row of rows) {
    assert.ok(row.url.startsWith(SITE_URL + "/"));
    assert.ok(!row.lastModified, "Do not invent lastmod timestamps");
    assert.ok(!row.url.includes("/start"));
    assert.ok(!row.url.includes("/guides/"));
    if (row.alternates) {
      const refs = row.alternates.languages;
      assert.equal(refs[row.url.split("/")[3]], row.url);
      for (const link of Object.values(refs)) assert.ok(urls.has(link));
    }
  }
  for (const slug of ENGLISH_ONLY_EXPERIENCES) {
    assert.ok(urls.has(SITE_URL + "/en/" + slug));
    for (const locale of locales.filter(l => l !== "en"))
      assert.ok(!urls.has(SITE_URL + "/" + locale + "/" + slug));
  }
});

test("Translated pages self-canonicalize; untranslated experiences do not claim an alternate locale", () => {
  for (const locale of locales) {
    const info = pageMetadata({locale,path:"/chat/music",title:"x",description:"y"});
    assert.equal(info.alternates.canonical, SITE_URL + "/" + locale + "/chat/music");
    assert.equal(Object.keys(info.alternates.languages).length, 6);
    for (const slug of ENGLISH_ONLY_EXPERIENCES) {
      const meta = experienceMetadata(locale,slug);
      if (locale === "en") {
        assert.equal(meta.alternates.canonical,SITE_URL + "/en/" + slug);
        assert.ok(!meta.robots);
      } else {
        assert.deepEqual(meta.robots,{index:false,follow:true});
        assert.ok(!meta.alternates);
      }
    }
  }
});

test("Homepage translated content has accessible server-rendered text", () => {
  const home=readFileSync(new URL("../components/NostalgiaHome.jsx",import.meta.url),"utf8");
  const lower=readFileSync(new URL("../components/NostalgiaLower.jsx",import.meta.url),"utf8");
  const closing=readFileSync(new URL("../app/[locale]/page.jsx",import.meta.url),"utf8");
  assert.ok(home.includes("getNostalgiaCopy(locale)"));
  assert.ok(home.includes("c.hero.cards[feature.id][2]"));
  assert.ok(lower.includes("getNostalgiaCopy(locale).lower"));
  assert.ok(closing.includes("getNostalgiaCopy(locale).closing"));
  assert.ok(!home.includes("THE INTERNET USED TO FEEL LIKE SOMETHING."));
  assert.ok(!lower.includes("Unscripted moments."));
});
