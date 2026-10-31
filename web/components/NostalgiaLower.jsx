import Link from "next/link";
import Image from "next/image";
import { categories } from "@/lib/categories";
import { fmt } from "@/lib/format";
import { localeNames, locales } from "@/lib/i18n";
import { SITE_NAME } from "@/lib/site";
import { getNostalgiaCopy } from "@/lib/nostalgia-locales";

const TOPIC_MARKS = {
  general: "✳", music: "♫", bored: "☾", gaming: "✦",
  movies: "▹", tech: "⌘", sports: "◉", art: "✎",
};

/**
 * Analog continuation of the selected ChatSpark CRT bedroom homepage.
 * Editorial/ticket/printed-paper design only on the homepage; actual chat,
 * feature routes and product functionality are unchanged.
 */
export default function NostalgiaLower({ locale, dict }) {
  const home = dict.home;
  const tx = getNostalgiaCopy(locale).lower;
  const prompt = dict.chat.sameBrainPrompts[0];

  return (
    <div className="nostalgia-lower-wrap">
      <section className="nlg-intro" aria-labelledby="nlg-intro-title">
        <span className="nlg-micro">CHATSPARK / {tx.introMeta}</span>
        <h2 id="nlg-intro-title">{tx.introA}<br /><em>{tx.introB}</em></h2>
        <p>{tx.introP}</p>
        <div className="nlg-intro-doodle" aria-hidden="true">✳ <span>{tx.introDoodle}</span></div>
      </section>

      <section className="nlg-samebrain" aria-labelledby="nlg-samebrain-title">
        <div className="nlg-samebrain-copy">
          <div className="nlg-section-number"><span>01 / {tx.gameMeta}</span><span className="nlg-stamp-dot">★</span></div>
          <span className="nlg-kicker">{tx.gameKicker}</span>
          <h2 id="nlg-samebrain-title">{tx.gameA}<br /><em>{tx.gameB}</em></h2>
          <p>{home.sparkText}</p>
          <div className="nlg-sidequest-badges"><span>↗ {tx.gameBadge[0]}</span><span>✳ {tx.gameBadge[1]}</span><span>♥ {tx.gameBadge[2]}</span></div>
          <Link className="nlg-paper-button" href={`/${locale}/start`}>{tx.gameCta} <span aria-hidden="true">↗</span></Link>
        </div>
        <div className="nlg-sidequest-stage">
          <div className="nlg-stage-tape nlg-tape-top" aria-hidden="true" />
          <div className="nlg-samebrain-slip" aria-label={tx.gameAria}>
            <div className="nlg-ticket-meta"><span>CHATSPARK / SAME BRAIN</span><span>ISSUE N° 0482</span></div>
            <div className="nlg-ticket-icon" aria-hidden="true">ϟ</div>
            <span className="nlg-ticket-eyebrow">{tx.gameTicket}</span>
            <h3>{prompt.q}</h3>
            <div className="nlg-choice-row" aria-hidden="true">
              <div className="nlg-choice"><span>{prompt.ea}</span><strong>{prompt.a}</strong></div>
              <div className="nlg-choice"><span>{prompt.eb}</span><strong>{prompt.b}</strong></div>
            </div>
            <div className="nlg-ticket-bottom"><span>01 — {tx.gameStep[0]}</span><span>02 — {tx.gameStep[1]}</span></div>
          </div>
          <span className="nlg-pencilled-side" aria-hidden="true">{tx.gameSideA}<br />{tx.gameSideB} ↗</span>
        </div>
      </section>

      <section className="nlg-topics" id="topics" aria-labelledby="nlg-topics-title">
        <div className="nlg-heading-line"><span>02 / {tx.topicsMeta}</span><span>{tx.topicsMeta2}</span></div>
        <div className="nlg-section-intro">
          <div><h2 id="nlg-topics-title">{tx.topicsA}<br /><em>{tx.topicsB}</em></h2></div>
          <p>{home.catsSub} {tx.topicsP}</p>
        </div>
        <ul className="nlg-topics-grid">
          {categories.map((topic, index) => (
            <li key={topic.id}>
              <Link className="nlg-topic" href={`/${locale}/chat/${topic.id}`}>
                <span className="nlg-topic-index">{String(index + 1).padStart(2, "0")}</span>
                <span className="nlg-topic-mark" aria-hidden="true">{TOPIC_MARKS[topic.id] || "✳"}</span>
                <span className="nlg-topic-copy"><strong>{dict.cats[topic.id].name}</strong><small>{dict.cats[topic.id].desc}</small></span>
                <span className="nlg-topic-arrow" aria-hidden="true">↗</span>
              </Link>
            </li>
          ))}
        </ul>
        <div className="nlg-topics-footer"><span>{tx.topicsEmpty}</span><Link href={`/${locale}/chat/general`}>{tx.topicsCta} ↗</Link></div>
      </section>

      <section className="nlg-atlas" aria-labelledby="nlg-atlas-title">
        <div className="nlg-atlas-paper">
          <div className="nlg-atlas-top"><span>03 / {tx.atlasMeta}</span><span>{tx.atlasMeta2}</span></div>
          <div className="nlg-atlas-grid">
            <div className="nlg-atlas-copy">
              <span className="nlg-kicker">{tx.atlasKicker}</span>
              <h2 id="nlg-atlas-title">{tx.atlasA}<br />{tx.atlasB} <em>{tx.atlasEm}</em></h2>
              <p>{fmt(home.globeText, {name: SITE_NAME})}</p>
              <div className="nlg-lang-label" id="nlg-lang-label">{home.globeLangs}</div>
              <ul className="nlg-lang-list" aria-labelledby="nlg-lang-label">
                {locales.map((l) => (
                  <li key={l}><Link href={`/${l}`} hrefLang={l} lang={l} aria-current={locale === l ? "page" : undefined}>{localeNames[l]}</Link></li>
                ))}
              </ul>
            </div>
            <div className="nlg-atlas-image" aria-hidden="true">
              <Image src="/art/globe.webp" alt="" width={1400} height={788} sizes="(max-width: 800px) 100vw, 46vw" loading="lazy" decoding="async" />
              <span className="nlg-atlas-stamp">{tx.atlasStamp} <b>✳</b></span>
              <span className="nlg-atlas-scribble">{tx.atlasScribbleA}<br />{tx.atlasScribbleB}</span>
            </div>
          </div>
          <div className="nlg-atlas-bottom"><span>CHATSPARK / {tx.atlasFoot}</span><span>{tx.atlasFoot2}</span></div>
        </div>
      </section>

      <section className="nlg-instructions" aria-labelledby="nlg-instructions-title">
        <div className="nlg-heading-line"><span>04 / {tx.stepsMeta}</span><span>{tx.stepsMeta2}</span></div>
        <div className="nlg-section-intro">
          <h2 id="nlg-instructions-title">{tx.stepsA}<br /><em>{tx.stepsB}</em></h2>
          <p>{tx.stepsP}</p>
        </div>
        <ol className="nlg-steps">
          {home.steps.map((step, i) => (
            <li key={step.t}>
              <div className="nlg-step-upper"><span>0{i + 1}</span><span className="nlg-step-symbol" aria-hidden="true">{["⌁","↗","✳"][i]}</span></div>
              <h3>{step.t}</h3>
              <p>{step.d}</p>
              <span className="nlg-step-foot">CHATSPARK / 00{i + 1}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="nlg-groundrules" aria-labelledby="nlg-why-title">
        <div className="nlg-ground-copy">
          <span className="nlg-kicker">05 / {tx.safetyMeta}</span>
          <h2 id="nlg-why-title">{tx.safetyA}<br /><em>{tx.safetyB}</em></h2>
          <p>{tx.safetyP}</p>
          <Link href={`/${locale}/safety`} className="nlg-text-link">{tx.safetyCta} <span aria-hidden="true">↗</span></Link>
        </div>
        <div className="nlg-ground-ledger">
          <div className="nlg-ledger-head"><span>{tx.safetyLedger}</span><span>✳ CS</span></div>
          {home.why.map((item, i) => (
            <div className="nlg-ledger-line" key={item.t}>
              <span>0{i + 1}</span><div><strong>{item.t}</strong><p>{item.d}</p></div><span aria-hidden="true">✓</span>
            </div>
          ))}
          <span className="nlg-ledger-foot">{tx.safetyFoot}</span>
        </div>
      </section>

      <section className="nlg-faq" aria-labelledby="nlg-faq-title">
        <div className="nlg-heading-line"><span>06 / {tx.faqMeta}</span><span>{tx.faqMeta2}</span></div>
        <div className="nlg-faq-grid">
          <div className="nlg-faq-titlebox"><span className="nlg-faq-glyph" aria-hidden="true">?</span><h2 id="nlg-faq-title">{tx.faqA}<br /><em>{tx.faqB}</em></h2><p>{tx.faqP}</p></div>
          <div className="nlg-faq-list">
            {home.faq.map((item,i)=>(
              <details key={item.q}>
                <summary><span className="nlg-faq-num">{String(i + 1).padStart(2,"0")}</span><span>{fmt(item.q, {name:SITE_NAME})}</span><span className="nlg-faq-plus" aria-hidden="true">+</span></summary>
                <p>{fmt(item.a, {name:SITE_NAME})}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
