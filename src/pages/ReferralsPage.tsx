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
  points: number;
};

type ReferralsPageProps = {
  address?: string;
  personalStats: { verifiedReferrals: number; pendingReferrals: number; flaggedReferrals: number; leaderboardRank: number | null; rewardsEarned: number | null; rewardsAvailable: boolean } | null;
  message: string;
  referralLink: string;
  referralCode: string;
  leaderboard: ReferralLeaderboardEntry[];
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
          <h1>Points leaderboard</h1>
          <p>Earn points by proposing markets, participating in markets, and referring qualified participants.</p>
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
          <strong>{walletEntry ? `#${walletEntry.rank}` : address ? "Not ranked yet" : "Connect once to load"}</strong>
          <small>{"Your all-time rank by earned activity points"}</small>
        </article>
        <article className="referral-stat-card">
          <span className="referral-stat-icon"><Gift size={19} /></span>
          <span>Referral points</span>
          <strong>5 points per qualifying referral</strong>
          <small>Points are awarded once per verified referral. Market proposal and trading points are shown in the points schedule below.</small>
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
          <div><span className="eyebrow">COMMUNITY RANKINGS</span><h2>Top contributors</h2></div>
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
            <Trophy size={30} /><h3>No points earned yet</h3><p>Rankings appear when a market proposal, verified trade, or qualifying referral earns points.</p>
          </div>
        ) : (
          <div className="referral-table-wrap">
            <table className="referral-table">
              <thead><tr><th>Rank</th><th>Wallet</th><th>Points</th></tr></thead>
              <tbody>
                {leaderboard.map((entry) => (
                  <tr key={entry.wallet}>
                    <td>#{entry.rank}</td>
                    <td>{entry.wallet.slice(0, 8)}…{entry.wallet.slice(-6)}{entry.wallet.toLowerCase() === address?.toLowerCase() ? " (You)" : ""}</td>
                    <td>{entry.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="referral-table-footer"><ShieldCheck size={16} />Only recorded proposals, verified on-chain participation, and qualified referrals count toward points.</div>
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
          <div><strong>Refer a participant</strong><p>Earn 5 points when a referred wallet meets the referral qualification rules.</p></div>
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

      <p className="market-disclaimer">
        Referral qualification is verified by the backend. Points are separate from token payouts; no cash or token payout is implied by a points balance.
      </p>
    </section>
  );
}
