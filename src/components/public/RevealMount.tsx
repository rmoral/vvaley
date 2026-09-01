"use client";
// "use client" OBLIGATORIO: monta un IntersectionObserver.
// ~0.4 kB. Cambio del rediseño: la clase pasa a .is-visible y el CSS ya no
// oculta el contenido cuando no hay JS (ver @media (scripting: enabled)).

import { useEffect } from "react";

export function RevealMount() {
  useEffect(() => {
    const els = document.querySelectorAll(".vv-reveal:not(.is-visible)");
    if (!els.length) return;

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          e.target.classList.add("is-visible");
          obs.unobserve(e.target);
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -30px 0px" },
    );

    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return null;
}
