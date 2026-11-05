import { useState } from "react";
import { ExternalLink, RefreshCw, Download } from "lucide-react";
import { collectProviderEvidence, listProviderEvidence, type ProviderMarketEvidence, type StoredMarketProposal } from "../markets/marketApi";
import { friendlyError } from "../utils/friendlyError";

type Props = {
  address?: string;
  signMessage: (message: string) => Promise<string>;
  proposals: StoredMarketProposal[];
};

function shortHash(value: string) {
  return value ? `${value.slice(0, 12)}…${value.slice(-8)}` : "Unavailable";
}

export default function ProviderEvidenceCollectionPanel({ address, signMessage, proposals }: Props) {
  const [evidenceByProposal, setEvidenceByProposal] = useState<Record<string, ProviderMarketEvidence[]>>({});
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadEvidence(proposalId: string) {
    if (!address) return;
    setBusyId(proposalId);
    setError("");
    try {
      const result = await listProviderEvidence(proposalId, address, signMessage);
      setEvidenceByProposal((current) => ({ ...current, [proposalId]: result.evidence ?? [] }));
    } catch (err) {
      setError(friendlyError(err, "Unable to load collected provider evidence."));
    } finally {
      setBusyId("");
    }
  }

  async function collectEvidence(proposalId: string) {
    if (!address) return;
    setBusyId(proposalId);
    setError("");
    setNotice("");
    try {
      const result = await collectProviderEvidence(proposalId, address, signMessage);
      setNotice(result.message);
      await loadEvidence(proposalId);
    } catch (err) {
      setError(friendlyError(err, "Unable to collect provider evidence."));
      setBusyId("");
    }
  }

  const approved = proposals.filter((proposal) => proposal.status === "APPROVED");
  return (
    <section className="page-section">
      <div className="section-heading">
        <div>
          <span className="eyebrow">OWNER OPERATIONS</span>
          <h2>Provider evidence collection</h2>
          <p>Collect a provider snapshot for an approved proposal. Collection does not accept or reject evidence; validators review it separately.</p>
        </div>
      </div>
      {!address && <p role="alert">Connect the configured owner wallet to collect provider evidence.</p>}
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      {approved.length === 0 ? <div className="empty-state"><p>No approved proposals are loaded. Load normal and automated proposals first.</p></div> : (
        <div className="market-grid admin-proposal-grid">
          {approved.map((proposal) => (
            <article className="market-card" key={proposal.id}>
              <div className="market-card-top"><span className="market-category">{proposal.category}</span><span className="market-status">APPROVED</span></div>
              <h3>{proposal.question}</h3>
              <p className="market-description">{proposal.description}</p>
              <div className="market-meta"><span>Provider</span><span>{proposal.resolutionRule.sourceId}</span></div>
              <div className="market-meta"><span>Metric</span><span>{proposal.resolutionRule.metric}</span></div>
              <div className="hero-actions admin-proposal-actions">
                <button className="primary-button" type="button" disabled={!address || !!busyId} onClick={() => void collectEvidence(proposal.id)}>
                  <Download size={16} /> {busyId === proposal.id ? "Collecting..." : "Collect evidence"}
                </button>
                <button className="text-action" type="button" disabled={!address || !!busyId} onClick={() => void loadEvidence(proposal.id)}>
                  <RefreshCw size={16} /> Load evidence
                </button>
              </div>
              {(evidenceByProposal[proposal.id] ?? []).map((item) => (
                <div className="verification-detail-card" key={item.id}>
                  <div className="market-meta"><span>Status</span><strong>{item.verificationStatus}</strong></div>
                  <div className="market-meta"><span>Retrieved</span><span>{new Date(item.retrievedAt).toLocaleString()}</span></div>
                  <div className="market-meta"><span>Content hash</span><span>{shortHash(item.contentHash)}</span></div>
                  <div className="market-meta"><span>Validator tally</span><span>{item.acceptedReviews} accepted · {item.rejectedReviews} rejected</span></div>
                  <a href={item.sourceUrl} target="_blank" rel="noreferrer">Open source <ExternalLink size={14} /></a>
                </div>
              ))}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
