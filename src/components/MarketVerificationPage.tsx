import { useEffect, useState } from "react";
import { ArrowLeft, ExternalLink, ShieldCheck, FileCheck2, WalletCards } from "lucide-react";
import { getValidatorSourceLinks, type ValidatorSourceLink } from "../markets/marketApi";
import { useAccount, useReadContract } from "wagmi";
import { formatUnits } from "viem";
import { assetOracleMarketManagerAbi, MARKET_OUTCOME, ASSET_CHAIN_TESTNET_EXPLORER, TESTNET_USDC_DECIMALS } from "../contracts/assetOracle";
import type { DisplayMarket } from "../pages/HomePage";

type Props = {
  market: DisplayMarket;
  outcome: number;
  resolvedAt: number;
  evidenceHash: string;
  evidenceSource: string;
  managerAddress?: string | null;
  backLabel?: string;
  onBack: () => void;
};

function normalizedHttpUrl(value: string): string | null {
  const source = value.trim();
  if (!source || /[\\s<>"']/u.test(source)) return null;
  try {
    // Validators may record a bare domain (e.g. Firescreener.com). Normalize
    // it to HTTPS so the source is still clickable on the verification page.
    const candidate = /^[a-z][a-z\\d+.-]*:\/\//i.test(source) ? source : `https://${source}`;
    const url = new URL(candidate);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (!url.hostname.includes(".") || url.hostname.startsWith(".") || url.hostname.endsWith(".")) return null;
    return url.href;
  } catch {
    return null;
  }
}

function shortHash(value: string) {
  return value && value !== "0x" + "0".repeat(64) ? `${value.slice(0, 12)}…${value.slice(-8)}` : "Not recorded";
}

export default function MarketVerificationPage({ market, outcome, resolvedAt, evidenceHash, evidenceSource, managerAddress, backLabel = "Back to markets", onBack }: Props) {
  const { address } = useAccount();
  const marketId = market.onchainMarketId ? BigInt(market.onchainMarketId) : undefined;
  const position = useReadContract({
    address: managerAddress as `0x${string}` | undefined,
    abi: assetOracleMarketManagerAbi,
    functionName: "positions",
    args: marketId !== undefined && address ? [marketId, address] : undefined,
    query: { enabled: Boolean(managerAddress && marketId !== undefined && address) },
  });
  const yesStake = position.data ? (position.data as readonly [bigint, bigint, boolean])[0] : 0n;
  const noStake = position.data ? (position.data as readonly [bigint, bigint, boolean])[1] : 0n;
  const claimed = position.data ? (position.data as readonly [bigint, bigint, boolean])[2] : false;
  const totalPosition = yesStake + noStake;
  const userPrediction = yesStake > noStake ? "YES" : noStake > yesStake ? "NO" : null;
  const userResult = !userPrediction ? "NO POSITION" : outcome === MARKET_OUTCOME.INVALID ? "REFUNDED" : (outcome === MARKET_OUTCOME.YES ? userPrediction === "YES" : userPrediction === "NO") ? "WON" : "LOST";
  const outcomeLabel = outcome === MARKET_OUTCOME.YES ? "YES" : outcome === MARKET_OUTCOME.NO ? "NO" : outcome === MARKET_OUTCOME.INVALID ? "INVALID" : "UNAVAILABLE";
  const sourceLink = normalizedHttpUrl(evidenceSource);
  const hasEvidenceHash = Boolean(evidenceHash && evidenceHash !== "0x" + "0".repeat(64));
  const [validatorLinks, setValidatorLinks] = useState<ValidatorSourceLink[]>([]);
  const [validatorLinksLoading, setValidatorLinksLoading] = useState(false);

  useEffect(() => {
    if (marketId === undefined || !managerAddress) return;
    let cancelled = false;
    setValidatorLinksLoading(true);
    void getValidatorSourceLinks(marketId.toString(), managerAddress)
      .then((result) => { if (!cancelled) setValidatorLinks(result.links); })
      .catch(() => { if (!cancelled) setValidatorLinks([]); })
      .finally(() => { if (!cancelled) setValidatorLinksLoading(false); });
    return () => { cancelled = true; };
  }, [market.onchainMarketId, managerAddress]);

  return (
    <section className="verification-details-page page-section">
      <button className="text-action" type="button" onClick={onBack}><ArrowLeft size={17} /> {backLabel}</button>
      <header className="verification-details-heading">
        <span className="eyebrow">ASSET ORACLE · MARKET RECORD</span>
        <span className="market-status market-status-settled">SETTLED</span>
        <h1>{market.question}</h1>
        <p>{market.label} · Market #{market.onchainMarketId ?? market.id}</p>
      </header>

      <section className="verification-section outcome-section">
        <div className="verification-section-title"><span className="verification-section-icon"><ShieldCheck size={19} /></span><div><span className="eyebrow">01</span><h2>Market Outcome</h2></div></div>
        <div className="verification-outcome-panel">
          <span>Final verified outcome</span>
          <strong className={outcomeLabel === "YES" ? "outcome-yes" : outcomeLabel === "NO" ? "outcome-no" : ""}>{outcomeLabel}</strong>
          <p>{resolvedAt > 0 ? `Resolved ${new Date(resolvedAt * 1000).toLocaleString()}` : "Resolution timestamp not recorded in the market record."}</p>
        </div>
      </section>

      <section className="verification-section">
        <div className="verification-section-title"><span className="verification-section-icon"><FileCheck2 size={19} /></span><div><span className="eyebrow">02</span><h2>Verification Details</h2></div></div>
        <div className="verification-detail-grid">
          <article className="verification-detail-card">
            <span className="verification-detail-label">Verified by</span>
            <strong>{evidenceSource || "Verification source not recorded"}</strong>
            {sourceLink && <a href={sourceLink} target="_blank" rel="noreferrer">Open source <ExternalLink size={14} /></a>}
            {!sourceLink && <p>Source links appear here when a direct URL is recorded on-chain.</p>}
          </article>
          <article className="verification-detail-card">
            <span className="verification-detail-label">Verification method</span>
            <strong>On-chain resolution record</strong>
            <p>The market contract records the outcome and evidence reference. This page does not infer an off-chain method that was not recorded.</p>
          </article>
          <article className="verification-detail-card verification-evidence-card">
            <span className="verification-detail-label">Evidence reference</span>
            <strong className="verification-hash">{shortHash(evidenceHash)}</strong>
            <p>{hasEvidenceHash ? "Evidence hash recorded by the market contract." : "No evidence hash is recorded for this market."}</p>
          </article>
          <article className="verification-detail-card">
            <span className="verification-detail-label">On-chain proof</span>
            <strong>Asset Chain testnet</strong>
            {managerAddress && <a href={`${ASSET_CHAIN_TESTNET_EXPLORER}/address/${managerAddress}`} target="_blank" rel="noreferrer">View market contract <ExternalLink size={14} /></a>}
            <p>Market creation transaction: {market.onchainTxHash ? <a href={`${ASSET_CHAIN_TESTNET_EXPLORER}/tx/${market.onchainTxHash}`} target="_blank" rel="noreferrer">{shortHash(market.onchainTxHash)} <ExternalLink size={13} /></a> : "Not recorded"}</p>
          </article>
        </div>
      </section>

      <section className="verification-section">
        <div className="verification-section-title"><span className="verification-section-icon"><FileCheck2 size={19} /></span><div><span className="eyebrow">03</span><h2>Validator Source Links</h2></div></div>
        <div className="verification-detail-grid">
          {validatorLinksLoading ? <article className="verification-detail-card"><p>Loading validator source links…</p></article>
            : validatorLinks.length === 0 ? <article className="verification-detail-card"><strong>No validator source links recorded</strong><p>Older votes remain valid; source links are available for votes recorded after this feature is enabled.</p></article>
            : validatorLinks.map((link) => (
              <article className="verification-detail-card" key={link.validatorAddress}>
                <span className="verification-detail-label">Validator {link.validatorAddress.slice(0, 6)}…{link.validatorAddress.slice(-4)}</span>
                <strong>{link.outcome === 1 ? "YES" : link.outcome === 2 ? "NO" : "INVALID"} vote evidence</strong>
                <a href={normalizedHttpUrl(link.sourceUrl) ?? undefined} target="_blank" rel="noreferrer">{link.sourceUrl} <ExternalLink size={14} /></a>
                <p>Vote transaction: <a href={ASSET_CHAIN_TESTNET_EXPLORER + "/tx/" + link.transactionHash} target="_blank" rel="noreferrer">{shortHash(link.transactionHash)} <ExternalLink size={13} /></a></p>
                <p>Recorded {new Date(link.recordedAt).toLocaleString()}</p>
              </article>
            ))}
        </div>
      </section>
      <section className="verification-section">
        <div className="verification-section-title"><span className="verification-section-icon"><WalletCards size={19} /></span><div><span className="eyebrow">04</span><h2>Your Position</h2></div></div>
        {!address ? <div className="verification-empty-position"><p>Connect your wallet to view your position in this market.</p></div> : position.isLoading ? <div className="verification-empty-position"><p>Loading your on-chain position…</p></div> : position.isError ? <div className="verification-empty-position"><p>Your position could not be loaded. Try again later.</p></div> : totalPosition === 0n ? <div className="verification-empty-position"><p>You did not stake in this market with the connected wallet.</p></div> : (
          <div className="verification-position-grid">
            <article className="verification-detail-card"><span className="verification-detail-label">Your prediction</span><strong>{userPrediction}</strong></article>
            <article className="verification-detail-card"><span className="verification-detail-label">Your stake</span><strong>{formatUnits(totalPosition, TESTNET_USDC_DECIMALS)} USDC</strong></article>
            <article className="verification-detail-card"><span className="verification-detail-label">Your result</span><strong className={userResult === "WON" ? "outcome-yes" : userResult === "LOST" ? "outcome-no" : ""}>{userResult}</strong></article>
            <article className="verification-detail-card"><span className="verification-detail-label">Payout status</span><strong>{claimed ? "Claimed" : userResult === "WON" || userResult === "REFUNDED" ? "Available to claim, if contract rules permit" : "No winning payout"}</strong></article>
          </div>
        )}
      </section>

      <p className="verification-disclaimer">Verification information is limited to data recorded by the connected Asset Oracle market contract. A source name or evidence hash is not represented as an independent audit. The resolution transaction is not available from the market record unless supplied by the indexer.</p>
    </section>
  );
}
