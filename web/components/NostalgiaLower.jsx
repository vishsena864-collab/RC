import Link from "next/link";
import { categories } from "@/lib/categories";
import { fmt } from "@/lib/format";
import { localeNames, locales } from "@/lib/i18n";
import { SITE_NAME } from "@/lib/site";

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
  const prompt = dict.chat.sameBrainPrompts[0];

  return (
    <div className="nostalgia-lower-wrap">
      <section className="nlg-intro" aria-labelledby="nlg-intro-title">
        <span className="nlg-micro">CHATSPARK / AN INTERNET WITH SOMETHING TO DO</span>
        <h2 id="nlg-intro-title">Real people.<br /><em>Unscripted moments.</em></h2>
        <p>The internet doesn't need another endless feed. Meet someone new, trade a song, play a little game, or leave a mark that strangers can discover.</p>
        <div className="nlg-intro-doodle" aria-hidden="true">✳ <span>ALL KINDS OF STRANGE ARE WELCOME.</span></div>
      </section>

      <section className="nlg-samebrain" aria-labelledby="nlg-samebrain-title">
        <div className="nlg-samebrain-copy">
          <div className="nlg-section-number"><span>01 / IN THE CHAT</span><span className="nlg-stamp-dot">★</span></div>
          <span className="nlg-kicker">A GAME FOR TWO PEOPLE WHO JUST MET</span>
          <h2 id="nlg-samebrain-title">SAME<br /><em>BRAIN?</em></h2>
          <p>{home.sparkText}</p>
          <div className="nlg-sidequest-badges"><span>↗ SECRET MISSIONS</span><span>✳ BLIND CHOICES</span><span>♥ SHARE THE MOMENT</span></div>
          <Link className="nlg-paper-button" href={`/${locale}/start`}>TRY IT IN RANDOM CHAT <span aria-hidden="true">↗</span></Link>
        </div>
        <div className="nlg-sidequest-stage">
          <div className="nlg-stage-tape nlg-tape-top" aria-hidden="true" />
          <div className="nlg-samebrain-slip" aria-label="Illustration of a Same Brain question">
            <div className="nlg-ticket-meta"><span>CHATSPARK / SAME BRAIN</span><span>ISSUE N° 0482</span></div>
            <div className="nlg-ticket-icon" aria-hidden="true">ϟ</div>
            <span className="nlg-ticket-eyebrow">TWO STRANGERS. ONE QUESTION.</span>
            <h3>{prompt.q}</h3>
            <div className="nlg-choice-row" aria-hidden="true">
              <div className="nlg-choice"><span>{prompt.ea}</span><strong>{prompt.a}</strong></div>
              <div className="nlg-choice"><span>{prompt.eb}</span><strong>{prompt.b}</strong></div>
            </div>
            <div className="nlg-ticket-bottom"><span>01 — SELECT IN SECRET</span><span>02 — REVEAL TOGETHER</span></div>
          </div>
          <span className="nlg-pencilled-side" aria-hidden="true">WHAT WOULD<br />YOU PICK? ↗</span>
        </div>
      </section>

      <section className="nlg-topics" id="topics" aria-labelledby="nlg-topics-title">
        <div className="nlg-heading-line"><span>02 / PICK A FREQUENCY</span><span>AN OPEN INVITATION TO EVERY CONVERSATION</span></div>
        <div className="nlg-section-intro">
          <div><h2 id="nlg-topics-title">WHAT ARE YOU<br /><em>INTO LATELY?</em></h2></div>
          <p>{home.catsSub} No profiles or followers. Just something to talk about.</p>
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
        <div className="nlg-topics-footer"><span>NOTHING IN PARTICULAR?</span><Link href={`/${locale}/chat/general`}>JUST MEET A STRANGER ↗</Link></div>
      </section>

      <section className="nlg-atlas" aria-labelledby="nlg-atlas-title">
        <div className="nlg-atlas-paper">
          <div className="nlg-atlas-top"><span>03 / POSTCARDS FROM EVERYWHERE</span><span>POSTMARK: PLANET EARTH</span></div>
          <div className="nlg-atlas-grid">
            <div className="nlg-atlas-copy">
              <span className="nlg-kicker">EVERY PERSON HAS A STORY</span>
              <h2 id="nlg-atlas-title">A WORLD<br />FULL OF <em>HELLOS.</em></h2>
              <p>{fmt(home.globeText, {name: SITE_NAME})}</p>
              <div className="nlg-lang-label" id="nlg-lang-label">{home.globeLangs}</div>
              <ul className="nlg-lang-list" aria-labelledby="nlg-lang-label">
                {locales.map((l) => (
                  <li key={l}><Link href={`/${l}`} hrefLang={l} lang={l} aria-current={locale === l ? "page" : undefined}>{localeNames[l]}</Link></li>
                ))}
              </ul>
            </div>
            <div className="nlg-atlas-image" aria-hidden="true">
              <img src="/art/globe.webp" alt="" width="1400" height="788" loading="lazy" decoding="async" />
              <span className="nlg-atlas-stamp">ANYWHERE / ANYTIME <b>✳</b></span>
              <span className="nlg-atlas-scribble">somewhere,<br />a stranger is waiting.</span>
            </div>
          </div>
          <div className="nlg-atlas-bottom"><span>CHATSPARK / WORLDWIDE</span><span>NO TWO CONVERSATIONS THE SAME</span></div>
        </div>
      </section>

      <section className="nlg-instructions" aria-labelledby="nlg-instructions-title">
        <div className="nlg-heading-line"><span>04 / INSTRUCTIONS FOR THE CURIOUS</span><span>EASIER THAN REWINDING A CASSETTE</span></div>
        <div className="nlg-section-intro">
          <h2 id="nlg-instructions-title">THREE STEPS.<br /><em>NO SMALL TALK REQUIRED.</em></h2>
          <p>From your side of the screen to somewhere completely unexpected.</p>
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
          <span className="nlg-kicker">05 / A BETTER KIND OF STRANGE</span>
          <h2 id="nlg-why-title">NO PROFILE.<br /><em>NO PRESSURE.</em></h2>
          <p>Meet people. Stay curious. Leave whenever you want. ChatSpark is meant to feel like the old internet, with room for a little more care.</p>
          <Link href={`/${locale}/safety`} className="nlg-text-link">OUR SAFETY RULES <span aria-hidden="true">↗</span></Link>
        </div>
        <div className="nlg-ground-ledger">
          <div className="nlg-ledger-head"><span>THE HOUSE RULES / 04 THINGS</span><span>✳ CS</span></div>
          {home.why.map((item, i) => (
            <div className="nlg-ledger-line" key={item.t}>
              <span>0{i + 1}</span><div><strong>{item.t}</strong><p>{item.d}</p></div><span aria-hidden="true">✓</span>
            </div>
          ))}
          <span className="nlg-ledger-foot">BE KIND OUT THERE. PEOPLE ARE REAL.</span>
        </div>
      </section>

      <section className="nlg-faq" aria-labelledby="nlg-faq-title">
        <div className="nlg-heading-line"><span>06 / THE FINE PRINT</span><span>QUESTIONS PEOPLE ASK BEFORE SAYING HELLO</span></div>
        <div className="nlg-faq-grid">
          <div className="nlg-faq-titlebox"><span className="nlg-faq-glyph" aria-hidden="true">?</span><h2 id="nlg-faq-title">STILL<br /><em>WONDERING?</em></h2><p>Good questions deserve honest answers.</p></div>
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
