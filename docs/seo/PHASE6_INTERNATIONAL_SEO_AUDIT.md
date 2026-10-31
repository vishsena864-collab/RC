# ChatSpark Phase 6 — International SEO and Localization Audit
**Date:** 31 October 2026 · **Review status:** DRAFT / pre-production · **Scope:** English, Spanish, Brazilian-leaning Portuguese, French and German.

## Outcome and release boundaries
This PR stages a complete translation of the **current editorial homepage surface** across five languages, a testable sitemap contract, accurate English-only experience boundaries and more accessible language-availability notices. It is not permission to publish unreviewed translations. Native reviewers and actual browser verification must approve copy before merging. The live site is unchanged while this PR remains open.

## Verified repository architecture
- Next.js App Router uses `/[locale]` for `en, es, pt, fr, de` and renders a language-aware `<html lang>`.
- Current canonical domain is `https://chatsparkrc.com`. Language versions are on one domain, not regional hostnames.
- Existing home, safety, and eight topic landing pages are rendered separately for each supported language; 10 routes × 5 = **50 candidate localized URLs**.
- English terms, privacy and cookies: **3 English-only URLs**; other locale copies are `noindex`.
- Underground FM, Poem Wall and Graffiti Wall have English **primary content**. Their native-language paths exist for navigation, but the product has not been translated. This branch makes all 12 non-English duplicates `noindex,follow` and adds an honest notice directing visitors to English originals or their localized homepage.
- The chat application `/[locale]/start` remains `noindex` and absent from the sitemap.
- Phase 5 six sample guides remain staged on separate PR #18; this PR does not index or import them.

## Before → after
| Aspect | Before | Draft solution |
|---|---|---|
| Homepage hero | Translated subtitle but English main tagline, badges, cards and labels | Locale-specific five-part headline, cards, accessible names and terminal phrases |
| Homepage editorial continuation | Most headings, introductions and navigation CTAs hardcoded in English | Each panel now consumes the same complete `getNostalgiaCopy(locale)` structure |
| Home close | Hardcoded English tagline and action | Locale-specific brand closing and link text |
| Localization source | Strings split between dict and hardcoded JSX | 68 editorial keys per locale in `web/lib/nostalgia-locales.js`; dictionaries remain source for existing FAQ, topics, steps and chat strings |
| English-only experiences | Non-English URLs returned English metadata with no robots/canonical directive | Noindex non-English copies, explicit language availability and in-content `lang=en` semantics |
| Sitemap | 50 localized URLs + 3 English legal URLs; missing 3 English experiences | 50 + 3 + 3 = **56 explicitly indexable URLs** |
| Sitemap lastmod | `lastModified: new Date()` falsely changes each generation | Omit lastmod until meaningful content edit dates are verifiable |
| Tests | Existing Phase 3 meta tests | Add reciprocal hreflang, URL uniqueness, locale shape, noindex boundary and sitemap tests |

## URL and hreflang policy
| Route family | Localized? | Indexed? | Canonical | hreflang | Sitemap |
|---|---|---|---|---|---|
| `/{locale}` | Home editorial draft expanded | Yes, pending native review before merging | Self per language | 5 languages + `x-default → /en` | 5 |
| `/{locale}/chat/{category}` | Existing per-locale titles, copy and topic content | Yes where genuine translation present | Self per language | 5 + `x-default` | 40 |
| `/{locale}/safety` | Existing translated rules | Yes | Self per language | 5 + `x-default` | 5 |
| `/en/terms,privacy,cookies` | English only | Yes | Self | None | 3 |
| `/{locale}/underground,poem-wall,graffiti-wall` | Main product English-only | **Only English** | English self-canonical; non-English noindex with no misleading alternate | None | 3 English only |
| `/{locale}/start` | Interactive app; translations vary | Noindex | None | None | Excluded |
| `/en/guides/**` | Six Phase 5 draft-only pages on separate PR | Noindex | Not published | None | Excluded |

