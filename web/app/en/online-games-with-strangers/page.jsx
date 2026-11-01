import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata({ locale: "en", path: "/online-games-with-strangers", title: "Creative Online Games With Strangers | ChatSpark", description: "Looking for things to do online with strangers? Explore text chat, graffiti battles and poetry challenges on ChatSpark.", englishOnly: true });
export default function Page() {
  return <main className="container" style={{maxWidth:880,paddingBlock:"5rem"}}>
    <nav aria-label="Breadcrumb"><Link href="/en">Home</Link> / Creative Online Games With Strangers</nav>
    <h1>More than a random chat website</h1><p className="lead">Switch between spontaneous text conversations and creative experiences. Graffiti Battles challenge you to draw to a prompt; Poem Battles challenge you to write. No video call required.</p>
    <p><Link className="btn btn-glow btn-large" href="/en/graffiti-wall">Explore drawing battles</Link></p>
    <section aria-labelledby="explore"><h2 id="explore">Explore more ways to connect</h2>
      <p>Try <Link href="/en/graffiti-wall">Graffiti Wall and drawing battles</Link>, <Link href="/en/poem-wall">Poem Wall and poetry challenges</Link>, or <Link href="/en/start">random text chat</Link>.</p>
    </section>
  </main>;
}
