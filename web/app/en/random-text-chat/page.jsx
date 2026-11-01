import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata({ locale: "en", path: "/random-text-chat", title: "Random Text Chat With Strangers | ChatSpark", description: "Meet strangers through random text chat. Explore anonymous conversations and creative activities on ChatSpark.", englishOnly: true });
export default function Page() {
  return <main className="container" style={{maxWidth:880,paddingBlock:"5rem"}}>
    <nav aria-label="Breadcrumb"><Link href="/en">Home</Link> / Random Text Chat With Strangers</nav>
    <h1>Random text chat, without video calls</h1><p className="lead">Find a new conversation through text-only stranger chat. You can also explore art challenges, poems and Underground FM. Chats are separate from the public creative experiences.</p>
    <p><Link className="btn btn-glow btn-large" href="/en/start">Start random text chat</Link></p>
    <section aria-labelledby="explore"><h2 id="explore">Explore more ways to connect</h2>
      <p>Try <Link href="/en/graffiti-wall">Graffiti Wall and drawing battles</Link>, <Link href="/en/poem-wall">Poem Wall and poetry challenges</Link>, or <Link href="/en/start">random text chat</Link>.</p>
    </section>
  </main>;
}
