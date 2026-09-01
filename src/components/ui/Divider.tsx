// Server Component. El filete es la unidad de separación del sistema:
// entre secciones va este, nunca un borde de caja.
export function Divider({
  inset = true,
  rule = false,
}: {
  inset?: boolean;
  /** Filete de 2px en --color-text para abrir un bloque mayor. */
  rule?: boolean;
}) {
  return (
    <div
      aria-hidden
      className={[
        rule ? "h-0.5 bg-text" : "h-px bg-bg3",
        inset ? "mx-6 md:mx-16" : "",
      ].join(" ")}
    />
  );
}
