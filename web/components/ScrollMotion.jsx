"use client";

import { useEffect } from "react";

/** Progressive enhancement: content is always visible without JavaScript. */
export default function ScrollMotion() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
    const elements = document.querySelectorAll(".home-content > .section, .home-content > .spark-showcase, .home-content > .globe-card, .home-content .cards > li, .home-content .steps > li, .home-content .why > li, .tagline-band");
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("reveal-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.08, rootMargin: "0px 0px 70px 0px" });
    elements.forEach((el) => {
      if (el.getBoundingClientRect().top < window.innerHeight * 0.93) return;
      el.classList.add("reveal-enter");
      observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);
  return null;
}
