/** @type {import('next').NextConfig} */

// Camera and microphone are blocked while the site is text-only. Change this to
// "camera=(self), microphone=(self), geolocation=()" when video chat ships.
const api = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:4000";
const trustedSocket = api === "same-origin" ? "" : (() => {
  try { const u = new URL(api); return ` ${u.origin} ${u.protocol === "https:" ? "wss:" : "ws:"}//${u.host}`; }
  catch { return ""; }
})();
// This policy prohibits third-party images, scripts, forms, embeds and WebRTC permissions.
// Next.js hydration currently needs its own inline bootstrap; production should adopt nonce-based
// strict CSP where supported by the chosen deployment.
const contentSecurityPolicy = [
  "default-src 'self'", "base-uri 'self'", "object-src 'none'", "frame-ancestors 'none'",
  "form-action 'self'", "img-src 'self' data: blob:", "font-src 'self' data:",
  "worker-src 'none'", "media-src 'self' https:", `connect-src 'self'${trustedSocket}`,
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === 'production' ? '' : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
].join("; ");
const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), midi=()" },
];

const nextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  compress: true,

  async redirects() {
    // English is the default language and the hreflang x-default.
    return [{ source: "/", destination: "/en", permanent: false }];
  },

  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/:locale/start", headers: [{ key: "Cache-Control", value: "no-store" }] },
      { source: "/:locale/chat/:path*", headers: [{ key: "Cache-Control", value: "no-store" }] },
    ];
  },
};

export default nextConfig;
