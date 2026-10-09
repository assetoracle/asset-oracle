
export type MarketSource = {
  id: string;
  name: string;
  category: string;
  description: string;
  website: string;
  enabled: boolean;
};

export const marketSources: MarketSource[] = [
  {
    id: "coingecko",
    name: "CoinGecko",
    category: "Crypto & Digital Assets",
    description:
      "Planned source for cryptocurrency prices and market data used in predefined prediction market rules.",
    website: "https://www.coingecko.com/",
    enabled: true,
  },
];

export function getMarketSource(
  sourceId: string,
): MarketSource | undefined {
  return marketSources.find((source) => source.id === sourceId);
}
