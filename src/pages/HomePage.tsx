import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  ChartNoAxesCombined,
  ShieldCheck,
  Users,
} from "lucide-react";

export type DisplayResolutionRule = {
  sourceId: string;
  metric: string;
  comparison: "ABOVE" | "AT_LEAST" | "BELOW" | "EQUALS";
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
  sport?: "football" | "basketball" | "tennis";
  closesAt: string;
  resolvesAt: string;
  status: string;
  symbol: string;
  label: string;
  endDate: string;
  resolutionRule?: DisplayResolutionRule;
  onchainMarketId?: string | null;
  onchainTxHash?: string | null;
  onchainManagerAddress?: string | null;
  onchainChainId?: number | null;
  participantCount?: number | null;
  totalStaked?: string | null;
};

type DashboardStats = {
  totalUsers: number | null;
  tradingVolume24h: string | number | null;
  totalMarkets: number | null;
  totalSettled: number | null;
  totalTradingVolume: string | number | null;
};

type HomePageProps = {
  markets: DisplayMarket[];
  marketsLoading: boolean;
  marketsError: string;
  onExploreMarkets: () => void;
  onOpenMarket: (market: DisplayMarket) => void;
  onOpenReferrals: () => void;
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
          totalTradingVolume: data.totalTradingVolume ?? null,
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
    { label: "Total Trading Volume", value: stats ? formatVolume(stats.totalTradingVolume) : "—", icon: ChartNoAxesCombined },
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
        {items.map(({ label, value, icon: Icon }) => (
          <article className="dashboard-stat-card" key={label}>
            <span className="dashboard-stat-icon"><Icon size={19} aria-hidden="true" /></span>
            <span className="dashboard-stat-label">{label}</span>
            <strong>{value}</strong>
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

function MarketSpotlight({ markets, onOpenMarket }: { markets: DisplayMarket[]; onOpenMarket: (market: DisplayMarket) => void }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const activeMarket = markets[activeIndex % markets.length];

  useEffect(() => {
    setActiveIndex((current) => current % Math.max(markets.length, 1));
  }, [markets.length]);

  useEffect(() => {
    if (paused || markets.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setActiveIndex((current) => (current + 1) % markets.length), 6500);
    return () => window.clearInterval(timer);
  }, [markets.length, paused]);

  if (!activeMarket) return null;

  return (
    <div className="market-spotlight" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocusCapture={() => setPaused(true)} onBlurCapture={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPaused(false);
    }}>
      <button className="market-spotlight-card" type="button" onClick={() => onOpenMarket(activeMarket)} aria-label={`Open featured market: ${activeMarket.question}`}>
        <span className="market-spotlight-orbit market-spotlight-orbit-one" aria-hidden="true" />
        <span className="market-spotlight-orbit market-spotlight-orbit-two" aria-hidden="true" />
        <span className="market-spotlight-topline"><span className="market-spotlight-live-dot" /> LIVE NOW <span className="market-spotlight-divider">/</span> {activeMarket.category}</span>
        <span className="market-spotlight-kicker">THE QUESTION</span>
        <strong className="market-spotlight-question">{activeMarket.question}</strong>
        <span className="market-spotlight-description">{activeMarket.description || "Review the market's resolution criteria before making your prediction."}</span>
        <span className="market-spotlight-bottom"><span>Review market &amp; predict</span><span className="market-spotlight-arrow"><ArrowUpRight size={19} /></span></span>
      </button>
      <div className="market-spotlight-controls" aria-label="Choose featured market">
        <span className="market-spotlight-count">{String(activeIndex + 1).padStart(2, "0")} <span>/</span> {String(markets.length).padStart(2, "0")}</span>
        <div className="market-spotlight-dots">
          {markets.map((market, index) => (
            <button key={market.id} type="button" className={index === activeIndex ? "market-spotlight-dot is-active" : "market-spotlight-dot"} aria-label={`Show featured market ${index + 1}: ${market.question}`} aria-pressed={index === activeIndex} onClick={() => setActiveIndex(index)} />
          ))}
        </div>
        <span className="market-spotlight-hint">Auto-rotates · pause by hovering</span>
      </div>
    </div>
  );
}

export default function HomePage({
  markets,
  marketsLoading,
  marketsError,
  onExploreMarkets,
  onOpenMarket,
  onOpenReferrals,
}: HomePageProps) {
  const motionPhrases = ["make evidence traceable.", "bring clarity to outcomes.", "connect real-world data.", "put verification first."];
  const [motionPhraseIndex, setMotionPhraseIndex] = useState(0);
  const motionPhrase = motionPhrases[motionPhraseIndex];
  const heroTitleFirst = "Real-world truth.";
  const heroTitleSecond = "On-chain.";
  const heroDescriptionText = "Explore real-world questions, understand how outcomes are verified, and follow transparent settlement.";
  const typewriterText = heroTitleFirst + heroTitleSecond + heroDescriptionText;
  const [typedCharacters, setTypedCharacters] = useState(0);

  useEffect(() => {
    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let typingTimer: number | undefined;
    let restartTimer: number | undefined;
    let cancelled = false;

    const stopTimers = () => {
      if (typingTimer !== undefined) window.clearInterval(typingTimer);
      if (restartTimer !== undefined) window.clearTimeout(restartTimer);
      typingTimer = undefined;
      restartTimer = undefined;
    };

    const typeCycle = () => {
      if (cancelled) return;
      stopTimers();
      if (motionPreference.matches) {
        setTypedCharacters(typewriterText.length);
        return;
      }

      setTypedCharacters(0);
      let cursor = 0;
      typingTimer = window.setInterval(() => {
        cursor += 1;
        setTypedCharacters(cursor);
        if (cursor >= typewriterText.length) {
          if (typingTimer !== undefined) window.clearInterval(typingTimer);
          typingTimer = undefined;
          restartTimer = window.setTimeout(typeCycle, 30000);
        }
      }, 42);
    };

    const handleMotionPreference = () => {
      if (motionPreference.matches) {
        stopTimers();
        setTypedCharacters(typewriterText.length);
      } else {
        typeCycle();
      }
    };

    typeCycle();
    motionPreference.addEventListener("change", handleMotionPreference);
    return () => {
      cancelled = true;
      stopTimers();
      motionPreference.removeEventListener("change", handleMotionPreference);
    };
  }, [typewriterText.length]);

  useEffect(() => {
    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let timer: number | undefined;

    const syncMotionPreference = () => {
      if (timer !== undefined) {
        window.clearInterval(timer);
        timer = undefined;
      }
      if (!motionPreference.matches) {
        timer = window.setInterval(() => {
          setMotionPhraseIndex((current) => (current + 1) % motionPhrases.length);
        }, 9000);
      }
    };

    syncMotionPreference();
    motionPreference.addEventListener("change", syncMotionPreference);
    return () => {
      if (timer !== undefined) window.clearInterval(timer);
      motionPreference.removeEventListener("change", syncMotionPreference);
    };
  }, []);

  return (
    <>
      <section className="hero">
        <div className="hero-layout">
          <div className="hero-copy">
          <span className="eyebrow">PREDICT <span>·</span> VERIFY <span>·</span> BUILD</span>
          <h1 className="hero-typewriter" aria-label="Real-world truth. On-chain."><span className="hero-typewriter-primary">{typewriterText.slice(0, Math.min(typedCharacters, heroTitleFirst.length))}</span>{typedCharacters > heroTitleFirst.length && <><br /><span>{typewriterText.slice(heroTitleFirst.length, Math.min(typedCharacters, heroTitleFirst.length + heroTitleSecond.length))}</span></>}</h1>
          <p className="hero-description hero-typewriter-description">{typewriterText.slice(heroTitleFirst.length + heroTitleSecond.length, Math.max(heroTitleFirst.length + heroTitleSecond.length, typedCharacters))}</p>
          <div className="hero-trust-chips" aria-label="Platform principles">
            <span><i aria-hidden="true" /> Clear resolution rules</span>
            <span><i aria-hidden="true" /> Evidence-led outcomes</span>
            <span><i aria-hidden="true" /> On-chain transparency</span>
          </div>
          <div className="hero-motion-line" aria-live="polite" aria-atomic="true">
            <span className="hero-motion-label">THE ORACLE IS BUILT TO</span>
            <span className="hero-motion-phrase" key={motionPhrase}>{motionPhrase}</span>
          </div>
          <div className="hero-actions">
            <button className="primary-button" type="button" onClick={onExploreMarkets}>Explore markets <ArrowUpRight size={16} /></button>
            <span className="network-label"><span className="network-dot" />Asset Oracle · Development Preview</span>
          </div>
          <div className="hero-footnote">Verification-first prediction infrastructure</div>
          </div>

          <aside className="hero-globe" aria-label="Asset Oracle market categories">
            <div className="globe-stage" aria-hidden="true">
              <div className="globe-halo"></div>
              <svg className="oracle-globe-svg" viewBox="0 0 360 360" role="presentation">
                <defs>
                  <radialGradient id="oracle-globe-fill" cx="34%" cy="27%" r="78%">
                    <stop offset="0%" stopColor="#1D6675" />
                    <stop offset="54%" stopColor="#0B2A35" />
                    <stop offset="100%" stopColor="#071A24" />
                  </radialGradient>
                  <clipPath id="oracle-globe-clip"><circle cx="180" cy="180" r="128" /></clipPath>
                </defs>
                <circle cx="180" cy="180" r="137" fill="none" stroke="var(--accent)" strokeOpacity=".28" strokeWidth="1" />
                <circle cx="180" cy="180" r="128" fill="url(#oracle-globe-fill)" stroke="var(--highlight)" strokeOpacity=".7" strokeWidth="1.4" />
                <g clipPath="url(#oracle-globe-clip)" fill="none" stroke="var(--accent)" strokeOpacity=".55" strokeWidth="1.15">
                  <ellipse cx="180" cy="180" rx="58" ry="128" />
                  <ellipse cx="180" cy="180" rx="105" ry="128" />
                  <ellipse cx="180" cy="180" rx="128" ry="43" />
                  <ellipse cx="180" cy="180" rx="128" ry="86" />
                  <path d="M52 180H308M65 132H295M65 228H295" strokeOpacity=".36" />
                  <path d="M100 100C122 116 132 139 124 158S109 202 133 222 157 253 151 278" stroke="var(--teal)" strokeOpacity=".8" />
                  <path d="M207 58C194 92 214 115 231 137S249 180 227 204 211 250 236 278" stroke="var(--teal)" strokeOpacity=".8" />
                </g>
                <circle cx="180" cy="180" r="128" fill="none" stroke="var(--highlight)" strokeOpacity=".24" />
                <circle cx="180" cy="180" r="145" fill="none" stroke="var(--teal)" strokeOpacity=".45" strokeDasharray="2 8" />
              </svg>
              <span className="globe-node globe-node-one"></span>
              <span className="globe-node globe-node-two"></span>
              <span className="globe-node globe-node-three"></span>
            </div>
            <div className="globe-category-list">
              {[
                "Digital Assets",
                "Stablecoins",
                "RWA",
                "Economic Data",
                "Regional Events",
                "Sports",
              ].map((category, index) => (
                <span className="globe-category" style={{ "--category-index": index } as React.CSSProperties} key={category}>
                  <span className="globe-category-dot"></span>{category}
                </span>
              ))}
            </div>
            <span className="globe-caption">FIVE MARKETS · ONE ORACLE</span>
          </aside>
        </div>
      </section>

      <section className="featured-markets market-spotlight-section" aria-labelledby="featured-markets-title">
        <div className="featured-markets-heading">
          <div>
            <span className="eyebrow">LIVE MARKET SPOTLIGHT</span>
            <h2 id="featured-markets-title">What would you back?</h2>
            <p>One live question in focus. Open the market to review its rules and make your prediction.</p>
          </div>
          <button className="text-action" type="button" onClick={onExploreMarkets}>Explore all markets <ArrowUpRight size={15} /></button>
        </div>
        {marketsLoading ? (
          <div className="featured-market-placeholder" role="status" aria-live="polite">Loading live markets…</div>
        ) : marketsError ? (
          <div className="featured-market-placeholder" role="alert">Live markets are temporarily unavailable.</div>
        ) : markets.length === 0 ? (
          <div className="featured-market-placeholder" role="status">
            <span className="featured-market-orbit" aria-hidden="true">◎</span>
            <strong>No live markets right now.</strong>
            <span>Explore the market catalogue and check back when a market opens.</span>
            <button className="text-action" type="button" onClick={onExploreMarkets}>Browse markets <ArrowUpRight size={15} /></button>
          </div>
        ) : (
          <MarketSpotlight markets={markets.filter((market) => market.status.toLowerCase() === "open" || market.status.toLowerCase() === "live").slice(0, 5).length
            ? markets.filter((market) => market.status.toLowerCase() === "open" || market.status.toLowerCase() === "live").slice(0, 5)
            : markets.slice(0, 5)}
            onOpenMarket={onOpenMarket}
          />
        )}
      </section>

      <DashboardOverview />

      <section className="principles" aria-label="How it works">
        <article className="principle"><span className="principle-number">01</span><h2>Find a market</h2><p>Explore a question and its resolution rules.</p></article>
        <article className="principle"><span className="principle-number">02</span><h2>Understand the rules</h2><p>Know how the outcome will be established.</p></article>
        <article className="principle"><span className="principle-number">03</span><h2>Verify the result</h2><p>Trace the evidence behind the final outcome.</p></article>
      </section>

      <section className="trust-clarity" aria-labelledby="trust-clarity-title">
        <div className="trust-clarity-heading">
          <span className="eyebrow">WHAT THE RECORD SHOWS</span>
          <h2 id="trust-clarity-title">Trust, with clear limits.</h2>
          <p>See what Asset Oracle checks today—and what still needs to be verified on-chain.</p>
        </div>
        <div className="trust-clarity-grid">
          <article className="trust-clarity-card">
            <span className="trust-clarity-index">01 · PUBLICATION</span>
            <h3>Listed markets only</h3>
            <p>Published markets shown here must include an on-chain market ID, creation transaction, manager address, and Asset Chain testnet reference.</p>
          </article>
          <article className="trust-clarity-card">
            <span className="trust-clarity-index">02 · RULES</span>
            <h3>Read the resolution criteria</h3>
            <p>Each market detail page presents the available question, schedule, and resolution rules before you decide how to participate.</p>
          </article>
          <article className="trust-clarity-card">
            <span className="trust-clarity-index">03 · EVIDENCE</span>
            <h3>Check recorded proof</h3>
            <p>For settled markets, the verification view shows outcome and evidence references recorded by the contract. A record is not an independent audit.</p>
          </article>
        </div>
        <p className="trust-clarity-footnote">Asset Chain testnet is a development environment. Always confirm the network and on-chain record; this interface does not claim independent verification beyond the data it displays.</p>
      </section>

      <section className="home-faq" aria-labelledby="home-faq-title">
        <div className="home-faq-intro">
          <span className="eyebrow">BEFORE YOU PARTICIPATE</span>
          <h2 id="home-faq-title">A few things worth knowing.</h2>
          <p>Understand the market record, resolution evidence, and current network environment before taking part.</p>
        </div>
        <div className="home-faq-list">
          <details>
            <summary>What is Asset Oracle?</summary>
            <p>Asset Oracle is a prediction-market interface built around real-world questions, defined resolution criteria, and on-chain market records.</p>
          </details>
          <details>
            <summary>How is a market outcome determined?</summary>
            <p>Each market should be read on its own terms. Review its resolution criteria and available data sources before participating; the contract record reflects the outcome submitted for that market.</p>
          </details>
          <details>
            <summary>Does an evidence record mean the result was independently audited?</summary>
            <p>No. A source name or evidence hash is a reference recorded for the market, not proof of an independent audit. Check the available source and on-chain transaction details yourself.</p>
          </details>
          <details>
            <summary>Is Asset Chain currently mainnet?</summary>
            <p>The current interface identifies Asset Chain as a testnet development environment. Testnet activity should not be mistaken for mainnet deployment.</p>
          </details>
        </div>
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
