import { useState } from "react";
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
  const selected = options.find((option) => option.value === String(value)) ?? options[0];

  return (
    <div className={`branded-select-wrap ${className}`}>
      <button
        id={id}
        type="button"
        className="branded-select-trigger"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{selected?.label ?? String(value)}</span>
        <span className="branded-select-icon"><ChevronDown size={17} /></span>
      </button>
      {open && !disabled && (
        <>
          <button className="branded-select-backdrop" type="button" aria-label="Close options" onClick={() => setOpen(false)} />
          <div className="branded-select-options" role="listbox" aria-label={ariaLabel}>
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={option.value === String(value)}
                className={`branded-select-option ${option.value === String(value) ? "active" : ""}`}
                onClick={() => { onChange(option.value); setOpen(false); }}
              >
                {option.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
