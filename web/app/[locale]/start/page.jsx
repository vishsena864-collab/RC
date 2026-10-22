import ChatApp from "@/components/ChatApp";
import { categoryIds } from "@/lib/categories";
import { fmt } from "@/lib/format";
import { getDict } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";
import { SITE_NAME } from "@/lib/site";

// The chat itself is an app screen, not content: keep it out of search results.
export async function generateMetadata({ params }) {
  const { locale } = await params;
  const dict = getDict(locale);
  return pageMetadata({
    locale,
    path: "/start",
    title: `${dict.chat.pageTitle} | ${SITE_NAME}`,
    description: fmt(dict.meta.homeDescription, { name: SITE_NAME }),
    noindex: true,
  });
}

export default async function StartPage({ params }) {
  const { locale } = await params;
  const dict = getDict(locale);
  const topics = categoryIds.map((id) => ({ id, name: dict.cats[id].name }));

  return (
    <div className="container chat-page">
      <ChatApp locale={locale} t={dict.chat} home={dict.home} topics={topics} links={{ terms: dict.nav.terms, safety: dict.nav.safety }} />
    </div>
  );
}
