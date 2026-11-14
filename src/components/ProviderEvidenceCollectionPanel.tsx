import { useEffect, useState } from "react";
import { ExternalLink, RefreshCw, Download } from "lucide-react";
import { collectProviderEvidence, listProviderEvidence, type ProviderMarketEvidence, type StoredMarketProposal } from "../markets/marketApi";
import { friendlyError } from "../utils/friendlyError";

type Props = {
  address?: string;
  signMessage: (message: string) => Promise<string>;
  proposals: StoredMarketProposal[];
};

function providerLabel(value: string) {
  const labels: Record<string, string> = {
    "coingecko": "CoinGecko",
    "dexscreener": "DexScreener",
    "defillama": "DeFiLlama",
    "sportmonks": "Sportmonks",
    "api-football": "API-Football",
    "fred": "Federal Reserve Economic Data",
    "world-bank": "World Bank",
    "gdelt": "GDELT News",
    "open-meteo": "Open-Meteo",
  };
  return labels[value.toLowerCase()] ?? value.replaceAll("-", " ").replaceAll("_", " ");
}

function statusLabel(status: ProviderMarketEvidence["verificationStatus"]) {
  if (status === "ACCEPTED") return "Accepted";
  if (status === "REJECTED") return "Rejected";
  if (status === "STALE") return "Outdated";
  return "Awaiting validator review";
}

function readableValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "No value returned";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return Number.isFinite(value) ? value.toLocaleString() : "Unavailable";
  if (typeof value === "string") return value.length > 140 ? value.slice(0, 137) + "…" : value;
  if (Array.isArray(value)) return value.length ? `${value.length} records received` : "No records returned";
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of ["value", "price", "close", "total", "observedValue", "result", "count"]) {
      if (record[key] !== undefined) return readableValue(record[key]);
    }
    return Object.keys(record).length ? "Data received" : "No data returned";
  }
  return "Unavailable";
}

export default function ProviderEvidenceCollectionPanel({ address, signMessage, proposals }: Props) {
  const [evidenceByProposal, setEvidenceByProposal] = useState<Record<string, ProviderMarketEvidence[]>>({});
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!address) {
      setEvidenceByProposal({});
      return;
    }
    let cancelled = false;
    void (async () => {
      for (const proposal of proposals.filter((item) => item.status === "APPROVED")) {
        try {
          const result = await listProviderEvidence(proposal.id, address, signMessage);
          if (!cancelled) setEvidenceByProposal((current) => ({ ...current, [proposal.id]: result.evidence ?? [] }));
        } catch (err) {
          if (!cancelled) setError(friendlyError(err, "Unable to load collected provider evidence."));
        }
      }
    })();
    return () => { cancelled = true; };
  }, [address, proposals, signMessage]);

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

  async function collectEvidence(proposalId: string, confirmRefresh = false) {
    if (!address) return;
    setBusyId(proposalId);
    setError("");
    setNotice("");
    try {
      const result = await collectProviderEvidence(proposalId, address, signMessage, confirmRefresh);
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
          <h2>Collect provider evidence</h2>
          <p>Evidence is loaded automatically. Once a provider response is stored, collection is locked to prevent accidental repeats. Use “Collect new evidence” only when you intentionally need another provider observation. Validators review evidence separately.</p>
        </div>
      </div>
      {!address && <p role="alert">Connect the configured owner wallet to collect provider evidence.</p>}
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      {approved.length === 0 ? <div className="empty-state"><p>No approved proposals are loaded. Load normal and automated proposals first.</p></div> : (
        <div className="market-grid admin-proposal-grid">
          {approved.map((proposal) => (
            <article className="market-card" key={proposal.id}>
              <div className="market-card-top"><span className="market-category">{proposal.category}</span><span className="market-status">Approved</span></div>
              <h3>{proposal.question}</h3>
              <p className="market-description">{proposal.description}</p>
              <div className="market-meta"><span>Provider</span><span>{providerLabel(proposal.resolutionRule.sourceId)}</span></div>
              <div className="market-meta"><span>Metric</span><span>{proposal.resolutionRule.metric.replaceAll("_", " ")}</span></div>
              <div className="hero-actions admin-proposal-actions">
                <button className="primary-button" type="button" disabled={!address || !!busyId || (evidenceByProposal[proposal.id] ?? []).length > 0} onClick={() => void collectEvidence(proposal.id)}>
                  <Download size={16} /> {busyId === proposal.id ? "Collecting..." : (evidenceByProposal[proposal.id] ?? []).length > 0 ? "Evidence collected" : "Collect evidence"}
                </button>
                {(evidenceByProposal[proposal.id] ?? []).length > 0 ? (
                  <button className="text-action" type="button" disabled={!address || !!busyId} onClick={() => {
                    if (window.confirm("Collect a new provider observation? This makes another provider request and may create or refresh evidence for validator review.")) void collectEvidence(proposal.id, true);
                  }}>
                    <RefreshCw size={16} /> Collect new evidence
                  </button>
                ) : (
                  <button className="text-action" type="button" disabled={!address || !!busyId} onClick={() => void loadEvidence(proposal.id)}>
                    <RefreshCw size={16} /> {busyId === proposal.id ? "Loading..." : "Refresh result"}
                  </button>
                )}
              </div>
              {(evidenceByProposal[proposal.id] ?? []).map((item) => (
                <div className="verification-detail-card" key={item.id}>
                  <div className="market-meta"><span>Provider response received</span><strong>Yes</strong></div>
                  <div className="market-meta"><span>Required result found</span><strong>{item.normalizedValue === null || item.normalizedValue === undefined || item.normalizedValue === "" ? "No" : "Yes"}</strong></div>
                  <div className="market-meta"><span>Result</span><strong>{readableValue(item.normalizedValue)}</strong></div>
                  <div className="market-meta"><span>Review status</span><strong>{statusLabel(item.verificationStatus)}</strong></div>
                  <div className="market-meta"><span>Retrieved</span><span>{new Date(item.retrievedAt).toLocaleString()}</span></div>
                  <div className="market-meta"><span>Validator agreement</span><span>{item.acceptedReviews + item.rejectedReviews}/2 decisions</span></div>
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
