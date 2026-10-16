import { useMemo } from "react";
import { useChainId, useReadContract, useReadContracts } from "wagmi";
import type { MarketCategory } from "../types";
import type { DisplayMarket } from "../pages/HomePage";
import {
  ASSET_CHAIN_TESTNET_EXPLORER,
  ASSET_CHAIN_TESTNET_ID,
  assetOracleMarketManagerAbi,
  assetOracleMarketManagerAddress,
} from "../contracts/assetOracle";

const MAX_MARKETS_TO_DISPLAY = 50;
const STATUS_LABELS = ["Open", "Closed", "Disputed", "Settled", "Refundable", "Cancelled", "Arbitration"] as const;
const OUTCOME_LABELS = ["Unresolved", "YES", "NO", "Invalid"] as const;

type Props = {
  activeCategory: MarketCategory;
  publishedMarkets: DisplayMarket[];
  onOpenMarket: (market: DisplayMarket) => void;
};

export default function OnchainMarkets({ activeCategory, publishedMarkets, onOpenMarket }: Props) {
  const chainId = useChainId();
  const enabled = Boolean(assetOracleMarketManagerAddress) && chainId === ASSET_CHAIN_TESTNET_ID;
  const count = useReadContract({
    address: assetOracleMarketManagerAddress,
    abi: assetOracleMarketManagerAbi,
    functionName: "marketCount",
    query: { enabled, refetchInterval: 30_000 },
  });

  // Display the earliest market IDs first, in ascending order.
  const ids = useMemo(() => {
    const total = count.data === undefined ? 0 : Number(count.data);
    if (!Number.isSafeInteger(total) || total < 0) return [];
    const length = Math.min(total, MAX_MARKETS_TO_DISPLAY);
    const firstId = Math.max(1, total - length + 1);
    return Array.from({ length }, (_, index) => BigInt(firstId + index));
  }, [count.data]);

  const markets = useReadContracts({
    contracts: ids.map((id) => ({
      address: assetOracleMarketManagerAddress!,
      abi: assetOracleMarketManagerAbi,
      functionName: "getMarket" as const,
      args: [id] as const,
    })),
    query: { enabled: enabled && ids.length > 0, refetchInterval: 30_000 },
  });

  if (!assetOracleMarketManagerAddress) return null;
  if (chainId !== ASSET_CHAIN_TESTNET_ID) {
    return <section className="resolution-preview onchain-status"><span className="eyebrow">ON-CHAIN MARKETS</span><h2>Enugu testnet</h2><p>Switch to Asset Chain Testnet (Chain ID 42421) to load markets directly from the contract.</p></section>;
  }
  if (count.isPending) {
    return <section className="resolution-preview onchain-status"><h2>On-chain markets</h2><p>Loading market count from Enugu testnet…</p></section>;
  }
  if (count.isError || markets.isError) {
    return <section className="resolution-preview onchain-status" role="status"><h2>On-chain markets unavailable</h2><p>Contract reads failed. Check the configured contract address and testnet RPC. Backend-published markets remain separate.</p></section>;
  }
  if (count.data === 0n) {
    return <section className="resolution-preview onchain-status"><span className="eyebrow">ON-CHAIN MARKETS</span><h2>No markets available yet</h2><p>Published markets will appear here after their publication records are verified.</p><a href={ASSET_CHAIN_TESTNET_EXPLORER + "/address/" + assetOracleMarketManagerAddress} target="_blank" rel="noreferrer">Inspect market manager on explorer</a></section>;
  }

  const rows = (markets.data ?? []).flatMap((result) => {
    if (result.status !== "success") return [];
    const market = result.result;
    const published = publishedMarkets.find((item) =>
      item.onchainMarketId === market.id.toString() &&
      item.onchainManagerAddress?.toLowerCase() === assetOracleMarketManagerAddress!.toLowerCase()
    );
    // Do not display raw on-chain markets as published until their backend
    // publication record has been verified and supplies a category.
    if (!published) return [];
    return [{
      id: market.id.toString(),
      question: market.question,
      creator: market.creator,
      closeTime: Number(market.closeTime),
      totalStaked: market.totalStaked,
      status: STATUS_LABELS[Number(market.status)] ?? "Unknown",
      outcome: OUTCOME_LABELS[Number(market.outcome)] ?? "Unknown",
      category: published.category,
      publishedMarket: published,
      explorerUrl: ASSET_CHAIN_TESTNET_EXPLORER + "/address/" + assetOracleMarketManagerAddress,
    }];
  });

  const visibleRows = rows
    .filter((market) => activeCategory === "All Markets" || market.category === activeCategory)
    .sort((a, b) => Number(a.id) - Number(b.id));

  return (
    <section className="resolution-preview onchain-status">
      <span className="eyebrow">LIVE CONTRACT DATA · ENUGU TESTNET</span>
      <h2>Published on-chain markets</h2>
      <p>Only markets with verified publication records are listed here.</p>
      {count.data !== undefined && count.data > BigInt(MAX_MARKETS_TO_DISPLAY) && <p>Showing up to {MAX_MARKETS_TO_DISPLAY} markets in ascending ID order.</p>}
      {markets.isPending ? <p>Loading market records…</p> : visibleRows.length === 0 ? <p>No markets available yet{activeCategory === "All Markets" ? "." : ` in ${activeCategory}.`}</p> : (
        <div className="market-grid">
          {visibleRows.map((market, index) => (
            <article className="market-card market-card-compact" key={market.id}>
              <div className="market-card-top">
                <span className="market-symbol">#{index + 1}</span>
                <div className="market-card-badges">
                  <span className="market-category">{market.category}</span>
                  <span className="market-status">{market.status}</span>
                </div>
              </div>
              <h3>{market.question}</h3>
              <div className="market-card-bottom">
                <span className="market-status-note">{market.outcome} · Closes {market.closeTime ? new Date(market.closeTime * 1000).toLocaleDateString() : "date unavailable"}</span>
                {market.status === "Open" && market.closeTime > Math.floor(Date.now() / 1000) ? (
                  <button className="primary-button open-market-button" type="button" onClick={() => onOpenMarket(market.publishedMarket)}>
                    Open Market <span aria-hidden="true">↗</span>
                  </button>
                ) : (
                  <span className="market-status-note" role="status">Entry closed — staking unavailable</span>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
