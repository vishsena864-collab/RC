import LegalPage from "@/components/LegalPage";
import { getDict } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";
import { SITE_NAME } from "@/lib/site";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return pageMetadata({
    locale,
    path: "/cookies",
    title: `${getDict("en").meta.cookiesTitle} | ${SITE_NAME}`,
    description: `${SITE_NAME} uses no tracking cookies. This page lists exactly what the site stores in your browser and why.`,
    englishOnly: true,
  });
}

export default function CookiesPage() {
  return <LegalPage kind="cookies" title={getDict("en").meta.cookiesTitle} />;
}
