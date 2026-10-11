import { useReadContract, useChainId } from "wagmi";
import {
  ASSET_CHAIN_TESTNET_ID,
  ASSET_CHAIN_TESTNET_EXPLORER,
  assetOracleMarketManagerAbi,
  assetOracleMarketManagerAddress,
  erc20TestnetAbi,
  TESTNET_USDC_ADDRESS,
} from "../contracts/assetOracle";

export default function OnchainMarketStatus() {
  const chainId = useChainId();
  const configured = Boolean(assetOracleMarketManagerAddress);
  const correctNetwork = chainId === ASSET_CHAIN_TESTNET_ID;

  const marketCount = useReadContract({
    address: assetOracleMarketManagerAddress,
    abi: assetOracleMarketManagerAbi,
    functionName: "marketCount",
    query: { enabled: configured && correctNetwork, refetchInterval: 30_000 },
  });

  const stablecoin = useReadContract({
    address: assetOracleMarketManagerAddress,
    abi: assetOracleMarketManagerAbi,
    functionName: "stablecoins",
    args: [0],
    query: { enabled: configured && correctNetwork, refetchInterval: 30_000 },
  });

  const tokenDecimals = useReadContract({
    address: TESTNET_USDC_ADDRESS,
    abi: erc20TestnetAbi,
    functionName: "decimals",
    query: { enabled: correctNetwork, refetchInterval: 60_000 },
  });

  const tokenConfigured = Boolean(
    stablecoin.data &&
      stablecoin.data[2] &&
      stablecoin.data[0].toLowerCase() === TESTNET_USDC_ADDRESS.toLowerCase() &&
      Number(stablecoin.data[1]) === 6 &&
      tokenDecimals.data === 6,
  );

  return (
    <section className="resolution-preview onchain-status" aria-live="polite">
      <span className="eyebrow">ON-CHAIN CONTRACT STATUS</span>
      <h2>Asset Chain testnet</h2>
      {!configured ? (
        <p>Contract reads are not enabled yet. The market manager address will be added only after deployment and independent explorer verification.</p>
      ) : !correctNetwork ? (
        <p>Switch your wallet or app network to Asset Chain Testnet (Chain ID 42421) to read the configured contract.</p>
      ) : marketCount.isPending ? (
        <p>Checking the deployed market manager and USDC configuration…</p>
      ) : marketCount.isError || stablecoin.isError ? (
        <p role="status">The contract could not be verified through the configured RPC. No transaction actions are enabled.</p>
      ) : (
        <>
          <div className="market-detail-grid">
            <article className="detail-info-card"><span>On-chain markets</span><strong>{marketCount.data?.toString() ?? "Unavailable"}</strong></article>
            <article className="detail-info-card"><span>Testnet USDC</span><strong>{tokenConfigured ? "Address and 6 decimals verified" : "Configuration not verified"}</strong></article>
          </div>
          <p>This is the contract’s on-chain market count, not the number of proposals published by the Asset Oracle backend.</p>
          {assetOracleMarketManagerAddress && <p><a href={ASSET_CHAIN_TESTNET_EXPLORER + "/address/" + assetOracleMarketManagerAddress} target="_blank" rel="noreferrer">View market manager on testnet explorer</a></p>}
        </>
      )}
      <p className="disabled-note">Read-only testnet integration. Staking, approvals, market creation, claims, and settlement remain disabled until contract verification and transaction-flow testing are complete.</p>
    </section>
  );
}