import { buildSitemap } from "@/lib/intl-sitemap";

// Next.js App Router sitemap route. Language alternatives are published only
// where the primary page content is genuinely localized.
export default function sitemap() {
  return buildSitemap();
}
