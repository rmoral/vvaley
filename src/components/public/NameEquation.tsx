// Server Component. El bloque "ecuación" del nombre en /sobre:
//   Valira  (el río)
// + Valley  (el valle de la innovación)
// = Valira Valley
//
// Cambio respecto al actual: el símbolo de la primera fila pasa de "+" a
// nada (una suma no empieza con +), la última fila se marca con "=" en teal,
// y el resultado se compone con el logotipo tipográfico real. Es el único
// sitio del sitio donde la marca aparece a tamaño editorial.

export function NameEquation({
  rows,
  result,
}: {
  /** Dos filas: Valira y Valley, cada una con su definición. */
  rows: { word: string; def: string; accent?: boolean }[];
  /** naming_result: la frase que cierra la ecuación. */
  result: string;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-bg3 bg-white">
      {rows.map((row, i) => (
        <div
          key={row.word}
          className="grid grid-cols-[36px_1fr] items-start gap-4 border-b border-bg3 p-6"
        >
          <span aria-hidden className="text-center text-xl font-light leading-[1.6] text-bg3">
            {i === 0 ? "" : "+"}
          </span>
          <div>
            <p
              className={`font-display text-[1.15rem] font-bold ${
                row.accent ? "text-river" : "text-text"
              }`}
            >
              {row.word}
            </p>
            <p className="mt-1 text-[0.85rem] leading-[1.6] text-text-2">{row.def}</p>
          </div>
        </div>
      ))}

      <div className="grid grid-cols-[36px_1fr] items-start gap-4 bg-river/[0.04] p-6">
        <span aria-hidden className="text-center text-xl font-light leading-[1.6] text-river">
          =
        </span>
        <div>
          <p className="font-display text-[1.15rem] font-black tracking-[0.05em] text-text">
            VALIRA<em className="not-italic text-river"> · </em>VALLEY
          </p>
          <p className="mt-1 text-[0.9rem] leading-[1.65] text-text-2">{result}</p>
        </div>
      </div>
    </div>
  );
}
