import { fmt } from "@/lib/format";
import { SPARK_GOAL } from "@/lib/sparks";

export function SparkMeter({ count, t }) {
  const progress = Math.min(count, SPARK_GOAL);
  return (
    <span className={`spark-meter ${count >= SPARK_GOAL ? "complete" : ""}`}>
      <i aria-hidden="true" />
      {fmt(t.sparkProgress, { n: progress, goal: SPARK_GOAL })}
    </span>
  );
}

export function SparkQuest({ number, prompt, t }) {
  return (
    <aside className="spark-quest" aria-label={t.sparkQuest}>
      <span className="spark-orb" aria-hidden="true">✦</span>
      <div>
        <span className="spark-kicker">{t.sparkQuest} · #{number}</span>
        <strong>{prompt}</strong>
      </div>
    </aside>
  );
}

export function SparkResult({ count, number, palette, onShare, shareState, t }) {
  return (
    <aside className={`spark-result spark-palette-${palette}`} aria-label={t.sparkUnlocked}>
      <span className="spark-result-glow" aria-hidden="true" />
      <span className="spark-result-icon" aria-hidden="true">✦</span>
      <span className="spark-kicker">{t.sparkUnlocked} · #{number}</span>
      <strong>{fmt(t.sparkResult, { n: count })}</strong>
      <button type="button" className="spark-share" onClick={onShare}>
        {shareState === "shared" ? t.sparkShared : t.sparkShare}
      </button>
      <small>{t.sparkPrivate}</small>
      <span className="sr-only" aria-live="polite">{shareState === "shared" ? t.sparkShared : ""}</span>
    </aside>
  );
}
