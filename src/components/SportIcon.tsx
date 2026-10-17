import type { CSSProperties } from "react";

export type SportKind = "football" | "basketball" | "tennis";

type SportIconProps = {
  sport: SportKind;
  size?: number;
  className?: string;
};

const iconStyle: CSSProperties = { display: "block", flexShrink: 0 };

export default function SportIcon({ sport, size = 28, className }: SportIconProps) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 64 64",
    role: "img",
    "aria-label": sport === "football" ? "Soccer ball" : sport === "basketball" ? "Basketball" : "Tennis ball",
    className,
    style: iconStyle,
  } as const;
  const gradientId = `ball-shade-${sport}`;
  const clipId = `ball-clip-${sport}`;

  if (sport === "football") {
    return (
      <svg {...common}>
        <defs>
          <radialGradient id={gradientId} cx="30%" cy="22%" r="78%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="62%" stopColor="#F2F5F6" />
            <stop offset="100%" stopColor="#AAB7BE" />
          </radialGradient>
          <clipPath id={clipId}><circle cx="32" cy="32" r="27" /></clipPath>
        </defs>
        <ellipse cx="33" cy="58" rx="19" ry="3.5" fill="#000000" opacity=".22" />
        <circle cx="32" cy="31" r="27" fill={`url(#${gradientId})`} stroke="#87959D" strokeWidth="1.2" />
        <g clipPath={`url(#${clipId})`} stroke="#172A35" strokeLinejoin="round" strokeWidth="1.7">
          <path d="M32 19 21 27l4 13h14l4-13-11-8Z" fill="#172A35" />
          <path d="m32 19 1-14M21 27 7 23M25 40l-7 12M39 40l7 12M43 27l14-4" fill="none" />
          <path d="m21 27-8-9M25 40l-2 14M39 40l2 14M43 27l8-9" fill="none" />
        </g>
        <ellipse cx="22" cy="14" rx="9" ry="4" fill="#FFFFFF" opacity=".48" transform="rotate(-35 22 14)" />
      </svg>
    );
  }

  if (sport === "basketball") {
    return (
      <svg {...common}>
        <defs>
          <radialGradient id={gradientId} cx="28%" cy="20%" r="82%">
            <stop offset="0%" stopColor="#FFB05C" />
            <stop offset="45%" stopColor="#F47724" />
            <stop offset="100%" stopColor="#A93412" />
          </radialGradient>
          <clipPath id={clipId}><circle cx="32" cy="31" r="27" /></clipPath>
        </defs>
        <ellipse cx="33" cy="58" rx="19" ry="3.5" fill="#000000" opacity=".22" />
        <circle cx="32" cy="31" r="27" fill={`url(#${gradientId})`} stroke="#7D2C12" strokeWidth="1.2" />
        <g clipPath={`url(#${clipId})`} fill="none" stroke="#321B16" strokeWidth="2.2">
          <path d="M32 3c-11 11-11 45 0 56M32 3c11 11 11 45 0 56M4 24c11 0 19 8 19 32M60 24C49 24 41 32 41 56M6 15c14 8 38 8 52 0M6 47c14-8 38-8 52 0" />
        </g>
        <ellipse cx="22" cy="13" rx="10" ry="4" fill="#FFD3A4" opacity=".45" transform="rotate(-35 22 13)" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <defs>
        <radialGradient id={gradientId} cx="28%" cy="20%" r="82%">
          <stop offset="0%" stopColor="#F3FF9B" />
          <stop offset="55%" stopColor="#D5F044" />
          <stop offset="100%" stopColor="#8AAE1D" />
        </radialGradient>
        <clipPath id={clipId}><circle cx="32" cy="31" r="27" /></clipPath>
      </defs>
      <ellipse cx="33" cy="58" rx="19" ry="3.5" fill="#000000" opacity=".22" />
      <circle cx="32" cy="31" r="27" fill={`url(#${gradientId})`} stroke="#718D20" strokeWidth="1.2" />
      <g clipPath={`url(#${clipId})`} fill="none" strokeLinecap="round">
        <path d="M12 7c13 8 23 24 29 48" stroke="#F8FFD8" strokeWidth="5.2" />
        <path d="M52 7C39 15 29 31 23 55" stroke="#F8FFD8" strokeWidth="5.2" />
        <path d="M12 7c13 8 23 24 29 48M52 7C39 15 29 31 23 55" stroke="#A4C52B" strokeWidth="1.1" />
      </g>
      <ellipse cx="22" cy="13" rx="10" ry="4" fill="#FFFFFF" opacity=".42" transform="rotate(-35 22 13)" />
    </svg>
  );
}
