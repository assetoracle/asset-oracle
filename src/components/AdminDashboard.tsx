
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ShieldCheck, RefreshCw, Check, X } from "lucide-react";
import ReferralReviewPanel from "./ReferralReviewPanel";
import PublishApprovedMarket from "./PublishApprovedMarket";
import PaidSubmissionRefundPanel from "./PaidSubmissionRefundPanel";
import { friendlyError } from "../utils/friendlyError";
import { API_BASE_URL } from "../config/env";

function formatProposalTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  const wat = new Intl.DateTimeFormat("en-NG", { timeZone: "Africa/Lagos", dateStyle: "medium", timeStyle: "short", hour12: false }).format(date);
  const utc = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", dateStyle: "medium", timeStyle: "short", hour12: false }).format(date);
  return `${wat} WAT (${utc} UTC)`;
}
import {
  ensureWalletSession,
  getPrivateAutomatedMarkets,
  decideAutomatedMarket,
  type StoredMarketProposal,
  type WalletRole,
} from "../markets/marketApi";

const API = API_BASE_URL;

type Props = {
  address?: string;
  role: WalletRole;
  signMessage: (message: string) => Promise<string>;
};

export default function AdminDashboard({
  address,
  role,
  signMessage,
}: Props) {
  const [proposals, setProposals] = useState<StoredMarketProposal[]>([]);
  const [automatedProposals, setAutomatedProposals] = useState<StoredMarketProposal[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirmation, setConfirmation] = useState<{ id: string; status: "APPROVED" | "REJECTED" } | null>(null);
  const [activeSection, setActiveSection] = useState<"proposals" | "automated" | "referrals" | "refunds">("proposals");

  useEffect(() => {
    if (role !== "OWNER") setActiveSection("automated");
  }, [role]);

  const authenticate = useCallback(async () => {
    if (!address) throw new Error("Connect your admin wallet first.");

    const session = await ensureWalletSession(address, signMessage);
    return { address, token: session.token };
  }, [address, signMessage]);

  const loadProposals = useCallback(async () => {
    if (!address) {
      setError("Connect the configured admin wallet to continue.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const session = await authenticate();
      const response = await fetch(`${API}/api/markets/admin/proposals/list/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.token}` },
        body: JSON.stringify({ address }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to load proposals.");
      }

      setProposals((data.proposals ?? []).filter((proposal: StoredMarketProposal) => proposal.origin !== "AUTOMATED").slice().sort((a: StoredMarketProposal, b: StoredMarketProposal) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()));
    } catch (err) {
      setError(friendlyError(err, "Request failed."));
    } finally {
      setLoading(false);
    }
  }, [address, authenticate]);

  const loadAutomatedProposals = useCallback(async () => {
    if (!address) {
      setError("Connect an authorized market-maker wallet to continue.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await authenticate();
      const data = await getPrivateAutomatedMarkets(address);
      setAutomatedProposals((data.proposals ?? []).slice().sort((a: StoredMarketProposal, b: StoredMarketProposal) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()));
    } catch (err) {
      setError(friendlyError(err, "Unable to load private automated markets."));
    } finally {
      setLoading(false);
    }
  }, [address, authenticate]);

  useEffect(() => {
    setProposals([]);
    setAutomatedProposals([]);
    setNotice("");
    setError("");
  }, [address]);

  function decide(id: string, status: "APPROVED" | "REJECTED") {
    setConfirmation({ id, status });
  }

  async function confirmDecision() {
    if (!confirmation) return;
    const { id, status } = confirmation;
    const action = status === "APPROVED" ? "approve" : "reject";
    setConfirmation(null);

    setBusyId(id);
    setError("");
    setNotice("");

    try {
      const session = await authenticate();
      const selected = proposals.find((proposal) => proposal.id === id) ?? automatedProposals.find((proposal) => proposal.id === id);
      if (selected?.origin === "AUTOMATED") {
        const result = await decideAutomatedMarket(id, address, status);
        setAutomatedProposals((current) => current.map((proposal) => proposal.id === id ? result.proposal : proposal));
        setNotice(`Automated market ${status.toLowerCase()} successfully.`);
      } else {
        const response = await fetch(
          `${API}/api/markets/admin/proposals/${encodeURIComponent(id)}/decision/session`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.token}` },
            body: JSON.stringify({ address, status }),
          },
        );
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || `Unable to ${action} proposal.`);
        setProposals((current) => current.map((proposal) => proposal.id === id ? data.proposal : proposal)
          .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()));
        setNotice(`Proposal ${status.toLowerCase()} successfully.`);
      }
    } catch (err) {
      setError(friendlyError(err, "Decision failed."));
    } finally {
      setBusyId("");
    }
  }

  const pending = proposals.filter(
    (proposal) => proposal.status === "PENDING_APPROVAL",
  );
  const pendingAutomated = automatedProposals.filter(
    (proposal) => proposal.status === "PENDING_APPROVAL",
  );

  return (
    <section className="page-section admin-dashboard">
      <div className="section-heading">
        <div>
          <span className="eyebrow">RESTRICTED ACCESS</span>
          <h1>{role === "OWNER" ? "Market Operations" : "Automated Market Review"}</h1>
          <p>{role === "OWNER" ? "Review manual proposals and manage API-generated markets." : "Review private API-generated markets. One authorized market maker can approve publication."}</p>
        </div>
        <ShieldCheck size={30} />
      </div>

      <nav className="admin-section-nav" aria-label="Market operations sections">
        {role === "OWNER" && <button type="button" className={activeSection === "proposals" ? "primary-button" : "text-action"} aria-current={activeSection === "proposals" ? "page" : undefined} onClick={() => setActiveSection("proposals")}>Manual proposals</button>}
        <button type="button" className={activeSection === "automated" ? "primary-button" : "text-action"} aria-current={activeSection === "automated" ? "page" : undefined} onClick={() => setActiveSection("automated")}>Automated markets</button>
        {role === "OWNER" && <button type="button" className={activeSection === "referrals" ? "primary-button" : "text-action"} aria-current={activeSection === "referrals" ? "page" : undefined} onClick={() => setActiveSection("referrals")}>Referral review</button>}
        {role === "OWNER" && <button type="button" className={activeSection === "refunds" ? "primary-button" : "text-action"} aria-current={activeSection === "refunds" ? "page" : undefined} onClick={() => setActiveSection("refunds")}>Paid proposal refunds</button>}
      </nav>

      {role === "OWNER" && activeSection === "proposals" && <>
      <div className="account-summary-grid admin-summary-grid">
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

      <div className="market-grid admin-proposal-grid">
        {proposals.map((proposal) => (
          <article className="market-card" key={proposal.id}>
            <div className="market-card-top">
              <span className="market-category">{proposal.category}</span>
              <span className="market-status">
                {proposal.status.replaceAll("_", " ")}
              </span>
            </div>

            {proposal.status === "PENDING_APPROVAL" && (
              <div className="hero-actions admin-proposal-actions">
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

            <h3>{proposal.question}</h3>
            <p className="market-description">{proposal.description}</p>
            <div className="market-meta"><span>Resolution rule</span><span>{proposal.resolutionRule?.description || "Not provided"}</span></div>
            <div className="market-meta"><span>Evidence source ID</span><span>{proposal.resolutionRule?.sourceId || "Not provided"}</span></div>

            {proposal.status === "APPROVED" && (
              <PublishApprovedMarket proposal={proposal} signMessage={signMessage} />
            )}

            <div className="market-meta">
              <span>Submitted</span>
              <span>{new Date(proposal.submittedAt).toLocaleDateString()}</span>
            </div>
            <div className="market-meta">
              <span>Closes</span>
              <span>{formatProposalTime(proposal.closesAt)}</span>
            </div>
            <div className="market-meta">
              <span>Resolves</span>
              <span>{formatProposalTime(proposal.resolvesAt)}</span>
            </div>

          </article>
        ))}
      </div>
      </>}
      {activeSection === "automated" && <>
        <div className="account-summary-grid admin-summary-grid">
          <article className="account-summary-card"><span>Private automated markets</span><strong>{automatedProposals.length}</strong></article>
          <article className="account-summary-card"><span>Awaiting approval</span><strong>{pendingAutomated.length}</strong></article>
          <article className="account-summary-card"><span>Approved, awaiting publication</span><strong>{automatedProposals.filter((p) => p.status === "APPROVED" && !p.onchainMarketId).length}</strong></article>
        </div>
        <button className="primary-button" type="button" onClick={loadAutomatedProposals} disabled={loading || !!busyId || !address}>
          <RefreshCw size={16} /> {loading ? "Loading private markets..." : "Load automated markets"}
        </button>
        {error && <p role="alert">{error}</p>}
        {notice && <p role="status">{notice}</p>}
        {address && !loading && automatedProposals.length === 0 && !error && <div className="empty-state"><h3>No private automated markets loaded</h3><p>Select “Load automated markets” to retrieve API-generated markets.</p></div>}
        <div className="market-grid admin-proposal-grid">
          {automatedProposals.map((proposal) => <article className="market-card" key={proposal.id}>
            <div className="market-card-top"><span className="market-category">{proposal.category}</span><span className="market-status">{proposal.status.replaceAll("_", " ")}</span></div>
            {proposal.status === "PENDING_APPROVAL" && <div className="hero-actions admin-proposal-actions">
              <button className="primary-button" type="button" disabled={!!busyId || loading} onClick={() => decide(proposal.id, "APPROVED")}><Check size={16} /> {busyId === proposal.id ? "Processing..." : "Approve & publish"}</button>
              <button className="text-action" type="button" disabled={!!busyId || loading} onClick={() => decide(proposal.id, "REJECTED")}><X size={16} /> Reject</button>
            </div>}
            <h3>{proposal.question}</h3><p className="market-description">{proposal.description}</p>
            <div className="market-meta"><span>Source ID</span><span>{proposal.resolutionRule?.sourceId || "Not provided"}</span></div>
            <div className="market-meta"><span>Visibility</span><span>{proposal.visibility}</span></div>
            {proposal.status === "APPROVED" && <PublishApprovedMarket proposal={proposal} signMessage={signMessage} />}
            <div className="market-meta"><span>Submitted</span><span>{new Date(proposal.submittedAt).toLocaleDateString()}</span></div>
            <div className="market-meta"><span>Closes</span><span>{formatProposalTime(proposal.closesAt)}</span></div>
            <div className="market-meta"><span>Resolves</span><span>{formatProposalTime(proposal.resolvesAt)}</span></div>
          </article>)}
        </div>
      </>}
      {role === "OWNER" && activeSection === "referrals" && <ReferralReviewPanel address={address} signMessage={signMessage} />}
      {role === "OWNER" && activeSection === "refunds" && <PaidSubmissionRefundPanel address={address} signMessage={signMessage} />}

      {confirmation && createPortal((() => {
        const selectedProposal = proposals.find((proposal) => proposal.id === confirmation.id) ?? automatedProposals.find((proposal) => proposal.id === confirmation.id);
        const approving = confirmation.status === "APPROVED";
        return (
          <div
            className="approval-modal-backdrop"
            onClick={() => setConfirmation(null)}
          >
            <section
              className="approval-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="approval-modal-title"
              aria-describedby="approval-modal-description"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="approval-modal-icon" aria-hidden="true">
                {approving ? <ShieldCheck size={25} /> : <X size={25} />}
              </div>
              <span className="approval-modal-eyebrow">ADMIN REVIEW · ASSET ORACLE</span>
              <h2 id="approval-modal-title">
                {approving ? "Approve market proposal?" : "Reject market proposal?"}
              </h2>
              <p id="approval-modal-description">
                {approving
                  ? "This proposal will move to the approved stage and can then proceed to on-chain publication."
                  : "This proposal will be marked as rejected and will not proceed to publication."}
              </p>
              {selectedProposal && (
                <div className="approval-modal-proposal">
                  <span>PROPOSAL</span>
                  <strong>{selectedProposal.question}</strong>
                  <small>{selectedProposal.category}</small>
                </div>
              )}
              <div className="approval-modal-actions">
                <button
                  className="approval-modal-cancel"
                  type="button"
                  onClick={() => setConfirmation(null)}
                >
                  Cancel
                </button>
                <button
                  className={approving ? "approval-modal-confirm" : "approval-modal-confirm approval-modal-confirm-danger"}
                  type="button"
                  onClick={() => void confirmDecision()}
                >
                  {approving ? <Check size={16} /> : <X size={16} />}
                  {approving ? "Confirm approval" : "Confirm rejection"}
                </button>
              </div>
            </section>
          </div>
        );
      })(), document.body)}
    </section>
  );
}
