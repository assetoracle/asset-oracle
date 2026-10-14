import { useCallback, useState } from "react";
import { Check, RefreshCw, ShieldAlert } from "lucide-react";
import { ensureWalletSession } from "../markets/marketApi";

const API = "https://asset-oracle-backend.onrender.com";

type Props = {
  address?: string;
  signMessage: (message: string) => Promise<string>;
};

type FlaggedReferral = {
  invitedWallet: string;
  referrerWallet: string;
  firstPredictionTransaction: string;
  flaggedAt: string | null;
};

export default function ReferralReviewPanel({ address, signMessage }: Props) {
  const [items, setItems] = useState<FlaggedReferral[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyWallet, setBusyWallet] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const authenticate = useCallback(async () => {
    if (!address) throw new Error("Connect the configured owner wallet first.");
    const session = await ensureWalletSession(address, signMessage);
    return { address, token: session.token };
  }, [address, signMessage]);

  const loadQueue = useCallback(async () => {
    if (!address) {
      setError("Connect the configured owner wallet to review flagged referrals.");
      return;
    }
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const auth = await authenticate();
      const response = await fetch(`${API}/api/referrals/review/queue/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth.token}` },
        body: JSON.stringify({ address }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load flagged referrals.");
      setItems(data.flaggedReferrals ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load flagged referrals.");
    } finally {
      setLoading(false);
    }
  }, [address, authenticate]);

  async function review(item: FlaggedReferral, decision: "APPROVE" | "KEEP_FLAGGED") {
    setBusyWallet(item.invitedWallet);
    setError("");
    setNotice("");
    try {
      const auth = await authenticate();
      const response = await fetch(`${API}/api/referrals/review/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth.token}` },
        body: JSON.stringify({ address, invitedWallet: item.invitedWallet, decision }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to update referral review.");
      if (decision === "APPROVE") {
        setItems((current) => current.filter((entry) => entry.invitedWallet !== item.invitedWallet));
      }
      setNotice(decision === "APPROVE"
        ? "Referral approved and added to the all-time leaderboard."
        : "Referral remains flagged and excluded from the leaderboard.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Referral review failed.");
    } finally {
      setBusyWallet("");
    }
  }

  return (
    <section className="referral-rules-card" aria-labelledby="flagged-referrals-heading">
      <div className="referral-rules-heading">
        <ShieldAlert size={21} />
        <h2 id="flagged-referrals-heading">Flagged referral review</h2>
      </div>
      <p>Only stake-verified referrals appear here. Shared IP is a review signal, not proof of abuse. Approving a referral includes it in the all-time leaderboard.</p>
      <button className="primary-button" type="button" onClick={loadQueue} disabled={!address || loading || !!busyWallet}>
        <RefreshCw size={16} />
        {loading ? "Authenticating and loading…" : "Load flagged referrals"}
      </button>
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      {!address && <p>Connect the configured owner wallet to access review controls.</p>}
      {address && !loading && items.length === 0 && <p>No flagged referrals loaded. Select the button to check the review queue.</p>}
      {items.map((item) => (
        <article className="market-card" key={item.invitedWallet}>
          <div className="market-card-top">
            <span className="market-category">Flagged referral</span>
            <span className="market-status">Awaiting review</span>
          </div>
          <div className="market-meta"><span>Invited wallet</span><strong>{item.invitedWallet.slice(0, 10)}…{item.invitedWallet.slice(-8)}</strong></div>
          <div className="market-meta"><span>Referrer wallet</span><strong>{item.referrerWallet.slice(0, 10)}…{item.referrerWallet.slice(-8)}</strong></div>
          <div className="market-meta"><span>First stake</span><a href={`https://scan-testnet.assetchain.org/tx/${item.firstPredictionTransaction}`} target="_blank" rel="noreferrer">View verified transaction</a></div>
          <div className="hero-actions">
            <button className="primary-button" type="button" disabled={!!busyWallet || loading} onClick={() => review(item, "APPROVE")}>
              <Check size={16} />{busyWallet === item.invitedWallet ? "Processing…" : "Approve referral"}
            </button>
            <button className="text-action" type="button" disabled={!!busyWallet || loading} onClick={() => review(item, "KEEP_FLAGGED")}>Keep flagged</button>
          </div>
        </article>
      ))}
    </section>
  );
}
