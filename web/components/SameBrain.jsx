"use client";

import { useEffect, useRef } from "react";
import { fmt } from "@/lib/format";

const answer = (prompt, choice) => (choice === 0 ? { emoji: prompt.ea, label: prompt.a } : { emoji: prompt.eb, label: prompt.b });

export function SameBrainCard({ brain, prompt, number, disabled, onVote, onShare, shareState, t }) {
  if (!brain || !prompt) return null;
  const result = brain.result;
  const yours = result ? answer(prompt, result.yourChoice) : null;
  const theirs = result ? answer(prompt, result.partnerChoice) : null;

  return (
    <aside className={`same-brain ${result ? (result.match ? "matched" : "split") : "choosing"}`} aria-label={t.sameBrainTitle}>
      <header>
        <span className="brain-mark" aria-hidden="true">⚡</span>
        <div><span>{t.sameBrainKicker} · #{number}</span><strong>{t.sameBrainTitle}</strong></div>
        <span className="brain-blind">{result ? t.sameBrainRevealed : t.sameBrainBlind}</span>
      </header>

      <h3>{prompt.q}</h3>

      {result ? (
        <div className="brain-reveal">
          <div><small>{t.you}</small><b>{yours.emoji}</b><strong>{yours.label}</strong></div>
          <span aria-hidden="true">{result.match ? "=" : "≠"}</span>
          <div><small>{t.stranger}</small><b>{theirs.emoji}</b><strong>{theirs.label}</strong></div>
        </div>
      ) : (
        <div className="brain-choices">
          {[answer(prompt, 0), answer(prompt, 1)].map((option, choice) => (
            <button
              type="button"
              key={option.label}
              className={brain.choice === choice ? "selected" : ""}
              disabled={disabled || brain.choice !== null}
              onClick={() => onVote(choice)}
            >
              <span aria-hidden="true">{option.emoji}</span><strong>{option.label}</strong>
            </button>
          ))}
        </div>
      )}

      {result ? (
        <div className="brain-verdict">
          <strong>{result.match ? t.sameBrainMatch : t.sameBrainDifferent}</strong>
          <p>{result.match ? fmt(t.sameBrainMatchSub, { choice: yours.label }) : fmt(t.sameBrainDifferentSub, { you: yours.label, them: theirs.label })}</p>
          <button type="button" onClick={onShare}>{shareState === "shared" ? t.sameBrainShared : t.sameBrainShare}</button>
        </div>
      ) : (
        <p className="brain-status">
          {brain.choice !== null ? t.sameBrainWaiting : brain.partnerLocked ? t.sameBrainPartnerReady : t.sameBrainInstruction}
        </p>
      )}
    </aside>
  );
}

export function SameBrainEffect({ match, t, onDone }) {
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    const timer = window.setTimeout(() => doneRef.current?.(), 2800);
    return () => window.clearTimeout(timer);
  }, [match]);

  return (
    <div className={`brain-screen-fx ${match ? "match" : "different"}`} aria-hidden="true">
      <span className="brain-screen-orbit one" />
      <span className="brain-screen-orbit two" />
      <div className="brain-screen-copy">
        <span>{match ? "⚡" : "↯"}</span>
        <strong>{match ? t.sameBrainMatch : t.sameBrainDifferent}</strong>
        <small>{match ? t.sameBrainMoment : t.sameBrainDebate}</small>
      </div>
    </div>
  );
}
