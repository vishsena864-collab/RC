"use client";

import { useEffect, useRef } from "react";

/** Decorative only: no tracking, network calls, or identifying data. */
export default function HeroAtmosphere() {
  const ref = useRef(null);
  useEffect(() => {
    const root = ref.current?.closest(".studio-hero");
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const stage = root.querySelector(".studio-hero-stage");
    if (!stage) return;
    let frame = 0;
    const onMove = (event) => {
      if (event.pointerType === "touch") return;
      const rect = stage.getBoundingClientRect();
      const x = Math.max(-1, Math.min(1, ((event.clientX - rect.left) / rect.width - .5) * 2));
      const y = Math.max(-1, Math.min(1, ((event.clientY - rect.top) / rect.height - .5) * 2));
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        stage.style.setProperty("--pointer-x", `${(x * 13).toFixed(1)}px`);
        stage.style.setProperty("--pointer-y", `${(y * 10).toFixed(1)}px`);
        stage.style.setProperty("--pointer-rx", `${(-y * 2.4).toFixed(2)}deg`);
        stage.style.setProperty("--pointer-ry", `${(x * 2.8).toFixed(2)}deg`);
      });
    };
    const onLeave = () => {
      cancelAnimationFrame(frame);
      for (const [key,value] of Object.entries({"--pointer-x":"0px","--pointer-y":"0px","--pointer-rx":"0deg","--pointer-ry":"0deg"})) stage.style.setProperty(key,value);
    };
    stage.addEventListener("pointermove", onMove, { passive: true });
    stage.addEventListener("pointerleave", onLeave);
    return () => { stage.removeEventListener("pointermove", onMove); stage.removeEventListener("pointerleave", onLeave); cancelAnimationFrame(frame); onLeave(); };
  }, []);
  return <div className="rc-ambient-particles" ref={ref} aria-hidden="true">{Array.from({length:12}, (_,i) => <i key={i} style={{"--particle-index":i,left:`${7+(i*17)%85}%`,top:`${9+(i*23)%76}%`}} />)}</div>;
}
