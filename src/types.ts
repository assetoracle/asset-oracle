export type MarketCategory =
  | "Crypto"
  | "Sports"
  | "Economics"
  | "RWA"
  | "Regional";

export type MarketFilter =
  | "All Markets"
  | "Live"
  | MarketCategory
  | "Settled Markets";