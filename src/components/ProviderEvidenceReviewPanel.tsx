import { useCallback, useEffect, useState } from "react";
import { ExternalLink, RefreshCw, Check, X } from "lucide-react";
import { useAccount, useSignMessage } from "wagmi";
import {
  getProviderEvidenceReviewQueue,
  listProviderEvidence,
  reviewProviderEvidence,
  type ProviderMarketEvidence,
  type StoredMarketProposal,
} from "../markets/marketApi";
import { friendlyError } from "../utils/friendlyError";

type Props = {
  canReview?: boolean;
  proposals?: StoredMarketProposal[];
  address?: string;
  signMessage?: (message: string) => Promise<string>;
};

function readableValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "No value returned";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return Number.isFinite(value) ? value.toLocaleString() : "Unavailable";
  if (typeof value === "string") return value.length > 140 ? value.slice(0, 137) + "…" : value;
  if (Array.isArray(value)) return value.length ? `${value.length} records received` : "No records returned";
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const preferred = ["value", "price", "close", "total", "observedValue", "result", "count"];
    for (const key of preferred) {
      if (record[key] !== undefined && record[key] !== value) return readableValue(record[key]);
    }
    return Object.keys(record).length ? "Data received and available for review" : "No data returned";
  }
  return "Unavailable";
}

function statusLabel(status: ProviderMarketEvidence["verificationStatus"]) {
  if (status === "ACCEPTED") return "Accepted";
  if (status === "REJECTED") return "Rejected";
  if (status === "STALE") return "Outdated";
  return "Awaiting validator review";
}

export default function ProviderEvidenceReviewPanel({ canReview = true, proposals, address: ownerAddress, signMessage: ownerSignMessage }: Props) {
  const { address: connectedAddress } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const address = ownerAddress ?? connectedAddress;
  const signMessage = ownerSignMessage ?? ((message: string) => signMessageAsync({ message }));
  const [evidence, setEvidence] = useState<ProviderMarketEvidence[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});

  const loadQueue = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    setError("");
    try {
      if (canReview) {
        const result = await getProviderEvidenceReviewQueue(address, signMessage);
        setEvidence(result.evidence ?? []);
      } else {
        const approved = (proposals ?? []).filter((proposal) => proposal.status === "APPROVED");
        const results = await Promise.all(approved.map((proposal) => listProviderEvidence(proposal.id, address, signMessage)));
        setEvidence(results.flatMap((result) => result.evidence ?? []));
      }
    } catch (err) {
      setError(friendlyError(err, "Unable to load provider evidence."));
    } finally {
      setLoading(false);
    }
  }, [address, canReview, proposals, signMessage]);

  useEffect(() => {
    setEvidence([]);
  }, [address]);

  async function submitReview(item: ProviderMarketEvidence, decision: "ACCEPTED" | "REJECTED") {
    if (!address || !canReview) return;
    setBusyId(item.id);
    setError("");
    setNotice("");
    try {
      const result = await reviewProviderEvidence({
        proposalId: item.proposalId,
        evidenceId: item.id,
        address,
        decision,
        note: notes[item.id]?.trim() || undefined,
        signMessage,
      });
      setNotice(result.verificationStatus === "UNREVIEWED"
        ? "Your review was recorded. One more matching validator decision is required."
        : `Evidence is now ${statusLabel(result.verificationStatus)}.`);
      await loadQueue();
    } catch (err) {
      setError(friendlyError(err, "Unable to submit evidence review."));
    } finally {
      setBusyId("");
    }
  }

  return (
    <section className="page-section">
      <div className="section-heading">
        <div>
          <span className="eyebrow">{canReview ? "VALIDATOR OPERATIONS" : "OWNER VIEW"}</span>
          <h2>{canReview ? "Evidence review" : "Evidence status and validator progress"}</h2>
          <p>{canReview
            ? "A saved record means the provider returned a response. “Required result found” means the market metric was extracted. Accept only when the result supports the market outcome."
            : "A saved record means the provider returned a response. “Required result found” means the market metric was extracted. Only authorized validators can submit reviews."}</p>
        </div>
      </div>
      <button className="primary-button" type="button" onClick={() => void loadQueue()} disabled={!address || loading || !!busyId}>
        <RefreshCw size={16} /> {loading ? "Loading evidence..." : "Refresh evidence"}
      </button>
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      {!address && <div className="empty-state"><p>Connect an authorized wallet to view provider evidence.</p></div>}
      {address && !loading && evidence.length === 0 && !error && <div className="empty-state"><p>No provider evidence is currently available for review.</p></div>}
      <div className="market-grid admin-proposal-grid">
        {evidence.map((item) => {
          const hasValue = item.normalizedValue !== null && item.normalizedValue !== undefined && item.normalizedValue !== "";
          const reviewCount = item.acceptedReviews + item.rejectedReviews;
          return (
            <article className="market-card" key={item.id}>
              <div className="market-card-top">
                <span className="market-category">{item.category ?? item.provider}</span>
                <span className="market-status">{statusLabel(item.verificationStatus)}</span>
              </div>
              <h3>{item.question ?? "Market evidence"}</h3>
              <div className="market-meta"><span>Provider response received</span><strong>Yes</strong></div>
              <div className="market-meta"><span>Required result found</span><strong>{hasValue ? "Yes" : "No"}</strong></div>
              <div className="market-meta"><span>Provider</span><span>{item.provider}</span></div>
              <div className="market-meta"><span>Result</span><strong>{readableValue(item.normalizedValue)}</strong></div>
              <div className="market-meta"><span>Retrieved</span><span>{new Date(item.retrievedAt).toLocaleString()}</span></div>
              <div className="market-meta"><span>Validator agreement</span><span>{reviewCount}/2 decisions · {item.acceptedReviews} accepted · {item.rejectedReviews} rejected</span></div>
              <p><a href={item.sourceUrl} target="_blank" rel="noreferrer">Open provider source <ExternalLink size={14} /></a></p>
              {item.reviews?.map((review) => (
                <div className="market-meta" key={review.validatorAddress}>
                  <span>Validator {review.validatorAddress.slice(0, 6)}…</span>
                  <span>{review.decision === "ACCEPTED" ? "Accepted" : "Rejected"}</span>
                </div>
              ))}
              {canReview && item.myDecision ? (
                <p role="status">Your decision: {item.myDecision === "ACCEPTED" ? "Accepted" : "Rejected"}. You cannot review this record again.</p>
              ) : canReview ? (
                <>
                  {!hasValue && <p role="note">The required market result was not found. This evidence cannot be accepted; reject it or wait for a corrected collection.</p>}
                  <label htmlFor={`evidence-note-${item.id}`}>Review note (optional)</label>
                  <textarea id={`evidence-note-${item.id}`} rows={2} maxLength={500} value={notes[item.id] ?? ""} onChange={(event) => setNotes((current) => ({ ...current, [item.id]: event.target.value }))} placeholder="Add a short reason for your decision." />
                  <div className="hero-actions admin-proposal-actions">
                    <button className="primary-button" type="button" disabled={!hasValue || !!busyId || loading} title={!hasValue ? "Cannot accept evidence without the required market result." : undefined} onClick={() => void submitReview(item, "ACCEPTED")}>
                      <Check size={16} /> {busyId === item.id ? "Submitting..." : "Accept evidence"}
                    </button>
                    <button className="text-action" type="button" disabled={!!busyId || loading} onClick={() => void submitReview(item, "REJECTED")}>
                      <X size={16} /> Reject evidence
                    </button>
                  </div>
                </>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
