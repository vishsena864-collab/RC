"use client";

import { useState } from "react";
import { fxParticles, getSticker } from "@/lib/stickers";

/**
 * A sticker inside the chat: pops in, plays its animation a few times, then rests.
 * Tap it to play it again (changing the key restarts every CSS animation inside).
 */
export default function Sticker({ id, label }) {
  const [plays, setPlays] = useState(0);
  const sticker = getSticker(id);
  if (!sticker) return null;
  const fx = fxParticles(sticker.fx);

  return (
    <button type="button" className="stk-btn" onClick={() => setPlays((n) => n + 1)} aria-label={label} data-sticker={id}>
      <span key={plays} className="stk-in">
        <span className={`stk anim-${sticker.anim}`} style={{ "--anim": `a-${sticker.anim}` }} aria-hidden="true">
          {sticker.emoji}
        </span>
        {fx ? (
          <span className={`fx fx-${fx.kind}`} aria-hidden="true">
            {fx.items.map((p, i) => (
              <i key={i} style={p.style}>
                {p.glyph}
              </i>
            ))}
          </span>
        ) : null}
      </span>
    </button>
  );
}
