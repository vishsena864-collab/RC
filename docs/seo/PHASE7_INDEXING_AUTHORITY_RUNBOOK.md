# ChatSpark SEO Phase 7 — Search Console, indexing monitor, and earned authority
**Prepared:** 31 October 2026 · **Current release:** main at `c7b3e8b5cfa4d14abcef238da48557c1b3859168` · **Status:** draft PR, no live SEO changes

## Evidence ledger — what is and is not verified
| Topic | Finding | Evidence / limitation |
|---|---|---|
| Primary canonical domain | `https://chatsparkrc.com` | Current Next.js site defaults and Vercel verified domain configuration |
| www and Vercel aliases | Project domains verified; Next.js code redirects www → apex | Domain redirects configured in `web/next.config.mjs`; external HTTP behavior could not be retrieved from this execution environment |
| Sitemap source on **current main** | **53 configured entries** (5 × [home + safety + 8 chat topics] + 3 English legal) | `web/app/sitemap.js`; **not a verified live XML fetch** |
| Missing from current sitemap source | `/en/underground`, `/en/poem-wall`, `/en/graffiti-wall` | Phase 6 draft PR #19 adds them, for 56 proposed URLs — it is **not merged** |
| Sitemap lastmod | Current generator sets `new Date()` per build | Phase 6 draft removes misleading dynamic date |
| Robots policy | Intended to allow site crawling and announce `/sitemap.xml` | `web/app/robots.js`, not live Googlebot evidence |
| Start/chat app `/en/start` | Noindex in metadata code; deliberately not in sitemap | `web/app/[locale]/start/page.jsx` |
| English-only feature replicas | Non-English routes currently have English body content | Phase 6 proposes noindex; do not represent live change as complete |
| Ownership verification | **UNKNOWN** | A Google verification TXT value was provided to the user for Namecheap; no Search Console account check or proof of saved TXT is available |
| Search Console performance | **NOT AVAILABLE** | No authorized Search Console connection or user report supplied |
| Indexed URLs / URLs excluded / manual actions | **NOT AVAILABLE** | Do not infer from source, Vercel READY, or `site:` search |
| Live endpoint fetch | **UNVERIFIED** | Direct requests in available test environments failed at DNS/network access; not proof Googlebot cannot access the site |
| Phase 4 / Phase 5 / Phase 6 | Open draft PRs #17/#18/#19 | Separate, not deployed to production |

**Key distinction:** A configured sitemap URL is not an indexed URL. Search Console ownership, sitemap fetch success and Google-selected canonical must be checked in Google's own UI. The public technical monitor in this branch cannot answer indexing questions.

## 1. Google Search Console first-party validation — owner actions
1. Open `https://search.google.com/search-console`, select or create the **Domain property** `chatsparkrc.com`, and check if Google shows **Ownership verified**. If not, confirm the Namecheap root TXT verification record and retry; do not remove the site's A/CNAME records.
2. Open **Sitemaps**, submit `https://chatsparkrc.com/sitemap.xml` (or `sitemap.xml` in the prefix box), and record **Submitted, Last read, Status, Discovered pages**. If previously submitted, do not submit duplicates; inspect its current status.
3. Open **Pages** > **Page indexing**. Export counts and reason categories, distinguishing `Discovered — currently not indexed`, `Crawled — currently not indexed`, `Duplicate, Google chose different canonical`, `Blocked by robots.txt`, `Excluded by noindex`, and genuine server errors.
4. Use **URL Inspection** for `/en`, `/es`, `/pt`, `/fr`, `/de`, `/en/safety`, `/en/chat/general`, `/en/underground`, `/en/poem-wall`, `/en/graffiti-wall` and `/en/start`. Record the **indexed version** AND the separate **live test** (if available), Google-selected canonical and whether the URL is on Google. Request indexing only for eligible indexable pages that need it, not for `/start` or unapproved draft guides. URL Inspection API can read the indexed status with authorized Google credentials but does not equal an indexing-submission API.
5. Open **Performance → Search results** and export **Pages**, **Queries**, **Countries**, **Devices**, and **Dates** for the same completed range (start with last 28 days; compare to previous 28 once data exists). Capture clicks, impressions, CTR and position from Google, not from estimates.
6. Check **Core Web Vitals**, **HTTPS** and **Manual actions**. Treat missing data as unavailable, not zero or passing.
7. Upload owner-exported CSV/Excel files to the report workbook. No Google credentials are required for manual exports and none should be emailed or stored in GitHub.

