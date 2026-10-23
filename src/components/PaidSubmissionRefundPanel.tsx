import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, RefreshCw, ShieldCheck } from "lucide-react";
import { API_BASE_URL } from "../config/env";
import { ensureWalletSession } from "../markets/marketApi";
import { friendlyError } from "../utils/friendlyError";

type RefundItem = {
  id: string;
  proposalId: string;
  walletAddress: string;
  network: "MAINNET" | "TESTNET";
  token: "USDC" | "USDT" | "cNGN";
  amountAtomic: string;
  status: string;
  paymentTxHash: string | null;
  refundTxHash: string | null;
  createdAt: string;
};

type Props = {
  address?: string;
  signMessage: (message: string) => Promise<string>;
};

const API = API_BASE_URL;
const HASH_PATTERN = /^0x[0-9a-fA-F]{64}$/;

function shortAddress(value: string) {
  return value.length > 18 ? value.slice(0, 10) + "…" + value.slice(-6) : value;
}

export default function PaidSubmissionRefundPanel({ address, signMessage }: Props) {
  const [refunds, setRefunds] = useState<RefundItem[]>([]);
  const pendingRefunds = refunds.filter((item) => item.status !== "REFUNDED");
  const completedRefunds = refunds.filter((item) => item.status === "REFUNDED");
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [hashes, setHashes] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [hasLoaded, setHasLoaded] = useState(false);
  const [lastVerified, setLastVerified] = useState<{ recipient: string; hash: string } | null>(null);
  const [activeSection, setActiveSection] = useState<"pending" | "refunded">("pending");

  const authenticate = useCallback(async () => {
    if (!address) throw new Error("Connect the configured admin wallet first.");
    const session = await ensureWalletSession(address, signMessage);
    return session.token;
  }, [address, signMessage]);

  const loadRefunds = useCallback(async (preserveNotice = false) => {
    if (!address) {
      setError("Connect the configured admin wallet to load refund records.");
      return;
    }
    setLoading(true);
    setError("");
    if (!preserveNotice) setNotice("");
    try {
      const token = await authenticate();
      const response = await fetch(`${API}/api/markets/paid-submissions/admin/refunds/queue`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ address }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load refund queue.");
      setRefunds((Array.isArray(data.refunds) ? data.refunds : []).sort((a: RefundItem, b: RefundItem) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setHasLoaded(true);
    } catch (err) {
      setError(friendlyError(err, "Unable to load refund queue."));
    } finally {
      setLoading(false);
    }
  }, [address, authenticate]);

  useEffect(() => {
    setRefunds([]);
    setHashes({});
    setError("");
    setNotice("");
    setHasLoaded(false);
    setLastVerified(null);
  }, [address]);

  async function verifyRefund(item: RefundItem) {
    const transactionHash = (hashes[item.id] ?? "").trim();
    if (!HASH_PATTERN.test(transactionHash)) {
      setError("Enter the complete refund transaction hash (0x followed by 64 hexadecimal characters).");
      return;
    }
    setBusyId(item.id);
    setError("");
    setNotice("");
    try {
      const token = await authenticate();
      const response = await fetch(`${API}/api/markets/paid-submissions/${encodeURIComponent(item.id)}/verify-refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ address, transactionHash }),
      });
      const data = await response.json();
      if (!response.ok) {
        const message = String(data.error || "Refund verification failed.");
        if (/transaction(?: receipt)? .*could not be found|transactionnotfound|receipt not found/i.test(message)) {
          throw new Error("The backend cannot find this transaction on the configured Asset Chain Testnet RPC. The refund has NOT been recorded yet. Confirm the hash opens on https://scan-testnet.assetchain.org and that it is on chain ID 42421.");
        }
        throw new Error(message);
      }
      setHashes((current) => ({ ...current, [item.id]: transactionHash }));
      setRefunds((current) => current.map((entry) => entry.id === item.id
        ? { ...entry, status: "REFUNDED", refundTxHash: transactionHash }
        : entry));
      setLastVerified({ recipient: item.walletAddress, hash: transactionHash });
      setActiveSection("refunded");
      setNotice(`SUCCESS — refund verified on-chain and recorded as REFUNDED. Recipient: ${shortAddress(item.walletAddress)}. Transaction: ${shortAddress(transactionHash)}. The item has been removed from the pending queue.`);
      void loadRefunds(true);
    } catch (err) {
      setError(friendlyError(err, "Refund verification failed."));
    } finally {
      setBusyId("");
    }
  }

  return (
    <section className="page-section paid-refund-panel" aria-labelledby="paid-refund-heading">
      <div className="section-heading">
        <div>
          <span className="eyebrow">ADMIN · PAYMENT RECONCILIATION</span>
          <h2 id="paid-refund-heading">Paid proposal refunds</h2>
          <p>Load rejected paid submissions, enter the refund transaction hash, and let the backend verify the on-chain transfer before recording REFUNDED.</p>
        </div>
        <ShieldCheck size={28} aria-hidden="true" />
      </div>

      <div className="account-summary-grid admin-summary-grid">
        <article className="account-summary-card">
          <span>Refunds awaiting verification</span>
          <strong>{pendingRefunds.length}</strong>
        </article>
        <article className="account-summary-card">
          <span>Network</span>
          <strong>Asset Chain Testnet</strong>
        </article>
        <article className="account-summary-card">
          <span>Expected refund</span>
          <strong>10 USDC</strong>
        </article>
      </div>

      <button className="primary-button" type="button" onClick={() => void loadRefunds()} disabled={!address || loading || !!busyId}>
        <RefreshCw size={16} />
        {loading ? "Authenticating and loading…" : "Load refund queue"}
      </button>

      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}

      {!address && <div className="empty-state"><h3>Connect your admin wallet</h3><p>Refund records are restricted to an authorized admin wallet.</p></div>}
      {address && hasLoaded && !loading && refunds.length === 0 && !error && <div className="empty-state"><h3>No refunds awaiting verification</h3><p>The queue loaded successfully and has no pending refund records.</p>{lastVerified && <p role="status">Most recent success: REFUNDED · {shortAddress(lastVerified.recipient)} · transaction {shortAddress(lastVerified.hash)}</p>}</div>}
      {address && !hasLoaded && !loading && !error && <p>Select “Load refund queue” to check current refund records.</p>}

      <div className="page-section-tabs" role="tablist" aria-label="Refund status sections">
        <button type="button" role="tab" aria-selected={activeSection === "pending"} className={activeSection === "pending" ? "active" : ""} onClick={() => setActiveSection("pending")}>Pending verification ({pendingRefunds.length})</button>
        <button type="button" role="tab" aria-selected={activeSection === "refunded"} className={activeSection === "refunded" ? "active" : ""} onClick={() => setActiveSection("refunded")}>Refunded ({completedRefunds.length})</button>
      </div>
      {activeSection === "pending" && <div className="market-grid admin-proposal-grid">
        {pendingRefunds.map((item) => (
          <article className="market-card" key={item.id}>
            <div className="market-card-top">
              <span className="market-category">{item.network} · {item.token}</span>
              <span className="market-status">{item.status.replaceAll("_", " ")}</span>
            </div>
            <h3>Rejected proposal refund</h3>
            <div className="market-meta"><span>Refund amount</span><span>{Number(item.amountAtomic) / 1_000_000} USDC</span></div>
            <div className="market-meta"><span>Recipient wallet</span><span title={item.walletAddress}>{shortAddress(item.walletAddress)}</span></div>
            <div className="market-meta"><span>Submission ID</span><span>{item.id}</span></div>
            <div className="market-meta"><span>Original payment</span><span>{item.paymentTxHash ? shortAddress(item.paymentTxHash) : "Not recorded"}</span></div>
            <label htmlFor={`refund-hash-${item.id}`}>Refund transaction hash</label>
            <input
              id={`refund-hash-${item.id}`}
              type="text"
              inputMode="text"
              autoComplete="off"
              spellCheck={false}
              placeholder="0x…"
              value={hashes[item.id] ?? ""}
              onChange={(event) => setHashes((current) => ({ ...current, [item.id]: event.target.value }))}
              disabled={!!busyId || loading}
            />
            <button className="primary-button" type="button" onClick={() => void verifyRefund(item)} disabled={!address || !!busyId || loading}>
              {busyId === item.id ? <RefreshCw size={16} /> : <CheckCircle2 size={16} />}
              {busyId === item.id ? "Verifying on-chain…" : "Verify refund and mark REFUNDED"}
            </button>
            <p className="market-description">The backend checks the chain, transaction success, treasury sender, approved USDC contract, exact amount, recipient, and confirmations. This button does not send funds.</p>
          </article>
        ))}
      </div>}
      {activeSection === "refunded" && <section className="refund-subsection" aria-labelledby="completed-refunds-heading">
        <h3 id="completed-refunds-heading">Refunded ({completedRefunds.length})</h3>
        {completedRefunds.length === 0 ? (
          <div className="empty-state"><p>No verified refunds recorded yet.</p></div>
        ) : (
          <div className="market-grid admin-proposal-grid">
            {completedRefunds.map((item) => (
              <article className="market-card refunded-card" key={item.id}>
                <div className="market-card-top"><span className="market-category">{item.network} · {item.token}</span><span className="market-status">REFUNDED</span></div>
                <h3>Refund verified</h3>
                <div className="market-meta"><span>Refund amount</span><strong>{Number(item.amountAtomic) / 1000000} USDC</strong></div>
                <div className="market-meta"><span>Recipient</span><span title={item.walletAddress}>{shortAddress(item.walletAddress)}</span></div>
                <div className="market-meta"><span>Refund transaction</span>{item.refundTxHash ? <a href={"https://scan-testnet.assetchain.org/tx/" + item.refundTxHash} target="_blank" rel="noreferrer">{shortAddress(item.refundTxHash)}</a> : <span>Not recorded</span>}</div>
                <p role="status">Successfully verified and recorded. No further action is required.</p>
              </article>
            ))}
          </div>
        )}
      </section>}
    </section>
  );
}
