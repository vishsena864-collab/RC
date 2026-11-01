import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata({ locale: "en", path: "/drawing-battle-online", title: "Online Drawing Battles & Creative Challenges | ChatSpark", description: "Join a free online drawing battle with a shared creative prompt. Sketch, compete and explore Graffiti Wall on ChatSpark.", englishOnly: true });
export default function Page() {
  return <main className="container" style={{maxWidth:880,paddingBlock:"5rem"}}>
    <nav aria-label="Breadcrumb"><Link href="/en">Home</Link> / Online Drawing Battles & Creative Challenges</nav>
    <h1>Drawing battles with a creative twist</h1><p className="lead">Graffiti Battles give two participants the same unexpected topic and a limited time to create. While waiting for an opponent, practice topics help you warm up. This is a creative battle, not a drawing-and-guessing game.</p>
    <p><Link className="btn btn-glow btn-large" href="/en/graffiti-wall">Try a graffiti battle</Link></p>
    <section aria-labelledby="explore"><h2 id="explore">Explore more ways to connect</h2>
      <p>Try <Link href="/en/graffiti-wall">Graffiti Wall and drawing battles</Link>, <Link href="/en/poem-wall">Poem Wall and poetry challenges</Link>, or <Link href="/en/start">random text chat</Link>.</p>
    </section>
  </main>;
}
