"use client";

import { useEffect, useRef } from "react";
import { fmt } from "@/lib/format";
import { STICKERS } from "@/lib/stickers";

// A popover grid above the message box. Each sticker previews its animation on hover or keyboard focus.
export default function StickerPicker({ t, onPick, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    const firstButton = ref.current?.querySelector("button");
    firstButton?.focus();

    const onKey = (e) => e.key === "Escape" && onClose();
    const onPointer = (e) => {
      // a click on the toggle button is handled by the button itself
      if (ref.current && !ref.current.contains(e.target) && !e.target.closest?.("[aria-controls='sticker-pop']")) onClose();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [onClose]);

  return (
    <div id="sticker-pop" ref={ref} className="sticker-pop" role="dialog" aria-label={t.stickers}>
      <ul>
        {STICKERS.map((s) => (
          <li key={s.id}>
            <button
              type="button"
              className="pick"
              style={{ "--anim": `a-${s.anim}` }}
              aria-label={fmt(t.stickerLabel, { name: t.stickerNames[s.id] })}
              title={t.stickerNames[s.id]}
              onClick={() => onPick(s.id)}
            >
              <span className="pick-emoji" aria-hidden="true">
                {s.emoji}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
