import { CheckCircle2, Copy, Gift, Link2, Medal, ShieldCheck, Trophy, Users } from "lucide-react";
import type { ReferralLeaderboardEntry } from "../markets/marketApi";

type Props = {
  address?: string;
  message: string;
  referralLink: string;
  referralCodeFromUrl: string;
  leaderboard: ReferralLeaderboardEntry[];
  leaderboardLoading: boolean;
  onGetReferralLink: () => void;
  onConfirmReferral: () => void;
};

export default function ReferralsPage({
  address, message, referralLink, referralCodeFromUrl, leaderboard,
  leaderboardLoading, onGetReferralLink, onConfirmReferral,
}: Props) {
  const me = leaderboard.find((entry) => entry.wallet.toLowerCase() === address?.toLowerCase());
  return (
    <section className="page-section referral-page">
      <div className="section-heading">
        <div><span className="eyebrow">COMMUNITY REWARDS</span><h1>Referral leaderboard</h1><p>Only verified qualifying referrals count.</p></div>
        <div className="referral-heading-icon"><Trophy size={28} /></div>
      </div>
      <div className="referral-overview-grid">
        <article className="referral-stat-card"><span className="referral-stat-icon"><Users size={19} /></span><span>Your verified referrals</span><strong>{me?.verifiedReferrals ?? "—"}</strong><small>First predictions verified</small></article>
        <article className="referral-stat-card"><span className="referral-stat-icon"><Medal size={19} /></span><span>Your leaderboard rank</span><strong>{me?.rank ?? "—"}</strong><small>All-time ranking</small></article>
        <article className="referral-stat-card"><span className="referral-stat-icon"><Gift size={19} /></span><span>Rewards earned</span><strong>—</strong><small>Reward policy not configured</small></article>
      </div>
      <section className="referral-link-card">
        <div className="referral-link-heading"><div className="referral-link-icon"><Link2 size={21} /></div><div><h2>Your referral link</h2><p>Connect your wallet to generate your unique link.</p></div></div>
        <div className="referral-link-field">
          <span>{referralLink || (address ? address.slice(0, 8) + "…" + address.slice(-6) + " · Generate your link" : "Connect your wallet to get started")}</span>
          <button className="referral-copy-button" type="button" onClick={onGetReferralLink} disabled={!address}><Copy size={16} /><span>{referralLink ? "Copy again" : "Get link"}</span></button>
        </div>
        {message && <p className="referral-message" role="status">{message}</p>}
      </section>
      {referralCodeFromUrl && <section className="referral-link-card"><h2>You arrived through a referral link</h2><p>Confirm pending attribution. It counts only after your first qualifying prediction is verified.</p><button className="primary-button" type="button" onClick={onConfirmReferral} disabled={!address}>Confirm referral</button></section>}
      <section className="referral-leaderboard-card">
        <div className="referral-table-heading"><div><span className="eyebrow">COMMUNITY RANKINGS</span><h2>Top referrers</h2></div><span className="network-label">All time</span></div>
        {leaderboardLoading ? <div className="referral-table-empty" role="status"><p>Loading verified leaderboard…</p></div> : leaderboard.length === 0 ? <div className="referral-table-empty"><Trophy size={30} /><h3>No qualified referrals yet</h3><p>Only confirmed first predictions count.</p></div> : <div className="referral-table-list">{leaderboard.map((entry) => <div className="referral-rule" key={entry.wallet}><span>#{entry.rank}</span><div><strong>{entry.wallet.slice(0, 8)}…{entry.wallet.slice(-6)}</strong><p>{entry.verifiedReferrals} verified referrals</p></div></div>)}</div>}
        <div className="referral-table-footer"><ShieldCheck size={16} />Only verified records count toward rankings.</div>
      </section>
      <section className="referral-rules-card">
        <div className="referral-rules-heading"><CheckCircle2 size={21} /><h2>When a referral counts</h2></div>
        <div className="referral-rule"><span>01</span><div><strong>The invited wallet connects</strong><p>A wallet connection alone does not qualify the referral.</p></div></div>
        <div className="referral-rule"><span>02</span><div><strong>The invited wallet makes its first prediction</strong><p>The backend verifies the successful on-chain stake before qualifying the referral.</p></div></div>
        <div className="referral-rule"><span>03</span><div><strong>Self-referral and abuse checks pass</strong><p>Self-referrals are rejected. Shared IPs can trigger review but are not proof of abuse by themselves.</p></div></div>
      </section>
      <p className="market-disclaimer">Referral data requires the backend service to be deployed and configured. Rewards remain unavailable until a reward policy is approved.</p>
    </section>
  );
}
