
export type MarketOutcome = "YES" | "NO";

export type MarketStatus =
  | "DRAFT"
  | "OPEN"
  | "CLOSED"
  | "RESOLVED"
  | "CANCELLED";

export type MarketCategory =
  | "Crypto"
  | "Sports"
  | "Economics"
  | "RWA"
  | "Regional";

export type MarketResolutionRule = {
  sourceId: string;
  metric: string;
  comparison: "ABOVE" | "BELOW" | "EQUALS";
  targetValue: number;
  currency?: string;
  observationTime: string;
  description: string;
};

export type MarketRecord = {
  id: string;
  question: string;
  description: string;
  category: MarketCategory;
  outcomes: readonly ["YES", "NO"];
  status: MarketStatus;
  createdAt: string;
  closesAt: string;
  resolvesAt: string;
  resolutionRule: MarketResolutionRule;
  createdBy: string;
};

export type MarketValidationResult = {
  valid: boolean;
  errors: string[];
};
