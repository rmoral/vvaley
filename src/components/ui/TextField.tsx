import type { ChangeEventHandler } from "react";

// Server Component en sí mismo: no usa hooks. Se puede renderizar desde un
// componente cliente sin marcarlo. La etiqueta va SIEMPRE visible encima.
export function TextField({
  id,
  label,
  type = "text",
  multiline = false,
  rows = 6,
  optional = false,
  optionalLabel = "opcional",
  placeholder,
  value,
  onChange,
  required,
  minLength,
  maxLength,
  autoComplete,
}: {
  id: string;
  label: string;
  type?: string;
  multiline?: boolean;
  rows?: number;
  optional?: boolean;
  optionalLabel?: string;
  placeholder?: string;
  value?: string;
  onChange?: ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement>;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  autoComplete?: string;
}) {
  const field =
    "rounded-field border border-bg3 bg-white px-3.5 py-2.5 text-[0.95rem] text-text " +
    "outline-none transition-colors duration-150 ease-out-soft " +
    "placeholder:text-text-2/60 focus:border-river";

  return (
    <label
      htmlFor={id}
      className="flex flex-col gap-1.5 text-[0.8rem] font-medium text-text-2"
    >
      <span>
        {label}
        {optional ? <span className="text-text-2/70"> ({optionalLabel})</span> : null}
      </span>
      {multiline ? (
        <textarea
          id={id}
          rows={rows}
          required={required}
          minLength={minLength}
          maxLength={maxLength}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className={`${field} resize-y`}
        />
      ) : (
        <input
          id={id}
          type={type}
          required={required}
          autoComplete={autoComplete}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className={field}
        />
      )}
    </label>
  );
}
