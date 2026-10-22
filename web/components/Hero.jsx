"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Avatar } from "./Art";
import HeroAtmosphere from "./HeroAtmosphere";

/** Animated *sample* conversation, never a real chat or live-user claim. */
function ConversationPreview({ home, chat }) {
  const [step, setStep] = useState(0);
  const [replay, setReplay] = useState(0);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setStep(4);
      return;
    }
    setStep(0);
    const timers = [
      window.setTimeout(() => setStep(1), 520),
      window.setTimeout(() => setStep(2), 1760),
      window.setTimeout(() => setStep(3), 3030),
      window.setTimeout(() => setStep(4), 4240),
      window.setTimeout(() => setReplay((n) => n + 1), 10300),
    ];
    return () => timers.forEach(window.clearTimeout);
  }, [replay]);

  return (
    <div className="studio-preview social-preview" aria-label={home.ui.demoLabel}>
      <div className="studio-preview-header social-preview-top">
        <div className="social-preview-top-left"><span className="social-back" aria-hidden="true">‹</span><span className="social-preview-header-icon" aria-hidden="true">✳</span><div><strong>{home.ui.previewTitle}</strong><small>{home.ui.previewCaption}</small></div></div>
        <span className="social-top-actions" aria-hidden="true"><span>⌕</span><span>···</span></span>
      </div>
      <div className="social-preview-inner">
        <div className="social-preview-timestamp">{home.ui.sampleConversation} <span>·</span> {home.ui.previewCaption.split("·").at(-1).trim()}</div>
        <div className="social-person-card"><span className="social-person-avatar"><Avatar n={4} size={54} priority /><i /></span><div><strong>{home.ui.newConnection}</strong><small>{home.ui.previewCaption}</small></div><span className="social-person-badge">✳</span></div>
        <div className="studio-preview-messages social-messages" aria-hidden="true">
          <div className={`studio-preview-bubble incoming social-msg social-msg-1 ${step >= 1 ? "is-visible" : ""}`}><Avatar n={4} size={33} priority /><span>{home.demo[0].text}</span></div>
          <div className={`studio-preview-bubble outgoing social-msg social-msg-2 ${step >= 2 ? "is-visible" : ""}`}><span>{home.demo[1].text}</span></div>
          <div className={`social-demo-seen ${step >= 2 ? "is-visible" : ""}`}>✓✓</div>
          <div className={`studio-preview-bubble incoming social-typing ${step === 3 ? "is-visible" : ""}`}><Avatar n={4} size={33} priority /><span><i /><i /><i /></span></div>
          <div className={`studio-preview-bubble incoming social-msg social-msg-3 ${step >= 4 ? "is-visible" : ""}`}><Avatar n={4} size={33} priority /><span>{home.demo[2].text}</span></div>
        </div>
      </div>
      <div className="social-compose-row"><span className="social-compose-add" aria-hidden="true">+</span><div className="studio-preview-compose"><span>{chat.placeholder}</span><span aria-hidden="true">☺</span></div><span className="social-compose-send" aria-hidden="true">➤</span></div>
      <div className="social-preview-footer"><span><span className="social-demo-dot" /> {home.ui.demoLabel}</span><button type="button" onClick={() => setReplay((n) => n + 1)} aria-label={home.ui.replayPreview}>↻ <span>{home.ui.replayPreview}</span></button></div>
    </div>
  );
}

export default function Hero({ locale, dict }) {
  const { home, chat } = dict;
  return (
    <section className="studio-hero" aria-labelledby="hero-h">
      <div className="studio-hero-noise" aria-hidden="true" />
      <HeroAtmosphere />
      <span className="social-ambient ambient-one" aria-hidden="true" /><span className="social-ambient ambient-two" aria-hidden="true" />
      <div className="studio-hero-inner">
        <div className="studio-hero-copy">
          <span className="studio-eyebrow"><span className="studio-eyebrow-sun" aria-hidden="true">✳</span>{home.ui.eyebrow}</span>
          <h1 id="hero-h"><span>{home.tagline[0]}</span><em>{home.tagline[1]}</em></h1>
          <p className="studio-hero-description">{home.sub}</p>
          <div className="studio-hero-actions">
            <Link href={`/${locale}/start`} className="studio-btn studio-btn-lime">{home.cta}<span className="social-cta-arrow" aria-hidden="true">↗</span></Link>
            <a href="#topics" className="studio-btn studio-btn-outline">{home.ui.explore}<span aria-hidden="true">↘</span></a>
          </div>
          <div className="studio-social-proof"><div className="studio-avatar-stack" aria-hidden="true">{[1,4,3,6].map((n) => <Avatar key={n} n={n} size={48} priority />)}</div><div><strong>{home.heroPeople}</strong><span>{home.ctaNote}</span></div></div>
          <div className="social-trust"><span>✧ {home.why[0].t}</span><span>◈ {home.why[1].t}</span><span>↗ {home.why[2].t}</span></div>
        </div>
        <div className="studio-hero-stage">
          <div className="social-halo-ring ring-a" aria-hidden="true"/><div className="social-halo-ring ring-b" aria-hidden="true"/>
          <div className="social-float social-story-badge" aria-hidden="true"><div className="social-story-avatars"><span><Avatar n={1} size={35} priority /></span><span><Avatar n={3} size={35} priority /></span><span><Avatar n={6} size={35} priority /></span></div><strong>{home.ui.connections}</strong><small>{home.ui.sayHello} ✨</small></div>
          <div className="social-float social-heart" aria-hidden="true"><span>💜</span><strong>{home.ui.goodVibes}</strong></div>
          <div className="social-float social-float-topic" aria-hidden="true"><span>♫</span><strong>{dict.cats.music.name}</strong><span>↗</span></div>
          <ConversationPreview home={home} chat={chat} />
        </div>
      </div>
      <div className="studio-hero-ribbon" aria-hidden="true"><div className="studio-ribbon-track">{Array.from({ length: 2 }, (_, i) => <span key={i}>{home.ui.ribbon.map((txt, index) => <span key={`${i}-${index}`}><b>✦</b>{txt}</span>)}</span>)}</div></div>
    </section>
  );
}
