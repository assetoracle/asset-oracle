
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
          <span>Market closes</span>
          <strong>{closesAt || "Not configured"}</strong>
        </article>
        <article className="detail-info-card">
          <Clock3 size={22} />
          <span>Resolution deadline</span>
          <strong>{endDate || "Not configured"}</strong>
        </article>
        <article className="detail-info-card">
          <ShieldCheck size={22} />
          <span>Validation method</span>
          <strong>2 of 3 human validators</strong>
        </article>
      </div>

      <section className="resolution-preview">
        <span className="eyebrow">MARKET RULES</span>
        <h2>What decides YES or NO?</h2>
        <p>{resolutionRule?.description || "Resolution criteria were not provided with this proposal. Validators must agree on a public evidence source before voting."}</p>
      </section>

      <section className="resolution-preview settlement-section">
        <span className="eyebrow">02 / HUMAN VALIDATION AND SETTLEMENT</span>
        <h2>Human validation</h2>
        <p>When the market is CLOSED, three authorized validators review the public evidence. Any two must submit the same YES or NO outcome and the same evidence reference. Votes are recorded on-chain.</p>
        <ol>
          <li>Review the market question and resolution rules.</li>
          <li>Agree on a public evidence URL or reference.</li>
          <li>Two authorized validators submit matching votes.</li>
          <li>The contract enters its challenge period. Finalization and claims follow the contract rules.</li>
        </ol>
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
