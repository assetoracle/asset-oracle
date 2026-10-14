import {
  ArrowUpRight,
  Search,
} from "lucide-react";
import type { DisplayMarket } from "./HomePage";
import type { MarketCategory } from "../types";

type MarketsPageProps = {
  categories: MarketCategory[];
  activeCategory: MarketCategory;
  search: string;
  markets: DisplayMarket[];
  marketsLoading: boolean;
  marketsError: string;
  proposalMessage: string;
  walletConnected: boolean;
  onConnect: () => void;
  onCategoryChange: (category: MarketCategory) => void;
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
  function renderMarketCard(market: DisplayMarket, categoryIndex: number) {
    return (
      <article className="market-card market-card-compact" key={market.id}>
        <div className="market-card-top">
          <span className="market-symbol">#{categoryIndex + 1}</span>
          <div className="market-card-badges">
            <span className="market-category">{market.label}</span>
            <span className="market-status">{market.status || "Published"}</span>
          </div>
        </div>
        <h3>{market.question}</h3>
        <div className="market-card-bottom">
          <span className="market-status-note">Closes {market.closesAt || "date unavailable"}</span>
          <button className="primary-button open-market-button" type="button" onClick={() => onOpenMarket(market)}>
            Open Market <ArrowUpRight size={15} />
          </button>
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

      <div className="category-list" aria-label="Market categories">
        {categories.map((category) => (
          <button className={activeCategory === category ? "category-button active" : "category-button"}
            key={category} type="button" onClick={() => onCategoryChange(category)}
            aria-pressed={activeCategory === category}>{category}</button>
        ))}
      </div>

      {marketsLoading ? (
        <div className="empty-state" role="status"><h3>Loading published markets</h3><p>Retrieving approved markets from Asset Oracle.</p></div>
      ) : marketsError ? (
        <div className="empty-state" role="alert">
          <h3>Unable to load markets</h3><p>{marketsError}</p>
          <button className="primary-button" type="button" onClick={onRetryMarkets}>Try again</button>
        </div>
      ) : markets.length === 0 ? (
        <div className="empty-state"><h3>No published markets in this category</h3><p>Markets appear here after publication and are filtered by the selected category.</p></div>
      ) : (
        <div className="market-grid">{markets.map((market, index) => renderMarketCard(market, index))}</div>
      )}

      <p className="market-disclaimer">
        Published proposals come from the approved public-market API. On-chain markets and participation are shown separately when the verified Enugu testnet contract is configured.
      </p>
    </section>
  );
}
