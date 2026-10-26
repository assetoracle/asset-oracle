import { useState } from "react";
import {
  CheckCircle2,
  Copy,
  Gift,
  Link2,
  Medal,
  Search,
  ShieldCheck,
  Trophy,
  Users,
} from "lucide-react";

type ReferralLeaderboardEntry = {
  rank: number;
  wallet: string;
  referrals: number;
  referralPoints: number;
};

type PointsLeaderboardEntry = {
  rank: number;
  wallet: string;
  points: number;
};

type TotalLeaderboardEntry = {
  rank: number;
  wallet: string;
  referrals: number;
  referralPoints: number;
  activityPoints: number;
  totalPoints: number;
};

type ReferralsPageProps = {
  address?: string;
  personalStats: { verifiedReferrals: number; pendingReferrals: number; flaggedReferrals: number; referralPoints: number; totalPoints: number; leaderboardRank: number | null; rewardsEarned: number | null; rewardsAvailable: boolean } | null;
  message: string;
  referralLink: string;
  referralCode: string;
  leaderboard: ReferralLeaderboardEntry[];
  pointsLeaderboard: PointsLeaderboardEntry[];
  totalLeaderboard: TotalLeaderboardEntry[];
  leaderboardLoading: boolean;
  leaderboardError: string;
  actionLoading: boolean;
  onGetReferralLink: () => void;
  onAttributeReferral: () => void;
  onRetryLeaderboard: () => void;
};

