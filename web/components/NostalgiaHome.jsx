import Link from "next/link";
import Image from "next/image";
import NostalgiaTerminal from "./NostalgiaTerminal";
import { getNostalgiaCopy } from "@/lib/nostalgia-locales";

const PHOTO_ROOT = "/art/nostalgia/";
const EXPERIENCES = [
  {
    id: "chat",
    path: "start",
  },
  {
    id: "radio",
    path: "underground",
  },
  {
    id: "movie",
    path: "start",
  },
  {
    id: "poem",
    path: "poem-wall",
  },
  {
    id: "graffiti",
    path: "graffiti-wall",
  },
];

/**
 * Nostalgic editorial homepage.
 * Real routes and real labels, no fabricated online user count.
 * Artwork is decorative; text, navigation and cards are live semantic HTML.
 */
export default function NostalgiaHome({ locale, dict }) {
  const chatLabel = dict?.home?.cta || "Start Chatting";
  const c = getNostalgiaCopy(locale);

  return (
    <section className="nostalgia-hero" data-locale={locale} aria-labelledby="nostalgia-title">
      <div className="nostalgia-room" aria-hidden="true">
        <img
          src={PHOTO_ROOT + "retro-room.webp"}
          alt=""
          width="1280"
          height="717"
          fetchPriority="high"
          decoding="async"
        />
        <NostalgiaTerminal phrases={c.terminal} />
      </div>
      <span className="nostalgia-shade" aria-hidden="true" />
      <span className="nostalgia-film" aria-hidden="true" />
      <span className="nostalgia-edge" aria-hidden="true" />

      <div className="nostalgia-copy">
        <div className="nostalgia-copy-top" aria-hidden="true">
          <span className="nostalgia-tiny-star">✳</span>
          <span>{c.hero.eyebrow}</span>
        </div>
        <h1 id="nostalgia-title" className="nostalgia-handline">
          <span className="nostalgia-search-intent">{dict.home.h1}</span>
          {c.hero.lines.map((line, index) => <span key={index} className={index === 3 ? "nostalgia-handline-accent" : undefined}>{line}</span>)}
        </h1>
        <p className="nostalgia-subtitle">
          {dict.home.sub}
        </p>
        <div className="nostalgia-actions">
          <Link href={`/${locale}/start`} className="nostalgia-cta" prefetch={false}>
            <span>{chatLabel}</span>
            <span className="nostalgia-cta-arrow" aria-hidden="true">→</span>
          </Link>
        </div>
        <div className="nostalgia-status" aria-label={c.hero.statusLabel}>
          <span className="nostalgia-status-dot" />
          <span>{c.hero.status}</span>
        </div>
      </div>

      <nav className="nostalgia-experiences" id="nostalgia-experiences" aria-label={c.hero.cardsLabel}>
        {EXPERIENCES.map((feature, index) => (
          <Link
            key={feature.id}
            className={`nostalgia-postcard nostalgia-postcard--${feature.id}`}
            href={`/${locale}/${feature.path}`}
            prefetch={false}
            aria-label={c.hero.cards[feature.id][2]}
          >
            <span className="nostalgia-tape nostalgia-tape--left" aria-hidden="true" />
            {index === 1 || index === 3 ? <span className="nostalgia-tape nostalgia-tape--right" aria-hidden="true" /> : null}
            <span className="nostalgia-photo">
              <Image
                src={PHOTO_ROOT + feature.id + ".webp"}
                alt=""
                width={456}
                height={196}
                sizes={index === 4
                  ? "(max-width: 750px) 72vw, (max-width: 1100px) 18vw, 220px"
                  : "(max-width: 750px) 45vw, (max-width: 1100px) 18vw, 220px"}
                loading="lazy"
                decoding="async"
              />
            </span>
            <span className="nostalgia-card-paper">
              <span className="nostalgia-card-copy">
                <strong>{c.hero.cards[feature.id][0]}</strong>
                <small>{c.hero.cards[feature.id][1]}</small>
              </span>
              <span className="nostalgia-card-arrow" aria-hidden="true">→</span>
            </span>
          </Link>
        ))}
      </nav>
      <span className="nostalgia-hero-footnote" aria-hidden="true">CHATSPARK © {new Date().getFullYear()} · {c.hero.foot}</span>
    </section>
  );
}
