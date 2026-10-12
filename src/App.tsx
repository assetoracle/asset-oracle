import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BriefcaseBusiness,
  ChartNoAxesCombined,
  FileText,
  History,
  House,
  ShieldCheck,
  Trophy,
  WalletCards,
} from "lucide-react";
import { useSignMessage } from "wagmi";

import Header from "./components/Header";
import {
  BottomNav,
  type NavItem,
  type Page,
} from "./components/Nav";
import MarketDetailPage from "./components/MarketDetailPage";
import { MarketProposalForm } from "./components/MarketProposalForm";
import AdminDashboard from "./components/AdminDashboard";
import Portfolio from "./components/Portfolio";
import HomePage, {
  type DisplayMarket,
} from "./pages/HomePage";
import MarketsPage from "./pages/MarketsPage";
import MyProposalsPage from "./pages/MyProposalsPage";
import ReferralsPage from "./pages/ReferralsPage";
import AccountPage from "./pages/AccountPage";
import { useWalletStatus } from "./hooks/useWalletStatus";
import {
  listPublishedMarkets,
  requestWalletNonce,
  getMyProposals,
  getWalletRole,
  createReferralCode,
  getReferralLeaderboard,
  attributeReferral,
  type ReferralLeaderboardEntry,
  type StoredMarketProposal,
  type WalletRoleResponse,
} from "./markets/marketApi";
import {
  categoryLabel,
  categorySymbol,
  formatDate,
} from "./utils/format";
import type { MarketCategory } from "./types";
import "./style.css";

const categories: MarketCategory[] = [
  "All Markets",
  "Crypto",
  "Sports",
  "Economics",
  "RWA",
  "Regional",
];

/**
 * Public frontend allowlist used only to show or hide admin navigation.
 * Backend authorization remains mandatory for every admin operation.
 *
 * Configure VITE_ADMIN_WALLET_ADDRESSES as a comma-separated list of
 * designated public wallet addresses in the frontend deployment settings.
 */
const ADMIN_WALLET_ADDRESSES = (
  import.meta.env.VITE_ADMIN_WALLET_ADDRESSES ?? ""
)
  .split(",")
  .map((value: string) => value.trim().toLowerCase())
  .filter(Boolean);

function useIsAdmin(address: string | undefined): boolean {
  if (!address) return false;
  return ADMIN_WALLET_ADDRESSES.includes(address.toLowerCase());
}

function pathForPage(page: Page, marketId?: string): string {
  if (marketId) {
    return `/markets/${encodeURIComponent(marketId)}`;
  }

  const paths: Record<Page, string> = {
    Home: "/",
    Markets: "/markets",
    "My Proposals": "/my-proposals",
    Portfolio: "/portfolio",
    Claims: "/claims",
    History: "/history",
    Referrals: "/referrals",
    Admin: "/admin",
  };

  return paths[page];
}

