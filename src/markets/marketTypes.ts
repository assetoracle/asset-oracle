import { findMarketSource } from "../data/marketSourceUtils";
import type {
  MarketRecord,
  MarketValidationResult,
} from "./marketTypes";

export function validateMarket(
  market: MarketRecord,
): MarketValidationResult {
  const errors: string[] = [];

  if (!market.id?.trim()) {
    errors.push("A market ID is required.");
  }

  if (!market.question?.trim()) {
    errors.push("A market question is required.");
  }

  if (!market.description?.trim()) {
    errors.push("A market description is required.");
  }

  if (!market.createdBy?.trim()) {
    errors.push("A market creator is required.");
  }

  const closesAt = Date.parse(market.closesAt);
  const resolvesAt = Date.parse(market.resolvesAt);

  if (!Number.isFinite(closesAt)) {
    errors.push("A valid market closing time is required.");
  } else if (closesAt <= Date.now()) {
    errors.push("The market closing time must be in the future.");
  }

  if (!Number.isFinite(resolvesAt)) {
    errors.push("A valid market resolution time is required.");
  } else if (
    Number.isFinite(closesAt) &&
    resolvesAt < closesAt
  ) {
    errors.push(
      "The resolution time cannot be before the closing time.",
    );
  }

  if (
    !Array.isArray(market.outcomes) ||
    !market.outcomes.includes("YES") ||
    !market.outcomes.includes("NO") ||
    market.outcomes.length !== 2
  ) {
    errors.push("A market must have exactly YES and NO outcomes.");
  }

  const rule = market.resolutionRule;
  const source = findMarketSource(rule?.sourceId ?? "");

  if (!source) {
    errors.push("The selected resolution data source is not registered.");
  } else if (!source.enabled) {
    errors.push("The selected resolution data source is disabled.");
  }

  if (!rule?.metric?.trim()) {
    errors.push("A resolution metric is required.");
  }

  if (
    rule?.targetValue === undefined ||
    !Number.isFinite(rule.targetValue)
  ) {
    errors.push("A valid numeric resolution target is required.");
  }

  if (
    !["ABOVE", "BELOW", "EQUALS"].includes(
      rule?.comparison ?? "",
    )
  ) {
    errors.push("A valid resolution comparison is required.");
  }

  if (!rule?.observationTime?.trim()) {
    errors.push("A resolution observation time is required.");
  }

  if (!rule?.description?.trim()) {
    errors.push("A resolution rule description is required.");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}