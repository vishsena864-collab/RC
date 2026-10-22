import { SITE_URL } from "@/lib/site";

// The chat screen (/<locale>/start) is kept out of search results with a noindex tag on the page itself.
// It must stay crawlable here: a page blocked in robots.txt cannot show search engines its noindex tag.
export default function robots() {
  return {
    rules: [{ userAgent: "*", allow: "/" }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
