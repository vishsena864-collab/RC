import assert from "node:assert/strict";
import test from "node:test";
import { EN_TOPIC_SEO, EN_EXPERIENCE_SEO } from "./seo-copy.js";
import { experienceMetadata, experienceJsonLd } from "./experience-meta.js";

test("On-page copy has unique concise titles and descriptions", () => {
  const copy = [...Object.values(EN_TOPIC_SEO), ...Object.values(EN_EXPERIENCE_SEO)];
  assert.equal(copy.length, 11);
  assert.equal(new Set(copy.map(x => x.title)).size, 11);
  assert.equal(new Set(copy.map(x => x.description)).size, 11);
  for (const x of copy) {
    assert.ok(x.title.length < 60);
    assert.ok(x.description.length < 155);
  }
});

test("Only English experiences claim canonical metadata", () => {
  for (const slug of Object.keys(EN_EXPERIENCE_SEO)) {
    const en = experienceMetadata("en", slug);
    assert.equal(en.alternates.canonical, "https://chatsparkrc.com/en/" + slug);
    assert.equal(experienceMetadata("es", slug).alternates, undefined);
    const schema = experienceJsonLd(slug);
    assert.equal(schema[0]["@type"], "WebPage");
    assert.equal(schema[1]["@type"], "BreadcrumbList");
  }
});
