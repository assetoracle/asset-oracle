
import {
  ArrowLeft,
  ShieldCheck,
  Clock3,
  Database,
  CircleAlert,
  ExternalLink,
  FileCheck2,
  Wallet,
  History,
  CheckCircle2,
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
        <span className="eyebrow">02 / VERIFICATION EVIDENCE</span>
        <h2>Evidence and source records</h2>
        <p>
          The settlement record will identify the providers actually
          consulted, their reported values, observation timestamps, and
          the evidence used to evaluate the predefined resolution rules.
        </p>

        <div className="settlement-info-grid">
          <article className="settlement-info-item">
            <Database size={19} />
            <div>
              <span>Providers consulted</span>
              <strong>Not yet recorded</strong>
            </div>
          </article>

          <article className="settlement-info-item">
            <FileCheck2 size={19} />
            <div>
              <span>Evidence record</span>
              <strong>Not yet available</strong>
            </div>
          </article>
        </div>
      </section>

      <section className="resolution-preview settlement-section">
        <span className="eyebrow">03 / VALIDATION AND CONSENSUS</span>
        <h2>Independent verification</h2>
        <p>
          Where validator verification is required, the record will show
          validator decisions, the applicable consensus requirement, and
          the final verification status. Automatic verification will show
          the configured workflow and its result instead.
        </p>

        <div className="settlement-timeline">
          <div className="timeline-item">
            <span className="timeline-marker">
              <CheckCircle2 size={16} />
            </span>
            <div>
              <strong>Market rules configured</strong>
              <p>Awaiting market setup</p>
            </div>
            <span className="timeline-status">Pending</span>
          </div>

          <div className="timeline-item">
            <span className="timeline-marker">
              <Database size={16} />
            </span>
            <div>
              <strong>Evidence collected</strong>
              <p>Awaiting source verification</p>
            </div>
            <span className="timeline-status">Pending</span>
          </div>

          <div className="timeline-item">
            <span className="timeline-marker">
              <ShieldCheck size={16} />
            </span>
            <div>
              <strong>Result verified</strong>
              <p>Awaiting verification workflow</p>
            </div>
            <span className="timeline-status">Pending</span>
          </div>

          <div className="timeline-item">
            <span className="timeline-marker">
              <History size={16} />
            </span>
            <div>
              <strong>Settlement completed</strong>
              <p>Awaiting on-chain execution</p>
            </div>
            <span className="timeline-status">Pending</span>
          </div>
        </div>
      </section>

      <section className="resolution-preview settlement-section">
        <span className="eyebrow">04 / ON-CHAIN SETTLEMENT</span>
        <h2>Transaction proof</h2>
        <p>
          Once settlement is executed, this section will link to the
          relevant blockchain transactions and display the confirmed
          settlement status.
        </p>

        <div className="settlement-info-grid">
          <article className="settlement-info-item">
            <ShieldCheck size={19} />
            <div>
              <span>Final outcome</span>
              <strong>Not determined</strong>
            </div>
          </article>

          <article className="settlement-info-item">
            <ExternalLink size={19} />
            <div>
              <span>Transaction hash</span>
              <strong>Not available</strong>
            </div>
          </article>
        </div>

        <p className="settlement-network-note">
          Network: Asset Chain Testnet
          <span> · </span>
          <a
            href="https://scan-testnet.assetchain.org"
            target="_blank"
            rel="noreferrer"
          >
            Open block explorer
            <ExternalLink size={13} />
          </a>
        </p>
      </section>

      <section className="resolution-preview settlement-section">
        <span className="eyebrow">05 / YOUR POSITION</span>
        <h2>Positions, payouts, and refunds</h2>
        <p>
          After wallet and contract integration, your account will show
          your selected outcome, deposited amount, transaction history,
          and any payout or refund confirmed by the contract.
        </p>

        <div className="settlement-info-grid">
          <article className="settlement-info-item">
            <Wallet size={19} />
            <div>
              <span>Your position</span>
              <strong>Connect wallet to check</strong>
            </div>
          </article>

          <article className="settlement-info-item">
            <History size={19} />
            <div>
              <span>Payout or refund</span>
              <strong>No settlement recorded</strong>
            </div>
          </article>
        </div>
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
