import { useState } from "react";
import { isAddress, type Address } from "viem";
import { CircleHelp, History, WalletCards, ExternalLink, RefreshCw } from "lucide-react";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import {
  ASSET_CHAIN_TESTNET_ID,
  ASSET_CHAIN_TESTNET_EXPLORER,
  assetOracleMarketManagerAbi,
  assetOracleMarketManagerAddress,
  erc20TestnetAbi,
} from "../contracts/assetOracle";
import type { WalletAccountData, WalletHistoryRecord, WalletPositionRecord } from "../markets/marketApi";
import { friendlyError } from "../utils/friendlyError";

type AccountPageProps = {
  page: "Claims" | "History";
  walletConnected: boolean;
  address?: string;
  accountData: WalletAccountData | null;
  loading: boolean;
  error: string;
  onConnect: () => void;
  onRetry: () => Promise<void>;
};

const statusLabels: Record<number, string> = {
  0: "Open",
  1: "Closed",
  2: "Disputed",
  3: "Settled",
  4: "Refundable",
  5: "Cancelled",
  6: "Arbitration",
};

const outcomeLabels: Record<number, string> = {
  0: "Pending",
  1: "YES",
  2: "NO",
  3: "Invalid / refund",
};

function shortHash(hash: string) {
  return `${hash.slice(0, 10)}…${hash.slice(-8)}`;
}

function formatTimestamp(value: string | null) {
  if (!value) return "Not settled";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : date.toLocaleString();
}

