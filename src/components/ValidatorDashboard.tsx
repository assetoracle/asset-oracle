import { useMemo, useState } from "react";
import { encodeAbiParameters, keccak256, toBytes, type Address } from "viem";
import { useAccount, useChainId, useReadContract, useReadContracts, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { ArrowUpRight, RefreshCw, ShieldCheck } from "lucide-react";
import {
  ASSET_CHAIN_TESTNET_ID,
  assetOracleMarketManagerAbi,
  assetOracleMarketManagerAddress,
  MARKET_STATUS,
} from "../contracts/assetOracle";

const VALIDATOR_WALLET_ADDRESSES = (import.meta.env.VITE_VALIDATOR_WALLET_ADDRESSES ?? "")
  .split(",")
  .map((value: string) => value.trim().toLowerCase())
  .filter(Boolean);

type ChainMarket = {
  id: bigint;
  creator: Address;
  stablecoin: number;
  question: string;
  resolutionRules: string;
  evidenceSource: string;
  closeTime: bigint;
  challengePeriod: bigint;
  resolvedAt: bigint;
  totalYes: bigint;
  totalNo: bigint;
  totalStaked: bigint;
  outcome: number;
  status: number;
  evidenceHash: `0x${string}`;
};

function voteKey(outcome: number, evidenceHash: `0x${string}`) {
  return keccak256(encodeAbiParameters(
    [{ type: "uint8" }, { type: "bytes32" }],
    [outcome, evidenceHash],
  ));
}

function explorerTx(hash?: `0x${string}`) {
  return hash ? `https://scan-testnet.assetchain.org/tx/${hash}` : undefined;
}

export default function ValidatorDashboard() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const allowlisted = Boolean(address && VALIDATOR_WALLET_ADDRESSES.includes(address.toLowerCase()));
  const manager = assetOracleMarketManagerAddress;
  const isValidator = useReadContract({
    address: manager,
    abi: assetOracleMarketManagerAbi,
    functionName: "isValidator",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address && chainId === ASSET_CHAIN_TESTNET_ID), refetchInterval: 15_000 },
  });
  const marketCount = useReadContract({
    address: manager,
    abi: assetOracleMarketManagerAbi,
    functionName: "marketCount",
    query: { enabled: Boolean(allowlisted && isValidator.data === true && chainId === ASSET_CHAIN_TESTNET_ID), refetchInterval: 15_000 },
  });
  const count = Number(marketCount.data ?? 0n);
  const marketReads = useReadContracts({
    contracts: Array.from({ length: Math.min(count, 500) }, (_, index) => ({
      address: manager,
      abi: assetOracleMarketManagerAbi,
      functionName: "getMarket" as const,
      args: [BigInt(index + 1)] as const,
    })),
    query: { enabled: Boolean(allowlisted && isValidator.data === true && chainId === ASSET_CHAIN_TESTNET_ID && count > 0), refetchInterval: 15_000 },
  });
  const { writeContract, data: txHash, isPending, error, reset } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash: txHash });
  const [outcomes, setOutcomes] = useState<Record<string, 1 | 2>>({});
  const [notice, setNotice] = useState("");

  const markets = useMemo(() => (marketReads.data ?? [])
    .map((read) => read.status === "success" ? read.result as unknown as ChainMarket : null)
    .filter((market): market is ChainMarket => Boolean(market && market.id > 0n && market.status === MARKET_STATUS.CLOSED))
    .sort((a, b) => Number(a.closeTime - b.closeTime)), [marketReads.data]);

  const votedReads = useReadContracts({
    contracts: address ? markets.map((market) => ({
      address: manager,
      abi: assetOracleMarketManagerAbi,
      functionName: "hasVoted" as const,
      args: [market.id, address] as const,
    })) : [],
    query: { enabled: Boolean(address && allowlisted && isValidator.data === true && markets.length > 0), refetchInterval: 10_000 },
  });
  const voteCountReads = useReadContracts({
    contracts: markets.flatMap((market) => {
      const evidence = market.evidenceSource.trim();
      const evidenceHash = evidence ? keccak256(toBytes(evidence)) : ("0x" + "00".repeat(32)) as `0x${string}`;
      return [1, 2].map((outcome) => ({
        address: manager,
        abi: assetOracleMarketManagerAbi,
        functionName: "voteCountByKey" as const,
        args: [market.id, voteKey(outcome, evidenceHash)] as const,
      }));
    }),
    query: { enabled: Boolean(allowlisted && isValidator.data === true && markets.length > 0), refetchInterval: 10_000 },
  });

  function submitVote(market: ChainMarket) {
    if (!address || !allowlisted || isValidator.data !== true || chainId !== ASSET_CHAIN_TESTNET_ID) return;
    const evidence = market.evidenceSource.trim();
    if (!evidence) {
      setNotice(`Market #${market.id.toString()} cannot be voted on because its published evidence source is missing.`);
      return;
    }
    const outcome = outcomes[market.id.toString()] ?? 1;
    const evidenceHash = keccak256(toBytes(evidence));
    setNotice("");
    reset();
    writeContract({
      address: manager,
      abi: assetOracleMarketManagerAbi,
      functionName: "resolveMarket",
      args: [market.id, outcome, evidenceHash],
    });
  }

  if (!isConnected) return <section className="validator-dashboard page-section"><h1>Validator settlement</h1><p>Connect an authorized validator wallet to continue.</p></section>;
  if (chainId !== ASSET_CHAIN_TESTNET_ID) return <section className="validator-dashboard page-section"><h1>Validator settlement</h1><p>Switch to Asset Chain Testnet (Chain ID 42421).</p></section>;
  if (!allowlisted || isValidator.data !== true) return <section className="validator-dashboard page-section"><h1>Access restricted</h1><p>This dashboard is available only to the designated validator wallets. Connect one of the authorized validator wallets.</p></section>;

  return (
    <section className="validator-dashboard page-section">
      <header className="section-heading">
        <div>
          <span className="eyebrow"><ShieldCheck size={14} /> PRIVATE VALIDATOR WORKSPACE</span>
          <h1>Markets ready for settlement</h1>
          <p>Review each closed market, choose YES or NO, then submit your on-chain vote. Two matching votes trigger the contract's consensus rule.</p>
        </div>
        <button className="secondary-button" type="button" onClick={() => { void marketCount.refetch(); void marketReads.refetch(); }}><RefreshCw size={16} /> Refresh</button>
      </header>
      <div className="validator-access-card">
        <span>Authorized validator</span>
        <strong>{address}</strong>
        <span>2 of 3 votes required · Asset Chain Testnet</span>
      </div>
      {notice && <p role="status">{notice}</p>}
      {error && <p role="alert">Vote transaction was not submitted: wallet rejected it or the contract returned an error.</p>}
      {receipt.isSuccess && txHash && <p className="wallet-message" role="status">Vote transaction confirmed. <a href={explorerTx(txHash)} target="_blank" rel="noreferrer">View transaction <ArrowUpRight size={13} /></a></p>}
      {marketCount.isPending || marketReads.isPending ? <p>Loading on-chain markets…</p>
        : marketCount.isError || marketReads.isError ? <p role="alert">Unable to load markets from the configured manager.</p>
        : markets.length === 0 ? <div className="empty-state"><h3>No markets awaiting settlement</h3><p>Closed markets will appear here when they are ready for validator review.</p></div>
        : <div className="validator-market-list">
          {markets.map((market, index) => {
            const id = market.id.toString();
            const hasVoted = votedReads.data?.[index]?.status === "success" && votedReads.data[index].result === true;
            const selectedOutcome = outcomes[id] ?? 1;
            const voteIndex = index * 2 + (selectedOutcome === 1 ? 0 : 1);
            const matchingVotes = Number(voteCountReads.data?.[voteIndex]?.status === "success" ? voteCountReads.data[voteIndex].result ?? 0n : 0n);
            const evidence = market.evidenceSource.trim();
            return <article className="validator-market-card" key={id}>
              <div className="validator-market-card-header"><span className="eyebrow">MARKET ID</span><strong>#{id}</strong><span className="validator-status-pill">Ready for validation</span></div>
              <h2>{market.question}</h2>
              <p>{market.resolutionRules}</p>
              <div className="validator-market-meta"><span>Closed {new Date(Number(market.closeTime) * 1000).toLocaleString()}</span><span>Pool: {(Number(market.totalStaked) / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC</span></div>
              <div className="validator-evidence">
                <span>Published evidence</span>
                {evidence ? <a href={/^https?:\/\//i.test(evidence) ? evidence : undefined} target="_blank" rel="noreferrer">{evidence}</a> : <strong>Missing evidence source — voting disabled</strong>}
              </div>
              <label htmlFor={`validator-outcome-${id}`}>Your decision</label>
              <select className="brand-select" id={`validator-outcome-${id}`} value={selectedOutcome} onChange={(event) => setOutcomes((current) => ({ ...current, [id]: Number(event.target.value) as 1 | 2 }))} disabled={hasVoted || isPending || receipt.isLoading}>
                <option value={1}>YES</option><option value={2}>NO</option>
              </select>
              <p className="validator-vote-count">Matching votes: {matchingVotes}/2</p>
              {hasVoted ? <p role="status">Your vote is recorded on-chain.</p> : <button className="primary-button" type="button" disabled={!evidence || isPending || receipt.isLoading} onClick={() => submitVote(market)}>{isPending ? "Confirm vote in wallet…" : receipt.isLoading ? "Recording vote…" : `Vote ${selectedOutcome === 1 ? "YES" : "NO"}`}</button>}
            </article>;
          })}
        </div>}
    </section>
  );
}
