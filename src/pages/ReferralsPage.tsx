import {
  CheckCircle2,
  Copy,
  Gift,
  Link2,
  Medal,
  ShieldCheck,
  Trophy,
  Users,
} from "lucide-react";

type ReferralLeaderboardEntry = {
  rank: number;
  wallet: string;
  verifiedReferrals: number;
};

type PointsLeaderboardEntry = { rank: number; wallet: string; points: number };

type ReferralsPageProps = {
  address?: string;
  personalStats: { verifiedReferrals: number; pendingReferrals: number; flaggedReferrals: number; leaderboardRank: number | null; rewardsEarned: number | null; rewardsAvailable: boolean } | null;
  message: string;
  referralLink: string;
  referralCode: string;
  leaderboard: ReferralLeaderboardEntry[];
  pointsLeaderboard: PointsLeaderboardEntry[];
  pointsLeaderboardLoading: boolean;
  pointsLeaderboardError: string;
  onRetryPointsLeaderboard: () => void;
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
  pointsLeaderboardLoading,
  pointsLeaderboardError,
  onRetryPointsLeaderboard,
  leaderboardLoading,
  leaderboardError,
  actionLoading,
  onGetReferralLink,
  onAttributeReferral,
  onRetryLeaderboard,
}: ReferralsPageProps) {
  const walletEntry = leaderboard.find(
    (entry) => entry.wallet.toLowerCase() === address?.toLowerCase(),
  );
  return (
    <section className="page-section referral-page">
      <div className="section-heading">
        <div>
          <span className="eyebrow">COMMUNITY REWARDS</span>
          <h1>Referral leaderboard</h1>
          <p>Invite people to Asset Oracle. Only qualifying referrals count.</p>
        </div>
        <div className="referral-heading-icon"><Trophy size={28} /></div>
      </div>

      <div className="referral-overview-grid">
        <article className="referral-stat-card">
          <span className="referral-stat-icon"><Users size={19} /></span>
          <span>Your verified referrals</span>
          <strong>{personalStats ? personalStats.verifiedReferrals : walletEntry ? walletEntry.verifiedReferrals : "Connect once to load"}</strong>
          <small>{personalStats ? `${personalStats.pendingReferrals} pending · ${personalStats.flaggedReferrals} flagged` : "Generate your referral link to load private stats"}</small>
        </article>
        <article className="referral-stat-card">
          <span className="referral-stat-icon"><Medal size={19} /></span>
          <span>Your leaderboard rank</span>
          <strong>{personalStats ? (personalStats.leaderboardRank ? `#${personalStats.leaderboardRank}` : "Not ranked yet") : walletEntry ? `#${walletEntry.rank}` : "Connect once to load"}</strong>
          <small>{personalStats ? "Your all-time rank across all qualifying referrers" : "Generate your referral link to load private stats"}</small>
        </article>
        <article className="referral-stat-card">
          <span className="referral-stat-icon"><Gift size={19} /></span>
          <span>Rewards earned</span>
          <strong>{personalStats?.rewardsAvailable && personalStats.rewardsEarned !== null ? personalStats.rewardsEarned : "Not active yet"}</strong>
          <small>Verified referrals are tracked, but reward amounts and payouts are not enabled.</small>
        </article>
      </div>

      <section className="referral-link-card">
        <div className="referral-link-heading">
          <div className="referral-link-icon"><Link2 size={21} /></div>
          <div>
            <h2>Your referral link</h2>
            <p>Connect your wallet to request your unique referral link. New visitors can register attribution after connecting their wallet.</p>
          </div>
        </div>
        <div className="referral-link-field">
          <span>{referralLink || (address ? `${address.slice(0, 8)}…${address.slice(-6)} · Generate your unique link` : "Connect your wallet to get started")}</span>
          {referralLink ? (
            <button className="referral-copy-button" type="button" onClick={() => { void navigator.clipboard.writeText(referralLink); }} aria-label="Copy referral link">
              <Copy size={16} /><span>Copy link</span>
            </button>
          ) : (
            <button className="referral-copy-button" type="button" onClick={onGetReferralLink} disabled={!address || actionLoading} aria-label="Get referral link">
              <Copy size={16} /><span>{actionLoading ? "Working…" : "Get link"}</span>
            </button>
          )}
        </div>
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

      <section className="referral-leaderboard-card">
        <div className="referral-table-heading">
          <div><span className="eyebrow">COMMUNITY RANKINGS</span><h2>Top referrers</h2></div>
          <span className="network-label">All time</span>
        </div>
        {leaderboardLoading ? (
          <div className="referral-table-empty" role="status">
            <Trophy size={30} /><h3>Loading leaderboard</h3><p>Retrieving verified referral records.</p>
          </div>
        ) : leaderboardError ? (
          <div className="referral-table-empty" role="alert">
            <Trophy size={30} /><h3>Leaderboard unavailable</h3><p>{leaderboardError}</p>
            <button className="text-action" type="button" onClick={onRetryLeaderboard}>Retry</button>
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="referral-table-empty">
            <Trophy size={30} /><h3>No qualifying referrals yet</h3><p>Rankings appear after verified referral records qualify.</p>
          </div>
        ) : (
          <div className="referral-table-wrap">
            <table className="referral-table">
              <thead><tr><th>Rank</th><th>Wallet</th><th>Verified referrals</th></tr></thead>
              <tbody>
                {leaderboard.map((entry) => (
                  <tr key={entry.wallet}>
                    <td>#{entry.rank}</td>
                    <td>{entry.wallet.slice(0, 8)}…{entry.wallet.slice(-6)}{entry.wallet.toLowerCase() === address?.toLowerCase() ? " (You)" : ""}</td>
                    <td>{entry.verifiedReferrals}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="referral-table-footer"><ShieldCheck size={16} />Only verified referral records count toward rankings.</div>
      </section>

      <section className="referral-leaderboard-card">
        <div className="referral-table-heading">
          <div><span className="eyebrow">POINTS RANKINGS</span><h2>Community points leaderboard</h2></div>
          <span className="network-label">All time</span>
        </div>
        <p className="market-disclaimer">Points are non-monetary. 10 points for first qualifying participation per wallet/market and 5 points for each qualified referral. Paid-submission points are not active yet.</p>
        {pointsLeaderboardLoading ? (
          <div className="referral-table-empty" role="status"><Trophy size={30} /><h3>Loading points</h3><p>Retrieving eligible points events.</p></div>
        ) : pointsLeaderboardError ? (
          <div className="referral-table-empty" role="alert"><Trophy size={30} /><h3>Points leaderboard unavailable</h3><p>{pointsLeaderboardError}</p><button className="text-action" type="button" onClick={onRetryPointsLeaderboard}>Retry</button></div>
        ) : pointsLeaderboard.length === 0 ? (
          <div className="referral-table-empty"><Trophy size={30} /><h3>No points recorded yet</h3><p>Rankings appear after qualifying activity is recorded.</p></div>
        ) : (
          <div className="referral-table-wrap"><table className="referral-table">
            <thead><tr><th>Rank</th><th>Wallet</th><th>Points</th></tr></thead>
            <tbody>{pointsLeaderboard.map((entry) => <tr key={entry.wallet}><td>#{entry.rank}</td><td>{entry.wallet.slice(0, 8)}…{entry.wallet.slice(-6)}{entry.wallet.toLowerCase() === address?.toLowerCase() ? " (You)" : ""}</td><td>{entry.points}</td></tr>)}</tbody>
          </table></div>
        )}
        <div className="referral-table-footer"><ShieldCheck size={16} />Only eligible, idempotently recorded points count.</div>
      </section>

      <section className="referral-rules-card">
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

      <p className="market-disclaimer">
        Only backend-verified qualifying referrals appear above. The leaderboard currently ranks verified referrals; reward amounts and payouts have not been enabled, so no reward total is being calculated.
      </p>
    </section>
  );
}
