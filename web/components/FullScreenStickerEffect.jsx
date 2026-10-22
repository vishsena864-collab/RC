"use client";

import { useEffect, useRef } from "react";
import { getSticker } from "@/lib/stickers";

const COLORS = ["#f472b6", "#38bdf8", "#facc15", "#34d399", "#a78bfa", "#fb923c"];

// A short, non-interactive celebration that covers the chat whenever either person uses a sticker.
// The layout is deterministic so a re-render never makes the particles jump.
export default function FullScreenStickerEffect({ id, onDone }) {
  const doneRef = useRef(onDone);
  const sticker = getSticker(id);
  doneRef.current = onDone;

  useEffect(() => {
    const timer = window.setTimeout(() => doneRef.current?.(), 2500);
    return () => window.clearTimeout(timer);
  }, [id]);

  if (!sticker) return null;

  const seed = [...id].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const particles = Array.from({ length: 20 }, (_, index) => {
    const angle = ((index * 137.5 + seed) * Math.PI) / 180;
    const distance = 35 + ((index * 17 + seed) % 38);
    return {
      "--tx": `${Math.cos(angle) * distance}vw`,
      "--ty": `${Math.sin(angle) * distance * 0.72}vh`,
      "--delay": `${(index % 6) * 0.045}s`,
      "--spin": `${90 + ((index * 47 + seed) % 300)}deg`,
      "--particle-color": COLORS[index % COLORS.length],
    };
  });

  return (
    <div className="sticker-screen-fx" data-kind={sticker.fx || "emoji"} aria-hidden="true">
      <span className="screen-flash" />
      <span className="screen-ring ring-one" />
      <span className="screen-ring ring-two" />
      <span className="screen-sticker-stage">
        <span className={`screen-sticker anim-${sticker.anim}`} style={{ "--anim": `a-${sticker.anim}` }}>
          {sticker.emoji}
        </span>
      </span>
      <span className="screen-particles">
        {particles.map((style, index) => (
          <i key={index} style={style}>
            <span>{sticker.emoji}</span>
          </i>
        ))}
      </span>
    </div>
  );
}
