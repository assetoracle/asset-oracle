import {
  ArrowLeft,
  ShieldCheck,
  Clock3,
  Database,
  CircleAlert,
} from "lucide-react";

type MarketDetailPageProps = {
  question: string;
  category: string;
  description: string;
  endDate: string;
  onBack: () => void;
};

function MarketDetailPage({
  question,
  category,
  description,
  endDate,
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
        <span className="preview-badge">PREVIEW</span>
      </div>

      <h1>{question}</h1>
      <p className="market-detail-description">{description}</p>

      <div className="market-detail-status">
        <CircleAlert size={20} />
        <div>
          <strong>Not a live market</strong>
          <p>
            This is a preview. Predictions and transactions are not
            enabled for this market yet.
          </p>
        </div>
      </div>

      <div className="market-detail-grid">
        <article className="detail-info-card">
          <Clock3 size={22} />
          <span>Resolution date</span>
          <strong>{endDate}</strong>
        </article>

        <article className="detail-info-card">
          <Database size={22} />
          <span>Data source</span>
          <strong>To be configured</strong>
        </article>

        <article className="detail-info-card">
          <ShieldCheck size={22} />
          <span>Verification</span>
          <strong>Rules required</strong>
        </article>
      </div>

      <section className="resolution-preview">
        <span className="eyebrow">HOW THE RESULT WILL BE DECIDED</span>
        <h2>Clear rules before predictions</h2>
        <p>
          Before a market becomes active, its resolution rules must
          identify the data source, measurement, deadline, and conditions
          that determine whether the final result is YES or NO.
        </p>

        <div className="outcome-preview">
          <button type="button" disabled>
            YES
          </button>
          <button type="button" disabled>
            NO
          </button>
        </div>

        <p className="disabled-note">
          Prediction selection will be available when a verified market
          and its smart contract are ready.
        </p>
      </section>

      <section className="resolution-preview">
        <span className="eyebrow">TRANSPARENT SETTLEMENT</span>
        <h2>Evidence will be shown here</h2>
        <p>
          Once implemented, this section will display the final outcome,
          settlement status, verification sources, supporting evidence,
          timestamps, transaction records, and any applicable refund or
          payout details.
        </p>
      </section>
    </section>
  );
}

export default MarketDetailPage;