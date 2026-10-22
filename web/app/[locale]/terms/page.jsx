import LegalPage from "@/components/LegalPage";
import { getDict } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";
import { SITE_NAME } from "@/lib/site";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return pageMetadata({
    locale,
    path: "/terms",
    title: `${getDict("en").meta.termsTitle} | ${SITE_NAME}`,
    description: `The terms for using ${SITE_NAME}: who can use it, what is not allowed, and how reports and blocks work.`,
    englishOnly: true,
  });
}

export default function TermsPage() {
  return <LegalPage kind="terms" title={getDict("en").meta.termsTitle} />;
}
