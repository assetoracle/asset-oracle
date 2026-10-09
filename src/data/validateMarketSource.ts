
import type { MarketSource } from "./marketSources";

export function validateMarketSource(
  source: MarketSource,
): boolean {
  return (
    typeof source.id === "string" &&
    source.id.trim().length > 0 &&
    typeof source.name === "string" &&
    source.name.trim().length > 0 &&
    typeof source.category === "string" &&
    source.category.trim().length > 0 &&
    typeof source.description === "string" &&
    source.description.trim().length > 0 &&
    typeof source.website === "string" &&
    isValidWebsite(source.website) &&
    typeof source.enabled === "boolean"
  );
}

function isValidWebsite(website: string): boolean {
  try {
    const url = new URL(website);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}
