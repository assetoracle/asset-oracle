import type { StoredMarketProposal, WalletRoleResponse } from "../markets/marketApi";
import { categoryLabel, formatDate } from "../utils/format";

type MyProposalsPageProps = {
  walletConnected: boolean;
  proposals: StoredMarketProposal[];
  loading: boolean;
  loaded: boolean;
  error: string;
  onConnect: () => void;
  onLoad: () => void;
  onEdit: (proposal: StoredMarketProposal) => void;
  walletRole: WalletRoleResponse | null;
  roleError: string;
  onchainValidatorStatus: boolean | null;
  onchainValidatorRosterConfigured: boolean | null;
};

export default function MyProposalsPage({
  walletConnected,
  proposals,
  loading,
  loaded,
  error,
  onConnect,
  onLoad,
  onEdit,
  walletRole,
  roleError,
  onchainValidatorStatus,
  onchainValidatorRosterConfigured,
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
          <h3>Sign in to continue</h3>
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
            <article className="account-summary-card">
              <span>On-chain validator status</span>
              <strong>
                {onchainValidatorRosterConfigured === false
                  ? "Roster not configured"
                  : onchainValidatorStatus === true && onchainValidatorRosterConfigured === true
                    ? "Authorized on active contract"
                    : onchainValidatorStatus === false
                      ? "Not authorized on active contract"
                      : "Checking active contract"}
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
                ? `Human validator ${walletRole.validatorNumber} recognized by the backend. ${onchainValidatorStatus === true && onchainValidatorRosterConfigured === true ? "The active 2-of-3 contract confirms this wallet is authorized." : onchainValidatorStatus === false || onchainValidatorRosterConfigured === false ? "The active contract does not currently confirm this validator; settlement voting remains unavailable." : "Checking the active contract before confirming settlement-voting access."}`
                : walletRole.isOwner
                  ? "Owner permissions: review, approve, and reject proposals."
                  : walletRole.role === "MARKET_CREATOR"
                    ? "Market creator permissions: submit proposals and track your own submissions. Approval and rejection remain owner-only."
                    : "Standard wallet: submit proposals and track your own submissions. Approval and rejection remain owner-only."}
            </p>
          )}

          {loading ? (
            <div className="empty-state proposal-state" role="status" aria-live="polite">
              <h3>Loading your proposals</h3>
              <p>Verifying this wallet and retrieving its submissions. This may take a moment.</p>
            </div>
          ) : (
            <>
              {roleError && (
                <div className="empty-state proposal-feedback" role="alert">
                  <h3>Unable to verify wallet role</h3>
                  <p>{roleError}</p>
                </div>
              )}

              {error && (
                <div className="empty-state proposal-feedback" role="alert">
                  <h3>Unable to load proposals</h3>
                  <p>{error}</p>
                </div>
              )}

              {loaded && proposals.length === 0 && !error && (
                <div className="empty-state proposal-feedback">
                  <h3>No proposals found</h3>
                  <p>No submissions were found for this wallet.</p>
                </div>
              )}
            </>
          )}

          {!loading && !error && loaded && proposals.length > 0 ? (
          <div className="market-grid my-proposal-grid">
            {proposals.map((proposal) => (
              <article className="market-card" key={proposal.id}>
                <div className="market-card-top">
                  <span className="market-category">
                    {categoryLabel(proposal.category)}
                  </span>
                  <span className={`market-status proposal-status proposal-status-${proposal.status.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>
                    {proposal.status.replace(/_/g, " ")}
                  </span>
                </div>

                {!proposal.onchainMarketId && !proposal.onchainTxHash && (
                  <div className="proposal-edit-actions">
                    {Date.parse(proposal.closesAt) <= Date.now() && (
                      <p className="disabled-note" role="status">
                        This proposal's closing time has passed. Edit it with a future closing time and resubmit for approval.
                      </p>
                    )}
                    <button
                      className="primary-button"
                      type="button"
                      onClick={() => onEdit(proposal)}
                    >
                      Edit proposal and resubmit
                    </button>
                  </div>
                )}

                <h3>{proposal.question}</h3>
                <p className="market-description">
                  {proposal.description}
                </p>

                <div className="market-meta">
                  <span>Submitted</span>
                  <span>{formatDate(proposal.submittedAt)}</span>
                </div>

                <div className="market-meta">
                  <span>Market closes</span>
                  <span>{formatDate(proposal.closesAt)}</span>
                </div>

                <div className="market-meta">
                  <span>Resolution date</span>
                  <span>{formatDate(proposal.resolvesAt)}</span>
                </div>

                <div className="market-meta">
                  <span>Reference</span>
                  <span>{proposal.id.slice(0, 8)}…</span>
                </div>
              </article>
            ))}
          </div>
          ) : null}
        </>
      )}
    </section>
  );
}