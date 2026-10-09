
import type {
  MarketRecord,
  MarketValidationResult,
} from "./marketTypes";

import { getMarketSource } from "../data/marketSourceUtils";

export function validateMarket(
  market: MarketRecord,
): MarketValidationResult {
  const errors: string[] = [];

  if (!market.id.trim()) {
    errors.push("Market ID is required.");
  }

  if (market.question.trim().length < 15) {
    errors.push("The market question must contain at least 15 characters.");
  }

  if (!market.description.trim()) {
    errors.push("A market description is required.");
  }

  if (!market.createdBy.trim()) {
    errors.push("The creator identifier is required.");
  }

  if (
    !Array.isArray(market.outcomes) ||
    market.outcomes.length !== 2 ||
    market.outcomes[0] !== "YES" ||
    market.outcomes[1] !== "NO"
  ) {
    errors.push("The market must have exactly YES and NO outcomes.");
  }

  const createdAt = Date.parse(market.createdAt);
  const closesAt = Date.parse(market.closesAt);
  const resolvesAt = Date.parse(market.resolvesAt);

  if (
    !Number.isFinite(createdAt) ||
    !Number.isFinite(closesAt) ||
    !Number.isFinite(resolvesAt)
  ) {
    errors.push("Market dates must be valid date-time values.");
  } else {
    if (closesAt <= createdAt) {
      errors.push("The closing time must be after the creation time.");
    }

    if (resolvesAt < closesAt) {
      errors.push("The resolution deadline cannot precede market closure.");
    }
  }

  const rule = market.resolutionRule;

  if (!rule.sourceId.trim()) {
    errors.push("A resolution data source is required.");
  } else if (!getMarketSource(rule.sourceId)) {
    errors.push("The selected resolution data source is not registered.");
  }

  if (!rule.metric.trim()) {
    errors.push("The metric being evaluated must be specified.");
  }

  if (!Number.isFinite(rule.targetValue)) {
    errors.push("The target value must be a finite number.");
  }

  if (
    !["ABOVE", "BELOW", "EQUALS"].includes(rule.comparison)
  ) {
    errors.push("A valid comparison rule must be selected.");
  }

  if (!Number.isFinite(Date.parse(rule.observationTime))) {
    errors.push("The observation time must be a valid date-time.");
  }

  if (!rule.description.trim()) {
    errors.push("The resolution rule must be explained.");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
