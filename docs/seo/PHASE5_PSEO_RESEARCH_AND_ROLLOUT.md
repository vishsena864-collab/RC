# ChatSpark Phase 5: Controlled programmatic SEO architecture
**Research date:** 2026-10-31 · **Status:** DRAFT / no production publication · **Branch:** seo/phase5-pseo-safe-pilot-2026-10-31

## Decision
Build **two** distinct informational patterns only, with **six fixed, hand-curated sample pages** on staging. Do not build 30–50 new URLs or let them index until primary search demand, uniqueness and usefulness are verified. The current pilot is intentionally excluded from the sitemap and marked `noindex,follow` even if accidentally merged.

The selected patterns describe information, **not** fake topic-specific live chat rooms or unverified city-targeted matching.

## 1. Pattern demand, intent and competition screen
The cited search results are **qualitative proof that relevant pages exist in web search**, not keyword-volume measurements or proof of our ranking. The prior Phase 2 keyword spreadsheet contains research candidates, not measured demand. All volume/CPC/SEO difficulty/aggregate volume fields remain **NOT MEASURED** until GSC or a licensed keyword provider supplies data.

| # | Search pattern | Example keywords | Intent | Observed competing source | Impact/Effort/Confidence | Decision |
|---|---|---|---|---|---|---|
| 1 | Conversation starters for [interest] | music conversation starters for strangers; gaming chat questions; movie chat openers | Informational then chat | https://chatix.chat/blog/conversation-starters-for-online-chat/ and https://opentalk.buzz/blog/conversation-starters-for-strangers | 4/3/Medium | **SELECT**: real prompt + follow-up + reasoning for each interest |
| 2 | Random chat safety for [situation] | first anonymous chat safety; what not to share in stranger chat; what to do after unsafe chat | Safety/informational | https://www.onlinesafety.lk/safe_use_items/chat_rooms | 5/3/Medium | **SELECT**: practical decision steps, examples, honest limitations; legal review required |
| 3 | Text chat games for [format] | games for two strangers over text; word games in chat | Informational/game | https://www.yappochat.com/blog/games-to-play-over-text | 3/4/Medium | Hold: overlaps future conversation guide and requires functional demonstrations |
| 4 | Poetry prompt challenges by [theme] | surprise poetry prompts; midnight poetry writing challenge | Creative exercise | https://www.poetrysoup.com/poetry/challenges/poetry-wheel.aspx | 3/5/Medium | Hold: first obtain truly original submissions and consent; do not create empty prompt pages |
| 5 | Graffiti challenge idea by [theme] | neon graffiti prompt; digital art challenge ideas | Inspiration/creation | Current ChatSpark art UI; separate SERP volume unknown | 3/5/Low | Hold: requires unique demos/media per topic, not just text substitutions |
| 6 | [Platform] vs [platform] text chat | Omegle text alternative vs Emerald; ChatSpark vs Chitchat | Comparison/decision | https://textxy.com/omegle-text-alternatives | 4/5/Medium | Reject at scale: editorial, dated hands-on comparisons only |
| 7 | Random chat with people in [city/country] | random chat Colombo; talk to strangers London | Localized navigational | Google doorway-abuse policy | 2/5/High | **REJECT**: no verified location-filtering or location-specific product; doorway risk |
| 8 | Listen to music with strangers by [genre] | online music room for jazz; indie listening room | Entertainment | Current Underground FM genre UI, not verified independent rooms | 3/4/Low | Reject at scale: risk of claiming genre-dedicated rooms that don't exist |
| 9 | Random chat in [language] | chat with strangers in Spanish; anonymous chat German | Locale/navigational | Existing translated URL structure | 4/4/Medium | Hold: native translated body content + language-specific availability not verified |

**No estimated aggregate search volume is presented:** combining unmeasured values would fabricate demand. Use GSC performance queries by target country and device first; optional external keyword provider export adds volume, CPC and difficulty.

## 2. Pilot information architecture

`/en/guides/conversation-starters/{music|gaming|movies}`

`/en/guides/chat-safety/{first-chat|personal-details|uncomfortable-chat}`

All six routes are **English-only** and generated from an explicit static allowlist in `web/lib/pseo-pilot.js`. Each has distinctive main content:
- Conversation starters: 7 original questions, 7 separate follow-ups, 7 contextual explanations, intro and topic-specific advice, relevant topic CTA.
- Safety: scenario-specific boundaries, 5 practical steps, 3 contrasting examples, contextual caveats and links to safety/privacy guidance.

**No location/language/brand/input combinations create new pages.** Invalid parameters return 404. Static generation uses Next.js `generateStaticParams` and `dynamicParams=false`.

### Data model
`{pattern,slug,title,description,h1,dek,intro,approach,closing,sourceLinks,reviewStatus}`
- Starter guide additionally includes `{topic,prompts:[{question,followUp,reason}]}`.
- Safety guide additionally includes `{steps:[{heading,explanation}],examples:[{unsafe,safer}]}`.

All content remains `reviewStatus:"draft-unreviewed"`; this is a quality-state label, **not** an invented human edit history.

### Page rendering and JSON-LD
The pilot Next.js server component renders its title, intro, examples and contextual CTA in page HTML. It also renders conservative `WebPage` and `BreadcrumbList` JSON-LD. No fake author, `Review`, `AggregateRating`, or FAQ rich-result promises. The draft intentionally does **not** publish canonical or hreflang assertions or any new sitemap entries.

```jsx
export const dynamicParams = false;
export function generateStaticParams() { return PILOT_ROUTES; }
export async function generateMetadata({params}) {
  const {locale,pattern,slug}=await params;
  const guide=locale==="en"?getPilotGuide(pattern,slug):null;
  if(!guide) return {robots:{index:false,follow:true}};
  return {title:guide.title,description:guide.description,robots:{index:false,follow:true}};
}
```

