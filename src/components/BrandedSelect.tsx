import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";

export type BrandedSelectOption = {
  value: string;
  label: string;
};

type Props = {
  value: string | number;
  options: BrandedSelectOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  id?: string;
  ariaLabel?: string;
  className?: string;
};

type MenuPosition = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
};

export default function BrandedSelect({
  value,
  options,
  onChange,
  disabled = false,
  id,
  ariaLabel,
  className = "",
}: Props) {
  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const selected = options.find((option) => option.value === String(value)) ?? options[0];

  function updateMenuPosition() {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const gap = 7;
    const viewportPadding = 8;
    const availableBelow = window.innerHeight - rect.bottom - gap - viewportPadding;
    const availableAbove = rect.top - gap - viewportPadding;
    const openAbove = availableBelow < Math.min(160, availableAbove);
    const maxHeight = Math.max(96, Math.min(300, Math.floor(openAbove ? availableAbove : availableBelow)));
    setMenuPosition({
      left: Math.max(viewportPadding, Math.min(rect.left, window.innerWidth - rect.width - viewportPadding)),
      top: openAbove ? Math.max(viewportPadding, rect.top - gap - maxHeight) : rect.bottom + gap,
      width: rect.width,
      maxHeight,
    });
  }

  function toggleMenu() {
    if (disabled) return;
    if (open) {
      setOpen(false);
      return;
    }
    updateMenuPosition();
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    const reposition = () => updateMenuPosition();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className={`branded-select-wrap ${className}`}>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        className="branded-select-trigger"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={toggleMenu}
      >
        <span>{selected?.label ?? String(value)}</span>
        <span className="branded-select-icon"><ChevronDown size={17} /></span>
      </button>
      {open && !disabled && menuPosition && createPortal(
        <>
          <button
            className="branded-select-backdrop"
            type="button"
            aria-label="Close options"
            onClick={() => setOpen(false)}
          />
          <div
            className="branded-select-options branded-select-options-portal"
            role="listbox"
            aria-label={ariaLabel}
            style={{
              position: "fixed",
              zIndex: 1201,
              pointerEvents: "auto",
              top: menuPosition.top,
              left: menuPosition.left,
              width: menuPosition.width,
              maxHeight: menuPosition.maxHeight,
            }}
          >
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={option.value === String(value)}
                className={`branded-select-option ${option.value === String(value) ? "active" : ""}`}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        </>,
        document.body,
      )}
    </div>
  );
}
