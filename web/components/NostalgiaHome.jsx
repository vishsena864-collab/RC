import Link from "next/link";

const PHOTO_ROOT = "/art/nostalgia/";
const EXPERIENCES = [
  {
    id: "chat", title: "RANDOM CHAT", sub: "Meet someone new",
    path: "start", label: "Open random stranger chat",
  },
  {
    id: "radio", title: "UNDERGROUND FM", sub: "Discover real music",
    path: "underground", label: "Explore Underground FM",
  },
  {
    id: "movie", title: "MOVIE RUSH", sub: "Play in stranger chat",
    path: "start", label: "Play Movie Rush with a stranger",
  },
  {
    id: "poem", title: "POEM WALL", sub: "Share your words",
    path: "poem-wall", label: "Visit Poem Wall",
  },
  {
    id: "graffiti", title: "GRAFFITI WALL", sub: "Paint the internet",
    path: "graffiti-wall", label: "Visit Graffiti Wall",
  },
];

/**
 * Nostalgic editorial homepage.
 * Real routes and real labels, no fabricated online user count.
 * Artwork is decorative; text, navigation and cards are live semantic HTML.
 */
export default function NostalgiaHome({ locale, dict }) {
  const chatLabel = dict?.home?.cta || "Start Chatting";

  return (
    <section className="nostalgia-hero" aria-labelledby="nostalgia-title">
      <div className="nostalgia-room" aria-hidden="true">
        <img
          src={PHOTO_ROOT + "retro-room.webp"}
          alt=""
          width="1280"
          height="717"
          fetchPriority="high"
          decoding="async"
        />
      </div>
      <span className="nostalgia-shade" aria-hidden="true" />
      <span className="nostalgia-film" aria-hidden="true" />
      <span className="nostalgia-edge" aria-hidden="true" />

      <div className="nostalgia-copy">
        <div className="nostalgia-copy-top" aria-hidden="true">
          <span className="nostalgia-tiny-star">✳</span>
          <span>THE INTERNET USED TO FEEL LIKE SOMETHING.</span>
        </div>
        <h1 id="nostalgia-title" className="nostalgia-handline">
          <span>A</span>
          <span>STRANGER</span>
          <span>TODAY.</span>
          <span className="nostalgia-handline-accent">A STORY</span>
          <span>TOMORROW.</span>
        </h1>
        <p className="nostalgia-subtitle">
          Jump into random conversations.<br />
          Find real music, play together, or leave<br className="nostalgia-copy-break" />
          a little piece of yourself behind.
        </p>
        <div className="nostalgia-actions">
          <Link href={`/${locale}/start`} className="nostalgia-cta">
            <span>{chatLabel}</span>
            <span className="nostalgia-cta-arrow" aria-hidden="true">→</span>
          </Link>
        </div>
        <div className="nostalgia-status" aria-label="Anonymous, text-based stranger chat">
          <span className="nostalgia-status-dot" />
          <span>NO PROFILES. NO FOLLOWERS. JUST STRANGERS.</span>
        </div>
      </div>

      <div className="nostalgia-room-note" aria-hidden="true">
        <span>GOOD</span><span>MUSIC.</span><span>BETTER</span><span>PEOPLE.</span>
      </div>

      <nav className="nostalgia-experiences" id="nostalgia-experiences" aria-label="Explore ChatSpark experiences">
        {EXPERIENCES.map((feature, index) => (
          <Link
            key={feature.id}
            className={`nostalgia-postcard nostalgia-postcard--${feature.id}`}
            href={`/${locale}/${feature.path}`}
            aria-label={feature.label}
          >
            <span className="nostalgia-tape nostalgia-tape--left" aria-hidden="true" />
            {index === 1 || index === 3 ? <span className="nostalgia-tape nostalgia-tape--right" aria-hidden="true" /> : null}
            <span className="nostalgia-photo">
              <img
                src={PHOTO_ROOT + feature.id + ".webp"}
                alt=""
                width="456"
                height="196"
                decoding="async"
                loading="eager"
              />
            </span>
            <span className="nostalgia-card-paper">
              <span className="nostalgia-card-copy">
                <strong>{feature.title}</strong>
                <small>{feature.sub}</small>
              </span>
              <span className="nostalgia-card-arrow" aria-hidden="true">→</span>
            </span>
          </Link>
        ))}
      </nav>
      <span className="nostalgia-hero-footnote" aria-hidden="true">CHATSPARK © {new Date().getFullYear()} · A MORE INTERESTING INTERNET</span>
    </section>
  );
}
