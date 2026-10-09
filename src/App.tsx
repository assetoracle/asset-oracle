
import { useState } from "react";
import {
  House,
  ChartNoAxesCombined,
  BriefcaseBusiness,
  WalletCards,
  History,
  Menu,
  X,
  Search,
  ArrowUpRight,
  ShieldCheck,
  CircleHelp,
} from "lucide-react";

import MarketDetailPage from "./components/MarketDetailPage";

import {
  connectWallet,
  switchToAssetChainTestnet,
  ASSET_CHAIN_TESTNET,
  type WalletConnection,
} from "./wallet";

type Page = "Home" | "Markets" | "Portfolio" | "Claims" | "History";

type MarketCategory =
  | "All Markets"
  | "Crypto"
  | "Sports"
  | "Economics"
  | "RWA"
  | "Regional";

const categories: MarketCategory[] = [
  "All Markets",
  "Crypto",
  "Sports",
  "Economics",
  "RWA",
  "Regional",
];

const navigation = [
  { label: "Home" as const, icon: House },
  { label: "Markets" as const, icon: ChartNoAxesCombined },
  { label: "Portfolio" as const, icon: BriefcaseBusiness },
  { label: "Claims" as const, icon: WalletCards },
  { label: "History" as const, icon: History },
];

const marketExamples = [
  {
    id: 1,
    category: "Crypto",
    symbol: "BTC",
    label: "CRYPTO",
    question: "Will Bitcoin reach $150,000 by December 31, 2026?",
    description:
      "A preview of how a crypto market could define its price source and resolution rule.",
    endDate: "Dec 31, 2026",
  },
  {
    id: 2,
    category: "Sports",
    symbol: "SP",
    label: "SPORTS",
    question: "Will a selected football team win its next scheduled match?",
    description:
      "A real market requires a specific fixture, match time, and official result source.",
    endDate: "Fixture required",
  },
  {
    id: 3,
    category: "Economics",
    symbol: "NG",
    label: "AFRICAN ECONOMICS",
    question: "Will Nigeria's next published inflation rate be lower?",
    description:
      "A real market must specify the NBS release and comparison period.",
    endDate: "Release required",
  },
  {
    id: 4,
    category: "RWA",
    symbol: "RW",
    label: "REAL-WORLD ASSETS",
    question: "Will a specified real-world asset metric increase?",
    description:
      "The asset, data provider, measurement date, and decision rule must be defined.",
    endDate: "Rules required",
  },
  {
    id: 5,
    category: "Regional",
    symbol: "GL",
    label: "REGIONAL & GLOBAL EVENTS",
    question: "Will a selected economic indicator change this month?",
    description:
      "The region, authoritative source, publication date, and decision rule must be specified.",
    endDate: "Release required",
  },
];

