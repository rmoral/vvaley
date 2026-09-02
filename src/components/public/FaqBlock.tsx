// Server Component. Bloque de preguntas frecuentes al pie de artículos y
// noticias. Cero JavaScript: <details>/<summary> nativos, que se abren con
// teclado, funcionan sin JS y los indexa Google igual.
//
// El mismo contenido se emite además como JSON-LD de tipo FAQPage (lo hace la
// página, no este componente), que es lo que puede dar resultado enriquecido.

import type { FaqEntry } from "@/lib/faq";

export function FaqBlock({ title, items }: { title: string; items: FaqEntry[] }) {
  return (
    <section aria-labelledby="faq-title">
      <h2
        id="faq-title"
        className="mb-6 font-display text-sub font-bold text-text text-pretty"
      >
        {title}
      </h2>

      <div className="divide-y divide-bg3 border-y border-bg3">
        {items.map((item) => (
          <details key={item.pregunta} className="group py-4">
            <summary className="flex cursor-pointer list-none items-start justify-between gap-4 font-semibold text-text transition-colors duration-150 hover:text-river [&::-webkit-details-marker]:hidden">
              {item.pregunta}
              <span
                aria-hidden
                className="mt-0.5 shrink-0 text-river transition-transform duration-250 ease-out-soft group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <p className="mt-3 pr-8 text-[0.95rem] leading-[1.7] text-text-2">
              {item.respuesta}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}
