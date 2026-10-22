"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { fmt } from "@/lib/format";
import { SERVER_URL } from "@/lib/site";
import { SPARK_GOAL, sparkIdentity } from "@/lib/sparks";
import { getSticker } from "@/lib/stickers";
import { NeonIcon } from "./Art";
import FullScreenStickerEffect from "./FullScreenStickerEffect";
import MovieRush from "./MovieRush";
import ReportDialog from "./ReportDialog";
import { SameBrainCard, SameBrainEffect } from "./SameBrain";
import Sticker from "./Sticker";
import StickerPicker from "./StickerPicker";
import { SparkMeter, SparkQuest, SparkResult } from "./StrangerSpark";

const STORAGE_KEY = "chat.settings.v1";
const MAX_INTERESTS = 10;
const MAX_INTEREST_LENGTH = 24;
const GENDERS = ["male", "female"];
const WANTS = ["any", "male", "female"];

const DEFAULT_SETTINGS = { gender: "male", want: "any", category: "general", interests: [] };

async function copyText(text) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  const area = document.createElement("textarea");
  area.value = text;
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.append(area);
  area.select();
  document.execCommand("copy");
  area.remove();
}

// Phases: setup -> searching -> chatting -> ended (-> searching again). `banned` is terminal.

export default function ChatApp({ locale, t, home, topics, links }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [phase, setPhase] = useState("setup");
  const [messages, setMessages] = useState([]);
  const [typing, setTyping] = useState(false);
  const [online, setOnline] = useState(null);
  const [connected, setConnected] = useState(false);
  const [notice, setNotice] = useState(null);
  const [draft, setDraft] = useState("");
  const [interestDraft, setInterestDraft] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const [partnerSeen, setPartnerSeen] = useState(false);
  const [reported, setReported] = useState(false);
  const [restored, setRestored] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [screenSticker, setScreenSticker] = useState(null);
  const [spark, setSpark] = useState(null);
  const [shareState, setShareState] = useState("");
  const [sameBrain, setSameBrain] = useState(null);
  const [brainEffect, setBrainEffect] = useState(null);
  const [brainShareState, setBrainShareState] = useState("");
  const [movie, setMovie] = useState({ state: "idle" });

  const socketRef = useRef(null);
  const settingsRef = useRef(settings);
  const ageRef = useRef(ageConfirmed);
  const idRef = useRef(0);
  const logRef = useRef(null);
  const inputRef = useRef(null);
  const typingTimer = useRef(null);
  const lastTypingSent = useRef(0);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);
  useEffect(() => {
    ageRef.current = ageConfirmed;
  }, [ageConfirmed]);

  const errorText = useCallback((code) => t.errors[code] || t.errors.generic, [t]);

  const addMessage = useCallback((kind, text) => {
    setMessages((list) => [...list, { id: ++idRef.current, kind, text }]);
  }, []);

  const addSticker = useCallback((kind, sticker) => {
    const messageId = ++idRef.current;
    setMessages((list) => [...list, { id: messageId, kind, sticker }]);
    setScreenSticker({ id: sticker, key: messageId });
  }, []);

  // ----- restore saved settings and any ?category= deep link -----
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (saved && typeof saved === "object") {
        setSettings((prev) => ({
          gender: GENDERS.includes(saved.gender) ? saved.gender : prev.gender,
          want: WANTS.includes(saved.want) ? saved.want : prev.want,
          category: topics.some((tp) => tp.id === saved.category) ? saved.category : prev.category,
          interests: Array.isArray(saved.interests)
            ? saved.interests.filter((i) => typeof i === "string").slice(0, MAX_INTERESTS)
            : prev.interests,
        }));
      }
    } catch {
      // storage unavailable (private mode): defaults are fine
    }
    const wanted = new URLSearchParams(window.location.search).get("category");
    if (wanted && topics.some((tp) => tp.id === wanted)) setSettings((prev) => ({ ...prev, category: wanted }));
    setRestored(true);
  }, [topics]);

  // Only save once the saved values have been loaded, otherwise the defaults would overwrite them.
  useEffect(() => {
    if (!restored) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // ignore
    }
  }, [settings, restored]);

  // ----- socket -----
  useEffect(() => {
    // An empty SERVER_URL means "same origin as this page"; socket.io needs undefined (not "") for that.
    const socket = io(SERVER_URL || undefined, { transports: ["websocket", "polling"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      setNotice((n) => (n?.lost ? null : n));
    });
    socket.on("disconnect", () => {
      setMovie({ state: "idle" });
      setConnected(false);
      setTyping(false);
      setPhase((p) => (p === "setup" || p === "banned" ? p : "ended"));
      setNotice((n) => n || { kind: "error", text: t.connectionLost, lost: true });
    });
    socket.on("connect_error", (err) => {
      if (err?.message === "banned") {
        setPhase("banned");
        setNotice({ kind: "error", text: t.banned });
        socket.close();
      }
    });
    socket.on("banned", () => {
      setPhase("banned");
      setNotice({ kind: "error", text: t.banned });
      socket.close();
    });
    socket.on("online", setOnline);

    socket.on("matched", (m) => {
      const roomId = typeof m.roomId === "string" ? m.roomId : `${Date.now()}`;
      const lines = [t.connected];
      if (m.common?.length) lines.push(fmt(t.commonInterests, { list: m.common.join(", ") }));
      if (GENDERS.includes(m.partner?.gender)) {
        lines.push(fmt(t.strangerIs, { gender: (m.partner.gender === "male" ? t.male : t.female).toLocaleLowerCase(locale) }));
      }
      setMessages(lines.map((text) => ({ id: ++idRef.current, kind: "system", text })));
      setMovie({ state: "idle" });
      setSpark({ roomId, ...sparkIdentity(roomId, t.sparkPrompts.length) });
      setShareState("");
      setSameBrain({ promptIndex: Number.isInteger(m.sameBrainPrompt) ? m.sameBrainPrompt : 0, choice: null, partnerLocked: false, result: null });
      setBrainEffect(null);
      setBrainShareState("");
      setPartnerSeen(true);
      setTyping(false);
      setPhase("chatting");
    });
    socket.on("partner_left", () => {
      setMovie((current) => current.state === "finished" ? current : { state: "idle" });
      setTyping(false);
      setPhase("ended");
      addMessage("system", t.partnerLeft);
    });
    socket.on("message", (msg) => {
      setTyping(false);
      addMessage("them", msg.text);
    });
    socket.on("sticker", (msg) => {
      if (!getSticker(msg?.id)) return; // an id this version does not know: ignore it
      setTyping(false);
      addSticker("them", msg.id);
    });
    socket.on("same_brain_partner_locked", () => {
      setSameBrain((current) => (current ? { ...current, partnerLocked: true } : current));
    });
    socket.on("same_brain_result", (result) => {
      if (!result || (result.yourChoice !== 0 && result.yourChoice !== 1) || (result.partnerChoice !== 0 && result.partnerChoice !== 1)) return;
      setSameBrain((current) => (current ? { ...current, result } : current));
      setBrainEffect({ key: Date.now(), match: Boolean(result.match) });
    });
    socket.on("movie_invited", () => setMovie({ state: "invited" }));
    socket.on("movie_declined", () => setMovie({ state: "idle" }));
    socket.on("movie_started", (game) => {
      if (!game || !Array.isArray(game.clues) || game.clues.length !== 4 || typeof game.roundId !== "string") return;
      setMovie({ state: "playing", roundId: game.roundId, clues: game.clues,
        endsAt: Date.now() + (Number.isInteger(game.durationMs) ? game.durationMs : 60_000) });
    });
    socket.on("movie_result", (outcome) => {
      if (!outcome || typeof outcome.answer !== "string") return;
      setMovie((current) => current.roundId === outcome.roundId
        ? { ...current, state: "finished", winner: outcome.winner, answer: outcome.answer }
        : current);
    });
    socket.on("typing", (on) => setTyping(Boolean(on)));

    return () => {
      clearTimeout(typingTimer.current);
      socket.close();
      socketRef.current = null;
    };
  }, [t, locale, addMessage, addSticker]);

  // glide to the newest message (instantly for people who prefer reduced motion), and focus the box when a chat starts
  useEffect(() => {
    const log = logRef.current;
    if (!log) return;
    const calm = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    log.scrollTo({ top: log.scrollHeight, behavior: calm ? "auto" : "smooth" });
  }, [messages, typing, phase]);
  useEffect(() => {
    if (phase === "chatting") inputRef.current?.focus();
    else setPickerOpen(false);
  }, [phase]);

  // ----- actions -----
  const join = useCallback(() => {
    const s = settingsRef.current;
    socketRef.current?.emit(
      "join",
      { gender: s.gender, want: s.want, category: s.category, mode: "text", interests: s.interests, ageConfirmed: ageRef.current },
      (res) => {
        if (res?.ok) return;
        setPhase("setup");
        setNotice({ kind: "error", text: errorText(res?.error) });
      },
    );
  }, [errorText]);

  function begin() {
    setNotice(null);
    setMessages([]);
    setScreenSticker(null);
    setSpark(null);
    setShareState("");
    setSameBrain(null);
    setBrainEffect(null);
    setBrainShareState("");
    setMovie({ state: "idle" });
    setTyping(false);
    setPartnerSeen(false);
    setReported(false);
    setPhase("searching");
    join();
  }

  function onStart(e) {
    e.preventDefault();
    if (ageConfirmed && connected) begin();
  }

  function onAgeChange(checked) {
    setAgeConfirmed(checked);
    if (!checked) setSettings((current) => (current.category === "adult" ? { ...current, category: "general" } : current));
  }

  function next() {
    socketRef.current?.emit("leave");
    begin();
  }

  function stop() {
    socketRef.current?.emit("leave");
    setMessages([]);
    setScreenSticker(null);
    setSpark(null);
    setShareState("");
    setSameBrain(null);
    setBrainEffect(null);
    setBrainShareState("");
    setMovie({ state: "idle" });
    setTyping(false);
    setNotice(null);
    setPhase("setup");
  }

  function stopTyping() {
    clearTimeout(typingTimer.current);
    if (lastTypingSent.current) socketRef.current?.emit("typing", false);
    lastTypingSent.current = 0;
  }

  function onDraft(e) {
    setDraft(e.target.value);
    const now = Date.now();
    if (now - lastTypingSent.current > 2000) {
      socketRef.current?.emit("typing", true);
      lastTypingSent.current = now;
    }
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(stopTyping, 1500);
  }

  function send(e) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || phase !== "chatting") return;
    setDraft("");
    stopTyping();
    socketRef.current?.emit("message", text, (res) => {
      if (res?.ok) return addMessage("me", text);
      setDraft((current) => current || text); // give the text back so nothing is lost
      addMessage("error", errorText(res?.error));
    });
  }

  function sendSticker(id) {
    if (phase !== "chatting") return;
    setPickerOpen(false);
    inputRef.current?.focus();
    socketRef.current?.emit("sticker", id, (res) => {
      if (res?.ok) return addSticker("me", id);
      addMessage("error", errorText(res?.error));
    });
  }

  function submitReport(reason, note) {
    socketRef.current?.emit("report", { reason, note }, (res) => {
      setReportOpen(false);
      if (!res?.ok) return addMessage("error", errorText(res?.error));
      setReported(true);
      socketRef.current?.emit("leave");
      setTyping(false);
      setPhase("ended");
      addMessage("system", t.reportThanks);
    });
  }

  // ----- interests -----
  function addInterests(raw) {
    const parts = raw.split(",");
    setSettings((s) => {
      const set = new Set(s.interests);
      for (const part of parts) {
        const value = part.trim().toLowerCase().slice(0, MAX_INTEREST_LENGTH);
        if (value && set.size < MAX_INTERESTS) set.add(value);
      }
      return { ...s, interests: [...set] };
    });
    setInterestDraft("");
  }

  function onInterestKey(e) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addInterests(interestDraft);
    } else if (e.key === "Backspace" && !interestDraft) {
      setSettings((s) => ({ ...s, interests: s.interests.slice(0, -1) }));
    }
  }

  const conversationCount = messages.reduce((total, message) => total + (message.kind === "me" || message.kind === "them" ? 1 : 0), 0);
  const sparkPrompt = spark ? t.sparkPrompts[spark.promptIndex % t.sparkPrompts.length] : "";
  const brainPrompt = sameBrain ? t.sameBrainPrompts[sameBrain.promptIndex % t.sameBrainPrompts.length] : null;

  function voteSameBrain(choice) {
    if (phase !== "chatting" || !sameBrain || sameBrain.choice !== null) return;
    setSameBrain((current) => ({ ...current, choice }));
    socketRef.current?.emit("same_brain_vote", { choice }, (res) => {
      if (res?.ok) return;
      setSameBrain((current) => (!current || current.result ? current : { ...current, choice: null }));
      addMessage("error", errorText(res?.error));
    });
  }

  async function shareSpark() {
    if (!spark) return;
    const url = `${window.location.origin}/${locale}/start`;
    const text = fmt(t.sparkShareText, { n: conversationCount, number: spark.number });
    try {
      if (navigator.share) await navigator.share({ title: t.sparkUnlocked, text, url });
      else await copyText(`${text} ${url}`);
      setShareState("shared");
    } catch (error) {
      if (error?.name === "AbortError") return;
      try {
        await copyText(`${text} ${url}`);
        setShareState("shared");
      } catch {
        // Sharing is optional; keep the button available if the browser blocks both methods.
      }
    }
  }

  async function shareSameBrain() {
    if (!spark || !sameBrain?.result || !brainPrompt) return;
    const yours = sameBrain.result.yourChoice === 0 ? brainPrompt.a : brainPrompt.b;
    const theirs = sameBrain.result.partnerChoice === 0 ? brainPrompt.a : brainPrompt.b;
    const outcome = sameBrain.result.match
      ? fmt(t.sameBrainShareMatch, { choice: yours })
      : fmt(t.sameBrainShareDifferent, { you: yours, them: theirs });
    const text = fmt(t.sameBrainShareText, { number: spark.number, outcome });
    const url = `${window.location.origin}/${locale}/start`;
    try {
      if (navigator.share) await navigator.share({ title: t.sameBrainTitle, text, url });
      else await copyText(`${text} ${url}`);
      setBrainShareState("shared");
    } catch (error) {
      if (error?.name === "AbortError") return;
      try {
        await copyText(`${text} ${url}`);
        setBrainShareState("shared");
      } catch {
        // Sharing is optional; keep the button available if both browser methods are blocked.
      }
    }
  }

  function requestMovieGame() {
    if (phase !== "chatting") return;
    socketRef.current?.emit("movie_invite", null, (result) => {
      if (result?.ok) setMovie({ state: "inviting" });
      else addMessage("error", result?.error === "game_busy" ? "A Movie Rush game is already pending." : errorText(result?.error));
    });
  }
  function answerMovieInvite(accept) {
    socketRef.current?.emit(accept ? "movie_accept" : "movie_decline", null, (result) => {
      if (!result?.ok) addMessage("error", errorText(result?.error));
      else if (!accept) setMovie({ state: "idle" });
    });
  }
  function submitMovieGuess(guess) {
    return new Promise((resolve) => {
      if (phase !== "chatting" || movie.state !== "playing") return resolve({ ok: false, error: "game_not_active" });
      socketRef.current?.timeout(5000).emit("movie_guess", { roundId: movie.roundId, guess }, (error, result) => {
        resolve(error ? { ok: false, error: "generic" } : result);
      });
    });
  }

  const onlineText = online ? fmt(t.online, { n: online }) : "";

  // ----- views -----
  if (phase === "banned") {
    return (
      <section className="panel">
        <p role="alert" className="notice error">
          {notice?.text}
        </p>
      </section>
    );
  }

  if (phase === "setup") {
    return (
      <div className="start-experience">
        <aside className="start-story">
          <span className="start-story-kicker">✳ {home.ui.eyebrow}</span>
          <h2>{home.tagline[0]} <em>{home.tagline[1]}</em></h2>
          <p>{home.sub}</p>
          <div className="start-story-conversation" aria-hidden="true">
            <div><span className="start-story-avatar">👋</span><b>{home.demo[0].text}</b></div>
            <div className="start-story-reply"><b>{home.demo[1].text}</b></div>
            <div><span className="start-story-avatar pink">✨</span><b>{home.demo[2].text}</b></div>
          </div>
          <div className="start-story-foot">✦ {home.ctaNote}</div>
        </aside>
        <section className="panel studio-setup-panel" aria-labelledby="setup-h">
          <div className="setup-head"><span className="start-story-kicker">01 / {home.ui.explore}</span><h1 id="setup-h">{t.setupTitle}</h1><p>{home.ui.previewCaption}</p></div>
        {notice ? (
          <p role="alert" className={`notice ${notice.kind}`}>
            {notice.text}
          </p>
        ) : null}

        <form onSubmit={onStart} className="form">
          <fieldset>
            <legend>{t.iAm}</legend>
            <div className="seg">
              {GENDERS.map((g) => (
                <label key={g} className="seg-item">
                  <input type="radio" name="gender" value={g} checked={settings.gender === g} onChange={() => setSettings((s) => ({ ...s, gender: g }))} />
                  <span>{t[g]}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend>{t.lookingFor}</legend>
            <div className="seg">
              {WANTS.map((w) => (
                <label key={w} className="seg-item">
                  <input type="radio" name="want" value={w} checked={settings.want === w} onChange={() => setSettings((s) => ({ ...s, want: w }))} />
                  <span>{t[w]}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="field">
            <label htmlFor="topic">{t.topic}</label>
            <div className="select-shell">
              <span className="select-spark" aria-hidden="true">✦</span>
              <select id="topic" value={settings.category} onChange={(e) => setSettings((s) => ({ ...s, category: e.target.value }))}>
                {topics.map((tp) => (
                  <option key={tp.id} value={tp.id}>
                    {tp.name}
                  </option>
                ))}
              </select>
              <span className="select-chevron" aria-hidden="true">⌄</span>
            </div>
          </div>

          <div className="field">
            <label htmlFor="interest">{t.interests}</label>
            <div className="chips">
              {settings.interests.map((i) => (
                <span className="chip" key={i}>
                  {i}
                  <button
                    type="button"
                    aria-label={fmt(t.removeInterest, { interest: i })}
                    onClick={() => setSettings((s) => ({ ...s, interests: s.interests.filter((x) => x !== i) }))}
                  >
                    ×
                  </button>
                </span>
              ))}
              <input
                id="interest"
                value={interestDraft}
                maxLength={MAX_INTEREST_LENGTH}
                placeholder={settings.interests.length < MAX_INTERESTS ? t.interestsHint : ""}
                disabled={settings.interests.length >= MAX_INTERESTS}
                onChange={(e) => setInterestDraft(e.target.value)}
                onKeyDown={onInterestKey}
                onBlur={() => interestDraft.trim() && addInterests(interestDraft)}
              />
            </div>
          </div>

          <label className="check">
            <input type="checkbox" checked={ageConfirmed} onChange={(e) => onAgeChange(e.target.checked)} />
            <span>
              {t.ageLabel}{" "}
              <Link href="/en/terms" target="_blank">
                {links.terms}
              </Link>
              {" · "}
              <Link href={`/${locale}/safety`} target="_blank">
                {links.safety}
              </Link>
            </span>
          </label>

          <button type="submit" className="btn btn-large" disabled={!ageConfirmed || !connected}>
            {t.start}
          </button>
          <p className="note" aria-live="polite">
            {connected ? onlineText : t.connectionLost}
          </p>
        </form>
        </section>
      </div>
    );
  }

  const canType = phase === "chatting";
  const canReport = partnerSeen && !reported && (phase === "chatting" || phase === "ended");

  return (
    <>
      <section className="chat" aria-label={t.pageTitle}>
      <div className="chat-top">
        <div className="social-session-identity">
          <span className={`social-session-icon ${phase === "searching" ? "is-searching" : ""}`} aria-hidden="true">✳<i /></span>
          <div className="social-session-details"><strong>{t.pageTitle}</strong><span className="status">
            {phase === "searching" ? (settings.interests.length ? t.searchingInterests : t.searching) : onlineText}
          </span></div>
        </div>
        {spark ? <SparkMeter count={conversationCount} t={t} /> : null}
        {canReport ? (
          <button type="button" className="btn btn-ghost btn-small" onClick={() => setReportOpen(true)}>
            ⚑ {t.report}
          </button>
        ) : null}
      </div>

      <div className="log" role="log" aria-live="polite" ref={logRef}>
        {spark ? <SparkQuest key={`quest-${spark.roomId}`} number={spark.number} prompt={sparkPrompt} t={t} /> : null}
        {spark && (canType || movie.state === "finished") ? (
          <MovieRush movie={movie} onInvite={requestMovieGame} onAccept={() => answerMovieInvite(true)}
            onDecline={() => answerMovieInvite(false)} onGuess={submitMovieGuess} errorText={errorText} />
        ) : null}
        {sameBrain ? (
          <SameBrainCard
            brain={sameBrain}
            prompt={brainPrompt}
            number={spark?.number}
            disabled={!canType}
            onVote={voteSameBrain}
            onShare={shareSameBrain}
            shareState={brainShareState}
            t={t}
          />
        ) : null}
        {messages.map((m) =>
          m.sticker ? (
            <div key={m.id} className={`msg sticker ${m.kind}`}>
              <span className="who">{m.kind === "me" ? t.you : t.stranger}</span>
              <Sticker id={m.sticker} label={fmt(t.stickerLabel, { name: t.stickerNames[m.sticker] })} />
            </div>
          ) : (
            <p key={m.id} className={`msg ${m.kind}`}>
              {m.kind === "me" || m.kind === "them" ? <span className="who">{m.kind === "me" ? t.you : t.stranger}</span> : null}
              {m.text}
            </p>
          ),
        )}
        {spark && conversationCount >= SPARK_GOAL ? (
          <SparkResult
            key={`result-${spark.roomId}`}
            count={conversationCount}
            number={spark.number}
            palette={spark.palette}
            onShare={shareSpark}
            shareState={shareState}
            t={t}
          />
        ) : null}
        {phase === "searching" ? (
          <div className="searching" role="status">
            <span className="radar">
              <NeonIcon name="search" size={46} priority />
            </span>
            <p>{settings.interests.length ? t.searchingInterests : t.searching}</p>
          </div>
        ) : null}
        {typing ? (
          <div className="typing-bubble" role="status">
            <span className="sr-only">{t.typing}</span>
            <i />
            <i />
            <i />
          </div>
        ) : null}
      </div>

      {notice ? (
        <p role="alert" className={`notice ${notice.kind}`}>
          {notice.text}
        </p>
      ) : null}

      <form className="composer" onSubmit={send}>
        <div className="sticker-wrap">
          <button
            type="button"
            className="btn btn-ghost icon-btn"
            aria-label={t.stickers}
            aria-expanded={pickerOpen}
            aria-controls="sticker-pop"
            disabled={!canType}
            onClick={() => setPickerOpen((open) => !open)}
          >
            <span aria-hidden="true">😊</span>
          </button>
          {pickerOpen ? <StickerPicker t={t} onPick={sendSticker} onClose={() => setPickerOpen(false)} /> : null}
        </div>
        <input
          ref={inputRef}
          value={draft}
          onChange={onDraft}
          placeholder={t.placeholder}
          aria-label={t.placeholder}
          maxLength={1000}
          disabled={!canType}
          autoComplete="off"
        />
        <button type="submit" className="btn" disabled={!canType || !draft.trim()}>
          {t.send}
        </button>
      </form>

      <div className="actions">
        <button type="button" className="btn btn-large" onClick={next} disabled={!connected}>
          {phase === "ended" ? t.newChat : phase === "searching" ? t.next : t.skip}
        </button>
        <button type="button" className="btn btn-ghost" onClick={stop}>
          {t.stop}
        </button>
      </div>
      <p className="note">{t.privacyReminder}</p>

        <ReportDialog t={t} open={reportOpen} onClose={() => setReportOpen(false)} onSubmit={submitReport} />
      </section>
      {screenSticker ? (
        <FullScreenStickerEffect
          key={screenSticker.key}
          id={screenSticker.id}
          onDone={() => setScreenSticker((current) => (current?.key === screenSticker.key ? null : current))}
        />
      ) : null}
      {brainEffect ? (
        <SameBrainEffect
          key={brainEffect.key}
          match={brainEffect.match}
          t={t}
          onDone={() => setBrainEffect((current) => (current?.key === brainEffect.key ? null : current))}
        />
      ) : null}
    </>
  );
}
