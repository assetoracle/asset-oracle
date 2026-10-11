import {
  ArrowUpRight,
  ShieldCheck,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";

export type DisplayResolutionRule = {
  sourceId: string;
  metric: string;
  comparison: "ABOVE" | "BELOW" | "EQUALS";
  targetValue: number;
  currency?: string;
  observationTime: string;
  description: string;
};

export type DisplayMarket = {
  id: string;
  question: string;
  description: string;
  category: "Crypto" | "Sports" | "Economics" | "RWA" | "Regional";
  closesAt: string;
  resolvesAt: string;
  status: string;
  symbol: string;
  label: string;
  endDate: string;
  resolutionRule?: DisplayResolutionRule;
};

type HomePageProps = {
  markets: DisplayMarket[];
  marketsLoading: boolean;
  marketsError: string;
  onExploreMarkets: () => void;
  onOpenMarket: (market: DisplayMarket) => void;
  onRetryMarkets: () => void;
  onOpenReferrals: () => void;
  renderMarketCard: (market: DisplayMarket) => ReactNode;
};

export default function HomePage({
  markets,
  marketsLoading,
  marketsError,
  onExploreMarkets,
  onOpenMarket,
  onRetryMarkets,
  onOpenReferrals,
  renderMarketCard,
}: HomePageProps) {
  function renderLoading() {
    return (
      <div className="empty-state" role="status">
        <h3>Loading published markets</h3>
        <p>Retrieving approved markets from Asset Oracle.</p>
      </div>
    );
  }

  function renderError() {
    return (
      <div className="empty-state" role="alert">
        <h3>Unable to load markets</h3>
        <p>{marketsError}</p>
        <button
          className="primary-button"
          type="button"
          onClick={onRetryMarkets}
        >
          Try again
        </button>
      </div>
    );
  }

  function renderEmptyState() {
    return (
      <div className="empty-state">
        <h3>No published markets yet</h3>
        <p>
          Approved markets will appear here after an administrator
          publishes them. Check back later.
        </p>
      </div>
    );
  }

  return (
    <>
      <section className="hero">
        <span className="eyebrow">
          PREDICT <span>·</span> VERIFY <span>·</span> BUILD
        </span>
        <h1>
          Real-world truth.
          <br />
          <span>On-chain.</span>
        </h1>
        <p className="hero-description">
          Explore real-world questions, understand how outcomes are
          verified, and follow transparent settlement.
        </p>
        <div className="hero-actions">
          <button
            className="primary-button"
            type="button"
            onClick={onExploreMarkets}
          >
            Explore markets <ArrowUpRight size={16} />
          </button>
          <span className="network-label">
            <span className="network-dot" />
            Asset Chain · Testnet development
          </span>
        </div>
        <div className="hero-footnote">
          Verification-first prediction infrastructure
        </div>
      </section>

      <section className="principles" aria-label="How it works">
        <article className="principle">
          <span className="principle-number">01</span>
          <h2>Find a market</h2>
          <p>Explore a question and its resolution rules.</p>
        </article>
        <article className="principle">
          <span className="principle-number">02</span>
          <h2>Understand the rules</h2>
          <p>Know how the outcome will be established.</p>
        </article>
        <article className="principle">
          <span className="principle-number">03</span>
          <h2>Verify the result</h2>
          <p>Trace the evidence behind the final outcome.</p>
        </article>
      </section>

      <section className="markets-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">DISCOVER</span>
            <h2>Published markets</h2>
            <p>Explore markets approved for publication.</p>
          </div>
          <button
            className="text-action"
            type="button"
            onClick={onExploreMarkets}
          >
            All markets <ArrowUpRight size={15} />
          </button>
        </div>

        {marketsLoading
          ? renderLoading()
          : marketsError
            ? renderError()
            : markets.length === 0
              ? renderEmptyState()
              : (
                  <div className="market-grid">
                    {markets.slice(0, 3).map((market) => (
                      <div key={market.id}>
                        {renderMarketCard({
                          ...market,
                          question: market.question,
                        })}
                        <button
                          className="text-action"
                          type="button"
                          onClick={() => onOpenMarket(market)}
                        >
                          View details <ArrowUpRight size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
      </section>

      <section className="verification-banner">
        <div>
          <span className="eyebrow">BUILT AROUND EVIDENCE</span>
          <h2>Every outcome needs a reason.</h2>
          <p>
            Defined rules, authoritative data sources, and traceable
            evidence will underpin market resolution.
          </p>
          <button
            className="text-action"
            type="button"
            onClick={onExploreMarkets}
          >
            Explore markets <ArrowUpRight size={15} />
          </button>
        </div>
        <ShieldCheck
          className="verification-icon"
          size={42}
          aria-hidden="true"
        />
      </section>

      <section className="referral-promo">
        <div className="referral-promo-icon">
          <Users size={24} />
        </div>
        <div className="referral-promo-copy">
          <span className="eyebrow">GROW THE COMMUNITY</span>
          <h2>Bring others into the Oracle.</h2>
          <p>
            Explore the referral programme interface and leaderboard.
            Referral tracking and rewards will be enabled after backend
            integration.
          </p>
        </div>
        <button
          className="primary-button"
          type="button"
          onClick={onOpenReferrals}
        >
          Referral leaderboard <ArrowUpRight size={16} />
        </button>
      </section>
    </>
  );
}