import { SITE_NAME } from "@/lib/site";

export default function manifest() {
  return {
    name: `${SITE_NAME} – Random Chat`,
    short_name: SITE_NAME,
    description: "Free, anonymous random text chat for adults.",
    start_url: "/en/start",
    display: "standalone",
    background_color: "#0f1115",
    theme_color: "#6d5efc",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