Each full cluster includes reciprocal `hreflang` annotations and the current URL itself. `x-default` points at the English fallback; no automatic browser-language or IP geolocation redirect is introduced. Non-English feature URLs must not be described as translated equivalents.

## Qualitative market / intent screen — NOT keyword volume data
| Language | Candidate natural-language searches, **not verified volumes** | Regional editorial questions | Next validation |
|---|---|---|---|
| English (en) | random text chat with strangers; anonymous chat without sign up | Global / regional English spelling? | Segment GSC queries by country and mobile |
| Spanish (es) | chat aleatorio de texto; chatear con desconocidos sin registro | Spain vs Mexico/LatAm phrasing and slang | Native ES + LatAm speakers compare titles and CTAs |
| Portuguese (pt) | chat aleatório por texto; conversar com desconhecidos sem cadastro | Current copy leans Brazil; Portuguese Portuguese phrasing differs | Brazilian + Portuguese copy editors; no assumed `pt-BR` ranking |
| French (fr) | chat aléatoire sans inscription; discuter avec des inconnus | France vs francophone Canada, Belgium, Africa | Regional review and only split if real distinct content |
| German (de) | Zufallschat ohne Anmeldung; mit Fremden chatten | Germany, Austria, Switzerland | DACH review; no country pages without distinct need |

**Measured search volume, CTR, CPC, ranking and traffic are NOT AVAILABLE** from the connected data. These are example search phrases, not statements of demand or rank.

## Translation and product QA
For each language and each new `NOSTALGIA_LOCALE_COPY` key:
1. Check native grammar, natural rhythm, sensitivity and brand voice; rewrite awkward generated text.
2. Verify that the new copy fits 320px, 375px, 768px and desktop and is visible in server HTML (especially H1); no overflow in German/French.
3. Confirm all adult 18+ disclosure and privacy claims match current policy; never imply verified identities or guaranteed music availability.
4. Compare locale title, description, rendered headline, and page language using URL inspection or SSR.
5. Confirm language switcher and links preserve valid routes; check English-only feature notices.
6. Verify mobile screen-reader output: translated `aria-label`, `<html lang>`, and English `lang=en` where feature UI is untranslated.
7. Test all five self-canonicals and 6 hreflang entries (including fallback) on each of 50 candidate localized pages.
8. Confirm English-only features have no fake alternate tags, canonical English and non-English `noindex`.
9. Test `sitemap.xml`: 56 unique URLs, only genuinely translated clusters, no fake lastmod, no start or draft guide URLs.
10. Have a real responsible native-language reviewer sign off translation, a developer sign off mobile/SSR, and a privacy reviewer sign off safety claims.
11. Only then merge. Watch Search Console's indexed-page, duplicate-page, hreflang, impressions and CTR reports over 28–90 days.

## Deployment and rollback
- Baseline production main at the branch point: `c7b3e8b5cfa4d14abcef238da48557c1b3859168` (Phase 3 PR #16 was already merged).
- Phase 4 PR #17 and Phase 5 PR #18 are **independent draft branches**; no changes were copied from them.
- This phase adds **no redirects, geographic landing pages, subdomains or domain moves**. All existing functional URLs remain.
- Staged preview: `cd web && npm ci && npm run build && node --test lib/international-seo.test.mjs`; confirm CI and Vercel preview as well.
- Production rollback if approved later: revert merge commit; restore previous sitemap and English-only robots behavior, and review whether indexing of feature duplicates has changed. Do not use GSC removals indiscriminately.

## Guidance
- Google: https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites
- Google hreflang: https://developers.google.com/search/docs/specialty/international/localized-versions
- Google canonicals: https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls
- Google sitemap: https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
- Next.js metadata: https://nextjs.org/docs/app/api-reference/functions/generate-metadata
- Next.js locales: https://nextjs.org/docs/app/guides/internationalization
