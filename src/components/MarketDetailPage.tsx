import { useState } from "react";
import {
  ArrowLeft,
  ShieldCheck,
  Clock3,
  CircleAlert,
  ExternalLink,
  LockKeyhole,
} from "lucide-react";

import OnchainMarketStatus from "./OnchainMarketStatus";
import OnchainMarketActions from "./OnchainMarketActions";

type ResolutionRule = {
  sourceId: string;
  metric: string;
  comparison: "ABOVE" | "AT_LEAST" | "BELOW" | "EQUALS";
  targetValue: number;
  currency?: string;
  observationTime: string;
  description: string;
};

type MarketDetailPageProps = {
  question: string;
  category: string;
  description: string;
  closesAt: string;
  endDate: string;
  resolutionRule?: ResolutionRule;
  onchainMarketId?: string | null;
  onchainManagerAddress?: string | null;
  onchainCloseTime?: number;
  onchainTxHash?: string | null;
  marketClosed?: boolean;
  backLabel?: string;
  onBack: () => void;
};

function MarketDetailPage({
  question,
  category,
  description,
  closesAt,
  endDate,
  resolutionRule,
  onchainMarketId,
  onchainManagerAddress,
  onchainCloseTime,
  onchainTxHash,
  marketClosed = false,
  backLabel = "Back to markets",
  onBack,
}: MarketDetailPageProps) {
  // Reject malformed API identifiers before converting them to BigInt.
  const validOnchainMarketId = typeof onchainMarketId === "string" && /^\d+$/.test(onchainMarketId)
    ? onchainMarketId
    : null;
  const validCloseTime = typeof onchainCloseTime === "number" && Number.isSafeInteger(onchainCloseTime) && onchainCloseTime >= 0
    ? onchainCloseTime
    : undefined;
  const [activeMarketDetailSection, setActiveMarketDetailSection] = useState<"status" | "timeline" | "rules">("status");

  return (
    <section className="market-detail-page page-section">
      <button className="text-action market-detail-back" type="button" onClick={onBack}>
        <ArrowLeft size={17} />
        {backLabel}
      </button>

      {marketClosed && (
        <div className="market-detail-status market-detail-status-closed" role="status">
          <CircleAlert size={21} aria-hidden="true" />
          <div>
            <strong>Market Closed</strong>
            <p>This market is no longer open for participation. You can still review its question, schedule, and resolution rules. Staking is unavailable.</p>
          </div>
        </div>
      )}

      <header className="market-detail-hero">
        <div className="market-detail-heading">
          <span className="eyebrow">{category}</span>
          <span className={`market-detail-chain-badge${validOnchainMarketId ? " is-listed" : ""}`}>
            <span className="market-detail-chain-dot" aria-hidden="true" />
            {validOnchainMarketId ? `On-chain · Testnet · #${validOnchainMarketId}` : "Not listed on-chain"}
          </span>
        </div>

        <h1>{question}</h1>
        <p className="market-detail-description">{description}</p>

        {validOnchainMarketId && (
          <div className="market-id-panel" aria-label={`Market ID ${validOnchainMarketId}`}>
            <span>Market ID</span>
            <strong>{validOnchainMarketId}</strong>
            <p>Use this exact ID when checking the market on the blockchain.</p>
          </div>
        )}

        {onchainTxHash && /^0x[0-9a-fA-F]{64}$/.test(onchainTxHash) && (
          <p className="market-network-note">
            <span>Market creation transaction</span>
            <a href={`https://scan-testnet.assetchain.org/tx/${onchainTxHash}`} target="_blank" rel="noreferrer">
              {onchainTxHash.slice(0, 12)}…{onchainTxHash.slice(-8)}
              <ExternalLink size={13} aria-hidden="true" />
            </a>
          </p>
        )}
      </header>

      <nav className="page-section-tabs" aria-label="Market detail sections">
        <button type="button" className={activeMarketDetailSection === "status" ? "active" : ""} aria-pressed={activeMarketDetailSection === "status"} onClick={() => setActiveMarketDetailSection("status")}>Market status</button>
        <button type="button" className={activeMarketDetailSection === "timeline" ? "active" : ""} aria-pressed={activeMarketDetailSection === "timeline"} onClick={() => setActiveMarketDetailSection("timeline")}>Timeline</button>
        <button type="button" className={activeMarketDetailSection === "rules" ? "active" : ""} aria-pressed={activeMarketDetailSection === "rules"} onClick={() => setActiveMarketDetailSection("rules")}>Resolution rules</button>
      </nav>
      {activeMarketDetailSection === "status" && <>
      <div className="market-detail-onchain">
        <OnchainMarketStatus />
        {validOnchainMarketId && validCloseTime !== undefined && (
          <OnchainMarketActions
            marketId={BigInt(validOnchainMarketId)}
            managerAddress={onchainManagerAddress}
            closeTime={validCloseTime}
          />
        )}
      </div>

      {!validOnchainMarketId && (
        <div className="market-detail-status market-detail-status-setup">
          <LockKeyhole size={21} aria-hidden="true" />
          <div>
            <strong>Market setup required</strong>
            <p>This market is not yet connected to a deployed market contract. Predictions, deposits, and settlement transactions are unavailable until the market is configured and verified.</p>
          </div>
        </div>
      )}

      </>}
      {activeMarketDetailSection === "timeline" && <section className="market-detail-schedule" aria-label="Market schedule and record">
        <div className="market-detail-section-heading">
          <span className="eyebrow">AT A GLANCE</span>
          <h2>Market timeline</h2>
        </div>
        <div className="market-detail-grid">
          <article className="detail-info-card">
            <span className="detail-info-icon"><Clock3 size={19} aria-hidden="true" /></span>
            <span className="detail-info-label">Market closes</span>
            <strong>{closesAt || "Not configured"}</strong>
          </article>
          <article className="detail-info-card">
            <span className="detail-info-icon"><ShieldCheck size={19} aria-hidden="true" /></span>
            <span className="detail-info-label">Resolution deadline</span>
            <strong>{endDate || "Not configured"}</strong>
          </article>
          <article className="detail-info-card">
            <span className="detail-info-icon"><LockKeyhole size={19} aria-hidden="true" /></span>
            <span className="detail-info-label">Market record</span>
            <strong>{validOnchainMarketId ? `ID #${validOnchainMarketId}` : "Not linked"}</strong>
          </article>
        </div>
      </section>}
      {activeMarketDetailSection === "rules" && <section className="resolution-preview">
        <div className="market-detail-section-heading">
          <span className="eyebrow">RESOLUTION CRITERIA</span>
          <h2>What decides YES or NO?</h2>
        </div>
        <p>{resolutionRule?.description || "Resolution criteria were not provided with this market."}</p>
        {resolutionRule && (
          <dl className="resolution-rule-facts">
            <div>
              <dt>Metric</dt>
              <dd>{resolutionRule.metric}</dd>
            </div>
            <div>
              <dt>Condition</dt>
              <dd>{resolutionRule.comparison.replaceAll("_", " ")}</dd>
            </div>
            <div>
              <dt>Target value</dt>
              <dd>{resolutionRule.targetValue}{resolutionRule.currency ? ` ${resolutionRule.currency}` : ""}</dd>
            </div>
            <div>
              <dt>Observation time</dt>
              <dd>{resolutionRule.observationTime}</dd>
            </div>
          </dl>
        )}
      </section>}
      <p className="market-disclaimer">
        Transparency notice: this interface does not claim that a market has been deployed, verified, or settled. Confirmed results and transaction details must come from the implemented verification workflow and on-chain records.
      </p>
    </section>
  );
}

export default MarketDetailPage;
