
import {
  marketSources,
  type MarketSource,
} from "./marketSources";

export type MarketSourceStatus = {
  id: string;
  name: string;
  enabled: boolean;
  configured: boolean;
  status: "available" | "disabled";
};

export function getMarketSourceStatuses(): MarketSourceStatus[] {
  return marketSources.map((source: MarketSource) => ({
    id: source.id,
    name: source.name,
    enabled: source.enabled,
    configured: source.website.trim().length > 0,
    status: source.enabled ? "available" : "disabled",
  }));
}

export function getMarketSourceStatus(
  sourceId: string,
): MarketSourceStatus | undefined {
  return getMarketSourceStatuses().find(
    (source) => source.id === sourceId,
  );
}
