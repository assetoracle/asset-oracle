
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ShieldCheck, RefreshCw, Check, X } from "lucide-react";
import ReferralReviewPanel from "./ReferralReviewPanel";
import PublishApprovedMarket from "./PublishApprovedMarket";
import ValidatorDashboard from "./ValidatorDashboard";
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
  decideManualMarketProposal,
  type StoredMarketProposal,
  listGeneratedMarketCandidates,
  decideGeneratedMarketCandidate,
  type GeneratedMarketCandidate,
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
  const [generatedCandidates, setGeneratedCandidates] = useState<GeneratedMarketCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirmation, setConfirmation] = useState<{ id: string; status: "APPROVED" | "REJECTED" } | null>(null);
  const [activeSection, setActiveSection] = useState<"proposals" | "automated" | "candidates" | "validators" | "referrals">("proposals");

  useEffect(() => {
    if (role === "MARKET_CREATOR") setActiveSection("proposals");
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

  const loadGeneratedCandidates = useCallback(async () => {
    if (!address) {
      setError("Connect an authorized reviewer wallet to continue.");
      return;
    }
    setLoading(true);
    setError("");
    setNotice("");
    try {
      await authenticate();
      const data = await listGeneratedMarketCandidates(address);
      setGeneratedCandidates(data.candidates ?? []);
    } catch (err) {
      setError(friendlyError(err, "Unable to load generated candidates."));
    } finally {
      setLoading(false);
    }
  }, [address, authenticate]);

  async function reviewGeneratedCandidate(candidateId: string, decision: "DISMISSED" | "PROMOTED") {
    if (!address) return;
    setBusyId(candidateId);
    setError("");
    setNotice("");
    try {
      await authenticate();
      await decideGeneratedMarketCandidate(candidateId, address, decision);
      setGeneratedCandidates((current) => current.filter((candidate) => candidate.id !== candidateId));
      if (decision === "PROMOTED") {
        setNotice("Candidate promoted into the normal proposal queue. It still requires the usual approval.");
      } else {
        setNotice("Generated candidate dismissed.");
      }
    } catch (err) {
      setError(friendlyError(err, "Unable to review generated candidate."));
    } finally {
      setBusyId("");
    }
  }

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
    setConfirmation(null);

    setBusyId(id);
    setError("");
    setNotice("");

    try {
      await authenticate();
      const selected = proposals.find((proposal) => proposal.id === id) ?? automatedProposals.find((proposal) => proposal.id === id);
      if (selected?.origin === "AUTOMATED") {
        const result = await decideAutomatedMarket(id, address!, status);
        setAutomatedProposals((current) => current.map((proposal) => proposal.id === id ? result.proposal : proposal));
        setNotice(`Automated market ${status.toLowerCase()} successfully.`);
      } else {
        const result = await decideManualMarketProposal(id, address!, status, signMessage);
        setProposals((current) => current.map((proposal) => proposal.id === id ? result.proposal : proposal)
          .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()));
        setNotice(status === "APPROVED"
          ? "Proposal approved. Any escrowed $10 USDC fee has been released to Treasury."
          : "Proposal rejected. Any escrowed $10 USDC fee has been refunded to its original wallet.");
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
          <h1>{role === "OWNER" ? "Market Operations" : "Market Creator Review"}</h1>
          <p>{role === "OWNER" ? "Review manual proposals and manage API-generated markets." : "Review and decide normal proposals and automated market proposals."}</p>
        </div>
        <ShieldCheck size={30} />
      </div>

      <nav className="admin-section-nav" aria-label="Market operations sections">
        {(role === "OWNER" || role === "MARKET_CREATOR") && <button type="button" className={activeSection === "proposals" ? "primary-button" : "text-action"} aria-current={activeSection === "proposals" ? "page" : undefined} onClick={() => setActiveSection("proposals")}>Normal proposals</button>}
        <button type="button" className={activeSection === "automated" ? "primary-button" : "text-action"} aria-current={activeSection === "automated" ? "page" : undefined} onClick={() => setActiveSection("automated")}>Automated markets</button>
        {(role === "OWNER" || role === "MARKET_CREATOR") && <button type="button" className={activeSection === "candidates" ? "primary-button" : "text-action"} aria-current={activeSection === "candidates" ? "page" : undefined} onClick={() => setActiveSection("candidates")}>Generated candidates</button>}
        {role === "OWNER" && <button type="button" className={activeSection === "validators" ? "primary-button" : "text-action"} aria-current={activeSection === "validators" ? "page" : undefined} onClick={() => setActiveSection("validators")}>Validator operations</button>}
        {role === "OWNER" && <button type="button" className={activeSection === "referrals" ? "primary-button" : "text-action"} aria-current={activeSection === "referrals" ? "page" : undefined} onClick={() => setActiveSection("referrals")}>Referral review</button>}
      </nav>

      {(role === "OWNER" || role === "MARKET_CREATOR") && activeSection === "proposals" && <>
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
              <button className="primary-button" type="button" disabled={!!busyId || loading} onClick={() => decide(proposal.id, "APPROVED")}><Check size={16} /> {busyId === proposal.id ? "Processing..." : "Approve"}</button>
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
      {(role === "OWNER" || role === "MARKET_CREATOR") && activeSection === "candidates" && <>
        <div className="account-summary-grid admin-summary-grid">
          <article className="account-summary-card"><span>Pending generated candidates</span><strong>{generatedCandidates.length}</strong></article>
          <article className="account-summary-card"><span>Review status</span><strong>Human review</strong></article>
          <article className="account-summary-card"><span>Publication</span><strong>Manual approval</strong></article>
        </div>
        <p className="market-description">These are draft candidates created from configured templates. Review the source, metric and threshold before promoting. Promotion only creates a normal pending proposal; it does not approve or publish a market.</p>
        <button className="primary-button" type="button" onClick={loadGeneratedCandidates} disabled={loading || !!busyId || !address}>
          <RefreshCw size={16} /> {loading ? "Loading candidates..." : "Load generated candidates"}
        </button>
        {error && <p role="alert">{error}</p>}
        {notice && <p role="status">{notice}</p>}
        {address && !loading && generatedCandidates.length === 0 && !error && <div className="empty-state"><h3>No pending candidates loaded</h3><p>Load the candidate queue to check for generated market drafts.</p></div>}
        <div className="market-grid admin-proposal-grid">
          {generatedCandidates.map((candidate) => <article className="market-card" key={candidate.id}>
            <div className="market-card-top"><span className="market-category">{candidate.category}</span><span className="market-status">PENDING REVIEW</span></div>
            <h3>{candidate.proposal.question}</h3>
            <p className="market-description">{candidate.proposal.description}</p>
            <div className="market-meta"><span>Template</span><span>{candidate.templateId}</span></div>
            <div className="market-meta"><span>Data source</span><span>{candidate.proposal.resolutionRule.sourceId}</span></div>
            <div className="market-meta"><span>Metric</span><span>{candidate.proposal.resolutionRule.metric}</span></div>
            <div className="market-meta"><span>Comparison</span><span>{candidate.proposal.resolutionRule.comparison} {candidate.proposal.resolutionRule.targetValue}{candidate.proposal.resolutionRule.currency ? ` ${candidate.proposal.resolutionRule.currency}` : ""}</span></div>
            <div className="market-meta"><span>Observation time</span><span>{formatProposalTime(candidate.proposal.resolutionRule.observationTime)}</span></div>
            <div className="market-meta"><span>Closes</span><span>{formatProposalTime(candidate.proposal.closesAt)}</span></div>
            <div className="market-meta"><span>Resolves</span><span>{formatProposalTime(candidate.proposal.resolvesAt)}</span></div>
            <div className="market-meta"><span>Generated</span><span>{formatProposalTime(candidate.createdAt)}</span></div>
            <div className="hero-actions admin-proposal-actions">
              <button className="primary-button" type="button" disabled={!!busyId || loading} onClick={() => void reviewGeneratedCandidate(candidate.id, "PROMOTED")}>
                <Check size={16} /> {busyId === candidate.id ? "Processing..." : "Promote to proposals"}
              </button>
              <button className="text-action" type="button" disabled={!!busyId || loading} onClick={() => void reviewGeneratedCandidate(candidate.id, "DISMISSED")}>
                <X size={16} /> Dismiss
              </button>
            </div>
          </article>)}
        </div>
      </>}
      {role === "OWNER" && activeSection === "validators" && <ValidatorDashboard />}
      {role === "OWNER" && activeSection === "referrals" && <ReferralReviewPanel address={address} signMessage={signMessage} />}

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
                {selectedProposal?.origin === "AUTOMATED"
                  ? (approving ? "Approve automated market?" : "Reject automated market?")
                  : (approving ? "Approve market proposal?" : "Reject market proposal?")}
              </h2>
              <p id="approval-modal-description">
                {approving
                  ? (selectedProposal?.origin === "AUTOMATED"
                    ? "One authorized market maker can approve this API-generated market. It stays private until the on-chain publication is confirmed."
                    : "This proposal will move to the approved stage and can then proceed to on-chain publication.")
                  : "This market will be rejected and will remain private."}
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