**Property nuance:** for the Domain property the Search Console API property ID is `sc-domain:chatsparkrc.com`; for URL-prefix properties it is `https://chatsparkrc.com/`. Use whichever property is actually verified. Submitting a sitemap or requesting indexing does not guarantee indexation.

## 2. Public technical monitor added in this PR
- `web/scripts/seo-public-monitor.mjs` — checks robots.txt, sitemap.xml and **13 public page URLs**, with up to three concurrent reads, 18s timeout and no tracking.
- Validates HTTP/network status, core sitemap membership, missing/double URLs, homepage hreflang count, HTML title, description, H1 count, canonical and noindex policy.
- The `/es/underground` translated-replica gap produces a **warning** until Phase 6 is approved.
- Emits dated Markdown + JSON reports in `seo-health-reports/`. Google metrics are recorded as **null/unknown**, never fabricated.
- `web/scripts/seo-public-monitor.test.mjs` validates parsing, noindex and outage reporting against local fixture responses; wired into frontend CI.
- `.github/workflows/seo-public-health.yml` proposes **manual dispatch and every-Monday 03:23 UTC** GitHub Actions runs only **after PR merge**. Reports are visible in run summary + retained as action artifacts for 90 days. No external accounts, emails, Search Console reads or chat-user data are accessed.
- **How to run manually:** `cd web && node scripts/seo-public-monitor.mjs`. The command may fail in locked-down networks; report this as a network limitation, not a Google indexing failure.

This monitoring workflow is staged; it has **not** begun running on a schedule. GitHub Actions schedules may also be delayed by GitHub operations.

## 3. Baseline and KPI measurement definitions
| KPI | Source | Calculation / decision | Current value |
|---|---|---|---|
| Property verified? | GSC ownership dashboard | Verified / Not verified | UNKNOWN |
| Sitemap last read status | GSC Sitemaps | Success / Couldn't fetch / Errors | UNKNOWN |
| Google-indexed important URLs | GSC URL Inspection | Indexed count over explicitly inspected important routes | UNKNOWN |
| Organic clicks | GSC Search performance | Google clicks in a complete date window | UNKNOWN |
| Impressions | GSC Search performance | Google impressions in same window | UNKNOWN |
| Organic CTR | GSC | Clicks ÷ impressions for same matching aggregation | UNKNOWN |
| Average position | GSC | GSC-reported average, **never average page averages unweighted** | UNKNOWN |
| Mobile / desktop breakdown | GSC | Search performance segmented by device | UNKNOWN |
| Site page crawl anomalies | Public monitor | Run errors / warnings, tied to date and source | NOT RUN YET |
| New relevant editorial mentions | Manual source-verified log | Accepted mentions with evidence URL, not requested or purchased links | NOT MEASURED |
| Engaged organic visits / chat starts | Privacy-compatible analytics only after policy/consent review | Verified session events attributed to organic traffic; none currently configured | NOT AVAILABLE |

Beware that exported GSC query rows may omit anonymized queries and UI exports are limited. If analytics are later installed, update the site's present no-analytics/no-tracker statements and complete applicable privacy review first.

