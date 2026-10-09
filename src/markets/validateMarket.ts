import { findMarketSource } from "../data/marketSourceUtils";
import type { MarketRecord } from "./marketTypes";

export type MarketValidationResult = {
  valid: boolean;
  errors: string[];
};

export function validateMarket(
  market: MarketRecord,
): MarketValidationResult {
  const errors: string[] = [];

  if (!market.question?.trim()) {
    errors.push("A market question is required.");
  }

  if (!market.description?.trim()) {
    errors.push("A market description is required.");
  }

  if (!market.creator?.trim()) {
    errors.push("A market creator is required.");
  }

  if (!market.endTime || !Number.isFinite(Date.parse(market.endTime))) {
    errors.push("A valid market end time is required.");
  } else if (Date.parse(market.endTime) <= Date.now()) {
    errors.push("The market end time must be in the future.");
  }

  if (
    !Array.isArray(market.outcomes) ||
    !market.outcomes.includes("YES") ||
    !market.outcomes.includes("NO")
  ) {
    errors.push("The market must include YES and NO outcomes.");
  }

  const source = findMarketSource(
    market.resolutionRule?.sourceId ?? "",
  );

  if (!source) {
    errors.push("The selected resolution data source is not registered.");
  } else if (!source.enabled) {
    errors.push("The selected resolution data source is disabled.");
  }

  if (!market.resolutionRule?.metric?.trim()) {
    errors.push("A resolution metric is required.");
  }

  if (
    market.resolutionRule?.target === undefined ||
    market.resolutionRule?.target === null ||
    !Number.isFinite(Number(market.resolutionRule.target))
  ) {
    errors.push("A valid resolution target is required.");
  }

  if (
    !["gt", "gte", "lt", "lte", "eq"].includes(
      market.resolutionRule?.comparison ?? "",
    )
  ) {
    errors.push("A valid resolution comparison is required.");
  }

  if (!market.resolutionRule?.observationTime?.trim()) {
    errors.push("A resolution observation time is required.");
  }

  if (!market.resolutionRule?.description?.trim()) {
    errors.push("A resolution rule description is required.");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}