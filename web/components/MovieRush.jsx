"use client";

import { useEffect, useState } from "react";

const DEFAULT_DURATION = 60_000;

async function renderCard(movie) {
  // This image contains no stranger's profile, chat messages, IP or location data.
  const canvas = document.createElement("canvas");
  canvas.width = 1080; canvas.height = 1350;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createLinearGradient(0, 0, 1080, 1350);
  gradient.addColorStop(0, "#11152f"); gradient.addColorStop(0.55, "#5a39bb"); gradient.addColorStop(1, "#131a3c");
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, 1080, 1350);
  // Deterministic decorative stars, not data about either user.
  for (let n = 0; n < 42; n += 1) {
    const x = (n * 197 + 137) % 1080, y = (n * 239 + 41) % 1350;
    ctx.fillStyle = `rgba(255,255,255,${0.24 + (n % 4) * 0.13})`;
    ctx.beginPath(); ctx.arc(x, y, n % 8 === 0 ? 5 : 2, 0, 2 * Math.PI); ctx.fill();
  }
  ctx.fillStyle = "rgba(255,255,255,.10)"; ctx.beginPath(); ctx.roundRect(78, 85, 924, 1180, 52); ctx.fill();
  ctx.strokeStyle = "rgba(235,220,255,.8)"; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.roundRect(78, 85, 924, 1180, 52); ctx.stroke();
  ctx.textAlign = "center";
  ctx.fillStyle = "#d9d0ff"; ctx.font = "700 38px system-ui"; ctx.fillText("CHATSPARK  ·  MOVIE RUSH", 540, 188);
  ctx.font = "165px system-ui"; ctx.fillText(movie.winner === "you" ? "🏆" : movie.winner === "stranger" ? "🎬" : "⏱️", 540, 450);
  ctx.fillStyle = "#ffffff"; ctx.font = "bold 76px system-ui";
  ctx.fillText(movie.winner === "you" ? "MOVIE MASTER" : movie.winner === "stranger" ? "NEXT ROUND?" : "MYSTERY ENDED", 540, 620);
  ctx.fillStyle = "#d7d2fa"; ctx.font = "38px system-ui"; ctx.fillText("FOUR CLUES. TWO STRANGERS.", 540, 725);
  ctx.fillText("ONE EPIC MOVIE RACE.", 540, 783);
  ctx.strokeStyle = "rgba(255,255,255,.35)"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(220, 850); ctx.lineTo(860, 850); ctx.stroke();
  ctx.font = "46px system-ui"; ctx.fillStyle = "#fff"; ctx.fillText("PLAY · GUESS · CONNECT", 540, 940);
  ctx.fillStyle = "#e2d8ff"; ctx.font = "32px system-ui";
  ctx.fillText("A Stranger Today. A Story Tomorrow.", 540, 1110);
  // Always include the site's URL beneath the card content.
  ctx.fillStyle = "#ffffff"; ctx.font = "bold 36px system-ui";
  ctx.fillText(window.location.host, 540, 1202);
  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

