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
    viewBox: "0 0 100 100",
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
          <radialGradient id={gradientId} cx="29%" cy="20%" r="82%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="48%" stopColor="#F7F8F8" />
            <stop offset="82%" stopColor="#D6DCE0" />
            <stop offset="100%" stopColor="#87939B" />
          </radialGradient>
          <radialGradient id="football-gloss" cx="25%" cy="16%" r="70%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity=".78" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </radialGradient>
          <clipPath id={clipId}><circle cx="50" cy="47" r="41" /></clipPath>
          <filter id="football-shadow" x="-30%" y="-30%" width="160%" height="180%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
        </defs>
        <ellipse cx="52" cy="91" rx="29" ry="5" fill="#000" opacity=".28" filter="url(#football-shadow)" />
        <circle cx="50" cy="47" r="41" fill={`url(#${gradientId})`} stroke="#77848D" strokeWidth="1.4" />
        <g clipPath={`url(#${clipId})`} stroke="#18242D" strokeLinejoin="round" strokeLinecap="round">
          <path d="M50 30 36 40 41 56 59 56 64 40Z" fill="#151E26" strokeWidth="1.8" />
          <path d="M50 30 49 8 64 12 72 25 64 40M36 40 18 31 12 44 20 60 41 56M41 56 31 75 43 87 57 87 69 75 59 56M64 40 82 31 89 44 80 60 59 56M36 40 27 22 18 31M64 40 73 22 82 31M31 75 18 79 10 65 20 60M69 75 82 79 90 65 80 60" fill="none" strokeWidth="2.4" />
          <path d="M50 30 49 8M36 40 18 31M64 40 82 31M41 56 31 75M59 56 69 75" fill="none" stroke="#FFFFFF" strokeOpacity=".38" strokeWidth="1.1" />
        </g>
        <circle cx="50" cy="47" r="41" fill="url(#football-gloss)" />
        <path d="M20 23c7-9 18-14 28-15" fill="none" stroke="#FFF" strokeWidth="3" strokeLinecap="round" opacity=".75" />
      </svg>
    );
  }

  if (sport === "basketball") {
    return (
      <svg {...common}>
        <defs>
          <radialGradient id={gradientId} cx="28%" cy="18%" r="82%">
            <stop offset="0%" stopColor="#FFC078" />
            <stop offset="48%" stopColor="#F47724" />
            <stop offset="100%" stopColor="#A93412" />
          </radialGradient>
          <clipPath id={clipId}><circle cx="50" cy="47" r="41" /></clipPath>
        </defs>
        <ellipse cx="52" cy="91" rx="29" ry="5" fill="#000" opacity=".24" />
        <circle cx="50" cy="47" r="41" fill={`url(#${gradientId})`} stroke="#7D2C12" strokeWidth="1.4" />
        <g clipPath={`url(#${clipId})`} fill="none" stroke="#321B16" strokeWidth="2.7">
          <path d="M50 5C31 20 31 74 50 89M50 5C69 20 69 74 50 89M8 36C28 36 39 48 39 88M92 36C72 36 61 48 61 88M12 20C32 32 68 32 88 20M12 74C32 62 68 62 88 74" />
        </g>
        <ellipse cx="34" cy="21" rx="13" ry="5" fill="#FFD3A4" opacity=".42" transform="rotate(-35 34 21)" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <defs>
        <radialGradient id={gradientId} cx="28%" cy="18%" r="82%">
          <stop offset="0%" stopColor="#F3FF9B" />
          <stop offset="55%" stopColor="#D5F044" />
          <stop offset="100%" stopColor="#8AAE1D" />
        </radialGradient>
        <clipPath id={clipId}><circle cx="50" cy="47" r="41" /></clipPath>
      </defs>
      <ellipse cx="52" cy="91" rx="29" ry="5" fill="#000" opacity=".22" />
      <circle cx="50" cy="47" r="41" fill={`url(#${gradientId})`} stroke="#718D20" strokeWidth="1.4" />
      <g clipPath={`url(#${clipId})`} fill="none" strokeLinecap="round">
        <path d="M19 10C40 25 55 51 67 84M81 10C60 25 45 51 33 84" stroke="#F8FFD8" strokeWidth="7" />
        <path d="M19 10C40 25 55 51 67 84M81 10C60 25 45 51 33 84" stroke="#A4C52B" strokeWidth="1.4" />
      </g>
      <ellipse cx="34" cy="21" rx="13" ry="5" fill="#FFFFFF" opacity=".42" transform="rotate(-35 34 21)" />
    </svg>
  );
}