function parseHash(): {
  page: Page;
  marketId: string | null;
} {
  const raw = window.location.hash.replace(/^#/, "") || "/";
  const parts = raw.split("/").filter(Boolean);

  if (parts[0] === "markets" && parts[1]) {
    return {
      page: "Markets",
      marketId: decodeURIComponent(parts.slice(1).join("/")),
    };
  }

  const routes: Record<string, Page> = {
    "": "Home",
    markets: "Markets",
    "my-proposals": "My Proposals",
    portfolio: "Portfolio",
    claims: "Claims",
    history: "History",
    referrals: "Referrals",
    admin: "Admin",
  };

  return {
    page: routes[parts[0] ?? ""] ?? "Home",
    marketId: null,
  };
}

export default function App() {
  const [page, setPage] = useState<Page>("Home");
  const [selectedMarketId, setSelectedMarketId] = useState<string | null>(
    null,
  );
  const [activeCategory, setActiveCategory] =
    useState<MarketCategory>("All Markets");
  const [search, setSearch] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [proposalFormOpen, setProposalFormOpen] = useState(false);
  const [proposalMessage, setProposalMessage] = useState("");
  const [referralMessage, setReferralMessage] = useState("");
  const [referralLink, setReferralLink] = useState("");
  const [referralLeaderboard, setReferralLeaderboard] = useState<ReferralLeaderboardEntry[]>([]);
  const [referralLeaderboardLoading, setReferralLeaderboardLoading] = useState(false);
  const [referralLeaderboardError, setReferralLeaderboardError] = useState("");
  const [referralActionLoading, setReferralActionLoading] = useState(false);

  const [publishedMarkets, setPublishedMarkets] =
    useState<DisplayMarket[]>([]);
  const [marketsLoading, setMarketsLoading] = useState(true);
  const [marketsError, setMarketsError] = useState("");

  const [myProposals, setMyProposals] =
    useState<StoredMarketProposal[]>([]);
  const [myProposalsLoading, setMyProposalsLoading] = useState(false);
  const [myProposalsError, setMyProposalsError] = useState("");
  const [myProposalsLoaded, setMyProposalsLoaded] = useState(false);
  const [walletRole, setWalletRole] = useState<WalletRoleResponse | null>(null);
  const [roleLoading, setRoleLoading] = useState(false);
  const [roleError, setRoleError] = useState("");

  const {
    address,
    wallet,
    networkState,
    walletBusy,
    walletMessage,
    setWalletMessage,
    handleConnect,
    handleOpenAccount,
    handleSwitchNetwork,
    handleDisconnectWallet,
  } = useWalletStatus();

  const { signMessageAsync } = useSignMessage();
  const isAdmin = useIsAdmin(address);

  const addressRef = useRef<string | undefined>(address);
  addressRef.current = address;

  const navItems = useMemo<NavItem[]>(() => {
    const items: NavItem[] = [
      { label: "Home", icon: House },
      { label: "Markets", icon: ChartNoAxesCombined },
      { label: "My Proposals", icon: FileText },
      { label: "Portfolio", icon: BriefcaseBusiness },
      { label: "Claims", icon: WalletCards },
      { label: "History", icon: History },
      { label: "Referrals", icon: Trophy },
    ];

    if (isAdmin) {
      items.push({ label: "Admin", icon: ShieldCheck });
    }

    return items;
  }, [isAdmin]);

  const isMountedRef = useRef(false);

useEffect(() => {
  isMountedRef.current = true;

  return () => {
    isMountedRef.current = false;
  };
}, []);

const loadMarkets = useCallback(async () => {
  setMarketsLoading(true);
  setMarketsError("");

  try {
    const result = await listPublishedMarkets();

    if (!isMountedRef.current) return;

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
        resolutionRule: market.resolutionRule,
        onchainMarketId: market.onchainMarketId ?? null,
        onchainTxHash: market.onchainTxHash ?? null,
        onchainManagerAddress: market.onchainManagerAddress ?? null,
        onchainChainId: market.onchainChainId ?? null,
      }));

    setPublishedMarkets(markets);
  } catch (error) {
    if (!isMountedRef.current) return;

    setMarketsError(
      error instanceof Error
        ? error.message
        : "Unable to load published markets.",
    );
  } finally {
    if (isMountedRef.current) {
      setMarketsLoading(false);
    }
  }
}, []);