function App() {
  const [page, setPage] = useState<Page>("Home");
  const [activeCategory, setActiveCategory] =
    useState<MarketCategory>("All Markets");
  const [search, setSearch] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedMarket, setSelectedMarket] =
    useState<(typeof marketExamples)[number] | null>(null);

  const [wallet, setWallet] = useState<WalletConnection | null>(null);
  const [walletBusy, setWalletBusy] = useState(false);
  const [walletMessage, setWalletMessage] = useState("");

  async function handleConnectWallet() {
    setWalletBusy(true);
    setWalletMessage("");

    try {
      const connection = await connectWallet();
      setWallet(connection);

      setWalletMessage(
        connection.chainId === ASSET_CHAIN_TESTNET.chainId
          ? "Wallet connected to Asset Chain testnet."
          : "Wallet connected. Switch to Asset Chain testnet to continue.",
      );
    } catch (error) {
      setWalletMessage(
        error instanceof Error
          ? error.message
          : "Unable to connect the wallet.",
      );
    } finally {
      setWalletBusy(false);
    }
  }

  async function handleSwitchNetwork() {
    setWalletBusy(true);
    setWalletMessage("");

    try {
      await switchToAssetChainTestnet();
      const connection = await connectWallet();
      setWallet(connection);

      setWalletMessage(
        connection.chainId === ASSET_CHAIN_TESTNET.chainId
          ? "Connected to Asset Chain testnet."
          : "Please confirm the network in your wallet.",
      );
    } catch (error) {
      setWalletMessage(
        error instanceof Error
          ? error.message
          : "Unable to switch networks.",
      );
    } finally {
      setWalletBusy(false);
    }
  }

  function navigateTo(nextPage: Page) {
    setPage(nextPage);
    setSelectedMarket(null);
    setMobileMenuOpen(false);
    setSearch("");
    setActiveCategory("All Markets");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const query = search.trim().toLowerCase();

  const filteredMarkets = marketExamples.filter((market) => {
    const matchesCategory =
      activeCategory === "All Markets" ||
      market.category === activeCategory;

    const matchesSearch =
      market.question.toLowerCase().includes(query) ||
      market.category.toLowerCase().includes(query) ||
      market.label.toLowerCase().includes(query);

    return matchesCategory && matchesSearch;
  });

  function renderMarketCard(market: (typeof marketExamples)[number]) {
    return (
      <article className="market-card" key={market.id}>
        <div className="market-card-top">
          <span className="market-symbol">{market.symbol}</span>

          <div className="market-card-badges">
            <span className="market-category">{market.label}</span>
            <span className="preview-badge">PREVIEW</span>
          </div>
        </div>

        <h3>{market.question}</h3>

        <p className="market-description">{market.description}</p>

        <div className="market-meta">
          <span>Resolution date</span>
          <span>{market.endDate}</span>
        </div>

        <div className="market-card-bottom">
          <span className="preview-label">Not yet active</span>

          <button
            className="text-action"
            type="button"
            onClick={() => {
              setSelectedMarket(market);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            View details <ArrowUpRight size={15} />
          </button>
        </div>
      </article>
    );
  }

  function renderPageContent() {
    if (selectedMarket) {
      return (
        <MarketDetailPage
          question={selectedMarket.question}
          category={selectedMarket.label}
          description={selectedMarket.description}
          endDate={selectedMarket.endDate}
          onBack={() => {
            setSelectedMarket(null);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      );
    }

    if (page === "Home") {
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
              Explore real-world questions, understand how outcomes
              are verified, and follow transparent settlement.
            </p>

            <div className="hero-actions">
              <button
                className="primary-button"
                type="button"
                onClick={() => navigateTo("Markets")}
              >
                Explore all markets <ArrowUpRight size={16} />
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
              <p>Explore a question and its predefined rules.</p>
            </article>

            <article className="principle">
              <span className="principle-number">02</span>
              <h2>Understand the rules</h2>
              <p>Review the source and resolution criteria.</p>
            </article>

            <article className="principle">
              <span className="principle-number">03</span>
              <h2>Verify the result</h2>
              <p>Follow the evidence behind the final outcome.</p>
            </article>
          </section>

          <section className="markets-section">
            <div className="section-heading">
              <div>
                <span className="eyebrow">A QUICK LOOK</span>
                <h2>Featured markets</h2>
                <p>A small selection from the market catalogue.</p>
              </div>

              <button
                className="text-action"
                type="button"
                onClick={() => navigateTo("Markets")}
              >
                All markets <ArrowUpRight size={15} />
              </button>
            </div>

            <div className="market-grid">
              {marketExamples.slice(0, 3).map(renderMarketCard)}
            </div>

            <p className="market-disclaimer">
              These are illustrative previews, not live markets.
              Participation, live odds, and play counts are not available.
            </p>
          </section>

          <section className="verification-banner">
            <div>
              <span className="eyebrow">BUILT AROUND EVIDENCE</span>
              <h2>Every outcome needs a reason.</h2>
              <p>
                Market rules, authoritative data providers, and
                traceable evidence will help establish final outcomes.
              </p>
              <button
                className="text-action"
                type="button"
                onClick={() => navigateTo("Markets")}
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
        </>
      );
    }

    if (page === "Markets") {
      return (
        <section className="markets-section page-section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">EXPLORE</span>
              <h1>All markets</h1>
              <p>Search questions or choose a category.</p>
            </div>
            <span className="preview-badge">PREVIEW</span>
          </div>

          <label className="search-box">
            <Search size={19} aria-hidden="true" />
            <input
              type="search"
              placeholder="Search markets..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Search markets"
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
            {filteredMarkets.map(renderMarketCard)}
          </div>

          {filteredMarkets.length === 0 && (
            <div className="empty-state">
              <h3>No matching markets</h3>
              <p>Try another search or choose a different category.</p>
            </div>
          )}

          <p className="market-disclaimer">
            These examples are for interface development only.
            Real participation is not yet enabled.
          </p>
        </section>
      );
    }

    const pageInfo = {
      Portfolio: {
        eyebrow: "YOUR ACTIVITY",
        title: "Your portfolio",
        description:
          "Your available funds, open predictions, and potential returns will appear here.",
        icon: BriefcaseBusiness,
        action: "Explore markets",
      },
      Claims: {
        eyebrow: "YOUR REWARDS",
        title: "Claim winnings",
        description:
          "Eligible winnings and refunds will appear here after the relevant market has been settled.",
        icon: WalletCards,
        action: "Explore markets",
      },
      History: {
        eyebrow: "YOUR RECORDS",
        title: "Activity history",
        description:
          "Review your past predictions, market outcomes, claims, and refunds here.",
        icon: History,
        action: "Explore markets",
      },
    }[page];

    const PageIcon = pageInfo.icon;

    return (
      <section className="page-section simple-page">
        <span className="eyebrow">{pageInfo.eyebrow}</span>

        <div className="simple-page-icon">
          <PageIcon size={30} />
        </div>

        <h1>{pageInfo.title}</h1>
        <p>{pageInfo.description}</p>

        {!wallet && (
          <p className="page-hint">
            Connect your wallet to prepare to use this feature.
          </p>
        )}

        <button
          className="primary-button"
          type="button"
          onClick={() => navigateTo("Markets")}
        >
          {pageInfo.action} <ArrowUpRight size={16} />
        </button>

        <div className="empty-state">
          <CircleHelp size={23} />
          <h3>Nothing to display yet</h3>
          <p>
            This section will become functional when live market data,
            contract positions, and transaction records are connected.
          </p>
        </div>
      </section>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <button
          className="brand"
          type="button"
          onClick={() => navigateTo("Home")}
          aria-label="Go to Asset Oracle home"
        >
          <span className="brand-mark" aria-hidden="true">
            A
          </span>
          <span>
            <span className="brand-name">ASSET ORACLE</span>
            <span className="brand-tagline">
              REAL-WORLD TRUTH, ON-CHAIN.
            </span>
          </span>
        </button>

        <nav className="desktop-navigation" aria-label="Main navigation">
          {navigation.map(({ label, icon: Icon }) => (
            <button
              className={page === label ? "nav-link active" : "nav-link"}
              key={label}
              type="button"
              onClick={() => navigateTo(label)}
              aria-current={page === label ? "page" : undefined}
            >
              <Icon size={17} />
              {label}
            </button>
          ))}
        </nav>

        <div className="header-actions">
          <button
            className="connect-button"
            type="button"
            onClick={handleConnectWallet}
            disabled={walletBusy}
          >
            {walletBusy
              ? "Connecting..."
              : wallet
                ? `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`
                : "Connect wallet"}
          </button>

          <button
            className="mobile-menu-button"
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
      </header>

      {mobileMenuOpen && (
        <nav className="mobile-navigation" aria-label="Mobile navigation">
          {navigation.map(({ label, icon: Icon }) => (
            <button
              className={page === label ? "nav-link active" : "nav-link"}
              key={label}
              type="button"
              onClick={() => navigateTo(label)}
            >
              <Icon size={19} />
              {label}
            </button>
          ))}
        </nav>
      )}

      {wallet && (
        <section className="wallet-status" aria-live="polite">
          <div>
            <strong>
              {wallet.chainId === ASSET_CHAIN_TESTNET.chainId
                ? "Asset Chain Testnet"
                : "Wallet connected"}
            </strong>
            <p>
              {wallet.address.slice(0, 10)}...
              {wallet.address.slice(-8)}
            </p>

            {wallet.chainId !== ASSET_CHAIN_TESTNET.chainId && (
              <p>Connected to chain ID {wallet.chainId}</p>
            )}
          </div>

          {wallet.chainId !== ASSET_CHAIN_TESTNET.chainId && (
            <button
              className="primary-button"
              type="button"
              onClick={handleSwitchNetwork}
              disabled={walletBusy}
            >
              {walletBusy ? "Switching..." : "Switch network"}
            </button>
          )}
        </section>
      )}

      {walletMessage && (
        <p className="wallet-message" role="status">
          {walletMessage}
        </p>
      )}

      <main key={page} className="page-content">
        {renderPageContent()}
      </main>

      <footer className="footer">
        <div>
          <strong>ASSET ORACLE</strong>
          <p>REAL-WORLD TRUTH, ON-CHAIN.</p>
        </div>

        <button
          className="footer-help"
          type="button"
          onClick={() =>
            setWalletMessage(
              "Asset Oracle helps users explore prediction markets and understand how outcomes are verified. Live participation is not yet enabled.",
            )
          }
        >
          <CircleHelp size={15} /> Help
        </button>

        <span>Early development · Testnet first</span>

        <div className="footer-socials" aria-label="Official social channels">
          <a
            href="https://x.com/assetoracle"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Asset Oracle on X"
            title="Follow Asset Oracle on X"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="currentColor"
                d="M18.9 2H22l-6.8 7.8L23.2 22h-6.3l-4.9-8-7 8H1.9l7.3-8.4L1.3 2h6.5l4.4 7.4L18.9 2Zm-1.1 17.9h1.7L6.8 4H5L17.8 19.9Z"
              />
            </svg>
          </a>

          <a
            href="https://t.me/assetoracle"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Join Asset Oracle on Telegram"
            title="Join Asset Oracle on Telegram"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="currentColor"
                d="M21.9 3.4 18.7 20c-.2 1.2-.9 1.5-1.8.9l-5-3.7-2.4 2.3c-.3.3-.5.5-1 .5l.4-5.1 9.3-8.4c.4-.4-.1-.6-.6-.2L6.1 13.6l-5-1.6c-1.1-.3-1.1-1.1.2-1.6L20.8 2c.9-.3 1.7.2 1.1 1.4Z"
              />
            </svg>
          </a>

          <a
            href="https://discord.gg/2HfFcsWEFq"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Join Asset Oracle on Discord"
            title="Join Asset Oracle on Discord"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="currentColor"
                d="M19.7 5.2A18 18 0 0 0 15.3 4l-.5 1a16 16 0 0 0-5.6 0l-.5-1a18 18 0 0 0-4.4 1.2C1.5 9.4.7 13.5 1.1 17.5a18 18 0 0 0 5.4 2.7l1.2-2a11 11 0 0 1-1.9-.9l.5-.4a13 13 0 0 0 11.4 0l.5.4a11 11 0 0 1-1.9.9l1.2 2a18 18 0 0 0 5.4-2.7c.5-4.6-.8-8.7-3.2-12.3ZM8.8 14.7c-1.1 0-1.9-1-1.9-2.1s.8-2.1 1.9-2.1 1.9 1 1.9 2.1-.8 2.1-1.9 2.1Zm6.4 0c-1.1 0-1.9-1-1.9-2.1s.8-2.1 1.9-2.1 1.9 1-1.9 2.1Z"
              />
            </svg>
          </a>
        </div>
      </footer>

      <nav className="bottom-navigation" aria-label="Quick navigation">
        {navigation.map(({ label, icon: Icon }) => (
          <button
            className={
              page === label ? "bottom-nav-link active" : "bottom-nav-link"
            }
            key={label}
            type="button"
            onClick={() => navigateTo(label)}
            aria-current={page === label ? "page" : undefined}
          >
            <Icon size={19} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

export default App;
