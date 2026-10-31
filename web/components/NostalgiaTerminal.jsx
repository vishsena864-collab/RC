"use client";

import { useEffect, useState } from "react";

export default function NostalgiaTerminal({ phrases }) {
  const [line, setLine] = useState("");
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduced.matches) {
      setLine(phrases[0]);
      return;
    }
    let timer;
    let index = 0;
    let character = 0;
    let direction = 1;
    let active = true;

    const run = () => {
      if (!active || document.hidden) {
        timer = window.setTimeout(run, 300);
        return;
      }
      const phrase = phrases[index];
      character += direction;
      setLine(phrase.slice(0, character));

      if (direction === 1 && character >= phrase.length) {
        direction = -1;
        timer = window.setTimeout(run, 2700);
      } else if (direction === -1 && character <= 0) {
        direction = 1;
        index = (index + 1) % phrases.length;
        timer = window.setTimeout(run, 550);
      } else {
        timer = window.setTimeout(run, direction === 1 ? 75 : 28);
      }
    };

    timer = window.setTimeout(run, 750);
    return () => { active = false; window.clearTimeout(timer); };
  }, [phrases]);

  return (
    <div className="nostalgia-terminal" aria-hidden="true">
      <span className="nostalgia-terminal-label">ChatSpark &gt;</span>
      <span className="nostalgia-terminal-output">{line}<i className="nostalgia-terminal-cursor" /></span>
    </div>
  );
}
