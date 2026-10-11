import { useMemo } from "react";
import { useChainId, useReadContract, useReadContracts } from "wagmi";
import {
  ASSET_CHAIN_TESTNET_EXPLORER,
  ASSET_CHAIN_TESTNET_ID,
  assetOracleMarketManagerAbi,
  assetOracleMarketManagerAddress,
} from "../contracts/assetOracle";

const MAX_MARKETS_TO_DISPLAY = 50;

const STATUS_LABELS = [
  "Open",
  "Closed",
  "Disputed",
  "Settled",
  "Refundable",
  "Cancelled",
  "Arbitration",
] as const;

const OUTCOME_LABELS = ["Unresolved", "YES", "NO", "Invalid"] as const;

export default function OnchainMarkets() {
  const chainId = useChainId();
  const enabled = Boolean(assetOracleMarketManagerAddress) && chainId === ASSET_CHAIN_TESTNET_ID;
  const count = useReadContract({
    address: assetOracleMarketManagerAddress,
    abi: assetOracleMarketManagerAbi,
    functionName: "marketCount",
    query: { enabled, refetchInterval: 30_000 },
  });

  const ids = useMemo(() => {
    const total = count.data === undefined ? 0 : Number(count.data);
    if (!Number.isSafeInteger(total) || total < 0) return [];
    const length = Math.min(total, MAX_MARKETS_TO_DISPLAY);
    return Array.from({ length }, (_, index) => BigInt(total - index));
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
    return (
      <section className="resolution-preview onchain-status">
        <span className="eyebrow">ON-CHAIN MARKETS</span>
        <h2>Enugu testnet</h2>
        <p>Switch to Asset Chain Testnet (Chain ID 42421) to load markets directly from the contract.</p>
      </section>
    );
  }
  if (count.isPending) {
    return <section className="resolution-preview onchain-status"><h2>On-chain markets</h2><p>Loading market count from Enugu testnet…</p></section>;
  }
  if (count.isError || markets.isError) {
    return <section className="resolution-preview onchain-status" role="status"><h2>On-chain markets unavailable</h2><p>Contract reads failed. Check the configured contract address and testnet RPC. Backend-published markets remain separate.</p></section>;
  }
  if (count.data === 0n) {
    return <section className="resolution-preview onchain-status"><span className="eyebrow">ON-CHAIN MARKETS</span><h2>No on-chain markets yet</h2><p>The configured market manager currently reports zero markets.</p><a href={ASSET_CHAIN_TESTNET_EXPLORER + "/address/" + assetOracleMarketManagerAddress} target="_blank" rel="noreferrer">Inspect market manager on explorer</a></section>;
  }

  const rows = (markets.data ?? []).flatMap((result) => {
    if (result.status !== "success") return [];
    const market = result.result;
    return [{
      id: market.id.toString(),
      question: market.question,
      creator: market.creator,
      closeTime: Number(market.closeTime),
      totalStaked: market.totalStaked,
      status: STATUS_LABELS[Number(market.status)] ?? "Unknown",
      outcome: OUTCOME_LABELS[Number(market.outcome)] ?? "Unknown",
      explorerUrl: ASSET_CHAIN_TESTNET_EXPLORER + "/address/" + assetOracleMarketManagerAddress,
    }];
  });

  return (
    <section className="resolution-preview onchain-status">
      <span className="eyebrow">LIVE CONTRACT DATA · ENUGU TESTNET</span>
      <h2>On-chain markets</h2>
      <p>These records are read directly from the configured market manager, separate from proposals published by the backend.</p>
      {count.data !== undefined && count.data > BigInt(MAX_MARKETS_TO_DISPLAY) && <p>Showing the latest {MAX_MARKETS_TO_DISPLAY} of {count.data.toString()} on-chain markets.</p>}
      {markets.isPending ? <p>Loading market records…</p> : rows.length === 0 ? <p>Market records could not be decoded. Verify the deployed contract ABI before relying on this display.</p> : (
        <div className="market-grid">
          {rows.map((market) => (
            <article className="market-card" key={market.id}>
              <div className="market-card-top"><span className="market-symbol">#{market.id}</span><div className="market-card-badges"><span className="market-category">{market.status}</span><span className="market-status">{market.outcome}</span></div></div>
              <h3>{market.question}</h3>
              <p className="market-description">Creator: {market.creator}</p>
              <div className="market-meta"><span>Total staked</span><span>{(Number(market.totalStaked) / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 2 })} test USDC</span></div>
              <div className="market-meta"><span>Closes</span><span>{market.closeTime ? new Date(market.closeTime * 1000).toLocaleString() : "Not set"}</span></div>
              <div className="market-card-bottom"><span className="market-status-note">Read-only testnet data</span><a className="text-action" href={market.explorerUrl} target="_blank" rel="noreferrer">View contract</a></div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