## 3. Mandatory indexation release gate (not implemented in this PR)
A future **separately approved PR** may allowlist only editorially approved URLs and add their **self-canonical** metadata and links from relevant published hubs. Only after genuine review should an approved URL be included in the live sitemap.

```js
// Illustrative FUTURE snippet. Do NOT place in live sitemap today.
const approved = REVIEWED_GUIDES.filter(g => g.reviewStatus === "approved-for-index");
const seoEntries = approved.map(g => ({
  url: SITE_URL + "/en/guides/" + g.pattern + "/" + g.slug,
  lastModified: new Date(g.lastSubstantiveEditAt),
  changeFrequency: "monthly",
  priority: 0.5,
}));
// Return [...existingSitemapEntries, ...seoEntries] in an approved release only.
```

The current sitemap remains unchanged; `robots.txt` must not block these pages when `noindex` is needed. Existing locale hreflang maps must **not** be copied to English-only guide URLs.

## 4. Originality, spam and policy gates
**Machine prechecks (in CI)**:
- Explicit six-route inventory; invalid combinations 404.
- Title 25–59 chars; description 90–154 chars; all titles/H1/descriptions unique.
- 65+ original intro words; at least 3 tailored approach notes.
- Starter pages: 7 genuinely distinct prompts, each with a follow-up and why.
- Safety pages: 5 detailed steps, 3 meaningful contrasting examples, evidence links.
- Pairwise intro-token Jaccard similarity < 0.46. A low score is **not** proof of actual originality.
- Noindex function returns `{index:false,follow:true}`; no guide URL in sitemap.

**Human release checks**:
- 2 independent reviewers assess 20 samples before scaling. With only 6 pilot pages, review **all six**, then 20 of the first proposed 30–50 batch.
- Every page must answer a different user intent; compare with `/en/chat/{category}`, `/en/safety` and any existing editorial pillar.
- Source evidence and factual claims checked. Safety content gets operator/moderation/privacy review.
- At least two verifiable distinct-useful elements beyond shared boilerplate (original decisions/examples, real tested product flow, consent-cleared screenshots, current technical data).
- All linked product experiences tested with real browser sessions. No forced redirects, no misleading engagement claims.
- Human proofread for accuracy, originality, accessibility, and mobile layout. No claim of authorship/testing not actually performed.
- If a page fails any gate: leave noindex or remove; consolidate genuine overlaps rather than publish variations.

## 5. Test and pre-launch plan
1. `cd web && npm ci && npm run build && node --test lib/pseo-pilot.test.mjs`.
2. Check all 6 routes on Vercel PR preview: HTTP 200, rendered H1 and paragraphs without client-side JS, and usable CTAs.
3. Check invalid slug, non-English locale and unapproved keywords: HTTP 404.
4. Inspect HTML for `<meta name="robots" content="noindex,follow">` or equivalent, JSON-LD, accurate language and single H1.
5. Check 375px/768px/desktop, keyboard navigation, contrast and LCP/INP/CLS in Lighthouse. Device lab data not yet collected.
6. Verify sitemap has **zero** pilot URL entries; check robots crawl rules.
7. Perform page-to-page and page-to-existing content duplicate analysis.
8. Manually inspect 20 samples before any 30–50 expansion; no such expansion is authorized now.
9. Record Search Console live inspection and indexing as **not measured** until access.

## 6. Phased rollout and measurement (future, conditional)
- **Stage A (now):** six unreviewed noindex drafts on PR preview, zero production changes.
- **Stage B:** complete editorial review, GSC baseline, verify a few representative queries per pattern by market. If no evidence of demand or unique value, stop.
- **Stage C:** separately approve 6 reviewed indexed URLs (or fewer), then inspect rendering, indexing, impressions, CTR and engagement over 28–90 days.
- **Stage D:** 30–50 pages only if there are real distinct topics and authors/reviewers can supply original evidence for each. Monitor indexed %, search impressions, actual organic visits and post-click chat starts.
- **Pruning:** review pages with "Crawled—currently not indexed" or zero impressions after ~90 days; investigate before noindex, merge, or 301 redirect. Do not blindly prune genuinely useful pages based on a single metric.
- At ChatSpark's present page count, crawl-budget engineering is not a bottleneck. A sitemap file supports up to 50,000 URLs / 50MB; split if genuinely necessary at scale, not now.

## 7. Risk and rollback
- No new public production URLs, no change to robots, redirects, sitemap, or existing canonical metadata.
- Preview branch from baseline main commit `c7b3e8b5cfa4d14abcef238da48557c1b3859168`. Phase 4 editorial-standards PR #17 is independent and remains staged.
- Rollback: close this PR. If ever merged by mistake, revert the merge and ensure pilot URLs keep `noindex`.
- Pilot content is a **draft produced with AI assistance** and not represented as verified user-testing or human-authored experience. Human review and meaningful first-hand additions are mandatory before indexing.

## Research references
- Google scaled-content/doorway policy: https://developers.google.com/search/docs/essentials/spam-policies
- Helpful people-first content: https://developers.google.com/search/docs/fundamentals/creating-helpful-content
- Noindex guidance: https://developers.google.com/search/docs/crawling-indexing/block-indexing
- Sitemaps: https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
- Chat-specific competing starter example: https://chatix.chat/blog/conversation-starters-for-online-chat/
- Text chat games example: https://www.yappochat.com/blog/games-to-play-over-text
- Poetry challenge: https://www.poetrysoup.com/poetry/challenges/poetry-wheel.aspx
- Evidence-based community chat safety: https://www.onlinesafety.lk/safe_use_items/chat_rooms
