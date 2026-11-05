import { useCallback, useEffect, useState } from "react";
import { ExternalLink, RefreshCw, Check, X } from "lucide-react";
import { useAccount, useSignMessage } from "wagmi";
import { getProviderEvidenceReviewQueue, reviewProviderEvidence, type ProviderMarketEvidence } from "../markets/marketApi";
import { friendlyError } from "../utils/friendlyError";

function shortHash(value: string) {
  return value ? `${value.slice(0, 12)}…${value.slice(-8)}` : "Unavailable";
}

export default function ProviderEvidenceReviewPanel() {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
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
      const result = await getProviderEvidenceReviewQueue(address, (message) => signMessageAsync({ message }));
      setEvidence(result.evidence ?? []);
    } catch (err) {
      setError(friendlyError(err, "Unable to load provider evidence."));
    } finally {
      setLoading(false);
    }
  }, [address, signMessageAsync]);

  useEffect(() => {
    setEvidence([]);
  }, [address]);

  async function submitReview(item: ProviderMarketEvidence, decision: "ACCEPTED" | "REJECTED") {
    if (!address) return;
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
        signMessage: (message) => signMessageAsync({ message }),
      });
      setNotice(result.verificationStatus === "UNREVIEWED"
        ? "Your review was recorded. A second matching validator review is still required."
        : `Evidence review reached consensus: ${result.verificationStatus}.`);
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
          <span className="eyebrow">VALIDATOR OPERATIONS</span>
          <h2>Provider evidence review</h2>
          <p>Inspect the collected source data before accepting or rejecting it. Two matching validator decisions establish the final status.</p>
        </div>
      </div>
      <button className="primary-button" type="button" onClick={() => void loadQueue()} disabled={!address || loading || !!busyId}>
        <RefreshCw size={16} /> {loading ? "Loading evidence..." : "Load review queue"}
      </button>
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      {!address && <div className="empty-state"><p>Connect your configured validator wallet to review provider evidence.</p></div>}
      {address && !loading && evidence.length === 0 && !error && <div className="empty-state"><p>No unreviewed provider evidence is currently awaiting validator review.</p></div>}
      <div className="market-grid admin-proposal-grid">
        {evidence.map((item) => (
          <article className="market-card" key={item.id}>
            <div className="market-card-top">
              <span className="market-category">{item.category ?? item.provider}</span>
              <span className="market-status">UNREVIEWED</span>
            </div>
            <h3>{item.question ?? "Market evidence"}</h3>
            <div className="market-meta"><span>Provider</span><span>{item.provider}</span></div>
            <div className="market-meta"><span>Metric</span><span>{item.metric}</span></div>
            <div className="market-meta"><span>Retrieved</span><span>{new Date(item.retrievedAt).toLocaleString()}</span></div>
            <div className="market-meta"><span>Content hash</span><span>{shortHash(item.contentHash)}</span></div>
            <div className="market-meta"><span>Validator votes</span><span>{item.acceptedReviews} accepted · {item.rejectedReviews} rejected</span></div>
            <p><a href={item.sourceUrl} target="_blank" rel="noreferrer">Open provider source <ExternalLink size={14} /></a></p>
            <details>
              <summary>Inspect collected data</summary>
              <pre className="evidence-raw-data">{JSON.stringify(item.rawData, null, 2)}</pre>
              <p>Extracted metric value: {JSON.stringify(item.normalizedValue)}</p>
            </details>
            {item.reviews?.map((review) => (
              <div className="market-meta" key={review.validatorAddress}>
                <span>{review.validatorAddress.slice(0, 8)}…</span>
                <span>{review.decision}</span>
              </div>
            ))}
            {item.myDecision ? (
              <p role="status">Your decision: {item.myDecision}. You cannot review this record again.</p>
            ) : (
              <>
                <label htmlFor={`evidence-note-${item.id}`}>Review note (optional)</label>
                <textarea id={`evidence-note-${item.id}`} rows={2} maxLength={500} value={notes[item.id] ?? ""} onChange={(event) => setNotes((current) => ({ ...current, [item.id]: event.target.value }))} placeholder="Explain why this evidence is acceptable or unreliable." />
                <div className="hero-actions admin-proposal-actions">
                  <button className="primary-button" type="button" disabled={!!busyId || loading} onClick={() => void submitReview(item, "ACCEPTED")}>
                    <Check size={16} /> {busyId === item.id ? "Submitting..." : "Accept evidence"}
                  </button>
                  <button className="text-action" type="button" disabled={!!busyId || loading} onClick={() => void submitReview(item, "REJECTED")}>
                    <X size={16} /> Reject evidence
                  </button>
                </div>
              </>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