useEffect(() => {
  void loadMarkets();
}, [loadMarkets]);

  // Resolve browser history and direct market-detail links after markets load.
  useEffect(() => {
    function syncFromHash() {
      const route = parseHash();
      setPage(route.page);
      setSelectedMarketId(route.marketId);
      setMobileMenuOpen(false);
    }

    window.addEventListener("hashchange", syncFromHash);
    syncFromHash();

    return () => window.removeEventListener("hashchange", syncFromHash);
  }, []);

  useEffect(() => {
    if (marketsLoading) return;

    const route = parseHash();
    if (!route.marketId) return;

    const exists = publishedMarkets.some(
      (market) => market.id === route.marketId,
    );

    if (!exists && !marketsError) {
      // No detail is shown for unknown or unpublished market IDs.
      setSelectedMarketId(null);
    }
  }, [marketsLoading, marketsError, publishedMarkets]);

  useEffect(() => {
    setReferralMessage("");
    setReferralLink("");
    setMyProposals([]);
    setMyProposalsLoaded(false);
    setMyProposalsError("");
    setWalletRole(null);
    setRoleError("");
    setRoleLoading(false);
  }, [address]);

  useEffect(() => {
    if (page !== "Referrals") return;
    let active = true;
    setReferralLeaderboardLoading(true);
    setReferralLeaderboardError("");
    void getReferralLeaderboard()
      .then((result) => {
        if (active) setReferralLeaderboard(result.leaderboard);
      })
      .catch((error) => {
        if (active) {
          setReferralLeaderboardError(error instanceof Error ? error.message : "Unable to load referral leaderboard.");
        }
      })
      .finally(() => {
        if (active) setReferralLeaderboardLoading(false);
      });
    return () => { active = false; };
  }, [page]);

  const selectedMarket = selectedMarketId
    ? publishedMarkets.find((market) => market.id === selectedMarketId) ?? null
    : null;

  function navigateTo(nextPage: Page) {
    setProposalMessage("");
    setMobileMenuOpen(false);
    setSearch("");
    setActiveCategory("All Markets");
    setReferralMessage("");
    window.location.hash = pathForPage(nextPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openMarket(market: DisplayMarket) {
    window.location.hash = pathForPage("Markets", market.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goBackToMarkets() {
    window.location.hash = pathForPage("Markets");
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
            onClick={() => openMarket(market)}
          >
            View details
          </button>
        </div>
      </article>
    );
  }

  async function handleVerifyWalletRole() {
    const requestedAddress = addressRef.current;

    if (!requestedAddress) {
      setRoleError("Connect your wallet first.");
      return;
    }

    setRoleLoading(true);
    setRoleError("");

    try {
      const { message } = await requestWalletNonce(requestedAddress);
      const signature = await signMessageAsync({ message });
      const result = await getWalletRole(requestedAddress, message, signature);

      if (addressRef.current?.toLowerCase() !== requestedAddress.toLowerCase()) {
        return;
      }

      setWalletRole(result);
    } catch (error) {
      if (addressRef.current?.toLowerCase() !== requestedAddress.toLowerCase()) {
        return;
      }

      setRoleError(
        error instanceof Error
          ? error.message
          : "Unable to verify this wallet's role.",
      );
      setWalletRole(null);
    } finally {
      if (addressRef.current?.toLowerCase() === requestedAddress.toLowerCase()) {
        setRoleLoading(false);
      }
    }
  }

  async function handleLoadMyProposals() {
    const requestedAddress = addressRef.current;

    if (!requestedAddress) {
      setMyProposalsError("Connect your wallet first.");
      return;
    }

    setMyProposalsLoading(true);
    setMyProposalsError("");

    try {
      // TODO: replace per-load signing with a short-lived backend session
      // token when a session-creation endpoint is implemented.
      const { message } = await requestWalletNonce(requestedAddress);
      const signature = await signMessageAsync({ message });

      const result = await getMyProposals(
        requestedAddress,
        message,
        signature,
      );

      if (addressRef.current?.toLowerCase() !== requestedAddress.toLowerCase()) {
        return;
      }

      setMyProposals(result.proposals);
      setMyProposalsLoaded(true);
    } catch (error) {
      if (addressRef.current?.toLowerCase() !== requestedAddress.toLowerCase()) {
        return;
      }

      setMyProposalsError(
        error instanceof Error
          ? error.message
          : "Unable to load your proposals.",
      );
    } finally {
      if (addressRef.current?.toLowerCase() === requestedAddress.toLowerCase()) {
        setMyProposalsLoading(false);
      }
    }
  }

  function handleProposalCreated(proposal: StoredMarketProposal) {
    setProposalFormOpen(false);
    setProposalMessage(
      `Proposal submitted successfully. Status: ${proposal.status}. Reference: ${proposal.id}`,
    );
    setMyProposalsLoaded(false);
  }

  async function handleGetReferralLink() {
    const requestedAddress = addressRef.current;
    if (!requestedAddress || !wallet) {
      setReferralMessage("Connect your wallet before generating a referral link.");
      return;
    }
    if (networkState !== "correct") {
      setReferralMessage("Switch to Asset Chain testnet before continuing.");
      return;
    }

    setReferralActionLoading(true);
    setReferralMessage("");
    try {
      const { message } = await requestWalletNonce(requestedAddress);
      const signature = await signMessageAsync({ message });
      const { code } = await createReferralCode(requestedAddress, message, signature);
      if (addressRef.current?.toLowerCase() !== requestedAddress.toLowerCase()) return;
      const url = new URL(window.location.href);
      url.searchParams.set("ref", code);
      url.hash = "/referrals";
      setReferralLink(url.toString());
      setReferralMessage("Your referral link is ready. Copy it to share.");
    } catch (error) {
      if (addressRef.current?.toLowerCase() !== requestedAddress.toLowerCase()) return;
      setReferralMessage(error instanceof Error ? error.message : "Unable to generate your referral link.");
    } finally {
      if (addressRef.current?.toLowerCase() === requestedAddress.toLowerCase()) {
        setReferralActionLoading(false);
      }
    }
  }

  async function handleAttributeReferral() {
    const requestedAddress = addressRef.current;
    const referralCode = new URLSearchParams(window.location.search).get("ref");
    if (!requestedAddress || !wallet) {
      setReferralMessage("Connect your wallet to register this referral.");
      return;
    }
    if (networkState !== "correct") {
      setReferralMessage("Switch to Asset Chain testnet before continuing.");
      return;
    }
    if (!referralCode) {
      setReferralMessage("No referral code was found in this link.");
      return;
    }

    setReferralActionLoading(true);
    setReferralMessage("");
    try {
      const { message } = await requestWalletNonce(requestedAddress);
      const signature = await signMessageAsync({ message });
      const result = await attributeReferral(requestedAddress, message, signature, referralCode);
      if (addressRef.current?.toLowerCase() !== requestedAddress.toLowerCase()) return;
      setReferralMessage(result.message);
      const url = new URL(window.location.href);
      url.searchParams.delete("ref");
      window.history.replaceState(null, "", url.toString());
    } catch (error) {
      if (addressRef.current?.toLowerCase() !== requestedAddress.toLowerCase()) return;
      setReferralMessage(error instanceof Error ? error.message : "Unable to register this referral.");
    } finally {
      if (addressRef.current?.toLowerCase() === requestedAddress.toLowerCase()) {
        setReferralActionLoading(false);
      }
    }
  }

  function renderContent() {
    if (selectedMarketId && marketsLoading) {
      return (
        <div className="empty-state" role="status">
          <h3>Loading published markets</h3>
          <p>Retrieving approved markets from Asset Oracle.</p>
        </div>
      );
    }

    if (selectedMarket) {
      return (
        <MarketDetailPage
          question={selectedMarket.question}
          category={selectedMarket.label}
          description={selectedMarket.description}
          closesAt={formatDate(selectedMarket.closesAt)}
          endDate={formatDate(selectedMarket.resolvesAt)}
          resolutionRule={selectedMarket.resolutionRule}
          onchainMarketId={selectedMarket.onchainMarketId}
          onchainCloseTime={Math.floor(new Date(selectedMarket.closesAt).getTime() / 1000)}
          onBack={goBackToMarkets}
        />
      );
    }

    if (selectedMarketId && !marketsLoading) {
      return (
        <div className="empty-state">
          <h3>Market not found</h3>
          <p>This market is unavailable or has not been published.</p>
          <button
            className="primary-button"
            type="button"
            onClick={goBackToMarkets}
          >
            Back to markets
          </button>
        </div>
      );
    }

    if (page === "Home") {
      return (
        <HomePage
          markets={publishedMarkets}
          marketsLoading={marketsLoading}
          marketsError={marketsError}
          onExploreMarkets={() => navigateTo("Markets")}
          onOpenMarket={openMarket}
          onRetryMarkets={() => void loadMarkets()}
          onOpenReferrals={() => navigateTo("Referrals")}
          renderMarketCard={renderMarketCard}
        />
      );
    }

    if (page === "Markets") {
      return (
        <MarketsPage
          categories={categories}
          activeCategory={activeCategory}
          search={search}
          markets={filteredMarkets}
          marketsLoading={marketsLoading}
          marketsError={marketsError}
          proposalMessage={proposalMessage}
          walletConnected={Boolean(wallet)}
          onCategoryChange={setActiveCategory}
          onSearchChange={setSearch}
          onPropose={() => {
            setProposalMessage("");
            setProposalFormOpen(true);
          }}
          onTrackProposal={() => navigateTo("My Proposals")}
          onRetryMarkets={() => void loadMarkets()}
          onOpenMarket={openMarket}
        />
      );
    }

    if (page === "My Proposals") {
      return (
        <MyProposalsPage
          walletConnected={Boolean(wallet)}
          proposals={myProposals}
          loading={myProposalsLoading}
          loaded={myProposalsLoaded}
          error={myProposalsError}
          onConnect={() => void handleConnect()}
          onLoad={() => void handleLoadMyProposals()}
          walletRole={walletRole}
          roleLoading={roleLoading}
          roleError={roleError}
          onVerifyRole={() => void handleVerifyWalletRole()}
        />
      );
    }

    if (page === "Portfolio") {
      return (
        <Portfolio
          address={address}
          onConnect={() => void handleConnect()}
        />
      );
    }

    if (page === "Referrals") {
      return (
        <ReferralsPage
          address={address}
          message={referralMessage}
          referralLink={referralLink}
          referralCode={new URLSearchParams(window.location.search).get("ref") ?? ""}
          leaderboard={referralLeaderboard}
          leaderboardLoading={referralLeaderboardLoading}
          leaderboardError={referralLeaderboardError}
          actionLoading={referralActionLoading}
          onGetReferralLink={() => void handleGetReferralLink()}
          onAttributeReferral={() => void handleAttributeReferral()}
          onRetryLeaderboard={() => {
            setReferralLeaderboardLoading(true);
            setReferralLeaderboardError("");
            void getReferralLeaderboard()
              .then((result) => setReferralLeaderboard(result.leaderboard))
              .catch((error) => setReferralLeaderboardError(error instanceof Error ? error.message : "Unable to load referral leaderboard."))
              .finally(() => setReferralLeaderboardLoading(false));
          }}
        />
      );
    }

    if (page === "Admin") {
      if (!isAdmin) {
        return (
          <div className="empty-state">
            <h3>Admin access unavailable</h3>
            <p>This account is not configured as an administrator.</p>
          </div>
        );
      }

      return (
        <AdminDashboard
          address={address}
          signMessage={(message) => signMessageAsync({ message })}
        />
      );
    }

    return (
      <AccountPage
        page={page}
        walletConnected={Boolean(wallet)}
        onConnect={() => void handleConnect()}
        onExploreMarkets={() => navigateTo("Markets")}
      />
    );
  }

  return (
    <div className="app">
      <Header
        page={page}
        navItems={navItems}
        wallet={wallet}
        walletBusy={walletBusy}
        mobileMenuOpen={mobileMenuOpen}
        onNavigate={navigateTo}
        onConnect={() => void handleConnect()}
        onOpenAccount={() => void handleOpenAccount()}
        onDisconnect={() => void handleDisconnectWallet()}
        onToggleMobileMenu={() => setMobileMenuOpen((open) => !open)}
      />

      {wallet && (
        <section className="wallet-status" aria-live="polite">
          <div>
            <strong>
              {networkState === "detecting"
                ? "Detecting network..."
                : networkState === "correct"
                  ? "Asset Chain Testnet"
                  : "Wallet connected · Wrong network"}
            </strong>
            <p>
              {wallet.address.slice(0, 10)}...
              {wallet.address.slice(-8)}
            </p>
            <p>
              Chain ID:{" "}
              {wallet.chainId === null
                ? "Detecting network..."
                : `${Number.parseInt(wallet.chainId, 16)} (${wallet.chainId})`}
              {networkState === "correct" ? " · Correct network" : ""}
            </p>
          </div>

          {networkState === "wrong" && (
            <div>
              <button
                className="primary-button"
                type="button"
                onClick={() => void handleSwitchNetwork()}
                disabled={walletBusy}
              >
                {walletBusy ? "Switching..." : "Switch network"}
              </button>
            </div>
          )}
        </section>
      )}

      {walletMessage && (
        <p className="wallet-message" role="status">
          {walletMessage}
        </p>
      )}

      <main key={page} className="page-content">
        {renderContent()}
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
          Help
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

      <BottomNav
        items={navItems}
        page={page}
        onNavigate={navigateTo}
      />

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
