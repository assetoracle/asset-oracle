import {
  CircleAlert,
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
  const periods = ["Weekly", "Monthly", "All time"] as const;

  return (
    <section className="page-section referral-page">
      <div className="section-heading">
        <div>
          <span className="eyebrow">COMMUNITY REWARDS</span>
          <h1>Referral leaderboard</h1>
          <p>
            Discover community growth and track your referral progress.
          </p>
        </div>
        <div className="referral-heading-icon">
          <Trophy size={28} />
        </div>
      </div>

      <div className="referral-status-banner">
        <CircleAlert size={19} />
        <div>
          <strong>Leaderboard data is not connected yet</strong>
          <p>
            Rankings, referral counts, and rewards will appear after
            referral tracking and eligibility checks are implemented.
          </p>
        </div>
      </div>

      <div className="referral-overview-grid">
        <article className="referral-stat-card">
          <span className="referral-stat-icon">
            <Users size={19} />
          </span>
          <span>Total verified referrals</span>
          <strong>—</strong>
          <small>Awaiting verified data</small>
        </article>

        <article className="referral-stat-card">
          <span className="referral-stat-icon">
            <Medal size={19} />
          </span>
          <span>Your current rank</span>
          <strong>—</strong>
          <small>Connect tracking to view rank</small>
        </article>

        <article className="referral-stat-card">
          <span className="referral-stat-icon">
            <Gift size={19} />
          </span>
          <span>Rewards earned</span>
          <strong>—</strong>
          <small>Reward rules not configured</small>
        </article>
      </div>

      <section className="referral-link-card">
        <div className="referral-link-heading">
          <div className="referral-link-icon">
            <Link2 size={21} />
          </div>
          <div>
            <h2>Your referral link</h2>
            <p>
              Your unique link will be issued after referral services
              are connected.
            </p>
          </div>
        </div>

        <div className="referral-link-field">
          <span>
            {address
              ? `${address.slice(0, 8)}…${address.slice(-6)} · Referral code pending`
              : "Connect your wallet to get started"}
          </span>
          <button
            className="referral-copy-button"
            type="button"
            onClick={onGetReferralLink}
            aria-label="Generate referral link"
          >
            <Copy size={16} />
            <span>Get link</span>
          </button>
        </div>

        {message && (
          <p className="referral-message" role="status">
            {message}
          </p>
        )}
      </section>

      <section className="referral-leaderboard-card">
        <div className="referral-table-heading">
          <div>
            <span className="eyebrow">COMMUNITY RANKINGS</span>
            <h2>Top referrers</h2>
          </div>
          <div
            className="referral-period-tabs"
            aria-label="Leaderboard period"
          >
            {periods.map((period) => (
              <button
                type="button"
                key={period}
                disabled
                title="Leaderboard periods will be enabled when live data is connected"
              >
                {period}
              </button>
            ))}
          </div>
        </div>

        <div className="referral-table-empty">
          <Trophy size={30} />
          <h3>Rankings coming soon</h3>
          <p>
            Verified referral rankings will be displayed here. Only
            eligible referrals will count toward leaderboard positions.
          </p>
        </div>

        <div className="referral-table-footer">
          <ShieldCheck size={16} />
          Rankings will use verified referral records, not
          self-reported counts.
        </div>
      </section>

      <section className="referral-rules-card">
        <div className="referral-rules-heading">
          <CheckCircle2 size={21} />
          <h2>How referral eligibility will work</h2>
        </div>

        <div className="referral-rule">
          <span>01</span>
          <div>
            <strong>Use a valid referral link</strong>
            <p>
              The referral must be attributed to a registered
              referral code.
            </p>
          </div>
        </div>

        <div className="referral-rule">
          <span>02</span>
          <div>
            <strong>Meet eligibility requirements</strong>
            <p>
              The programme will define qualifying activity and
              anti-abuse checks.
            </p>
          </div>
        </div>

        <div className="referral-rule">
          <span>03</span>
          <div>
            <strong>Earn rewards under published rules</strong>
            <p>
              Rewards will only be shown after the reward policy and
              payment mechanism are implemented.
            </p>
          </div>
        </div>
      </section>

      <p className="market-disclaimer">
        No rankings, referral totals, or reward amounts are currently
        claimed. This page is the frontend foundation for the referral
        system; live data requires backend integration.
      </p>
    </section>
  );
}