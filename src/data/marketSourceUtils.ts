
import {
  marketSources,
  type MarketSource,
} from "./marketSources";

export function listMarketSources(): MarketSource[] {
  return [...marketSources];
}

export function findMarketSource(
  sourceId: string,
): MarketSource | undefined {
  return marketSources.find(
    (source) => source.id === sourceId,
  );
}

export function listMarketSourcesByCategory(
  category: string,
): MarketSource[] {
  return marketSources.filter(
    (source) =>
      source.category.toLowerCase() ===
      category.toLowerCase(),
  );
}

export function listEnabledMarketSources(): MarketSource[] {
  return marketSources.filter(
    (source) => source.enabled,
  );
}
