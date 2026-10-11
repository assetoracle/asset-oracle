
import { useEffect, useState } from "react";
import {
  useAccount,
  useDisconnect,
  useSwitchChain,
  useSignMessage,
} from "wagmi";
import { useAppKit } from "@reown/appkit/react";
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
  Users,
  Trophy,
  Copy,
  Gift,
  Link2,
  Medal,
  CheckCircle2,
  CircleAlert,
} from "lucide-react";

import MarketDetailPage from "./components/MarketDetailPage";
import WalletHelpPanel from "./components/WalletHelpPanel";
import { MarketProposalForm } from "./components/MarketProposalForm";
import Portfolio from "./components/Portfolio";
import {
  listPublishedMarkets,
  requestWalletNonce,
  getMyProposals,
  type StoredMarketProposal,
} from "./markets/marketApi";

type Page =
  | "Home"
  | "Markets"
  | "My Proposals"
  | "Portfolio"
  | "Claims"
  | "History"
  | "Referrals";

type MarketCategory =
  | "All Markets"
  | "Crypto"
  | "Sports"
  | "Economics"
  | "RWA"
  | "Regional";

type DisplayMarket = {
  id: string;
  question: string;
  description: string;
  category: Exclude<MarketCategory, "All Markets">;
  closesAt: string;
  resolvesAt: string;
  status: string;
  symbol: string;
  label: string;
  endDate: string;
};

type WalletConnection = {
  address: string;
  chainId: string;
};

const ASSET_CHAIN_ID = 42421;

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
  { label: "My Proposals" as const, icon: BriefcaseBusiness },
  { label: "Portfolio" as const, icon: BriefcaseBusiness },
  { label: "Claims" as const, icon: WalletCards },
  { label: "History" as const, icon: History },
];

const moreNavigation = [
  { label: "Referrals" as const, icon: Trophy },
];

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function categoryLabel(category: string): string {
  const labels: Record<string, string> = {
    Crypto: "CRYPTO",
    Sports: "SPORTS",
    Economics: "ECONOMICS",
    RWA: "REAL-WORLD ASSETS",
    Regional: "REGIONAL & GLOBAL",
  };

  return labels[category] ?? category.toUpperCase();
}

function categorySymbol(category: string): string {
  const symbols: Record<string, string> = {
    Crypto: "CR",
    Sports: "SP",
    Economics: "EC",
    RWA: "RW",
    Regional: "RG",
  };

  return symbols[category] ?? "AO";
}

function normalizeChainId(chainId: string | number): string {
  if (typeof chainId === "number") {
    return `0x${chainId.toString(16)}`;
  }

  const normalized = chainId.toLowerCase();

  if (normalized.startsWith("0x")) {
    return normalized;
  }

  const decimal = Number(normalized);

  if (Number.isFinite(decimal) && decimal >= 0) {
    return `0x${decimal.toString(16)}`;
  }

  return normalized;
}

function isTestnet(chainId: string): boolean {
  return (
    normalizeChainId(chainId) ===
    normalizeChainId(ASSET_CHAIN_ID)
  );
}

function displayChainId(chainId: string): string {
  try {
    if (chainId.toLowerCase().startsWith("0x")) {
      return `${parseInt(chainId, 16)} (${chainId})`;
    }

    return `${Number(chainId)} (${chainId})`;
  } catch {
    return chainId;
  }
}

