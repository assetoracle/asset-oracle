
import { useState } from "react";

type MarketCategory =
  | "All Markets"
  | "Crypto"
  | "Sports"
  | "Economics"
  | "Real-World Assets";

const categories: MarketCategory[] = [
  "All Markets",
  "Crypto",
  "Sports",
  "Economics",
  "Real-World Assets",
];

const marketExamples = [
  {
    id: 1,
    category: "Crypto",
    symbol: "BTC",
    label: "DIGITAL ASSETS",
    question: "Will Bitcoin reach $150,000 by December 31, 2026?",
    description:
      "Outcome must be verified against the predefined CoinGecko price source and market rules.",
    endDate: "Dec 31, 2026",
  },
  {
    id: 2,
    category: "Sports",
    symbol: "SP",
    label: "SPORTS",
    question: "Will a selected football team win its next scheduled match?",
    description:
      "A future market will require a specific fixture, official result source and settlement deadline.",
    endDate: "Fixture required",
  },
  {
    id: 3,
    category: "Economics",
    symbol: "NG",
    label: "AFRICAN ECONOMICS",
    question: "Will Nigeria's next published inflation rate be lower?",
    description:
      "A future market will specify the NBS release, comparison period and exact decision rule.",
    endDate: "Release required",
  },
  {
    id: 4,
    category: "Real-World Assets",
    symbol: "RW",
    label: "REAL-WORLD ASSETS",
    question: "Will a specified real-world asset metric increase?",
    description:
      "A future market will identify its asset, data provider, measurement date and verification rule.",
    endDate: "Market rules required",
  },
];

function App() {
  const [activeCategory, setActiveCategory] =
    useState<MarketCategory>("All Markets");
  const [search, setSearch] = useState("");

  const filteredMarkets = marketExamples.filter((market) => {
    const matchesCategory =
      activeCategory === "All Markets" ||
      market.category === activeCategory;

    const matchesSearch =
      market.question.toLowerCase().includes(search.toLowerCase()) ||
      market.category.toLowerCase().includes(search.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  return (
    <div className="app">
      <header className="header">
        <a className="brand" href="#" aria-label="Asset Oracle home">
          <span className="brand-mark" aria-hidden="true">
            A
          </span>
          <span>
            <span className="brand-name">ASSET ORACLE</span>
            <span className="brand-tagline">
              REAL-WORLD TRUTH, ON-CHAIN.
            </span>
          </span>
        </a>

        <button
          className="connect-button"
          type="button"
          onClick={() =>
            window.alert(
              "Wallet connection will be added in a later development stage."
            )
          }
        >
          Connect Wallet
        </button>
      </header>

      <main>
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
            Explore future outcomes, understand how they will be
            verified, and follow transparent on-chain settlement.
          </p>

          <div className="hero-actions">
            <a className="primary-button" href="#markets">
              Explore markets <span aria-hidden="true">↗</span>
            </a>
            <span className="network-label">
              <span className="network-dot" />
              Asset Chain · Testnet development
            </span>
          </div>

          <div className="hero-footnote">
            Verification-first prediction infrastructure
          </div>
        </section>

        <section className="principles" aria-label="Platform principles">
          <article className="principle">
            <span className="principle-number">01</span>
            <h2>Predict</h2>
            <p>Explore YES or NO outcomes for clearly defined events.</p>
          </article>

          <article className="principle">
            <span className="principle-number">02</span>
            <h2>Verify</h2>
            <p>Identify the sources and rules that determine results.</p>
          </article>

          <article className="principle">
            <span className="principle-number">03</span>
            <h2>Settle</h2>
            <p>Make settlement evidence and transaction records transparent.</p>
          </article>
        </section>

        <section className="markets-section" id="markets">
          <div className="section-heading">
            <div>
              <span className="eyebrow">EXPLORE THE POSSIBILITIES</span>
              <h2>Prediction markets</h2>
              <p>Discover questions across digital assets, sports and more.</p>
            </div>

            <span className="preview-badge">UI PREVIEW</span>
          </div>

          <label className="search-box">
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              placeholder="Search market questions..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Search market questions"
            />
          </label>

          <div className="category-list" aria-label="Market categories">
            {categories.map((category) => (
              <button
                className={
                  activeCategory === category
                    ? "category-button active"
                    : "category-button"
                }
                key={category}
                type="button"
                onClick={() => setActiveCategory(category)}
                aria-pressed={activeCategory === category}
              >
                {category}
              </button>
            ))}
          </div>

          <div className="market-grid">
            {filteredMarkets.map((market) => (
              <article className="market-card" key={market.id}>
                <div className="market-card-top">
                  <span className="market-symbol">{market.symbol}</span>
                  <span className="market-category">{market.label}</span>
                </div>

                <h3>{market.question}</h3>
                <p className="market-description">{market.description}</p>

                <div className="market-meta">
                  <span>Resolution date</span>
                  <span>{market.endDate}</span>
                </div>

                <div className="market-card-bottom">
                  <span className="preview-label">
                    Illustrative example
                  </span>
                  <span className="arrow" aria-hidden="true">
                    ↗
                  </span>
                </div>
              </article>
            ))}
          </div>

          {filteredMarkets.length === 0 && (
            <div className="empty-state">
              <h3>No matching examples</h3>
              <p>Try another search term or select a different category.</p>
            </div>
          )}

          <p className="market-disclaimer">
            These are illustrative interface examples, not live markets.
            No stakes, live odds or actual settlement data are available yet.
          </p>
        </section>

        <section className="verification-banner">
          <div>
            <span className="eyebrow">BUILT AROUND EVIDENCE</span>
            <h2>Every outcome needs a reason.</h2>
            <p>
              The planned settlement record will identify the actual
              data providers, verification evidence, decision rule,
              final outcome and available on-chain transactions.
            </p>
          </div>
          <span className="verification-icon" aria-hidden="true">
            ✓
          </span>
        </section>
      </main>

      <footer className="footer">
        <div>
          <strong>ASSET ORACLE</strong>
          <p>REAL-WORLD TRUTH, ON-CHAIN.</p>
        </div>
        <span>Early development · Testnet first</span>
      </footer>
    </div>
  );
}

export default App;