function AccountPage({
  page,
  walletConnected,
  address,
  accountData,
  loading,
  error,
  onConnect,
  onRetry,
}: AccountPageProps) {
  const { chainId } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const [busyMarketKey, setBusyMarketKey] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [activeAccountSection, setActiveAccountSection] = useState<"primary" | "secondary">("primary");

  const isClaims = page === "Claims";
  const history = accountData?.history ?? [];
  const positions = accountData?.positions ?? [];
  const claimable = accountData?.claimable ?? [];
  const completedClaims = history.filter((item) => item.type === "Claimed" || item.type === "Refunded");
  const summary = isClaims
    ? [
        ["Claimable markets", String(claimable.length)],
        ["Completed claims / refunds", String(completedClaims.length)],
        ["Zero-payout settlements to finalize", String(claimable.filter((item) => Number(item.claimableAmount) === 0).length)],
      ]
    : [
        ["Predictions", String(positions.length)],
        ["Settled positions", String(positions.filter((item) => item.status === 3).length)],
        ["Indexed transactions", accountData?.historyStatus === "VERIFIED_ONCHAIN_EVENT_INDEX" ? String(history.length) : "Indexer unavailable"],
      ];

  async function handleClaim(position: WalletPositionRecord) {
    if (!address || !publicClient) {
      setActionError("Verified market manager or wallet connection is unavailable.");
      return;
    }
    if (chainId !== ASSET_CHAIN_TESTNET_ID) {
      setActionError("Switch your wallet to Asset Chain Enugu Testnet before claiming.");
      return;
    }
    // Backward-compatible during rollout: old API responses only describe the current manager.
    const managerAddress = position.managerAddress ?? assetOracleMarketManagerAddress;
    const allowedManagers = [assetOracleMarketManagerAddress];
    if (!managerAddress || !isAddress(managerAddress) ||
        !allowedManagers.some((value) => value.toLowerCase() === managerAddress.toLowerCase())) {
      setActionError("This position belongs to a retired testnet deployment and cannot be claimed here.");
      return;
    }
    const claimManager = managerAddress as Address;
    const marketKey = `${claimManager.toLowerCase()}:${position.marketId}`;
    setBusyMarketKey(marketKey);
    setActionError("");
    setActionMessage("");
    try {
      // Re-read the original contract immediately before asking the wallet to
      // sign. Never redirect a legacy claim to the newly deployed manager.
      const managerCode = await publicClient.getBytecode({ address: claimManager });
      if (!managerCode || managerCode === "0x") {
        throw new Error("The original market manager has no verified contract code. No transaction was sent.");
      }
      const [market, onchainPosition] = await Promise.all([
        publicClient.readContract({
          address: claimManager,
          abi: assetOracleMarketManagerAbi,
          functionName: "getMarket",
          args: [BigInt(position.marketId)],
        }),
        publicClient.readContract({
          address: claimManager,
          abi: assetOracleMarketManagerAbi,
          functionName: "positions",
          args: [BigInt(position.marketId), address as Address],
        }),
      ]);
      if (Number(market.id) !== position.marketId || Number(market.status) !== position.status) {
        throw new Error("The on-chain market status changed. Refresh account data before claiming.");
      }
      if (onchainPosition[2] || (onchainPosition[0] === 0n && onchainPosition[1] === 0n)) {
        throw new Error("No unclaimed position exists at this manager for this wallet.");
      }
      const currentStatus = Number(market.status);
      const canFinalize = currentStatus === 2 &&
        BigInt(Math.floor(Date.now() / 1000)) >= market.resolvedAt + market.challengePeriod;
      if (![3, 4, 5].includes(currentStatus) && !canFinalize) {
        throw new Error(currentStatus === 2
          ? "The challenge period is still active. This market cannot be finalized yet."
          : "This position is not currently claimable or refundable.");
      }
      const coin = await publicClient.readContract({
        address: claimManager,
        abi: assetOracleMarketManagerAbi,
        functionName: "stablecoins",
        args: [market.stablecoin],
      });
      const tokenAddress = coin[0] as Address;
      const tokenDecimals = Number(coin[1]);
      // A token may be disabled for new stakes after this position was created;
      // that must not disable a user's claim from the original manager.
      if (!isAddress(tokenAddress) || /^0x0{40}$/i.test(tokenAddress) ||
          tokenDecimals !== position.tokenDecimals) {
        throw new Error("The original market's settlement token configuration could not be verified.");
      }
      const verifiedTokenCode = await publicClient.getBytecode({ address: tokenAddress });
      const verifiedDecimals = await publicClient.readContract({
        address: tokenAddress,
        abi: erc20TestnetAbi,
        functionName: "decimals",
      });
      if (!verifiedTokenCode || verifiedTokenCode === "0x" || Number(verifiedDecimals) !== tokenDecimals) {
        throw new Error("The original settlement token contract could not be verified. No transaction was sent.");
      }

      if (canFinalize) {
        setActionMessage("Challenge period ended. Confirm market finalization in your wallet…");
        const finalizeHash = await writeContractAsync({
          address: claimManager,
          abi: assetOracleMarketManagerAbi,
          functionName: "finalizeMarket",
          args: [BigInt(position.marketId)],
          chainId: ASSET_CHAIN_TESTNET_ID,
        });
        const finalizeReceipt = await publicClient.waitForTransactionReceipt({ hash: finalizeHash });
        if (finalizeReceipt.status !== "success") throw new Error("Market finalization failed on-chain.");
        setActionMessage("Market finalized. Confirm the claim transaction in your wallet…");
      } else {
        setActionMessage("Transaction submitted. Waiting for network confirmation…");
      }
      const functionName = currentStatus === 4 || currentStatus === 5 ? "refundCancelled" : "claim";
      const hash = await writeContractAsync({
        address: claimManager,
        abi: assetOracleMarketManagerAbi,
        functionName,
        args: [BigInt(position.marketId)],
        chainId: ASSET_CHAIN_TESTNET_ID,
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== "success") throw new Error("The claim transaction failed on-chain.");
      setActionMessage("Claim/refund confirmed. Updating your account records…");
      await onRetry();
    } catch (err) {
      setActionError(friendlyError(err, "Unable to submit claim."));
    } finally {
      setBusyMarketKey(null);
    }
  }

  function renderHistoryRow(item: WalletHistoryRecord) {
    const label = item.type === "Staked" ? "Prediction placed"
      : item.type === "Claimed" ? "Claim paid"
      : item.type === "Refunded" ? "Refund paid"
      : "Market settled";
    return (
      <article className="account-summary-card" key={item.transactionHash + item.type + item.marketId}>
        <span>{label} · Market #{item.marketId}</span>
        {item.managerAddress && <small>Manager: {item.managerAddress.slice(0, 8)}…{item.managerAddress.slice(-6)}</small>}
        <strong>{item.amount ? `Amount: ${item.amount}` : item.outcome !== null ? outcomeLabels[item.outcome] ?? "Outcome recorded" : "On-chain event"}</strong>
        <small>{formatTimestamp(item.timestamp)}</small>
        <a href={`${ASSET_CHAIN_TESTNET_EXPLORER}/tx/${item.transactionHash}`} target="_blank" rel="noreferrer">
          {shortHash(item.transactionHash)} <ExternalLink size={13} />
        </a>
      </article>
    );
  }

  return (
    <section className="page-section account-page">
      <div className="section-heading">
        <div>
          <span className="eyebrow">{isClaims ? "YOUR REWARDS" : "YOUR RECORDS"}</span>
          <h1>{page}</h1>
          <p>{isClaims
            ? "Review verified claimable payouts and submit claims or refunds through your wallet."
            : "Review your on-chain predictions, settlement status, claims, refunds, and indexed transactions."}</p>
        </div>
        <div className="account-page-icon">{isClaims ? <WalletCards size={25} /> : <History size={25} />}</div>
      </div>

      {!walletConnected ? (
        <div className="account-empty-state">
          <CircleHelp size={25} />
          <h2>Sign in to continue</h2>
          <p>Connect the wallet used to place predictions to load its verified account records.</p>
          <button className="primary-button" type="button" onClick={onConnect}>Connect wallet</button>
        </div>
      ) : (
        <>
          <div className="account-summary-grid">
            {summary.map(([label, value]) => (
              <article className="account-summary-card" key={label}><span>{label}</span><strong>{loading ? "Loading…" : value}</strong></article>
            ))}
          </div>

          <div className="proposal-actions">
            <button className="primary-button refresh-action-button" type="button" onClick={() => { void onRetry(); }} disabled={loading}>
              <RefreshCw size={16} className={loading ? "refresh-action-spinning" : ""} /> {loading ? "Refreshing account data…" : "Refresh account data"}
            </button>
          </div>

          {error && <div className="empty-state" role="alert"><h3>Account data unavailable</h3><p>{error}</p></div>}
          {accountData?.positionsStatus === "PARTIAL_ONCHAIN_POSITIONS" && <div className="empty-state" role="alert"><h3>Some manager data is unavailable</h3><p>At least one configured manager could not be read. Do not assume the list is complete; refresh and retry before taking action.</p></div>}
          {actionMessage && <p className="wallet-message" role="status">{actionMessage}</p>}
          {actionError && <p className="wallet-message" role="alert">{actionError}</p>}

          <nav className="page-section-tabs" aria-label={isClaims ? "Claims sections" : "History sections"}>
            <button type="button" className={activeAccountSection === "primary" ? "active" : ""} aria-pressed={activeAccountSection === "primary"} onClick={() => setActiveAccountSection("primary")}>{isClaims ? "Available claims" : "On-chain positions"}</button>
            <button type="button" className={activeAccountSection === "secondary" ? "active" : ""} aria-pressed={activeAccountSection === "secondary"} onClick={() => setActiveAccountSection("secondary")}>{isClaims ? "Completed claims" : "Transaction history"}</button>
          </nav>
          {isClaims ? (
            <section className="account-record-section">
              {activeAccountSection === "primary" && <>
              <h2>Available claims and refunds</h2>
              {claimable.length === 0 && !loading ? (
                <div className="empty-state"><h3>No claimable payouts found</h3><p>Claimable amounts appear after verified settlement or cancellation/refund status is available on-chain.</p></div>
              ) : (
                <div className="market-grid">
                  {claimable.map((item) => {
                    const itemManagerAddress = item.managerAddress ?? assetOracleMarketManagerAddress ?? "unknown";
                    const itemKey = `${itemManagerAddress.toLowerCase()}:${item.marketId}`;
                    return (
                    <article className="market-card" key={itemKey}>
                      <span className="market-category">Market #{item.marketId} · {statusLabels[item.status] ?? "Status unavailable"}</span>
                      <h3>{item.question}</h3>
                      <p className="market-description">Verified available amount: <strong>{item.claimableAmount}</strong></p>
                      <div className="market-meta"><span>YES stake</span><span>{item.yesStake}</span></div>
                      <div className="market-meta"><span>NO stake</span><span>{item.noStake}</span></div>
                      <div className="market-meta"><span>Outcome</span><span>{outcomeLabels[item.outcome] ?? "Pending"}</span></div>
                      <small>Original manager: {itemManagerAddress === "unknown" ? "Unavailable" : `${itemManagerAddress.slice(0, 8)}…${itemManagerAddress.slice(-6)}`}</small>
                      <button className="primary-button" type="button" disabled={busyMarketKey !== null} onClick={() => void handleClaim(item)}>
                        {busyMarketKey === itemKey ? "Confirming…" : item.status === 2 ? "Finalize & claim" : item.status === 3 ? (Number(item.claimableAmount) === 0 ? "Confirm zero-payout claim" : "Claim payout") : "Claim refund"}
                      </button>
                    </article>
                    );
                  })}
                </div>
              )}
              </>}
              {activeAccountSection === "secondary" && <>
              <h2>Completed claims and refunds</h2>
              {completedClaims.length === 0 ? <p>No confirmed claim or refund transactions found in the indexed history.</p> : <div className="account-summary-grid">{completedClaims.map(renderHistoryRow)}</div>}
              </>}
            </section>
          ) : (
            <section className="account-record-section">
              {activeAccountSection === "primary" && <>
              <h2>Your on-chain positions</h2>
              {positions.length === 0 && !loading ? <div className="empty-state"><h3>No predictions found</h3><p>No positions were found for this wallet on the configured market manager.</p></div> : (
                <div className="market-grid">
                  {positions.map((item) => (
                    <article className="market-card" key={(item.managerAddress ?? assetOracleMarketManagerAddress ?? "unknown").toLowerCase() + ":" + item.marketId}>
                      <span className="market-category">Market #{item.marketId} · {statusLabels[item.status] ?? "Status unavailable"}</span>
                      <small>Original manager: {(item.managerAddress ?? assetOracleMarketManagerAddress) ? `${(item.managerAddress ?? assetOracleMarketManagerAddress)!.slice(0, 8)}…${(item.managerAddress ?? assetOracleMarketManagerAddress)!.slice(-6)}` : "Unavailable"}</small>
                      <h3>{item.question}</h3>
                      <div className="market-meta"><span>YES stake</span><span>{item.yesStake}</span></div>
                      <div className="market-meta"><span>NO stake</span><span>{item.noStake}</span></div>
                      <div className="market-meta"><span>Outcome</span><span>{outcomeLabels[item.outcome] ?? "Pending"}</span></div>
                      <div className="market-meta"><span>Claim status</span><span>{item.claimed ? "Claimed" : item.claimableAmount !== "0" ? "Claim available" : "Not claimable"}</span></div>
                    </article>
                  ))}
                </div>
              )}
              </>}
              {activeAccountSection === "secondary" && <>
              <h2>Transaction history</h2>
              {accountData?.historyStatus !== "VERIFIED_ONCHAIN_EVENT_INDEX" ? (
                <div className="empty-state"><h3>Transaction index unavailable</h3><p>Your current positions are read directly from the verified chain, but a complete transaction timeline requires the backend event indexer to be enabled and caught up.</p></div>
              ) : history.length === 0 ? <p>No indexed transactions found for this wallet.</p> : <div className="account-summary-grid">{history.map(renderHistoryRow)}</div>}
              </>}
            </section>
          )}
        </>
      )}
    </section>
  );
}

export default AccountPage;
