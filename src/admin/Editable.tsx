import { useRef } from "react";
import { useMountEffect } from "../useMountEffect";

type EditableProps = {
  value: string;
  onCommit: (value: string) => void;
  className?: string;
  placeholder?: string;
  ariaLabel?: string;
  multiline?: boolean;
};

// Inline contentEditable that commits on blur. The DOM text is set imperatively so
// React never reconciles the editable content (which would fight the caret). Initial
// text is written on mount; callers pass a `key` derived from the value so an external
// change (e.g. adopting a rewrite) remounts the node with fresh text — reset-with-key,
// not a per-render effect.
export function Editable({
  value,
  onCommit,
  className,
  placeholder,
  ariaLabel,
  multiline,
}: EditableProps) {
  const ref = useRef<HTMLSpanElement>(null);

  useMountEffect(() => {
    if (ref.current) ref.current.textContent = value;
  });

  return (
    <span
      ref={ref}
      className={`border-2 border-transparent rounded-lg py-[3px] px-[7px] my-[-3px] mx-[-7px] cursor-text transition-[border-color,background] duration-100 ease-[ease] outline-none hover:border-[#ddd4c2] hover:bg-paper focus:border-ink focus:bg-paper focus:shadow-[3px_3px_0_var(--color-ink)] empty:before:content-[attr(data-ph)] empty:before:text-ink-soft empty:before:opacity-55 ${className ?? ""}`}
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-label={ariaLabel}
      data-ph={placeholder}
      onKeyDown={(e) => {
        if (!multiline && e.key === "Enter") {
          e.preventDefault();
          e.currentTarget.blur();
        }
      }}
      onBlur={(e) => onCommit((e.currentTarget.textContent ?? "").replace(/\s+$/, ""))}
    />
  );
}
