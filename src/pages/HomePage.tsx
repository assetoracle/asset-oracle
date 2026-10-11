import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  ChartNoAxesCombined,
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

type DashboardStats = {
  totalUsers: number | null;
  tradingVolume24h: string | number | null;
  totalMarkets: number | null;
  totalSettled: number | null;
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

const API_BASE_URL = "https://asset-oracle-backend.onrender.com";

function formatCount(value: number | null | undefined) {
  return value === undefined || value === null ? "—" : value.toLocaleString();
}

function formatVolume(value: string | number | null | undefined) {
  if (value === undefined || value === null || value === "") return "—";
  const amount = Number(value);
  return Number.isFinite(amount)
    ? `$ ${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
    : String(value);
}

function DashboardOverview() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function loadStats() {
      try {
        const response = await fetch(`${API_BASE_URL}/api/stats/dashboard`, {
          signal: controller.signal,
          headers: { Accept: "application/json" },
        });
        if (!response.ok) throw new Error("Dashboard statistics are unavailable.");
        const data = await response.json();
        setStats({
          totalUsers: data.totalUsers !== null && data.totalUsers !== undefined && Number.isFinite(Number(data.totalUsers)) ? Number(data.totalUsers) : null,
          tradingVolume24h: data.tradingVolume24h ?? null,
          totalMarkets: data.totalMarkets !== null && data.totalMarkets !== undefined && Number.isFinite(Number(data.totalMarkets)) ? Number(data.totalMarkets) : null,
          totalSettled: data.totalSettled !== null && data.totalSettled !== undefined && Number.isFinite(Number(data.totalSettled)) ? Number(data.totalSettled) : null,
        });
      } catch (error) {
        if (!controller.signal.aborted) setUnavailable(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadStats();
    return () => controller.abort();
  }, []);

  const items = [
    { label: "Total Users", value: stats ? formatCount(stats.totalUsers) : "—", icon: Users },
    { label: "24hrs Trading Volume", value: stats ? formatVolume(stats.tradingVolume24h) : "—", icon: ChartNoAxesCombined },
    { label: "Total Market", value: stats ? formatCount(stats.totalMarkets) : "—", icon: ShieldCheck },
    { label: "Total Settled", value: stats ? formatCount(stats.totalSettled) : "—", icon: ShieldCheck },
  ];

  return (
    <section className="dashboard-overview" aria-labelledby="dashboard-overview-title">
      <div className="section-heading dashboard-overview-heading">
        <div>
          <span className="eyebrow">ASSET ORACLE AT A GLANCE</span>
          <h2 id="dashboard-overview-title">Dashboard statistics</h2>
        </div>
        {loading && <span className="network-label" role="status">Updating…</span>}
      </div>
      <div className="dashboard-stats-grid">
        {items.map(({ label, value, icon: Icon, description }) => (
          <article className={`dashboard-stat-card${description ? " dashboard-stat-card-wide" : ""}`} key={label}>
            <span className="dashboard-stat-icon"><Icon size={19} aria-hidden="true" /></span>
            <span className="dashboard-stat-label">{label}</span>
            <strong>{value}</strong>
            {description && <p className="dashboard-stat-description">{description}</p>}
          </article>
        ))}
      </div>
      {unavailable && (
        <p className="dashboard-stats-note" role="status">
          Live statistics are temporarily unavailable. Values are not estimated or replaced with sample data.
        </p>
      )}
    </section>
  );
}

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
        <button className="primary-button" type="button" onClick={onRetryMarkets}>
          Try again
        </button>
      </div>
    );
  }

  function renderEmptyState() {
    return (
      <div className="empty-state">
        <h3>No published markets yet</h3>
        <p>Approved markets will appear here after an administrator publishes them. Check back later.</p>
      </div>
    );
  }

  return (
    <>
      <section className="hero">
        <span className="eyebrow">PREDICT <span>·</span> VERIFY <span>·</span> BUILD</span>
        <h1>Real-world truth.<br /><span>On-chain.</span></h1>
        <p className="hero-description">Explore real-world questions, understand how outcomes are verified, and follow transparent settlement.</p>
        <div className="hero-actions">
          <button className="primary-button" type="button" onClick={onExploreMarkets}>Explore markets <ArrowUpRight size={16} /></button>
          <span className="network-label"><span className="network-dot" />Asset Chain · Testnet development</span>
        </div>
        <div className="hero-footnote">Verification-first prediction infrastructure</div>
      </section>

      <DashboardOverview />

      <section className="principles" aria-label="How it works">
        <article className="principle"><span className="principle-number">01</span><h2>Find a market</h2><p>Explore a question and its resolution rules.</p></article>
        <article className="principle"><span className="principle-number">02</span><h2>Understand the rules</h2><p>Know how the outcome will be established.</p></article>
        <article className="principle"><span className="principle-number">03</span><h2>Verify the result</h2><p>Trace the evidence behind the final outcome.</p></article>
      </section>

      <section className="markets-section">
        <div className="section-heading">
          <div><span className="eyebrow">DISCOVER</span><h2>Published markets</h2><p>Explore markets approved for publication.</p></div>
          <button className="text-action" type="button" onClick={onExploreMarkets}>All markets <ArrowUpRight size={15} /></button>
        </div>
        {marketsLoading ? renderLoading() : marketsError ? renderError() : markets.length === 0 ? renderEmptyState() : (
          <div className="market-grid">
            {markets.slice(0, 3).map((market) => (
              <div key={market.id}>
                {renderMarketCard(market)}
                <button className="text-action" type="button" onClick={() => onOpenMarket(market)}>View details <ArrowUpRight size={15} /></button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="verification-banner">
        <div>
          <span className="eyebrow">BUILT AROUND EVIDENCE</span>
          <h2>Every outcome needs a reason.</h2>
          <p>Defined rules, authoritative data sources, and traceable evidence will underpin market resolution.</p>
          <button className="text-action" type="button" onClick={onExploreMarkets}>Explore markets <ArrowUpRight size={15} /></button>
        </div>
        <ShieldCheck className="verification-icon" size={42} aria-hidden="true" />
      </section>

      <section className="referral-promo">
        <div className="referral-promo-icon"><Users size={24} /></div>
        <div className="referral-promo-copy">
          <span className="eyebrow">GROW THE COMMUNITY</span>
          <h2>Bring others into the Oracle.</h2>
          <p>A referral only becomes eligible after the invited wallet makes its first qualifying prediction. Self-referrals and suspicious duplicate activity are excluded.</p>
        </div>
        <button className="primary-button" type="button" onClick={onOpenReferrals}>Referral leaderboard <ArrowUpRight size={16} /></button>
      </section>
    </>
  );
}