export default function MovieRush({ movie, onInvite, onAccept, onDecline, onGuess, errorText }) {
  const [guess, setGuess] = useState("");
  const [seconds, setSeconds] = useState(60);
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    setGuess(""); setFeedback(""); setBusy(false);
  }, [movie.roundId]);
  useEffect(() => {
    if (movie.state !== "playing") return;
    const update = () => setSeconds(Math.max(0, Math.ceil(((movie.endsAt || Date.now() + DEFAULT_DURATION) - Date.now()) / 1000)));
    update();
    const id = setInterval(update, 200);
    return () => clearInterval(id);
  }, [movie.state, movie.endsAt]);

  async function submit(event) {
    event.preventDefault();
    if (busy || !guess.trim()) return;
    setBusy(true);
    try {
      const result = await onGuess(guess.trim());
      if (result?.ok) {
        setFeedback(result.correct ? "🎉 You got it!" : `Not quite — ${result.remaining} guesses left.`);
        if (!result.correct) setGuess("");
      } else setFeedback(errorText(result?.error));
    } finally { setBusy(false); }
  }
  async function cardAction(share) {
    setExporting(true);
    try {
      const blob = await renderCard(movie);
      if (!blob) throw Error("Canvas export failed");
      const file = new File([blob], "randomchat-movie-rush.png", { type: "image/png" });
      const url = `${window.location.origin}/en/start`;
      if (share && navigator.share && navigator.canShare?.({ files: [file] })) {
        try { await navigator.share({ files: [file], title: "Movie Rush", text: "Can you beat me in Movie Rush?", url }); return; }
        catch (err) { if (err?.name === "AbortError") return; }
      }
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a"); link.href = objectUrl; link.download = file.name;
      link.click(); setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch { setFeedback("Couldn't export this card. Please try again."); }
    finally { setExporting(false); }
  }

  return (
    <section className="movie-rush" aria-label="Movie Rush mini-game">
      <div className="movie-rush-head"><span className="movie-rush-symbol" aria-hidden="true">🎬</span><div><strong>MOVIE RUSH</strong><p>4 shared clues · first correct guess wins</p></div><span className="movie-rush-tag">LIVE GAME</span></div>
      {movie.state === "idle" ? (
        <div className="movie-rush-center"><p>Make chatting more fun. Challenge your stranger to a quick movie guessing race.</p><button type="button" onClick={onInvite} className="movie-rush-btn">⚡ Challenge your stranger</button></div>
      ) : movie.state === "inviting" ? (
        <p role="status" className="movie-rush-center">Challenge sent! Waiting for your stranger to join…</p>
      ) : movie.state === "invited" ? (
        <div className="movie-rush-center"><p>🍿 Your stranger challenged you to Movie Rush!</p><div className="movie-rush-actions"><button type="button" className="movie-rush-btn" onClick={onAccept}>I'm in!</button><button type="button" className="movie-rush-btn secondary" onClick={onDecline}>Not now</button></div></div>
      ) : movie.state === "playing" ? (
        <div className="movie-rush-play"><div className="movie-rush-clock"><span>GUESS THE MOVIE</span><b aria-label={`${seconds} seconds remaining`}>⏱ {seconds}s</b></div>
          <ol className="movie-rush-clues">{movie.clues.map((clue, i) => <li key={i}><em>{i+1}</em><span>{clue}</span></li>)}</ol>
          <form onSubmit={submit} className="movie-rush-guess"><label htmlFor="movie-guess">What's the movie?</label><div><input id="movie-guess" autoComplete="off" spellCheck={false} maxLength={100} value={guess} onChange={e => setGuess(e.target.value)} placeholder="Type the movie title..." /><button type="submit" disabled={busy || !guess.trim() || seconds===0}>Guess!</button></div></form>
          {feedback ? <p className="movie-rush-feedback" role="status">{feedback}</p> : null}
          <small>The server checks answers. Both players see exactly the same clues.</small>
        </div>
      ) : (
        <div className="movie-rush-end"><div className="movie-rush-result-icon">{movie.winner === "you" ? "🏆" : movie.winner === "stranger" ? "🎬" : "⏱️"}</div>
          <strong>{movie.winner === "you" ? "YOU WON!" : movie.winner === "stranger" ? "THE STRANGER WON!" : "TIME'S UP!"}</strong><p>The movie was <b>{movie.answer}</b></p>
          <div className="movie-rush-actions"><button type="button" onClick={() => cardAction(true)} disabled={exporting} className="movie-rush-btn">✨ Share card</button><button type="button" onClick={() => cardAction(false)} disabled={exporting} className="movie-rush-btn secondary">Save PNG</button><button type="button" onClick={onInvite} className="movie-rush-btn secondary">Play again</button></div>
          <small>Cards include your website address, never private chat content.</small>
        </div>
      )}
      {feedback && movie.state !== "playing" ? <p className="movie-rush-feedback" role="status">{feedback}</p> : null}
    </section>
  );
}
