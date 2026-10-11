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

type ReferralsPageProps = {
  address?: string;
  message: string;
  onGetReferralLink: () => void;
};

export default function ReferralsPage({
  address,
  message,
  onGetReferralLink,
}: ReferralsPageProps) {
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
          <strong>—</strong>
          <small>Live referral records will appear here</small>
        </article>
        <article className="referral-stat-card">
          <span className="referral-stat-icon"><Medal size={19} /></span>
          <span>Your leaderboard rank</span>
          <strong>—</strong>
          <small>Based on qualifying referrals</small>
        </article>
        <article className="referral-stat-card">
          <span className="referral-stat-icon"><Gift size={19} /></span>
          <span>Rewards earned</span>
          <strong>—</strong>
          <small>Shown when reward rules are configured</small>
        </article>
      </div>

      <section className="referral-link-card">
        <div className="referral-link-heading">
          <div className="referral-link-icon"><Link2 size={21} /></div>
          <div>
            <h2>Your referral link</h2>
            <p>Connect your wallet to request your unique referral link.</p>
          </div>
        </div>
        <div className="referral-link-field">
          <span>{address ? `${address.slice(0, 8)}…${address.slice(-6)} · Referral link` : "Connect your wallet to get started"}</span>
          <button className="referral-copy-button" type="button" onClick={onGetReferralLink} disabled={!address} aria-label="Get referral link">
            <Copy size={16} /><span>Get link</span>
          </button>
        </div>
        {message && <p className="referral-message" role="status">{message}</p>}
      </section>

      <section className="referral-leaderboard-card">
        <div className="referral-table-heading">
          <div><span className="eyebrow">COMMUNITY RANKINGS</span><h2>Top referrers</h2></div>
          <span className="network-label">All time</span>
        </div>
        <div className="referral-table-empty">
          <Trophy size={30} />
          <h3>Leaderboard data is being connected</h3>
          <p>The leaderboard will rank wallets by verified qualifying referrals, not link clicks or self-reported totals.</p>
        </div>
        <div className="referral-table-footer"><ShieldCheck size={16} />Only verified referral records count toward rankings.</div>
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
        Referral counts, leaderboard positions, and rewards remain unreported until verified backend records are connected. No sample figures are shown.
      </p>
    </section>
  );
}