## 4. 30 / 60 / 90-day owner-controlled plan
| Window | Deliverable | Owner | Exit condition |
|---|---|---|---|
| Days 1–7 | Confirm GSC Domain ownership; sitemap status; export baseline; inspect 11 priority URLs | Site owner | Screenshots/exports dated, status not guessed |
| Days 1–14 | Review Phase 6 translation corrections and English experience sitemap additions | Editor + engineer | Native approval, correct hreflang and SSR; **separate merge decision** |
| Days 8–21 | Merge this monitor PR if approved and check first GitHub Actions artifact | Engineer | 13 pages checked, actionable warnings triaged, no secrets |
| Days 15–30 | Fix confirmed Googlebot fetch / canonical / noindex defects | Engineer | GSC live test and next crawl are consistent |
| Days 21–45 | Publish one genuine first-hand public engineering case study after product QA | Product team | Source evidence, reviewer approval, honest limitations |
| Days 30–60 | Submit an original maker story where allowed; join one genuine audio/art community discussion | Editor | Community-specific contribution, no promotional spam |
| Days 45–75 | Publish consent-cleared demos of graffiti/poetry/music functions if reliable | Product + editorial | No unauthorized visitor content; functional proof |
| Days 60–90 | Re-export Search Console with comparable date windows; revise content by query intent | SEO analyst | Documented deltas and a next decision, not a ranking guarantee |
| Day 90 | Decide: improve, consolidate, keep or remove any low-value draft content | SEO/editorial | URL-by-URL evidence, maintain redirects if necessary |

## 5. Authority building — earned editorial mentions, not backlink farming
The following are **potential communities**, not partners or places we have contacted. Validate each destination's rules before posting, verify product reliability first and never claim a resulting link.

| Channel | Value-first angle | Relevant source / constraint | Status |
|---|---|---|---|
| Product Hunt | Short authentic product launch + video of a truly working text chat and live rooms | https://help.producthunt.com/en/articles/17350772-launch-guide ; no requests for upvotes and production features must work | NOT CONTACTED |
| DEV Community | Engineering article: how ChatSpark safely separates anonymous text matching from live games without P2P IP exchange | https://dev.to/help/getting-started and https://dev.to/guidelines-for-ai-assisted-articles-on-dev ; meaningful technical detail, no promotional AI slop | NOT POSTED |
| Audius developer community | Real technical integration lessons from Underground FM streaming, with provider constraints and proper attribution | https://docs.audius.co/learn/contributing/overview/ ; ask whether your contribution is relevant before sharing | NOT CONTACTED |
| Audius community project directory | If the built experience meets project-listing requirements, propose a sincere listing/demo | https://audius.community/ ; directory inclusion is not automatic | NOT SUBMITTED |
| Reddit relevant communities | Answer real user questions about text-only social apps, safety, or collaborative drawing | https://support.reddithelp.com/hc/en-us/articles/28012014962580-How-do-I-keep-spam-out-of-my-community ; subreddit-specific restrictions and no drive-by spam | NOT POSTED |
| Indie maker groups | Build log showing honest failures, engineering tradeoffs and specific requests for feedback | Verify current community rules first; do not inflate metrics | NOT CONTACTED |
| Digital-literacy educators | Offer a genuinely reviewed plain-language privacy guide with realistic warnings | Do not pitch until legal and safety statements are verified | NOT CONTACTED |
| Online art/poetry community | Invite voluntary participation in tested creative challenges, with submission-rights and moderation transparency | Obtain permission before using any creations publicly | NOT CONTACTED |

**Link policy:** no paid followed links, automated mass outreach, comment backlink spam, link exchanges, fabricated testimonials or undisclosed sponsorships. Relevant links may be `nofollow` or `sponsored`; value is real awareness and participation rather than manipulation.

## 6. Blockers and release/rollback
- This PR is a **non-production staging branch**. No sitemap, robots, source metadata, conversion scripts or user-facing designs were changed.
- The monitor may reveal current technical gaps (Phase 6 missing experiences, missing translations) but does not silently merge Phase 6 PR #19.
- To enable weekly checks, explicitly review and merge this PR. To revert, close the PR (no changes), or revert its merge commit and disable the workflow if merged later.
- Search Console integration is a separate authorized account action; no connector to Google Search Console was available in this session. Provide property access or export the GSC reports to obtain actual indexing/click data.

## References
- URL Inspection: https://support.google.com/webmasters/answer/9012289/
- Sitemaps report: https://support.google.com/webmasters/answer/7451001
- Indexing report: https://support.google.com/webmasters/answer/7440203
- GSC API overview: https://developers.google.com/webmaster-tools/v1/api_reference_index
- Google link-spam policy: https://developers.google.com/search/docs/essentials/spam-policies
- Google helpful content: https://developers.google.com/search/docs/fundamentals/creating-helpful-content
- Search Console data caveats: https://developers.google.com/search/blog/2022/10/performance-data-deep-dive