function App() {
  const [page, setPage] = useState<Page>("Home");
  const [activeCategory, setActiveCategory] =
    useState<MarketCategory>("All Markets");
  const [search, setSearch] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [walletHelpOpen, setWalletHelpOpen] = useState(false);
  const [proposalFormOpen, setProposalFormOpen] = useState(false);
  const [proposalMessage, setProposalMessage] = useState("");

  const [publishedMarkets, setPublishedMarkets] =
    useState<DisplayMarket[]>([]);
  const [marketsLoading, setMarketsLoading] = useState(true);
  const [marketsError, setMarketsError] = useState("");

  const [selectedMarket, setSelectedMarket] =
    useState<DisplayMarket | null>(null);

  const [walletBusy, setWalletBusy] = useState(false);
  const [walletMessage, setWalletMessage] = useState("");
  const [referralMessage, setReferralMessage] = useState("");

  const [myProposals, setMyProposals] =
    useState<StoredMarketProposal[]>([]);
  const [myProposalsLoading, setMyProposalsLoading] =
    useState(false);
  const [myProposalsError, setMyProposalsError] =
    useState("");
  const [myProposalsLoaded, setMyProposalsLoaded] =
    useState(false);

  // Keep the existing Reown AppKit wallet connection.
  const { open } = useAppKit();

  const { address, chainId, isConnected } = useAccount();
  const { disconnectAsync } = useDisconnect();
  const { switchChainAsync } = useSwitchChain();
  const { signMessageAsync } = useSignMessage();

  const wallet: WalletConnection | null =
    isConnected && address
      ? {
          address,
          chainId: normalizeChainId(chainId ?? ""),
        }
      : null;

  // Clear account-specific data when the connected wallet changes.
  useEffect(() => {
    setReferralMessage("");
    setMyProposals([]);
    setMyProposalsLoaded(false);
    setMyProposalsError("");
  }, [address]);

  // Load only markets approved for publication.
  useEffect(() => {
    let active = true;

    async function loadMarkets() {
      setMarketsLoading(true);
      setMarketsError("");

      try {
        const result = await listPublishedMarkets();

        if (!active) return;

        const markets: DisplayMarket[] = result.markets
          .filter((market) => market.status === "APPROVED")
          .map((market) => ({
            id: market.id,
            question: market.question,
            description: market.description,
            category: market.category,
            closesAt: market.closesAt,
            resolvesAt: market.resolvesAt,
            status: market.status,
            symbol: categorySymbol(market.category),
            label: categoryLabel(market.category),
            endDate: formatDate(market.resolvesAt),
          }));

        setPublishedMarkets(markets);
      } catch (error) {
        if (!active) return;

        setMarketsError(
          error instanceof Error
            ? error.message
            : "Unable to load published markets.",
        );
      } finally {
        if (active) setMarketsLoading(false);
      }
    }

    void loadMarkets();

    return () => {
      active = false;
    };
  }, []);

  // Keep the wallet status aligned with the active account and network.
  useEffect(() => {
    if (!wallet) {
      setWalletMessage("");
      return;
    }

    if (isTestnet(wallet.chainId)) {
      setWalletMessage(
        "Wallet connected to Asset Chain Testnet.",
      );
    } else {
      setWalletMessage(
        `Wallet connected on chain ID ${displayChainId(
          wallet.chainId,
        )}. Switch to Asset Chain Testnet to continue.`,
      );
    }
  }, [wallet?.address, wallet?.chainId]);

  function handleOpenWalletHelp() {
  setWalletMessage("");
  void handleConnectWallet();
  }

  async function handleConnectWallet() {
    setWalletHelpOpen(false);
    setWalletBusy(true);
    setWalletMessage("");

    try {
      await open({ view: "Connect" });
    } catch (error) {
      setWalletMessage(
        error instanceof Error
          ? error.message
          : "Unable to open the wallet selector.",
      );
    } finally {
      setWalletBusy(false);
    }
  }

  
async function handleSwitchNetwork() {
  setWalletBusy(true);
  setWalletMessage("");

  try {
    await switchChainAsync({
      chainId: ASSET_CHAIN_ID,
    });

    setWalletMessage(
      "Successfully switched to Asset Chain Testnet (42421).",
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "";

    console.error("Asset Chain network switch failed:", error);

    if (
      /user rejected|user denied|user cancelled/i.test(errorMessage)
    ) {
      setWalletMessage(
        "Network switch was cancelled. Try again, or switch to Asset Chain Testnet in your wallet.",
      );
    } else {
      setWalletMessage(
        "Unable to switch networks from this browser. Open Asset Oracle in your wallet's built-in browser, or switch to Asset Chain Testnet manually. Chain ID: 42421.",
      );
    }
  } finally {
    setWalletBusy(false);
  }
}


function handleOpenNetworkSelector() {
  void open({ view: "Networks" });
}

  async function handleDisconnectWallet() {
    setWalletBusy(true);
    setWalletMessage("");

    try {
      await disconnectAsync();
      setWalletMessage("Wallet disconnected from Asset Oracle.");
      setReferralMessage("");
      setMyProposals([]);
      setMyProposalsLoaded(false);
      setMyProposalsError("");
    } catch (error) {
      setWalletMessage(
        error instanceof Error
          ? error.message
          : "Unable to disconnect the wallet.",
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
    setReferralMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const query = search.trim().toLowerCase();

  const filteredMarkets = publishedMarkets.filter((market) => {
    const matchesCategory =
      activeCategory === "All Markets" ||
      market.category === activeCategory;

    const matchesSearch =
      market.question.toLowerCase().includes(query) ||
      market.category.toLowerCase().includes(query) ||
      market.label.toLowerCase().includes(query) ||
      market.description.toLowerCase().includes(query);

    return matchesCategory && matchesSearch;
  });

  function renderMarketCard(market: DisplayMarket) {
    return (
      <article className="market-card" key={market.id}>
        <div className="market-card-top">
          <span className="market-symbol">{market.symbol}</span>
          <div className="market-card-badges">
            <span className="market-category">{market.label}</span>
            <span className="market-status">Approved</span>
          </div>
        </div>

        <h3>{market.question}</h3>
        <p className="market-description">{market.description}</p>

        <div className="market-meta">
          <span>Resolution date</span>
          <span>{market.endDate}</span>
        </div>

        <div className="market-card-bottom">
          <span className="market-status-note">Published market</span>
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

  function renderMarketLoading() {
    return (
      <div className="empty-state" role="status">
        <h3>Loading published markets</h3>
        <p>Retrieving approved markets from Asset Oracle.</p>
      </div>
    );
  }

  function renderMarketError() {
    return (
      <div className="empty-state" role="alert">
        <h3>Unable to load markets</h3>
        <p>{marketsError}</p>
        <button
          className="primary-button"
          type="button"
          onClick={() => window.location.reload()}
        >
          Try again
        </button>
      </div>
    );
  }

  function renderMarketEmptyState() {
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

  function renderHome() {
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
              onClick={() => navigateTo("Markets")}
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
              onClick={() => navigateTo("Markets")}
            >
              All markets <ArrowUpRight size={15} />
            </button>
          </div>

          {marketsLoading
            ? renderMarketLoading()
            : marketsError
              ? renderMarketError()
              : publishedMarkets.length === 0
                ? renderMarketEmptyState()
                : (
                  <div className="market-grid">
                    {publishedMarkets.slice(0, 3).map(renderMarketCard)}
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
            onClick={() => navigateTo("Referrals")}
          >
            Referral leaderboard <ArrowUpRight size={16} />
          </button>
        </section>
      </>
    );
  }

  async function handleLoadMyProposals() {
    if (!address) {
      setMyProposalsError("Connect your wallet first.");
      return;
    }

    setMyProposalsLoading(true);
    setMyProposalsError("");

    try {
      const { message } = await requestWalletNonce(address);
      const signature = await signMessageAsync({ message });

      const result = await getMyProposals(
        address,
        message,
        signature,
      );

      setMyProposals(result.proposals);
      setMyProposalsLoaded(true);
    } catch (error) {
      setMyProposalsError(
        error instanceof Error
          ? error.message
          : "Unable to load your proposals.",
      );
    } finally {
      setMyProposalsLoading(false);
    }
  }

  function handleProposalCreated(proposal: StoredMarketProposal) {
    setProposalFormOpen(false);
    setProposalMessage(
      `Proposal submitted successfully. Status: ${proposal.status}. Reference: ${proposal.id}`,
    );

    setMyProposalsLoaded(false);
  }

  function renderMarkets() {
    return (
      <section className="markets-section page-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">DISCOVER</span>
            <h1>Markets</h1>
            <p>Browse approved markets by category.</p>
          </div>

          <button
            className="primary-button"
            type="button"
            onClick={() => {
              setProposalMessage("");
              setProposalFormOpen(true);
            }}
          >
            Propose a Market
          </button>
        </div>

        {proposalMessage && (
          <div className="empty-state" role="status">
            <h3>Proposal received</h3>
            <p>{proposalMessage}</p>
            <p>
              Your proposal is awaiting review. Submission does not
              guarantee approval or publication.
            </p>
            {wallet && (
              <button
                className="text-action"
                type="button"
                onClick={() => navigateTo("My Proposals")}
              >
                Track my proposal <ArrowUpRight size={15} />
              </button>
            )}
          </div>
        )}

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

        {marketsLoading
          ? renderMarketLoading()
          : marketsError
            ? renderMarketError()
            : filteredMarkets.length === 0
              ? renderMarketEmptyState()
              : (
                <div className="market-grid">
                  {filteredMarkets.map(renderMarketCard)}
                </div>
              )}

        <p className="market-disclaimer">
          Only markets returned by the approved public-market API are
          displayed. Market participation is not yet enabled.
        </p>
      </section>
    );
  }

  function renderMyProposals() {
    return (
      <section className="page-section account-page">
        <div className="section-heading">
          <div>
            <span className="eyebrow">YOUR SUBMISSIONS</span>
            <h1>My Proposals</h1>
            <p>Track the review status of your market proposals.</p>
          </div>
        </div>

        {!wallet ? (
          <div className="empty-state">
            <h3>Connect your wallet</h3>
            <p>
              Connect the wallet you used to submit your proposals.
            </p>
            <button
              className="primary-button"
              type="button"
              onClick={handleOpenWalletHelp}
            >
              Connect wallet
            </button>
          </div>
        ) : (
          <>
            <button
              className="primary-button"
              type="button"
              onClick={handleLoadMyProposals}
              disabled={myProposalsLoading}
            >
              {myProposalsLoading
                ? "Verifying wallet..."
                : "Load my proposals"}
            </button>

            {myProposalsError && (
              <div className="empty-state" role="alert">
                <h3>Unable to load proposals</h3>
                <p>{myProposalsError}</p>
              </div>
            )}

            {myProposalsLoaded && myProposals.length === 0 && (
              <div className="empty-state">
                <h3>No proposals found</h3>
                <p>
                  No submissions were found for this wallet.
                </p>
              </div>
            )}

            <div className="market-grid">
              {myProposals.map((proposal) => (
                <article className="market-card" key={proposal.id}>
                  <div className="market-card-top">
                    <span className="market-category">
                      {categoryLabel(proposal.category)}
                    </span>
                    <span className="market-status">
                      {proposal.status.replaceAll("_", " ")}
                    </span>
                  </div>

                  <h3>{proposal.question}</h3>
                  <p className="market-description">
                    {proposal.description}
                  </p>

                  <div className="market-meta">
                    <span>Submitted</span>
                    <span>{formatDate(proposal.submittedAt)}</span>
                  </div>

                  <div className="market-meta">
                    <span>Market closes</span>
                    <span>{formatDate(proposal.closesAt)}</span>
                  </div>

                  <div className="market-meta">
                    <span>Resolution date</span>
                    <span>{formatDate(proposal.resolvesAt)}</span>
                  </div>

                  <div className="market-meta">
                    <span>Reference</span>
                    <span>{proposal.id.slice(0, 8)}…</span>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </section>
    );
  }

  function renderAccountPage() {
    const pageInfo = {
      Portfolio: {
        eyebrow: "YOUR ACTIVITY",
        title: "Your portfolio",
        description:
          "Your positions, stakes, and outcomes will appear here when contract data is connected.",
        icon: BriefcaseBusiness,
        cards: [
          ["Open positions", "Awaiting contract data"],
          ["Total staked", "Awaiting contract data"],
          ["Realised outcomes", "Awaiting market history"],
        ],
      },
      Claims: {
        eyebrow: "YOUR REWARDS",
        title: "Claims",
        description:
          "Track eligible winnings and refunds after verified market settlement.",
        icon: WalletCards,
        cards: [
          ["Claimable rewards", "Awaiting settlement data"],
          ["Completed claims", "Awaiting transaction history"],
          ["Refunds", "Awaiting contract data"],
        ],
      },
      History: {
        eyebrow: "YOUR RECORDS",
        title: "History",
        description:
          "Review predictions, outcomes, settlement events, and refunds.",
        icon: History,
        cards: [
          ["Predictions", "No records loaded"],
          ["Settlements", "No records loaded"],
          ["Transactions", "No records loaded"],
        ],
      },
    } as const;

    if (page === "My Proposals") {
      return renderMyProposals();
    }

    if (page === "Referrals") {
      return renderReferralLeaderboard();
    }

    if (page === "Home" || page === "Markets") {
      return null;
    }

    if (page === "Portfolio") {
  return (
    <Portfolio
      address={address}
      onConnect={handleOpenWalletHelp}
    />
  );
}

    const info = pageInfo[page];
    const PageIcon = info.icon;

    return (
      <section className="page-section account-page">
        <div className="section-heading">
          <div>
            <span className="eyebrow">{info.eyebrow}</span>
            <h1>{info.title}</h1>
            <p>{info.description}</p>
          </div>
          <div className="account-page-icon">
            <PageIcon size={25} />
          </div>
        </div>

        <div className="account-summary-grid">
          {info.cards.map(([label, value]) => (
            <article className="account-summary-card" key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </article>
          ))}
        </div>

        <div className="account-empty-state">
          <div className="account-empty-icon">
            <CircleHelp size={25} />
          </div>
          <h2>
            {wallet ? "No records available yet" : "Connect your wallet"}
          </h2>
          <p>
            {wallet
              ? "Your wallet is connected, but verified account records are not yet available. This page will populate when the market contracts and account data services are integrated."
              : "Connect your wallet to prepare for account features. Positions, balances, claims, and history will appear only when verified data is available."}
          </p>

          {!wallet && (
            <button
              className="primary-button"
              type="button"
              onClick={handleOpenWalletHelp}
              disabled={walletBusy}
            >
              Connect wallet
            </button>
          )}

          <button
            className="text-action"
            type="button"
            onClick={() => navigateTo("Markets")}
          >
            Explore markets <ArrowUpRight size={15} />
          </button>
        </div>
      </section>
    );
  }

  async function handleCopyReferralLink() {
    if (!wallet) {
      setReferralMessage(
        "Connect your wallet before generating a referral link.",
      );
      return;
    }

    if (!isTestnet(wallet.chainId)) {
      setReferralMessage(
        "Switch to Asset Chain testnet before continuing.",
      );
      return;
    }

    setReferralMessage(
      "Referral link generation requires a backend-issued referral code. That service is not connected yet.",
    );
  }

  function renderReferralLeaderboard() {
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
              {wallet
                ? `${wallet.address.slice(0, 8)}…${wallet.address.slice(-6)} · Referral code pending`
                : "Connect your wallet to get started"}
            </span>
            <button
              className="referral-copy-button"
              type="button"
              onClick={handleCopyReferralLink}
              aria-label="Generate referral link"
            >
              <Copy size={16} />
              <span>Get link</span>
            </button>
          </div>

          {referralMessage && (
            <p className="referral-message" role="status">
              {referralMessage}
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

    if (page === "Home") return renderHome();
    if (page === "Markets") return renderMarkets();

    return renderAccountPage();
  }

  const allNavigation = [...navigation, ...moreNavigation];

  return (
    <div className="app">
      <header className="header">
        <button
          className="brand"
          type="button"
          onClick={() => navigateTo("Home")}
          aria-label="Go to Asset Oracle home"
        >
          <img
            className="brand-logo"
            src="/asset-oracle-logo.png"
            alt="Asset Oracle"
          />
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

          <button
            className={page === "Referrals" ? "nav-link active" : "nav-link"}
            type="button"
            onClick={() => navigateTo("Referrals")}
            aria-current={page === "Referrals" ? "page" : undefined}
          >
            <Trophy size={17} />
            Referrals
          </button>
        </nav>

        <div className="header-actions">
          {wallet ? (
            <div className="wallet-header-actions">
              <button
                className="connect-button"
                type="button"
                onClick={handleConnectWallet}
                disabled={walletBusy}
                title="Manage connected wallet"
              >
                {`${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`}
              </button>
              <button
                className="disconnect-button"
                type="button"
                onClick={handleDisconnectWallet}
                disabled={walletBusy}
              >
                {walletBusy ? "Please wait..." : "Disconnect"}
              </button>
            </div>
          ) : (
            <button
              className="connect-button"
              type="button"
              onClick={handleOpenWalletHelp}
              disabled={walletBusy}
            >
              Connect wallet
            </button>
          )}

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
          {allNavigation.map(({ label, icon: Icon }) => (
            <button
              className={page === label ? "nav-link active" : "nav-link"}
              key={label}
              type="button"
              onClick={() => navigateTo(label)}
              aria-current={page === label ? "page" : undefined}
            >
              <Icon size={19} />
              {label === "Referrals" ? "Referral leaderboard" : label}
            </button>
          ))}
        </nav>
      )}

      {wallet && (
        <section className="wallet-status" aria-live="polite">
          <div>
            <strong>
              {isTestnet(wallet.chainId)
                ? "Asset Chain Testnet"
                : "Wallet connected · Wrong network"}
            </strong>
            <p>
              {wallet.address.slice(0, 10)}...
              {wallet.address.slice(-8)}
            </p>
            <p>
              Chain ID: {displayChainId(wallet.chainId)}
              {isTestnet(wallet.chainId) ? " · Correct network" : ""}
            </p>
          </div>

         
{!isTestnet(wallet.chainId) && (
  <div>
    <button
      className="primary-button"
      type="button"
      onClick={handleSwitchNetwork}
      disabled={walletBusy}
    >
      {walletBusy ? "Switching..." : "Switch network"}
    </button>

    <button
      className="text-action"
      type="button"
      onClick={handleOpenNetworkSelector}
      disabled={walletBusy}
    >
      Choose network in Reown
    </button>
  </div>
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
              "Asset Oracle is building transparent prediction markets and verifiable settlement infrastructure. Market participation is not yet enabled.",
            )
          }
        >
          <CircleHelp size={15} /> Help
        </button>

        <span>Building on Asset Chain</span>

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
                d="M19.7 5.2A18 18 0 0 0 15.3 4l-.5 1a16 16 0 0 0-5.6 0l-.5-1a18 18 0 0 0-4.4 1.2C1.5 9.4.7 13.5 1.1 17.5a18 18 0 0 0 5.4 2.7l1.2-2a11 11 0 0 1-1.9-.9l.5-.4a13 13 0 0 0 11.4 0l.5.4a11 11 0 0 1-1.9.9l1.2 2a18 18 0 0 0 5.4-2.7c.5-4.6-.8-8.7-3.2-12.3ZM8.8 14.7c-1.1 0-1.9-1-1.9-2.1s.8-2.1 1.9-2.1 1.9 1 1.9 2.1-.8 2.1-1.9 2.1Zm6.4 0c-1.1 0-1.9-1-1.9-2.1s.8-2.1 1.9-2.1 1.9 1 1.9 2.1-.8 2.1-1.9 2.1Z"
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

        <button
          className={
            page === "Referrals"
              ? "bottom-nav-link active"
              : "bottom-nav-link"
          }
          type="button"
          onClick={() => navigateTo("Referrals")}
          aria-current={page === "Referrals" ? "page" : undefined}
        >
          <Trophy size={19} />
          <span>Referrals</span>
        </button>
      </nav>

      {walletHelpOpen && (
        <WalletHelpPanel
          onConnect={handleConnectWallet}
          onClose={() => setWalletHelpOpen(false)}
        />
      )}

      {proposalFormOpen && (
        <MarketProposalForm
          address={address ?? ""}
          
signMessage={(message: string) => signMessageAsync({ message })}
          onClose={() => setProposalFormOpen(false)}
          onCreated={handleProposalCreated}
        />
      )}
    </div>
  );
}

export default App;
