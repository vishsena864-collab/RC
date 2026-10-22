import path from "node:path";
import { ImageResponse } from "next/og";
import sharp from "sharp";
import { getDict, isLocale } from "@/lib/i18n";
import { SITE_NAME } from "@/lib/site";

// Social preview card (1200x630) shown when the link is shared. One per language, built at deploy time.
export const alt = SITE_NAME;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// The artwork is WebP; the image renderer wants PNG, so convert on the fly (at build time only).
async function art(relative, px) {
  const file = path.join(process.cwd(), "public", "art", relative);
  const png = await sharp(file).resize(px, px).png().toBuffer();
  return `data:image/png;base64,${png.toString("base64")}`;
}

export default async function OpenGraphImage({ params }) {
  const { locale } = await params;
  // This route renders on demand, so refuse made-up language codes instead of rendering for them.
  if (!isLocale(locale)) return new Response("Not found", { status: 404 });
  const dict = getDict(locale);

  const [a1, a2, a3, a4, chats, send, groups] = await Promise.all([
    art("avatars/a4.webp", 150),
    art("avatars/a8.webp", 150),
    art("avatars/a3.webp", 150),
    art("avatars/a6.webp", 150),
    art("icons/chats.webp", 150),
    art("icons/send.webp", 110),
    art("icons/groups.webp", 120),
  ]);

  const ring = (img, extra = {}) => (
    <div
      style={{
        display: "flex",
        width: 170,
        height: 170,
        borderRadius: 85,
        padding: 5,
        background: "linear-gradient(135deg, #8b5cf6, #ec4899)",
        ...extra,
      }}
    >
      <img src={img} width={160} height={160} style={{ borderRadius: 80 }} />
    </div>
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 72px",
          color: "#f3f4fb",
          background:
            "radial-gradient(900px 500px at 90% 0%, rgba(139,92,246,0.55), rgba(13,15,23,0) 65%), radial-gradient(700px 500px at 0% 110%, rgba(236,72,153,0.4), rgba(13,15,23,0) 65%), #0d0f17",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", width: 640 }}>
          <div style={{ display: "flex", fontSize: 40, fontWeight: 700, color: "#d9cfff" }}>{SITE_NAME}</div>
          <div style={{ display: "flex", fontSize: 76, fontWeight: 800, lineHeight: 1.05, marginTop: 18 }}>{dict.home.h1}</div>
          <div style={{ display: "flex", fontSize: 32, color: "#b9bdd2", marginTop: 26 }}>{dict.home.ctaNote}</div>
        </div>

        <div style={{ display: "flex", position: "relative", width: 380, height: 470 }}>
          <div style={{ display: "flex", position: "absolute", left: 0, top: 10 }}>{ring(a1)}</div>
          <div style={{ display: "flex", position: "absolute", left: 200, top: 60 }}>{ring(a2)}</div>
          <div style={{ display: "flex", position: "absolute", left: 20, top: 250 }}>{ring(a3)}</div>
          <div style={{ display: "flex", position: "absolute", left: 210, top: 300 }}>{ring(a4)}</div>
          <img src={chats} width={120} height={120} style={{ position: "absolute", left: 240, top: -30 }} />
          <img src={send} width={90} height={90} style={{ position: "absolute", left: 130, top: 190 }} />
          <img src={groups} width={100} height={100} style={{ position: "absolute", left: 290, top: 180 }} />
        </div>
      </div>
    ),
    size,
  );
}
