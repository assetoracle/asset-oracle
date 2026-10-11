import type { StoredMarketProposal } from "../markets/marketApi";
import { categoryLabel } from "../utils/format";

type MyProposalsPageProps = {
  walletConnected: boolean;
  proposals: StoredMarketProposal[];
  loading: boolean;
  loaded: boolean;
  error: string;
  onConnect: () => void;
  onLoad: () => void;
};

export default function MyProposalsPage({
  walletConnected,
  proposals,
  loading,
  loaded,
  error,
  onConnect,
  onLoad,
}: MyProposalsPageProps) {
  return (
    <section className="page-section account-page">
      <div className="section-heading">
        <div>
          <span className="eyebrow">YOUR SUBMISSIONS</span>
          <h1>My Proposals</h1>
          <p>Track the review status of your market proposals.</p>
        </div>
      </div>

      {!walletConnected ? (
        <div className="empty-state">
          <h3>Connect your wallet</h3>
          <p>
            Connect the wallet you used to submit your proposals.
          </p>
          <button
            className="primary-button"
            type="button"
            onClick={onConnect}
          >
            Connect wallet
          </button>
        </div>
      ) : (
        <>
          <button
            className="primary-button"
            type="button"
            onClick={onLoad}
            disabled={loading}
          >
            {loading ? "Verifying wallet..." : "Load my proposals"}
          </button>

          {error && (
            <div className="empty-state" role="alert">
              <h3>Unable to load proposals</h3>
              <p>{error}</p>
            </div>
          )}

          {loaded && proposals.length === 0 && !error && (
            <div className="empty-state">
              <h3>No proposals found</h3>
              <p>No submissions were found for this wallet.</p>
            </div>
          )}

          <div className="market-grid">
            {proposals.map((proposal) => (
              <article className="market-card" key={proposal.id}>
                <div className="market-card-top">
                  <span className="market-category">
                    {categoryLabel(proposal.category)}
                  </span>
                  <span className="market-status">
                    {proposal.status.replace(/_/g, " ")}
                  </span>
                </div>

                <h3>{proposal.question}</h3>
                <p className="market-description">
                  {proposal.description}
                </p>

                <div className="market-meta">
                  <span>Submitted</span>
                  <span>{proposal.submittedAt}</span>
                </div>

                <div className="market-meta">
                  <span>Market closes</span>
                  <span>{proposal.closesAt}</span>
                </div>

                <div className="market-meta">
                  <span>Resolution date</span>
                  <span>{proposal.resolvesAt}</span>
                </div>

                <div className="market-meta">
                  <span>Reference</span>
                  <span>{proposal.id.slice(0, 8)}…</span>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}