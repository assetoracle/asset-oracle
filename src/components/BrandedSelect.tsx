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
  const [activeIndex, setActiveIndex] = useState(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === String(value)));
  const selected = options[selectedIndex];

  function updateMenuPosition() {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const gap = 7;
    const viewportPadding = 8;
    const availableBelow = Math.max(0, window.innerHeight - rect.bottom - gap - viewportPadding);
    const availableAbove = Math.max(0, rect.top - gap - viewportPadding);
    const openAbove = availableBelow < Math.min(160, availableAbove);
    const availableSpace = openAbove ? availableAbove : availableBelow;
    const maxHeight = Math.max(80, Math.min(300, Math.floor(availableSpace)));
    const width = Math.min(rect.width, window.innerWidth - viewportPadding * 2);
    const left = Math.max(viewportPadding, Math.min(rect.left, window.innerWidth - width - viewportPadding));
    const preferredTop = openAbove ? rect.top - gap - maxHeight : rect.bottom + gap;
    const top = Math.max(
      viewportPadding,
      Math.min(preferredTop, window.innerHeight - maxHeight - viewportPadding),
    );
    setMenuPosition({ left, top, width, maxHeight });
  }

  function openMenu(index = selectedIndex) {
    if (disabled || options.length === 0) return;
    updateMenuPosition();
    setActiveIndex(Math.max(0, Math.min(index, options.length - 1)));
    setOpen(true);
  }

  function closeMenu(returnFocus = true) {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }

  function chooseOption(index: number) {
    const option = options[index];
    if (!option) return;
    onChange(option.value);
    closeMenu();
  }

  function handleTriggerKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;
    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openMenu(selectedIndex);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      openMenu(selectedIndex);
    } else if (event.key === "Home") {
      event.preventDefault();
      openMenu(0);
    } else if (event.key === "End") {
      event.preventDefault();
      openMenu(options.length - 1);
    }
  }

  function handleListKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeMenu();
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, options.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setActiveIndex(options.length - 1);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      chooseOption(activeIndex);
    } else if (event.key.length === 1 && /[a-z0-9]/i.test(event.key)) {
      const start = (activeIndex + 1) % options.length;
      const ordered = [...options.slice(start), ...options.slice(0, start)];
      const match = ordered.find((option) => option.label.toLowerCase().startsWith(event.key.toLowerCase()));
      if (match) setActiveIndex(options.indexOf(match));
    }
  }

  useEffect(() => {
    if (!open) return;
    optionRefs.current[activeIndex]?.focus();
  }, [open, activeIndex]);

  useEffect(() => {
    if (!open) return;
    const reposition = () => updateMenuPosition();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenu();
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
        aria-controls={open ? `${id ?? "branded-select"}-listbox` : undefined}
        disabled={disabled}
        onClick={() => open ? closeMenu(false) : openMenu()}
        onKeyDown={handleTriggerKeyDown}
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
            onClick={() => closeMenu(false)}
            tabIndex={-1}
          />
          <div
            id={`${id ?? "branded-select"}-listbox`}
            className="branded-select-options branded-select-options-portal"
            role="listbox"
            aria-label={ariaLabel}
            aria-activedescendant={`${id ?? "branded-select"}-option-${activeIndex}`}
            style={{
              position: "fixed",
              zIndex: 1201,
              pointerEvents: "auto",
              top: menuPosition.top,
              left: menuPosition.left,
              width: menuPosition.width,
              maxHeight: menuPosition.maxHeight,
            }}
            onKeyDown={handleListKeyDown}
          >
            {options.map((option, index) => (
              <button
                key={option.value}
                ref={(element) => { optionRefs.current[index] = element; }}
                id={`${id ?? "branded-select"}-option-${index}`}
                type="button"
                role="option"
                tabIndex={index === activeIndex ? 0 : -1}
                aria-selected={option.value === String(value)}
                className={`branded-select-option ${option.value === String(value) ? "active" : ""}`}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => chooseOption(index)}
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
