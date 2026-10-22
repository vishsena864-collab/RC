import LegalPage from "@/components/LegalPage";
import { getDict } from "@/lib/i18n";
import { pageMetadata } from "@/lib/seo";
import { SITE_NAME } from "@/lib/site";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return pageMetadata({
    locale,
    path: "/privacy",
    title: `${getDict("en").meta.privacyTitle} | ${SITE_NAME}`,
    description: `The ${SITE_NAME} privacy policy: what we collect, why we collect it, and how long we keep it.`,
    englishOnly: true,
  });
}

export default function PrivacyPage() {
  return <LegalPage kind="privacy" title={getDict("en").meta.privacyTitle} />;
}
