import { useState } from "react";
import {
  ArrowUpRight,
  Search,
  ChevronDown,
  ShieldCheck,
} from "lucide-react";
import type { DisplayMarket } from "./HomePage";
import type { MarketFilter } from "../types";

type MarketsPageProps = {
  categories: MarketFilter[];
  activeCategory: MarketFilter;
  search: string;
  markets: DisplayMarket[];
  liveMarketIds: Set<string>;
  settledMarketIds: Set<string>;
  marketOutcomes: Map<string, number>;
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
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const selectedSubjectCategory =
    categories.includes(activeCategory) &&
    !["All Markets", "Live", "Settled Markets"].includes(activeCategory)
      ? activeCategory
      : "All Markets";
  const subjectCategories = categories.filter(
    (category) => !["All Markets", "Live", "Settled Markets"].includes(category),
  );

  // Keep all published markets visible here; closed markets belong on this page too.
  const visibleMarkets = markets;

  function renderMarketCard(market: DisplayMarket, categoryIndex: number) {
    return (
      <article className="market-card market-card-compact" key={market.id}>
        <div className="market-card-top">
          <span className="market-symbol">#{categoryIndex + 1}</span>
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
          const yesPercent = distribution?.yesPercent ?? 0;
          const noPercent = distribution?.noPercent ?? 0;
          const hasSideStake = distribution?.hasSideStake ?? false;
          return (
            <div className="market-sentiment" aria-label={hasSideStake ? `YES stake ${yesPercent}%, NO stake ${noPercent}%` : "No stakes placed yet"}>
              <div className={`market-sentiment-track${hasSideStake ? "" : " market-sentiment-empty"}`} role="img" aria-label={hasSideStake ? `YES ${yesPercent}%, NO ${noPercent}%` : "Stake distribution unavailable"}>
                <span className="market-sentiment-yes" style={{ width: `${hasSideStake ? yesPercent : 50}%` }} />
                <span className="market-sentiment-no" style={{ width: `${hasSideStake ? noPercent : 50}%` }} />
              </div>
              <div className="market-sentiment-labels">
                <span className="market-sentiment-label-yes">YES {hasSideStake ? `${yesPercent.toFixed(2)}%` : "—"}</span>
                <span className="market-sentiment-label-no">NO {hasSideStake ? `${noPercent.toFixed(2)}%` : "—"}</span>
              </div>
            </div>
          );
        })()}
        {settledMarketIds.has(market.id) && (() => {
          const outcome = marketOutcomes.get(market.id);
          const label = outcome === 1 ? "YES" : outcome === 2 ? "NO" : outcome === 3 ? "INVALID" : "Outcome pending";
          return <div className="settled-outcome-preview"><span>Final outcome</span><strong className={label === "YES" ? "outcome-yes" : label === "NO" ? "outcome-no" : ""}>{label}</strong></div>;
        })()}
        <div className="market-card-bottom">
          <span className="market-status-note">{settledMarketIds.has(market.id) ? "Resolution confirmed on-chain" : `Closes ${market.closesAt || "date unavailable"}`}</span>
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
        <button className="primary-button" type="button" onClick={onPropose}>Propose a Market</button>
      </div>

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
          <div className="market-category-select-wrap">
            <button
              id="market-category-select"
              className="market-category-select market-category-select-trigger"
              type="button"
              aria-label="Filter markets by category"
              aria-haspopup="listbox"
              aria-expanded={categoryDropdownOpen}
              onClick={() => setCategoryDropdownOpen((open) => !open)}
            >
              <span>{selectedSubjectCategory === "All Markets" ? "All categories" : selectedSubjectCategory === "RWA" ? "Real-World Assets (RWA)" : selectedSubjectCategory}</span>
              <span className="market-category-select-icon"><ChevronDown size={17} /></span>
            </button>
            {categoryDropdownOpen && (
              <>
                <button
                  className="market-category-dropdown-backdrop"
                  type="button"
                  aria-label="Close category menu"
                  onClick={() => setCategoryDropdownOpen(false)}
                />
                <div className="market-category-dropdown" role="listbox" aria-label="Market categories">
                  <button
                    className={["market-category-option", selectedSubjectCategory === "All Markets" ? "active" : ""].filter(Boolean).join(" ")}
                    type="button"
                    role="option"
                    aria-selected={selectedSubjectCategory === "All Markets"}
                    onClick={() => { onCategoryChange("All Markets"); setCategoryDropdownOpen(false); }}
                  >
                    All categories
                  </button>
                  {subjectCategories.map((category) => (
                    <button
                      className={["market-category-option", selectedSubjectCategory === category ? "active" : ""].filter(Boolean).join(" ")}
                      key={category}
                      type="button"
                      role="option"
                      aria-selected={selectedSubjectCategory === category}
                      onClick={() => { onCategoryChange(category); setCategoryDropdownOpen(false); }}
                    >
                      {category === "RWA" ? "Real-World Assets (RWA)" : category}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
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

      {marketsLoading ? (
        <div className="empty-state" role="status"><h3>Loading published markets</h3><p>Retrieving approved markets from Asset Oracle.</p></div>
      ) : marketsError ? (
        <div className="empty-state" role="alert">
          <h3>Unable to load markets</h3><p>{marketsError}</p>
          <button className="primary-button" type="button" onClick={onRetryMarkets}>Try again</button>
        </div>
      ) : visibleMarkets.length === 0 ? (
        <div className="empty-state"><h3>{activeCategory === "Live" ? "No live markets right now" : activeCategory === "Settled Markets" ? "No settled markets yet" : "No published markets in this category"}</h3><p>{activeCategory === "Live" ? "Markets appear here only while on-chain status is open and the participation deadline has not passed." : activeCategory === "Settled Markets" ? "Markets move here after their on-chain settlement status is confirmed." : "Markets appear here after publication and are filtered by the selected category."}</p></div>
      ) : (
        <div className="market-grid">{visibleMarkets.map((market, index) => renderMarketCard(market, index))}</div>
      )}

      <p className="market-disclaimer">
        Published proposals come from the approved public-market API. On-chain markets and participation are shown separately when the verified Enugu testnet contract is configured.
      </p>
    </section>
  );
}
