import { useRef } from "react";
import { useMountEffect } from "../useMountEffect";
import { isEnterKey } from "../ime";

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
// change (e.g. adopting a rewrite) remounts the node with fresh text via reset-with-key,
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
      className={`border border-transparent rounded-md py-[2px] px-1.5 my-[-2px] mx-[-6px] cursor-text transition-colors outline-none hover:border-[#e3ded4] hover:bg-[#fafaf8] focus:border-[#1c1b19] focus:bg-white empty:before:content-[attr(data-ph)] empty:before:text-[#9b988f] empty:before:opacity-60 ${className ?? ""}`}
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-label={ariaLabel}
      data-ph={placeholder}
      onKeyDown={(e) => {
        if (!multiline && isEnterKey(e)) {
          e.preventDefault();
          e.currentTarget.blur();
        }
      }}
      onBlur={(e) => onCommit((e.currentTarget.textContent ?? "").replace(/\s+$/, ""))}
    />
  );
}
