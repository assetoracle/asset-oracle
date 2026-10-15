import type { StoredMarketProposal, WalletRoleResponse } from "../markets/marketApi";
import { categoryLabel } from "../utils/format";

type MyProposalsPageProps = {
  walletConnected: boolean;
  proposals: StoredMarketProposal[];
  loading: boolean;
  loaded: boolean;
  error: string;
  onConnect: () => void;
  onLoad: () => void;
  walletRole: WalletRoleResponse | null;
  roleError: string;
};

export default function MyProposalsPage({
  walletConnected,
  proposals,
  loading,
  loaded,
  error,
  onConnect,
  onLoad,
  walletRole,
  roleError,
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
          <div className="account-summary-grid">
            <article className="account-summary-card">
              <span>Wallet role</span>
              <strong>{walletRole
                ? walletRole.humanValidator
                  ? (walletRole.isOwner ? "OWNER · HUMAN VALIDATOR 1" : `HUMAN VALIDATOR ${walletRole.validatorNumber}`)
                  : walletRole.role.replace(/_/g, " ")
                : "Not verified"}</strong>
            </article>
            <article className="account-summary-card">
              <span>Proposal review</span>
              <strong>
                {walletRole?.permissions.approveOrRejectProposals
                  ? "Can approve or reject"
                  : "Owner approval required"}
              </strong>
            </article>
          </div>

          <div className="proposal-actions">
            <button
              className="primary-button"
              type="button"
              onClick={onLoad}
              disabled={loading}
            >
              {loading ? "Verifying wallet..." : "Load my proposals"}
            </button>
          </div>

          {walletRole && (
            <p className="wallet-message" role="status">
              {walletRole.humanValidator
                ? `Human validator ${walletRole.validatorNumber} recognized. Manual market resolution is enabled only when the deployed contract confirms this validator and the required two matching votes are reached.`
                : walletRole.isOwner
                  ? "Owner permissions: review, approve, and reject proposals."
                  : walletRole.role === "MARKET_CREATOR"
                    ? "Market creator permissions: submit proposals and track your own submissions. Approval and rejection remain owner-only."
                    : "Standard wallet: submit proposals and track your own submissions. Approval and rejection remain owner-only."}
            </p>
          )}

          {roleError && (
            <div className="empty-state" role="alert">
              <h3>Unable to verify wallet role</h3>
              <p>{roleError}</p>
            </div>
          )}

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