export default function ReferralsPage({
  address,
  personalStats,
  message,
  referralLink,
  referralCode,
  leaderboard,
  pointsLeaderboard,
  totalLeaderboard,
  leaderboardLoading,
  leaderboardError,
  actionLoading,
  onAttributeReferral,
  onRetryLeaderboard,
}: ReferralsPageProps) {
  const [activeLeaderboard, setActiveLeaderboard] = useState<"referral" | "points" | "total">("referral");
  const [walletSearch, setWalletSearch] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const [activeReferralSection, setActiveReferralSection] = useState<"my-referrals" | "leaderboards">("my-referrals");

  async function copyReferralLink() {
    if (!referralLink) return;
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(referralLink);
      setCopyMessage("Referral link copied.");
    } catch {
      setCopyMessage("Copy unavailable. Select the link to copy.");
    }
  }
  const searchTerm = walletSearch.trim().toLowerCase();
  const filteredReferrals = leaderboard.filter((entry) => entry.wallet.toLowerCase().includes(searchTerm));
  const filteredPoints = pointsLeaderboard.filter((entry) => entry.wallet.toLowerCase().includes(searchTerm));
  const filteredTotals = totalLeaderboard.filter((entry) => entry.wallet.toLowerCase().includes(searchTerm));
  const walletEntry = totalLeaderboard.find(
    (entry) => entry.wallet.toLowerCase() === address?.toLowerCase(),
  );
  return (
    <section className="page-section referral-page">
      <div className="section-heading">
        <div>
          <span className="eyebrow">COMMUNITY REWARDS</span>
          <h1>Points leaderboard</h1>
          <p>Earn points by proposing markets, participating in markets, and referring qualified participants.</p>
        </div>
        <div className="referral-heading-icon"><Trophy size={28} /></div>
      </div>

      <nav className="page-section-tabs" aria-label="Referral sections">
        <button type="button" className={activeReferralSection === "my-referrals" ? "active" : ""} aria-pressed={activeReferralSection === "my-referrals"} onClick={() => setActiveReferralSection("my-referrals")}>My referral link</button>
        <button type="button" className={activeReferralSection === "leaderboards" ? "active" : ""} aria-pressed={activeReferralSection === "leaderboards"} onClick={() => setActiveReferralSection("leaderboards")}>Leaderboards & points</button>
      </nav>
      {activeReferralSection === "my-referrals" && <>
      <div className="referral-overview-grid">
        <article className="referral-stat-card">
          <span className="referral-stat-icon"><Users size={19} /></span>
          <span>Your verified referrals</span>
          <strong>{personalStats ? personalStats.verifiedReferrals : walletEntry ? walletEntry.referrals : "Connect once to load"}</strong>
          <small>{personalStats ? `${personalStats.pendingReferrals} pending · ${personalStats.flaggedReferrals} flagged` : "Generate your referral link to load private stats"}</small>
        </article>
        <article className="referral-stat-card">
          <span className="referral-stat-icon"><Medal size={19} /></span>
          <span>Your leaderboard rank</span>
          <strong>{walletEntry ? `#${walletEntry.rank}` : address ? "Not ranked yet" : "Connect once to load"}</strong>
          <small>{"Your all-time rank by earned activity points"}</small>
        </article>
        <article className="referral-stat-card">
          <span className="referral-stat-icon"><Gift size={19} /></span>
          <span>Referral points earned</span>
          <strong>{personalStats ? personalStats.referralPoints.toLocaleString() : "Connect to load"}</strong>
          <small>5 points are awarded for each verified referral. {personalStats ? `${personalStats.pendingReferrals} pending · ${personalStats.flaggedReferrals} flagged` : "Connect your wallet to load your personal referral totals."}</small>
        </article>
      </div>

      <section className="referral-link-card">
        <div className="referral-link-heading">
          <div className="referral-link-icon"><Link2 size={21} /></div>
          <div>
            <h2>Your referral link</h2>
            <p>Your unique referral link is prepared automatically when your wallet connects. No transaction or separate signature is needed to create it.</p>
          </div>
        </div>
        <div className="referral-link-field">
          <span>{referralLink || (address ? `${address.slice(0, 8)}…${address.slice(-6)} · Generate your unique link` : "Connect your wallet to get started")}</span>
          {referralLink ? (
            <button className="referral-copy-button" type="button" onClick={() => { void copyReferralLink(); }} aria-label="Copy referral link">
              <Copy size={16} /><span>{copyMessage === "Referral link copied." ? "Copied" : "Copy link"}</span>
            </button>
          ) : (
            <span className="referral-link-status" role="status">
              {!address ? "Connect your wallet to create your unique link" : "Your unique link will appear here once wallet verification completes"}
            </span>
          )}
        </div>
        {copyMessage && <p className="referral-message" role="status">{copyMessage}</p>}
        {referralCode && (
          <div className="referral-link-field">
            <span>Referral code detected: {referralCode}</span>
            <button className="referral-copy-button" type="button" onClick={onAttributeReferral} disabled={!address || actionLoading}>
              <Link2 size={16} /><span>{actionLoading ? "Working…" : "Register referral"}</span>
            </button>
          </div>
        )}
        {message && <p className="referral-message" role="status">{message}</p>}
      </section>

      </>}
      {activeReferralSection === "leaderboards" && <>
      <section className="referral-leaderboard-card">
        <div className="referral-table-heading">
          <div><span className="eyebrow">COMMUNITY RANKINGS</span><h2>Leaderboard</h2></div>
          <span className="network-label">All time</span>
        </div>
        <div className="referral-view-tabs" role="tablist" aria-label="Leaderboard view">
          <button type="button" role="tab" aria-selected={activeLeaderboard === "referral"} className={activeLeaderboard === "referral" ? "active" : ""} onClick={() => setActiveLeaderboard("referral")}>Referral</button>
          <button type="button" role="tab" aria-selected={activeLeaderboard === "points"} className={activeLeaderboard === "points" ? "active" : ""} onClick={() => setActiveLeaderboard("points")}>Points</button>
          <button type="button" role="tab" aria-selected={activeLeaderboard === "total"} className={activeLeaderboard === "total" ? "active" : ""} onClick={() => setActiveLeaderboard("total")}>Total</button>
        </div>
        <label className="leaderboard-search">
          <Search size={17} aria-hidden="true" />
          <span className="leaderboard-search-label">Find a wallet</span>
          <input
            type="search"
            value={walletSearch}
            onChange={(event) => setWalletSearch(event.target.value)}
            placeholder="Type the first 4 characters of a wallet address"
            aria-label="Search leaderboard by wallet address"
            autoComplete="off"
            spellCheck={false}
          />
          {walletSearch && <button type="button" className="leaderboard-search-clear" onClick={() => setWalletSearch("")} aria-label="Clear wallet search">Clear</button>}
        </label>
        <p className="leaderboard-search-hint">Search wallets in the selected leaderboard. Scroll within the list to browse more entries.</p>
        {leaderboardLoading ? (
          <div className="referral-table-empty" role="status"><Trophy size={30} /><h3>Loading leaderboard</h3><p>Retrieving verified activity and points.</p></div>
        ) : leaderboardError ? (
          <div className="referral-table-empty" role="alert"><Trophy size={30} /><h3>Leaderboard unavailable</h3><p>{leaderboardError}</p><button className="text-action" type="button" onClick={onRetryLeaderboard}>Retry</button></div>
        ) : (
          <div className="referral-table-wrap">
            {activeLeaderboard === "referral" ? (
              filteredReferrals.length === 0 ? <div className="referral-table-empty"><Users size={30} /><h3>{searchTerm ? "No matching wallet" : "No qualified referrals yet"}</h3><p>{searchTerm ? "Try another wallet prefix or clear your search." : "Qualified referrers will appear here after an invited wallet completes a qualifying prediction."}</p></div> :
              <table className="referral-table"><thead><tr><th>Rank</th><th>Wallet address</th><th>Total referrals</th><th>Points earned</th></tr></thead><tbody>
                {filteredReferrals.map((entry) => <tr key={entry.wallet}><td>#{entry.rank}</td><td>{entry.wallet.slice(0, 8)}…{entry.wallet.slice(-6)}{entry.wallet.toLowerCase() === address?.toLowerCase() ? " (You)" : ""}</td><td>{entry.referrals}</td><td>{entry.referralPoints}</td></tr>)}
              </tbody></table>
            ) : activeLeaderboard === "points" ? (
              filteredPoints.length === 0 ? <div className="referral-table-empty"><Medal size={30} /><h3>{searchTerm ? "No matching wallet" : "No points earned yet"}</h3><p>{searchTerm ? "Try another wallet prefix or clear your search." : "Wallets appear here after recorded proposals or qualifying trades earn points."}</p></div> :
              <table className="referral-table"><thead><tr><th>Rank</th><th>Wallet address</th><th>Points</th></tr></thead><tbody>
                {filteredPoints.map((entry) => <tr key={entry.wallet}><td>#{entry.rank}</td><td>{entry.wallet.slice(0, 8)}…{entry.wallet.slice(-6)}{entry.wallet.toLowerCase() === address?.toLowerCase() ? " (You)" : ""}</td><td>{entry.points}</td></tr>)}
              </tbody></table>
            ) : (
              filteredTotals.length === 0 ? <div className="referral-table-empty"><Trophy size={30} /><h3>{searchTerm ? "No matching wallet" : "No leaderboard activity yet"}</h3><p>{searchTerm ? "Try another wallet prefix or clear your search." : "Combined totals will appear once wallets earn points or qualify referrals."}</p></div> :
              <table className="referral-table"><thead><tr><th>Rank</th><th>Wallet address</th><th>Referrals</th><th>Referral points</th><th>Activity points</th><th>Total points</th></tr></thead><tbody>
                {filteredTotals.map((entry) => <tr key={entry.wallet}><td>#{entry.rank}</td><td>{entry.wallet.slice(0, 8)}…{entry.wallet.slice(-6)}{entry.wallet.toLowerCase() === address?.toLowerCase() ? " (You)" : ""}</td><td>{entry.referrals}</td><td>{entry.referralPoints}</td><td>{entry.activityPoints}</td><td><strong>{entry.totalPoints}</strong></td></tr>)}
              </tbody></table>
            )}
          </div>
        )}
        <div className="referral-table-footer"><ShieldCheck size={16} />Referral counts include qualified referrals only. Points come from backend-verified proposals, on-chain participation, and qualified referrals.</div>
      </section>
      <section className="referral-rules-card">
        <div className="referral-rules-heading"><CheckCircle2 size={21} /><h2>Points schedule</h2></div>
        <div className="referral-rule">
          <span>50</span>
          <div><strong>Propose a market</strong><p>Earn 50 points when a market proposal is successfully submitted and recorded.</p></div>
        </div>
        <div className="referral-rule">
          <span>10</span>
          <div><strong>Participate in a market</strong><p>Earn 10 points for qualifying market participation confirmed by an on-chain trade.</p></div>
        </div>
        <div className="referral-rule">
          <span>05</span>
          <div><strong>Refer a participant</strong><p>5 points per referral.</p></div>
        </div>
        <div className="referral-rules-heading"><CheckCircle2 size={21} /><h2>When a referral counts</h2></div>
        <div className="referral-rule">
          <span>01</span>
          <div><strong>The invited wallet connects</strong><p>A referral link may attribute the visit, but a wallet connection alone does not qualify the referral.</p></div>
        </div>
        <div className="referral-rule">
          <span>02</span>
          <div><strong>The invited wallet makes its first qualifying prediction</strong><p>The referral is registered only after the first qualifying prediction is confirmed. Link clicks and wallet connections alone do not count.</p></div>
        </div>
        <div className="referral-rule">
          <span>03</span>
          <div><strong>Anti-abuse checks pass</strong><p>The system rejects self-referrals and flags suspicious repeated activity. IP signals may support abuse detection, but shared networks alone should not automatically disqualify users.</p></div>
        </div>
      </section>

      </>}
      <p className="market-disclaimer">
        Referral qualification is verified by the backend. Points are separate from token payouts; no cash or token payout is implied by a points balance.
      </p>
    </section>
  );
}
