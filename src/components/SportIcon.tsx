import type { CSSProperties } from "react";

export type SportKind = "football" | "basketball" | "tennis";

type SportIconProps = {
  sport: SportKind;
  size?: number;
  className?: string;
};

const iconStyle: CSSProperties = {
  display: "block",
  flexShrink: 0,
};

export default function SportIcon({
  sport,
  size = 28,
  className,
}: SportIconProps) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 48 48",
    role: "img",
    "aria-label":
      sport === "football"
        ? "Football"
        : sport === "basketball"
          ? "Basketball"
          : "Tennis",
    className,
    style: iconStyle,
  } as const;

  if (sport === "football") {
    return (
      <svg {...common}>
        <circle cx="24" cy="24" r="20" fill="#F4F8FA" stroke="#102F3A" strokeWidth="1.8" />
        <path d="M24 14 15.5 20.2 18.7 30h10.6l3.2-9.8L24 14Z" fill="#152B35" />
        <path d="m24 14 .2-8M15.5 20.2 7 17.5M18.7 30l-5.4 7M29.3 30l5.4 7M33.3 20.2 41 17.5" fill="none" stroke="#152B35" strokeWidth="2.8" strokeLinejoin="round" />
        <path d="m15.5 20.2-5.1-5.6M18.7 30l-1.2 8.2M29.3 30l1.2 8.2M33.3 20.2l5.1-5.6" fill="none" stroke="#152B35" strokeWidth="1.5" />
      </svg>
    );
  }

  if (sport === "basketball") {
    return (
      <svg {...common}>
        <circle cx="24" cy="24" r="20" fill="#F0442F" stroke="#101D25" strokeWidth="1.8" />
        <path d="M4.7 20.8c8.4 1 15.1 10.1 15.1 22M43.3 20.8c-8.4 1-15.1 10.1-15.1 22M24 4c-7 8-7 32 0 40M24 4c7 8 7 32 0 40M5.8 13.2c10.8 5.6 25.6 5.6 36.4 0M5.8 34.8c10.8-5.6 25.6-5.6 36.4 0" fill="none" stroke="#17232B" strokeWidth="2.2" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <circle cx="24" cy="24" r="20" fill="#D7F34B" stroke="#102F3A" strokeWidth="1.8" />
      <path d="M11 8.8c8.8 5.4 15.8 16.1 19.5 30.1M37 8.8C28.2 14.2 21.2 24.9 17.5 38.9" fill="none" stroke="#F8FFE0" strokeWidth="4.4" strokeLinecap="round" />
      <path d="M11 8.8c8.8 5.4 15.8 16.1 19.5 30.1M37 8.8C28.2 14.2 21.2 24.9 17.5 38.9" fill="none" stroke="#91B52B" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}
