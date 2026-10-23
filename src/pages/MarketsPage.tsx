import { useState } from "react";
import {
  ArrowUpRight,
  Search,
  ShieldCheck,
} from "lucide-react";
import type { DisplayMarket } from "./HomePage";
import type { MarketFilter } from "../types";
import SportIcon, { type SportKind } from "../components/SportIcon";
import BrandedSelect from "../components/BrandedSelect";

function safeEvidenceUrl(value: string | undefined): URL | null {
  const source = value?.trim();
  if (!source || /[\\s<>"']/u.test(source)) return null;
  try {
    // Validators sometimes record a domain such as "FireScreener.com" rather
    // than a fully qualified URL. Treat bare domains as HTTPS source links.
    const candidate = /^[a-z][a-z\\d+.-]*:\/\//i.test(source) ? source : `https://${source}`;
    const url = new URL(candidate);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (!url.hostname.includes(".") || url.hostname.startsWith(".") || url.hostname.endsWith(".")) return null;
    return url;
  } catch {
    return null;
  }
}

function formatMarketTime(value: string | undefined): string {
  if (!value) return "date unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "date unavailable";
  return new Intl.DateTimeFormat("en-NG", {
    timeZone: "Africa/Lagos",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZoneName: "short",
  }).format(date).replace("GMT+1", "WAT");
}

type MarketsPageProps = {
  categories: MarketFilter[];
  activeCategory: MarketFilter;
  search: string;
  markets: DisplayMarket[];
  liveMarketIds: Set<string>;
  settledMarketIds: Set<string>;
  marketOutcomes: Map<string, number>;
  marketEvidenceSources: Map<string, string>;
  marketStakeDistribution: Map<string, { yesPercent: number; noPercent: number; hasSideStake: boolean }>;
  onVerify: (market: DisplayMarket) => void;
  marketsLoading: boolean;
  marketsError: string;
  proposalMessage: string;
  walletConnected: boolean;
  onConnect: () => void;
  onCategoryChange: (category: MarketFilter) => void;
  onSearchChange: (value: string) => void;
  onPropose: () => void;
  onTrackProposal: () => void;
  onRetryMarkets: () => void;
  onOpenMarket: (market: DisplayMarket) => void;
};

export default function MarketsPage({
  categories,
  activeCategory,
  search,
  markets,
  liveMarketIds,
  settledMarketIds,
  marketOutcomes,
  marketEvidenceSources,
  marketStakeDistribution,
  onVerify,
  marketsLoading,
  marketsError,
  proposalMessage,
  walletConnected,
  onCategoryChange,
  onSearchChange,
  onPropose,
  onTrackProposal,
  onRetryMarkets,
  onOpenMarket,
}: MarketsPageProps) {
  const [sortOrder, setSortOrder] = useState<"closing" | "newest" | "question">("closing");
  const [activeMarketSection, setActiveMarketSection] = useState<"browse" | "propose">("browse");
  const selectedSubjectCategory =
    categories.includes(activeCategory) &&
    !["All Markets", "Live", "Settled Markets"].includes(activeCategory)
      ? activeCategory
      : "All Markets";
  const subjectCategories = categories.filter(
    (category) => !["All Markets", "Live", "Settled Markets"].includes(category),
  );

  // Keep all filtered published markets visible; sort locally without changing API or contract state.
  const visibleMarkets = [...markets].sort((a, b) => {
    if (sortOrder === "question") return a.question.localeCompare(b.question);
    if (sortOrder === "newest") {
      const dateA = Date.parse(a.closesAt ?? "");
      const dateB = Date.parse(b.closesAt ?? "");
      if (!Number.isNaN(dateA) && !Number.isNaN(dateB)) return dateB - dateA;
      return b.id.localeCompare(a.id);
    }
    const dateA = Date.parse(a.closesAt ?? "");
    const dateB = Date.parse(b.closesAt ?? "");
    if (Number.isNaN(dateA)) return 1;
    if (Number.isNaN(dateB)) return -1;
    return dateA - dateB;
  });

  function renderMarketCard(market: DisplayMarket, categoryIndex: number) {
    const sportsMarket = market.label.trim().toLowerCase() === "sports";
    const marketText = `${market.question} ${"description" in market ? String(market.description ?? "") : ""}`.toLowerCase();
    const sportKind: SportKind = market.sport ?? (/\b(nba|basketball|court|three[- ]pointer|dunk)\b/.test(marketText)
      ? "basketball"
      : /\b(tennis|wimbledon|atp|wta|grand slam|set point)\b/.test(marketText)
        ? "tennis"
        : "football");
    return (
      <article className="market-card market-card-compact" key={market.id}>
        <div className="market-card-top">
          <span className="market-symbol">{sportsMarket ? <SportIcon sport={sportKind} size={25} /> : `#${categoryIndex + 1}`}</span>
          <div className="market-card-badges">
            <span className="market-category">{market.label}</span>
            {settledMarketIds.has(market.id) ? (
              <span className="market-status market-status-settled">SETTLED</span>
            ) : liveMarketIds.has(market.id) ? (
              <span className="market-status market-status-live"><span className="live-indicator" aria-hidden="true" />LIVE</span>
            ) : (
              <span className="market-status">CLOSED</span>
            )}
          </div>
        </div>
        <h3>{market.question}</h3>
        {liveMarketIds.has(market.id) && (() => {
          const distribution = marketStakeDistribution.get(market.id);
          if (!distribution) return null;
          const { yesPercent, noPercent, hasSideStake } = distribution;
          return (
            <div className="market-sentiment" aria-label={`Current stake distribution: YES ${hasSideStake ? yesPercent.toFixed(1) + "%" : "no stakes"}, NO ${hasSideStake ? noPercent.toFixed(1) + "%" : "no stakes"}`}>
              <div className={`market-sentiment-track${hasSideStake ? "" : " market-sentiment-empty"}`} role="img" aria-label={hasSideStake ? `YES ${yesPercent.toFixed(1)}%, NO ${noPercent.toFixed(1)}%` : "No stakes yet"}>
                <div className="market-sentiment-yes" style={{ width: `${yesPercent}%` }} />
                <div className="market-sentiment-no" style={{ width: `${noPercent}%` }} />
              </div>
              <div className="market-sentiment-labels">
                <span className="market-sentiment-yes-label">YES {hasSideStake ? `${yesPercent.toFixed(1)}%` : "—"}</span>
                <span className="market-sentiment-no-label">NO {hasSideStake ? `${noPercent.toFixed(1)}%` : "—"}</span>
              </div>
            </div>
          );
        })()}
        {settledMarketIds.has(market.id) && (() => {
          const outcome = marketOutcomes.get(market.id);
          const label = outcome === 1 ? "YES" : outcome === 2 ? "NO" : outcome === 3 ? "INVALID" : "Outcome pending";
          const sourceUrl = safeEvidenceUrl(marketEvidenceSources.get(market.id));
          return (
            <div className="settled-outcome-preview">
              <div className="settled-outcome-result"><span>Final outcome</span><strong className={label === "YES" ? "outcome-yes" : label === "NO" ? "outcome-no" : ""}>{label}</strong></div>
              <div className="settled-verified-source">
                <span>Verified source</span>
                {sourceUrl ? (
                  <a href={sourceUrl.href} target="_blank" rel="noopener noreferrer" aria-label={`Open verified source ${sourceUrl.hostname} in a new tab`}>
                    {sourceUrl.hostname.replace(/^www\\./i, "")} <ArrowUpRight size={14} aria-hidden="true" />
                  </a>
                ) : (
                  <strong>{marketEvidenceSources.get(market.id)?.trim() || "Source not recorded on-chain"}</strong>
                )}
              </div>
            </div>
          );
        })()}
        <div className="market-card-bottom">
          <span className="market-status-note">{settledMarketIds.has(market.id) ? "Resolution confirmed on-chain" : `Closes ${formatMarketTime(market.closesAt)}`}</span>
          {settledMarketIds.has(market.id) ? (
            <button className="primary-button open-market-button verify-market-button" type="button" onClick={() => onVerify(market)}><ShieldCheck size={15} /> Verify</button>
          ) : (
            <button
              className="primary-button open-market-button"
              type="button"
              onClick={() => onOpenMarket(market)}
              title={liveMarketIds.has(market.id) ? "Open market details and participate while open." : "View closed market details; staking is unavailable."}
            >
              {liveMarketIds.has(market.id) ? "Open Market" : "View Details"}
              <ArrowUpRight size={15} />
            </button>
          )}
        </div>
      </article>
    );
  }

  return (
    <section className="markets-section page-section">
      <div className="section-heading">
        <div>
          <span className="eyebrow">DISCOVER</span>
          <h1>Markets</h1>
          <p>Browse approved markets by category.</p>
        </div>

      </div>

      <nav className="page-section-tabs" aria-label="Markets sections">
        <button type="button" className={activeMarketSection === "browse" ? "active" : ""} aria-pressed={activeMarketSection === "browse"} onClick={() => setActiveMarketSection("browse")}>Browse markets</button>
        <button type="button" className={activeMarketSection === "propose" ? "active" : ""} aria-pressed={activeMarketSection === "propose"} onClick={() => setActiveMarketSection("propose")}>Propose a market</button>
      </nav>
      {activeMarketSection === "browse" && <>
      {proposalMessage && (
        <div className="empty-state" role="status">
          <h3>Proposal received</h3>
          <p>{proposalMessage}</p>
          <p>Your proposal is awaiting review. Submission does not guarantee approval or publication.</p>
          {walletConnected && (
            <button className="text-action" type="button" onClick={onTrackProposal}>
              Track my proposal <ArrowUpRight size={15} />
            </button>
          )}
        </div>
      )}

      <label className="search-box">
        <Search size={19} aria-hidden="true" />
        <input type="search" placeholder="Search markets..." value={search}
          onChange={(event) => onSearchChange(event.target.value)} aria-label="Search markets" />
      </label>

      <div className="market-filter-panel">
        <div className="market-status-filters" role="group" aria-label="Filter markets by status">
          {(["All Markets", "Live", "Settled Markets"] as MarketFilter[]).map((status) => (
            <button
              className={["category-button", "status-filter-button", activeCategory === status ? "active" : ""].filter(Boolean).join(" ")}
              key={status}
              type="button"
              onClick={() => onCategoryChange(status)}
              aria-pressed={activeCategory === status}
            >
              {status === "Live" && <span className="live-indicator" aria-hidden="true" />}
              {status === "Settled Markets" ? "Settled" : status === "All Markets" ? "All" : status}
            </button>
          ))}
        </div>

        <div className="market-category-filter">
          <label htmlFor="market-category-select">Category</label>
          <BrandedSelect
            id="market-category-select"
            className="market-category-branded-select"
            value={selectedSubjectCategory}
            onChange={(value) => onCategoryChange(value as MarketFilter)}
            options={[
              { value: "All Markets", label: "All categories" },
              ...subjectCategories.map((category) => ({
                value: category,
                label: category === "RWA" ? "Real-World Assets (RWA)" : category,
              })),
            ]}
            ariaLabel="Filter markets by category"
          />
        </div>

        <div className="category-list category-list-desktop" aria-label="Market categories">
          {categories.filter((category) => !["All Markets", "Live", "Settled Markets"].includes(category)).map((category) => (
            <button
              className={["category-button", activeCategory === category ? "active" : ""].filter(Boolean).join(" ")}
              key={category}
              type="button"
              onClick={() => onCategoryChange(category)}
              aria-pressed={activeCategory === category}
            >
              {category === "RWA" ? "Real-World Assets (RWA)" : category}
            </button>
          ))}
        </div>
      </div>

      {!marketsLoading && !marketsError && visibleMarkets.length > 0 && (
        <div className="market-results-toolbar">
          <p className="market-results-count" aria-live="polite">
            <strong>{visibleMarkets.length}</strong> {visibleMarkets.length === 1 ? "market" : "markets"} found
            {search.trim() ? <span> for “{search.trim()}”</span> : null}
          </p>
          <div className="market-sort-control">
            <label htmlFor="market-sort-select">Sort by</label>
            <BrandedSelect
              id="market-sort-select"
              className="market-sort-branded-select"
              value={sortOrder}
              onChange={(value) => setSortOrder(value as "closing" | "newest" | "question")}
              options={[
                { value: "closing", label: "Closing soon" },
                { value: "newest", label: "Latest closing date" },
                { value: "question", label: "Question A–Z" },
              ]}
              ariaLabel="Sort markets"
            />
          </div>
        </div>
      )}

      {marketsLoading ? (
        <div className="empty-state" role="status"><h3>Loading published markets</h3><p>Retrieving approved markets from Asset Oracle.</p></div>
      ) : marketsError ? (
        <div className="empty-state" role="alert">
          <h3>Unable to load markets</h3><p>{marketsError}</p>
          <button className="primary-button" type="button" onClick={onRetryMarkets}>Try again</button>
        </div>
      ) : visibleMarkets.length === 0 ? (
        <div className="empty-state market-empty-state">
          <span className="market-empty-icon" aria-hidden="true"><Search size={22} /></span>
          <h3>{search.trim() ? "No matching markets" : activeCategory === "Live" ? "No live markets right now" : activeCategory === "Settled Markets" ? "No settled markets yet" : "No published markets in this category"}</h3>
          <p>{search.trim() ? "Try a different keyword or clear your search to see more published markets." : activeCategory === "Live" ? "Markets appear here only while on-chain status is open and the participation deadline has not passed." : activeCategory === "Settled Markets" ? "Markets move here after their on-chain settlement status is confirmed." : "Markets appear here after publication and are filtered by the selected category."}</p>
          {(search.trim() || activeCategory !== "All Markets") && (
            <button
              className="text-action"
              type="button"
              onClick={() => {
                onSearchChange("");
                onCategoryChange("All Markets");
              }}
            >
              Clear filters <ArrowUpRight size={15} />
            </button>
          )}
        </div>
      ) : (
        <div className="market-grid">{visibleMarkets.map((market, index) => renderMarketCard(market, index))}</div>
      )}

      <p className="market-disclaimer">
        Published proposals come from the approved public-market API. On-chain markets and participation are shown separately when the verified Enugu testnet contract is configured.
      </p>
      </>}
      {activeMarketSection === "propose" && <section className="empty-state market-propose-section"><h2>Propose a market</h2><p>Submit a new market question with clear resolution rules and a verifiable evidence source. Your proposal must be reviewed before it can be published.</p><button className="primary-button" type="button" onClick={onPropose}>Open proposal form</button></section>}
    </section>
  );
}
