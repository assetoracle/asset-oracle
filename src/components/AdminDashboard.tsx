
import { useCallback, useEffect, useState } from "react";
import { ShieldCheck, RefreshCw, Check, X } from "lucide-react";
import PublishApprovedMarket from "./PublishApprovedMarket";
import {
  requestWalletNonce,
  type StoredMarketProposal,
} from "../markets/marketApi";

const API = "https://asset-oracle-backend.onrender.com";

type Props = {
  address?: string;
  signMessage: (message: string) => Promise<string>;
};

export default function AdminDashboard({
  address,
  signMessage,
}: Props) {
  const [proposals, setProposals] = useState<StoredMarketProposal[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const authenticate = useCallback(async () => {
    if (!address) throw new Error("Connect your admin wallet first.");

    const { message } = await requestWalletNonce(address);
    const signature = await signMessage(message);

    return { address, message, signature };
  }, [address, signMessage]);

  const loadProposals = useCallback(async () => {
    if (!address) {
      setError("Connect the configured admin wallet to continue.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const walletAuth = await authenticate();
      const response = await fetch(`${API}/api/markets/admin/proposals/list`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(walletAuth),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to load proposals.");
      }

      setProposals(data.proposals ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed.");
    } finally {
      setLoading(false);
    }
  }, [address, authenticate]);

  useEffect(() => {
    setProposals([]);
    setNotice("");
    setError("");
  }, [address]);

  async function decide(
    id: string,
    status: "APPROVED" | "REJECTED",
  ) {
    const action = status === "APPROVED" ? "approve" : "reject";

    if (!window.confirm(`Are you sure you want to ${action} this proposal?`)) {
      return;
    }

    setBusyId(id);
    setError("");
    setNotice("");

    try {
      const walletAuth = await authenticate();
      const response = await fetch(
        `${API}/api/markets/admin/proposals/${encodeURIComponent(id)}/decision`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status, walletAuth }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Unable to ${action} proposal.`);
      }

      setProposals((current) =>
        current.map((proposal) =>
          proposal.id === id ? data.proposal : proposal,
        ),
      );

      setNotice(`Proposal ${status.toLowerCase()} successfully.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Decision failed.");
    } finally {
      setBusyId("");
    }
  }

  const pending = proposals.filter(
    (proposal) => proposal.status === "PENDING_APPROVAL",
  );

  return (
    <section className="page-section">
      <div className="section-heading">
        <div>
          <span className="eyebrow">RESTRICTED ACCESS</span>
          <h1>Admin Dashboard</h1>
          <p>Review market proposals before publication.</p>
        </div>
        <ShieldCheck size={30} />
      </div>

      <div className="account-summary-grid">
        <article className="account-summary-card">
          <span>Total proposals loaded</span>
          <strong>{proposals.length}</strong>
        </article>
        <article className="account-summary-card">
          <span>Pending review</span>
          <strong>{pending.length}</strong>
        </article>
        <article className="account-summary-card">
          <span>Approved</span>
          <strong>
            {proposals.filter((p) => p.status === "APPROVED").length}
          </strong>
        </article>
      </div>

      <button
        className="primary-button"
        type="button"
        onClick={loadProposals}
        disabled={loading || !!busyId || !address}
      >
        <RefreshCw size={16} />
        {loading ? "Authenticating and loading..." : "Load proposals"}
      </button>

      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}

      {!address && (
        <div className="empty-state">
          <h3>Connect your admin wallet</h3>
          <p>Only the wallet authorized by the backend can review proposals.</p>
        </div>
      )}

      {address && !loading && proposals.length === 0 && !error && (
        <div className="empty-state">
          <h3>No proposals loaded</h3>
          <p>Select “Load proposals” to authenticate and retrieve submissions.</p>
        </div>
      )}

      <div className="market-grid">
        {proposals.map((proposal) => (
          <article className="market-card" key={proposal.id}>
            <div className="market-card-top">
              <span className="market-category">{proposal.category}</span>
              <span className="market-status">
                {proposal.status.replaceAll("_", " ")}
              </span>
            </div>

            <h3>{proposal.question}</h3>
            <p className="market-description">{proposal.description}</p>

            <div className="market-meta">
              <span>Submitted</span>
              <span>{new Date(proposal.submittedAt).toLocaleDateString()}</span>
            </div>
            <div className="market-meta">
              <span>Closes</span>
              <span>{new Date(proposal.closesAt).toLocaleDateString()}</span>
            </div>
            <div className="market-meta">
              <span>Resolves</span>
              <span>{new Date(proposal.resolvesAt).toLocaleDateString()}</span>
            </div>

            {proposal.status === "APPROVED" && (
              <PublishApprovedMarket proposal={proposal} />
            )}

            {proposal.status === "PENDING_APPROVAL" && (
              <div className="hero-actions">
                <button
                  className="primary-button"
                  type="button"
                  disabled={!!busyId || loading}
                  onClick={() => decide(proposal.id, "APPROVED")}
                >
                  <Check size={16} />
                  {busyId === proposal.id ? "Processing..." : "Approve"}
                </button>
                <button
                  className="text-action"
                  type="button"
                  disabled={!!busyId || loading}
                  onClick={() => decide(proposal.id, "REJECTED")}
                >
                  <X size={16} /> Reject
                </button>
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
