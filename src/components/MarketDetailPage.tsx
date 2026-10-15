
import {
  ArrowLeft,
  ShieldCheck,
  Clock3,
  Database,
  CircleAlert,
  ExternalLink,
  FileCheck2,
  CircleHelp,
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
  onBack,
}: MarketDetailPageProps) {
  return (
    <section className="market-detail-page page-section">
      <button
        className="text-action"
        type="button"
        onClick={onBack}
      >
        <ArrowLeft size={17} />
        Back to markets
      </button>

      <div className="market-detail-heading">
        <span className="eyebrow">{category}</span>
        <span className="market-status">
          <CircleAlert size={13} />
          {onchainMarketId ? `Live on testnet · Market #${onchainMarketId}` : "Not yet listed on-chain"}
        </span>
      </div>

      <h1>{question}</h1>
      <p className="market-detail-description">{description}</p>

      {onchainTxHash && /^0x[0-9a-fA-F]{64}$/.test(onchainTxHash) && (
        <p className="market-network-note">
          Market creation transaction:{" "}
          <a href={`https://scan-testnet.assetchain.org/tx/${onchainTxHash}`} target="_blank" rel="noreferrer">
            {onchainTxHash.slice(0, 12)}…{onchainTxHash.slice(-8)} <ExternalLink size={13} />
          </a>
        </p>
      )}

      <OnchainMarketStatus />
      {onchainMarketId && onchainCloseTime !== undefined && (
        <OnchainMarketActions
          marketId={BigInt(onchainMarketId)}
          managerAddress={onchainManagerAddress}
          closeTime={onchainCloseTime}
        />
      )}

      {!onchainMarketId && <div className="market-detail-status">
        <LockKeyhole size={20} />
        <div>
          <strong>Market setup required</strong>
          <p>
            This market is not yet connected to a deployed market
            contract. Predictions, deposits, and settlement transactions
            are not available until the market is configured and verified.
          </p>
        </div>
      </div>}

      <div className="market-detail-grid">
        <article className="detail-info-card">
          <Clock3 size={22} />
          <span>Market closing date</span>
          <strong>{closesAt || "Not configured"}</strong>
        </article>

        <article className="detail-info-card">
          <Clock3 size={22} />
          <span>Outcome resolution date</span>
          <strong>{endDate || "Not configured"}</strong>
        </article>

        <article className="detail-info-card">
          <Database size={22} />
          <span>Resolution data source</span>
          <strong>{resolutionRule?.sourceId || "Not configured"}</strong>
        </article>

        <article className="detail-info-card">
          <ShieldCheck size={22} />
          <span>Resolution rules</span>
          <strong>{resolutionRule ? "Configured in proposal" : "Pending configuration"}</strong>
        </article>
      </div>

      <section className="resolution-preview">
        <span className="eyebrow">01 / RESOLUTION FRAMEWORK</span>
        <h2>Rules must be clear before a market opens</h2>
        <p>
          The conditions below come from the submitted market proposal.
          They describe the intended resolution criteria, but do not by
          themselves mean the market has been deployed or verified.
        </p>

        <div className="settlement-rule-list">
          <div className="settlement-rule">
            <Database size={18} />
            <div>
              <strong>Data provider</strong>
              <span>{resolutionRule?.sourceId || "Not specified in this proposal"}</span>
            </div>
            <CircleHelp size={16} />
          </div>

          <div className="settlement-rule">
            <FileCheck2 size={18} />
            <div>
              <strong>Measurement and threshold</strong>
              <span>
                {resolutionRule
                  ? `${resolutionRule.metric}: ${resolutionRule.comparison.toLowerCase()} ${resolutionRule.targetValue.toLocaleString()}${resolutionRule.currency ? ` ${resolutionRule.currency}` : ""}`
                  : "Not specified in this proposal"}
              </span>
            </div>
            <CircleHelp size={16} />
          </div>

          <div className="settlement-rule">
            <Clock3 size={18} />
            <div>
              <strong>Observation time</strong>
              <span>
                {resolutionRule?.observationTime
                  ? new Date(resolutionRule.observationTime).toLocaleString()
                  : "Not specified in this proposal"}
              </span>
            </div>
            <CircleHelp size={16} />
          </div>

          {resolutionRule?.description && (
            <div className="settlement-rule">
              <FileCheck2 size={18} />
              <div>
                <strong>Resolution instructions</strong>
                <span>{resolutionRule.description}</span>
              </div>
            </div>
          )}
        </div>

        {!onchainMarketId && <>
          <div className="outcome-preview">
            <button type="button" disabled>
              YES
            </button>
            <button type="button" disabled>
              NO
            </button>
          </div>

          <p className="disabled-note">
            Prediction selection becomes available only when a valid market
            is deployed and its trading conditions are confirmed.
          </p>
        </>}
      </section>

      <section className="resolution-preview settlement-section">
        <span className="eyebrow">02 / HUMAN VALIDATION AND SETTLEMENT</span>
        <h2>Two of three validators</h2>
        <p>
          After the market closes, any two of the three authorized human validators
          must submit matching YES or NO votes directly to the market contract.
          The contract records each vote and recognizes consensus only after two
          matching votes are confirmed on-chain.
        </p>
        <ol>
          <li>Close the expired market on-chain.</li>
          <li>Two authorized validators independently submit the same outcome.</li>
          <li>The contract records the consensus and starts its configured challenge period.</li>
          <li>After the challenge period, a finalization transaction is required before eligible users can claim payouts.</li>
        </ol>
        <p className="disabled-note">
          Important: the currently deployed contract does not automatically transfer every user's payout immediately after the second vote.
          It moves the market to a challenge state; finalization and individual claims are separate on-chain transactions.
          Automatic payout would require a contract upgrade or a new deployment and migration plan.
        </p>
        <p className="settlement-network-note">
          Network: Asset Chain Testnet ·{" "}
          <a href="https://scan-testnet.assetchain.org" target="_blank" rel="noreferrer">
            Open block explorer <ExternalLink size={13} />
          </a>
        </p>
      </section>

      <p className="market-disclaimer">
        Transparency notice: this interface does not claim that a market
        has been deployed, verified, or settled. Confirmed results and
        transaction details must come from the implemented verification
        workflow and on-chain records.
      </p>
    </section>
  );
}

export default MarketDetailPage;
