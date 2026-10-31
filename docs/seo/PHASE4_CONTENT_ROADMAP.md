# Phase 4 — ChatSpark original content production plan

**Status:** Research and editorial backlog only. No article or sitemap or redirect has been published by this PR.
**Baseline:** Phase 3 PR #16 has already been merged into main and Vercel is READY. This does not replace rendered-page QA.

## Editorial goals
- Primary: encourage adults 18+ to start authentic, text-only random conversations.
- Secondary: accurate discovery of Underground FM and creative graffiti/poetry challenges.
- Supporting: transparent privacy and safer-chat explanations.
- No invented visitor numbers, ranking promises, test results or author profiles.

## Six-month editorial slots (24)

### November 2026
1. Refresh /en/safety with an evidence-backed report walkthrough.
2. Draft /en/anonymous-chat-privacy-guide after legal and hosted-log review.
3. Add genuine product screenshots and explanatory copy to /en.
4. Keep /en/chat/general differentiated from the homepage.

### December 2026
1. Test 30 original adult-appropriate conversation starters before preparing a guide.
2. Document how interest matching works using synthetic, unit-tested matcher examples.
3. Refresh /en/chat/music with unique questions and proper FM links.
4. Document Underground FM controller handoff after two-browser playback QA.

### January 2027
1. Refresh /en/graffiti-wall with consent-cleared studio and live-battle screenshots.
2. Refresh /en/poem-wall with the separate live round and weekly gallery rules.
3. Add verified graffiti studio tool and signature-card limitation instructions.
4. Document poem originality, contest rules and moderation limitations.

### February 2027
1. Test any proposed Omegle text-only alternative comparison against dated first-hand evidence.
2. Refresh /en/chat/bored with genuine two-person game examples.
3. Refresh /en/chat/movies with spoiler-aware prompts and verified Movie Rush.
4. Refresh /en/chat/gaming with non-recycled gaming questions.

### March 2027
1. Refresh /en/chat/tech with specific practical discussion starters.
2. Refresh /en/chat/sports with original cross-sport discussion prompts.
3. Clarify how /en/chat/art differs from public creative walls.
4. Document actual mobile user journey and device-specific observations on /en.

### April 2027
1. Review native Spanish homepage translation and semantics.
2. Review Portuguese homepage locale/market fit and phrasing.
3. Review native French site language and FAQs.
4. Review native German privacy/consent terms and homepage phrasing.

## Ten required research briefs

| Existing or candidate URL | Primary topic | Minimum distinct contribution | Publication gate |
|---|---|---|---|
| /en/anonymous-chat-privacy-guide (new) | What anonymous means | Tested data flow, honest IP limitations | Legal + hosting settings |
| /en/conversation-starters-for-strangers (new) | Conversation starters | 30 human-reviewed prompts, transparent test method | Consent and genuine feedback |
| /en/how-interest-matching-works (new) | Matching mechanics | Synthetic case table grounded in server/src/matcher.js | Backend reviewer |
| /en/omegle-text-chat-alternative (new) | Text-only alternative comparison | Dated direct feature comparison, not alleged ranking | Independently verify all providers |
| /en/safety (refresh) | Safety and reporting | Screenshot of actual Skip/Report flow | Safety review |
| /en/underground (refresh) | Shared music rooms | Real controller and playback demo | Two-browser QA; provider limits |
| /en/graffiti-wall (refresh) | Online art studio/challenges | Demonstrated painting, timed voting, rights | Consented examples and QA |
| /en/poem-wall (refresh) | Poetry challenge | Live vs weekly wall distinction, data retention | Consent and published rules |
| /en (refresh) | Free random text chat | Real guest/matching walkthrough and privacy caveat | Product QA |
| /en/chat/music (refresh) | Music text chat | Topic prompts distinct from shared audio | Clear CTA and valid product flow |

**No additional keyword landing pages** unless separate demand and unique user value are established. Target lengths are editorial estimates, not ranking factors. The complete outlines, evidence sources, references, owners and CTA copy reside in the Phase 4 strategy workbook/report provided alongside this PR.

## Content ownership and trust work
1. Obtain a verified legal operator/team name and monitored public support/corrections channel.
2. Confirm real authors/reviewers rather than inventing expert bios.
3. Confirm actual privacy and safety behavior with code, runtime, provider documentation and counsel.
4. Capture consent-cleared desktop/mobile screenshots and demonstration clips.
5. Publish articles only when source citations, originality and user value have been reviewed.
6. Keep a correction log with genuine publication and material-update dates.
7. Validate schema, accessible alt text, working internal links, live CTAs and production SSR HTML.
8. Avoid commercial scripts or analytics inconsistent with published privacy policies.

## About page skeleton (NOT for direct publication)

ChatSpark is a text-only, adult-oriented service for meeting random strangers. It also has optional shared music rooms and creative walls. The service is operated by **[VERIFIED OPERATOR OR TEAM]** in **[VERIFIED JURISDICTION]**. Contact: **[MONITORED SUPPORT CHANNEL]**. We describe how we operate in our privacy statement, terms and safety rules.

Do not publish any placeholder facts or promise moderation staffing or end-to-end encryption.

## Release and rollback
Work is staged on this documentation-only branch. Production files and the Phase 3 implementation are unchanged. No redirect mapping is needed: no URLs are modified. Rollback simply closes the draft PR without merging. When a future page is actually built, use separate feature branches, review the page and affected routes, and require approval for production publication.

Official editorial sources:
- https://developers.google.com/search/docs/fundamentals/creating-helpful-content
- https://developers.google.com/search/docs/essentials/spam-policies
- https://developers.google.com/search/docs/appearance/google-images
- https://developers.google.com/search/docs/appearance/video
