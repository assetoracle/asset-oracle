import { useEffect, useMemo, useRef, useState } from "react";
import BrandedSelect from "./BrandedSelect";
import { encodeAbiParameters, keccak256, toBytes, type Address } from "viem";
import { useAccount, useChainId, useReadContracts, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { ArrowUpRight, RefreshCw, ShieldCheck } from "lucide-react";
import {
  ASSET_CHAIN_TESTNET_ID,
  assetOracleMarketManagerAbi,
  assetOracleMarketManagerAddress,
  LEGACY_ASSET_ORACLE_MARKET_MANAGER_ADDRESSES,
  MARKET_STATUS,
} from "../contracts/assetOracle";

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
  managerAddress: Address;
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
  const managers = useMemo(() => [...new Set([assetOracleMarketManagerAddress, ...LEGACY_ASSET_ORACLE_MARKET_MANAGER_ADDRESSES])], []);
  const validatorReads = useReadContracts({
    contracts: address ? managers.map((managerAddress) => ({ address: managerAddress, abi: assetOracleMarketManagerAbi, functionName: "isValidator" as const, args: [address] as const })) : [],
    query: { enabled: Boolean(address && chainId === ASSET_CHAIN_TESTNET_ID), refetchInterval: 15_000 },
  });
  const authorizedValidator = Boolean(address && validatorReads.data?.some((read) => read.status === "success" && read.result === true));
  const managerCountReads = useReadContracts({
    contracts: managers.map((managerAddress) => ({ address: managerAddress, abi: assetOracleMarketManagerAbi, functionName: "marketCount" as const })),
    query: { enabled: Boolean(authorizedValidator && chainId === ASSET_CHAIN_TESTNET_ID), refetchInterval: 15_000 },
  });
  const marketContracts = useMemo(() => managers.flatMap((managerAddress, managerIndex) => {
    const count = Number(managerCountReads.data?.[managerIndex]?.status === "success" ? managerCountReads.data[managerIndex].result ?? 0n : 0n);
    return Array.from({ length: Math.min(Math.max(count, 0), 500) }, (_, index) => ({ address: managerAddress, abi: assetOracleMarketManagerAbi, functionName: "getMarket" as const, args: [BigInt(index + 1)] as const }));
  }), [managers, managerCountReads.data]);
  const marketReads = useReadContracts({
    contracts: marketContracts,
    query: { enabled: Boolean(authorizedValidator && chainId === ASSET_CHAIN_TESTNET_ID && marketContracts.length > 0), refetchInterval: 15_000 },
  });
  const { writeContract, data: txHash, isPending, error, reset } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash: txHash });
  const [outcomes, setOutcomes] = useState<Record<string, 1 | 2>>({});
  const [notice, setNotice] = useState("");
  const [actionType, setActionType] = useState<"close" | "vote" | "finalize" | null>(null);
  const [pendingVote, setPendingVote] = useState<{ managerAddress: Address; marketId: bigint; outcome: 1 | 2; evidenceHash: `0x${string}` } | null>(null);
  const handledCloseHash = useRef<string | null>(null);

  const managerDiagnostics = managers.map((managerAddress, index) => {
    const read = managerCountReads.data?.[index];
    const count = read?.status === "success" ? Number(read.result ?? 0n) : null;
    const failedMarketReads = marketContracts.reduce((total, contract, readIndex) =>
      contract.address.toLowerCase() === managerAddress.toLowerCase() &&
      marketReads.data?.[readIndex]?.status === "failure" ? total + 1 : total, 0);
    return { managerAddress, count, readStatus: !read ? "pending" : read.status, failedMarketReads };
  });
  const markets = useMemo(() => (marketReads.data ?? [])
    .map((read, index) => read.status === "success"
      ? { ...(read.result as unknown as ChainMarket), managerAddress: marketContracts[index].address }
      : null)
    .filter((market): market is ChainMarket => {
      if (!market || market.id <= 0n) return false;
      const isClosed = market.status === MARKET_STATUS.CLOSED;
      const isExpiredOpen = market.status === MARKET_STATUS.OPEN &&
        market.closeTime <= BigInt(Math.floor(Date.now() / 1000));
      return isClosed || isExpiredOpen || market.status === MARKET_STATUS.DISPUTED;
    })
    .sort((a, b) => Number(a.closeTime - b.closeTime)), [marketReads.data, marketContracts]);

  const votedReads = useReadContracts({
    contracts: address ? markets.map((market) => ({
      address: market.managerAddress,
      abi: assetOracleMarketManagerAbi,
      functionName: "hasVoted" as const,
      args: [market.id, address] as const,
    })) : [],
    query: { enabled: Boolean(address && authorizedValidator && markets.length > 0), refetchInterval: 10_000 },
  });
  const voteCountReads = useReadContracts({
    contracts: markets.flatMap((market) => {
      const evidence = market.evidenceSource.trim();
      const evidenceHash = evidence ? keccak256(toBytes(evidence)) : ("0x" + "00".repeat(32)) as `0x${string}`;
      return [1, 2].map((outcome) => ({
        address: market.managerAddress,
        abi: assetOracleMarketManagerAbi,
        functionName: "voteCountByKey" as const,
        args: [market.id, voteKey(outcome, evidenceHash)] as const,
      }));
    }),
    query: { enabled: Boolean(authorizedValidator && markets.length > 0), refetchInterval: 10_000 },
  });

  useEffect(() => {
    if (!receipt.isSuccess || actionType !== "close" || !pendingVote || !txHash || handledCloseHash.current === txHash) return;
    handledCloseHash.current = txHash;
    reset();
    setActionType("vote");
    writeContract({
      address: pendingVote.managerAddress,
      abi: assetOracleMarketManagerAbi,
      functionName: "resolveMarket",
      args: [pendingVote.marketId, pendingVote.outcome, pendingVote.evidenceHash],
    });
    setPendingVote(null);
    setNotice("Market closed on-chain. Confirm the follow-up vote transaction in your wallet.");
  }, [receipt.isSuccess, actionType, pendingVote, txHash, reset, writeContract]);

  function finalizeMarket(market: ChainMarket) {
    if (!address || !authorizedValidator || chainId !== ASSET_CHAIN_TESTNET_ID) return;
    if (market.status !== MARKET_STATUS.DISPUTED) return;
    const challengeEndsAt = market.resolvedAt + market.challengePeriod;
    if (BigInt(Math.floor(Date.now() / 1000)) < challengeEndsAt) {
      setNotice(`Market #${market.id.toString()} is still in its challenge period.`);
      return;
    }
    setNotice("");
    reset();
    setPendingVote(null);
    setActionType("finalize");
    writeContract({ address: market.managerAddress, abi: assetOracleMarketManagerAbi, functionName: "finalizeMarket", args: [market.id] });
  }

  function submitVote(market: ChainMarket) {
    if (!address || !authorizedValidator || chainId !== ASSET_CHAIN_TESTNET_ID) return;
    const evidence = market.evidenceSource.trim();
    if (!evidence) {
      setNotice(`Market #${market.id.toString()} cannot be voted on because its published evidence source is missing.`);
      return;
    }
    const outcome = outcomes[`${market.managerAddress.toLowerCase()}-${market.id.toString()}`] ?? 1;
    const evidenceHash = keccak256(toBytes(evidence));
    setNotice("");
    reset();
    if (market.status === MARKET_STATUS.OPEN && market.closeTime <= BigInt(Math.floor(Date.now() / 1000))) {
      setPendingVote({ managerAddress: market.managerAddress, marketId: market.id, outcome, evidenceHash });
      setActionType("close");
      writeContract({
        address: market.managerAddress,
        abi: assetOracleMarketManagerAbi,
        functionName: "closeMarket",
        args: [market.id],
      });
      return;
    }
    if (market.status !== MARKET_STATUS.CLOSED) return;
    setPendingVote(null);
    setActionType("vote");
    writeContract({
      address: market.managerAddress,
      abi: assetOracleMarketManagerAbi,
      functionName: "resolveMarket",
      args: [market.id, outcome, evidenceHash],
    });
  }

  if (!isConnected) return <section className="validator-dashboard page-section"><h1>Validator settlement</h1><p>Connect an authorized validator wallet to continue.</p></section>;
  if (chainId !== ASSET_CHAIN_TESTNET_ID) return <section className="validator-dashboard page-section"><h1>Validator settlement</h1><p>Switch to Asset Chain Testnet (Chain ID 42421).</p></section>;
  if (!authorizedValidator) return <section className="validator-dashboard page-section"><h1>Access restricted</h1><p>This dashboard is available only to the designated validator wallets. Connect one of the authorized validator wallets.</p></section>;

  return (
    <section className="validator-dashboard page-section">
      <header className="section-heading">
        <div>
          <span className="eyebrow"><ShieldCheck size={14} /> PRIVATE VALIDATOR WORKSPACE</span>
          <h1>Validator settlement</h1>
          <p>Vote on closed markets, then finalize matching consensus after the challenge period ends. Payouts remain claim-based.</p>
        </div>
        <button className="secondary-button" type="button" onClick={() => { void validatorReads.refetch(); void managerCountReads.refetch(); void marketReads.refetch(); }}><RefreshCw size={16} /> Refresh</button>
      </header>
      <div className="validator-access-card">
        <span>Authorized validator</span>
        <strong>{address}</strong>
        <span>2 of 3 votes required · Asset Chain Testnet</span>
      </div>
      {notice && <p role="status">{notice}</p>}
      {error && <p role="alert">Transaction was not submitted: the wallet rejected it or the contract returned an error. If the closing transaction failed, refresh the market list and try again.</p>}
      {receipt.isSuccess && txHash && <p className="wallet-message" role="status">{actionType === "close" ? "Market close transaction confirmed. Refresh the list to load it for voting." : actionType === "finalize" ? "Market finalized on-chain. Participants can now claim eligible payouts." : "Vote transaction confirmed."} <a href={explorerTx(txHash)} target="_blank" rel="noreferrer">View transaction <ArrowUpRight size={13} /></a> <button type="button" className="secondary-button" onClick={() => { void validatorReads.refetch(); void managerCountReads.refetch(); void marketReads.refetch(); }}>Refresh list</button></p>}
      {managerCountReads.isPending || marketReads.isPending ? <p>Loading on-chain markets…</p>
        : managerCountReads.isError || marketReads.isError ? <p role="alert">Unable to load markets from the configured manager(s).</p>
        : markets.length === 0 ? <div className="empty-state"><h3>No markets awaiting settlement</h3><p>Closed markets will appear here when they are ready for validator review.</p><div className="validator-market-meta" style={{ display: "grid", gap: "8px", marginTop: "16px", textAlign: "left" }}><strong>Market loading diagnostics</strong>{managerDiagnostics.map((item) => <div key={item.managerAddress}><span>{item.managerAddress.toLowerCase() === assetOracleMarketManagerAddress.toLowerCase() ? "Main manager" : "Legacy manager"}: </span><span>{item.count === null ? `marketCount read ${item.readStatus}` : `${item.count} markets returned`}</span><span>{item.failedMarketReads > 0 ? ` · ${item.failedMarketReads} market reads failed` : ""}</span></div>)}</div></div>
        : <div className="validator-market-list">
          {markets.map((market, index) => {
            const id = market.id.toString();
            const hasVoted = votedReads.data?.[index]?.status === "success" && votedReads.data[index].result === true;
            const challengeEndsAt = market.resolvedAt + market.challengePeriod;
            const canFinalize = market.status === MARKET_STATUS.DISPUTED && BigInt(Math.floor(Date.now() / 1000)) >= challengeEndsAt;
            const selectedOutcome = outcomes[`${market.managerAddress.toLowerCase()}-${id}`] ?? 1;
            const voteIndex = index * 2 + (selectedOutcome === 1 ? 0 : 1);
            const matchingVotes = Number(voteCountReads.data?.[voteIndex]?.status === "success" ? voteCountReads.data[voteIndex].result ?? 0n : 0n);
            const evidence = market.evidenceSource.trim();
            return <article className="validator-market-card" key={`${market.managerAddress.toLowerCase()}-${id}`}>
              <div className="validator-market-card-header"><span className="eyebrow">MARKET ID</span><strong>#{id}</strong><span className="validator-status-pill">{market.managerAddress.toLowerCase() === assetOracleMarketManagerAddress.toLowerCase() ? "Main manager" : "Legacy manager"}</span><span className="validator-status-pill">{market.status === MARKET_STATUS.DISPUTED ? (canFinalize ? "Challenge period ended · ready to finalize" : "In challenge period") : market.status === MARKET_STATUS.CLOSED ? "Ready for validation" : "Expired · ready to vote"}</span></div>
              <h2>{market.question}</h2>
              <p>{market.resolutionRules}</p>
              <div className="validator-market-meta"><span>Closed {new Date(Number(market.closeTime) * 1000).toLocaleString()}</span><span>Pool: {(Number(market.totalStaked) / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC</span></div>
              <div className="validator-evidence">
                <span>Published evidence</span>
                {evidence ? <a href={/^https?:\/\//i.test(evidence) ? evidence : undefined} target="_blank" rel="noreferrer">{evidence}</a> : <strong>Missing evidence source — voting disabled</strong>}
              </div>
              <label htmlFor={`validator-outcome-${id}`}>Your decision</label>
              <BrandedSelect
                className="validator-outcome-select"
                id={`validator-outcome-${id}`}
                value={selectedOutcome}
                options={[{ value: "1", label: "YES" }, { value: "2", label: "NO" }]}
                onChange={(value) => setOutcomes((current) => ({ ...current, [`${market.managerAddress.toLowerCase()}-${id}`]: Number(value) as 1 | 2 }))}
                disabled={hasVoted || isPending || receipt.isLoading}
                ariaLabel="Your decision"
              />
              <p className="validator-vote-count">{market.status === MARKET_STATUS.DISPUTED ? `Challenge period ends ${new Date(Number(challengeEndsAt) * 1000).toLocaleString()}` : `Matching votes: ${matchingVotes}/2`}</p>
              {market.status === MARKET_STATUS.DISPUTED ? <button className="primary-button" type="button" disabled={!canFinalize || isPending || receipt.isLoading} onClick={() => finalizeMarket(market)}>{isPending && actionType === "finalize" ? "Confirm finalization in wallet…" : receipt.isLoading && actionType === "finalize" ? "Finalizing market…" : canFinalize ? "Finalize market" : "Challenge period active"}</button> : hasVoted ? <p role="status">Your vote is recorded on-chain.</p> : <button className="primary-button" type="button" disabled={!evidence || isPending || receipt.isLoading} onClick={() => submitVote(market)}>{isPending && actionType === "close" ? "Confirm closing in wallet…" : receipt.isLoading && actionType === "close" ? "Closing market…" : isPending && actionType === "vote" ? "Confirm vote in wallet…" : receipt.isLoading && actionType === "vote" ? "Recording vote…" : `Vote ${selectedOutcome === 1 ? "YES" : "NO"}`}</button>}
            </article>;
          })}
        </div>}
    </section>
  );
}
