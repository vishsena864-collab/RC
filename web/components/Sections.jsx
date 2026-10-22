import Link from "next/link";
import { categories } from "@/lib/categories";
import { fmt } from "@/lib/format";
import { localeNames, locales } from "@/lib/i18n";
import { SITE_NAME } from "@/lib/site";
import { Avatar, IconTile } from "./Art";

// Icons for the three steps and the four reasons (same order as the dictionary arrays).
const STEP_ICONS = ["preferences", "search", "message"];
const WHY_ICONS = ["profile", "groups", "send", "notifications"];

export function Steps({ title, steps }) {
  return (
    <section className="section" aria-labelledby="steps-h" id="how-it-works">
      <span className="studio-section-kicker">02 / {title}</span><h2 id="steps-h">{title}</h2>
      <ol className="steps">
        {steps.map((s, i) => (
          <li key={s.t}>
            <span className="step-icon">
              <IconTile name={STEP_ICONS[i % STEP_ICONS.length]} size={68} />
              <span className="step-num" aria-hidden="true">
                {i + 1}
              </span>
            </span>
            <h3>{s.t}</h3>
            <p>{s.d}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** One card per topic, each with its own avatar and accent colour. */
export function CategoryGrid({ locale, dict, title, sub, exclude }) {
  const visible = categories.filter((c) => c.id !== exclude);
  return (
    <section className="section studio-topics" aria-labelledby="cats-h" id="topics">
      <div className="studio-heading-row"><div><span className="studio-section-kicker">{dict.home.ui.topicsKicker}</span><h2 id="cats-h">{title}</h2></div><span className="studio-heading-decoration" aria-hidden="true">↘</span></div>
      {sub ? <p className="lead">{sub}</p> : null}
      <ul className="cards">
        {visible.map((c) => (
          <li key={c.id}>
            <Link href={`/${locale}/chat/${c.id}`} className="card" style={{ "--accent": c.accent }}>
              <span className="card-avatar">
                <Avatar n={c.avatar} size={88} />
                <span className="card-emoji" aria-hidden="true">
                  {c.icon}
                </span>
              </span>
              <span className="card-name">{dict.cats[c.id].name}</span>
              <span className="card-desc">{dict.cats[c.id].desc}</span>
              <span className="studio-card-arrow" aria-hidden="true">↗</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function WhyGrid({ title, items }) {
  return (
    <section className="section" aria-labelledby="why-h">
      <span className="studio-section-kicker">03 / {fmt(title, { name: SITE_NAME })}</span><h2 id="why-h">{fmt(title, { name: SITE_NAME })}</h2>
      <ul className="why">
        {items.map((w, i) => (
          <li key={w.t}>
            <IconTile name={WHY_ICONS[i % WHY_ICONS.length]} size={60} />
            <div>
              <h3>{w.t}</h3>
              <p>{w.d}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** The signature product loop: a blind choice, synchronized reveal, and privacy-safe share card. */
export function SparkShowcase({ locale, dict }) {
  const home = dict.home;
  const brain = dict.chat.sameBrainPrompts[0];
  return (
    <section className="spark-showcase" aria-labelledby="spark-showcase-h">
      <div className="spark-showcase-copy">
        <span className="spark-showcase-kicker">✳ &nbsp; {home.sparkKicker}</span>
        <h2 id="spark-showcase-h">{home.sparkTitle}</h2>
        <p>{home.sparkText}</p>
        <ul>
          {home.sparkPoints.map((point) => (
            <li key={point}><span aria-hidden="true">✓</span>{point}</li>
          ))}
        </ul>
        <Link href={`/${locale}/start`} className="btn btn-glow">{home.sparkCta}</Link>
      </div>
      <div className="spark-demo" aria-hidden="true">
        <span className="spark-demo-orb">⚡</span>
        <span className="spark-demo-label">{dict.chat.sameBrainTitle} · #482</span>
        <strong>{brain.q}</strong>
        <div className="spark-demo-choices">
          <span><b>{brain.ea}</b>{brain.a}</span>
          <span className="selected"><b>{brain.eb}</b>{brain.b}</span>
        </div>
        <span>{dict.chat.sameBrainBlind}</span>
      </div>
    </section>
  );
}

export function MomentDeck({ dict }) {
  const t = dict.chat;
  const prompt = t.sameBrainPrompts[2];
  return (
    <section className="moment-deck" aria-label={dict.home.sparkKicker}>
      <article className="moment-brain">
        <div className="moment-top"><span>01</span><small>{t.sameBrainKicker}</small></div>
        <strong>{t.sameBrainTitle}</strong>
        <p>{t.sameBrainInstruction}</p>
        <div className="moment-versus" aria-hidden="true">
          <span><b>{prompt.ea}</b>{prompt.a}</span>
          <i>VS</i>
          <span><b>{prompt.eb}</b>{prompt.b}</span>
        </div>
      </article>
      <article className="moment-reactions">
        <div className="moment-top"><span>02</span><small>{t.stickers}</small></div>
        <strong>{t.stickerNames.party}</strong>
        <div className="reaction-burst" aria-hidden="true">
          <span>🔥</span><span>😂</span><span>🎉</span><span>👻</span><span>✨</span>
        </div>
      </article>
      <article className="moment-mission">
        <div className="moment-top"><span>03</span><small>{t.sparkQuest}</small></div>
        <strong>{dict.home.sparkDemoPrompt}</strong>
        <p>{t.sparkPrivate}</p>
        <div className="mission-line" aria-hidden="true"><i /><i /><i /><i /><i /><i /></div>
      </article>
    </section>
  );
}

export function FaqList({ title, items }) {
  return (
    <section className="section" aria-labelledby="faq-h">
      <span className="studio-section-kicker">04 / FAQ</span><h2 id="faq-h">{title}</h2>
      <div className="faq">
        {items.map((f) => (
          <details key={f.q}>
            <summary>{fmt(f.q, { name: SITE_NAME })}</summary>
            <p>{fmt(f.a, { name: SITE_NAME })}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

/** "Someone new, from anywhere": globe artwork plus links to every language version of the site. */
export function GlobeCard({ locale, dict }) {
  const home = dict.home;
  return (
    <section className="globe-card" aria-labelledby="globe-h">
      <div className="globe-copy"><span className="studio-section-kicker">{home.heroPeople}</span>
        <h2 id="globe-h">{home.globeTitle}</h2>
        <p>{fmt(home.globeText, { name: SITE_NAME })}</p>
        <p className="lang-label" id="lang-label">
          {home.globeLangs}
        </p>
        <ul className="lang-pills" aria-labelledby="lang-label">
          {locales.map((l) => (
            <li key={l}>
              <Link href={`/${l}`} hrefLang={l} lang={l} aria-current={l === locale ? "true" : undefined}>
                {localeNames[l]}
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <div className="globe-art" aria-hidden="true">
        <img src="/art/globe.webp" width={1400} height={788} alt="" loading="lazy" decoding="async" />
      </div>
    </section>
  );
}

/**
 * Full-width closing band: the slogan is real (translated, searchable) text over the wave artwork.
 * Render it outside the page container so it can span the whole window.
 */
export function TaglineBand({ locale, dict }) {
  const [first, second] = dict.home.tagline;
  return (
    <section className="tagline-band" aria-labelledby="tagline-h">
      <img src="/art/tagline-waves.webp" width={2400} height={428} alt="" className="band-art" loading="lazy" decoding="async" />
      <span className="studio-section-kicker">✳ {dict.home.ui.bottomKicker}</span>
      <h2 id="tagline-h"><span>{first}</span> <span className="grad">{second}</span></h2>
      <p>{dict.home.finalSub}</p>
      <Link href={`/${locale}/start`} className="btn btn-glow btn-large">
        {dict.home.cta}
      </Link>
      <span className="note">{dict.home.ctaNote}</span>
    </section>
  );
}
