import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BriefcaseBusiness,
  ChartNoAxesCombined,
  ArrowUpRight,
  FileText,
  History,
  House,
  ShieldCheck,
  Trophy,
  WalletCards,
  CircleHelp,
  X,
} from "lucide-react";
import { useReadContracts, useSignMessage } from "wagmi";
import { MARKET_STATUS, assetOracleMarketManagerAbi } from "./contracts/assetOracle";
import { isAddress } from "viem";
import {
  ASSET_CHAIN_TESTNET_ID,
} from "./contracts/assetOracle";

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
import TermsOfServicePage from "./pages/TermsOfServicePage";
import { useWalletStatus } from "./hooks/useWalletStatus";
import {
  listPublishedMarkets,
  requestWalletNonce,
  ensureWalletSession,
  getWalletSession,
  getWalletAccountData,
  getMyProposals,
  getWalletRole,
  createReferralCode,
  getPersonalReferralStats,
  getReferralLeaderboard,
  attributeReferral,
  type ReferralLeaderboardEntry,
  type StoredMarketProposal,
  type WalletRoleResponse,
  type WalletAccountData,
  type PersonalReferralStats,
} from "./markets/marketApi";
import {
  categoryLabel,
  categorySymbol,
  formatDate,
} from "./utils/format";
import type { MarketFilter } from "./types";
import "./style.css";

const categories: MarketFilter[] = [
  "All Markets",
  "Live",
  "Digital Assets",
  "Sports",
  "RWA",
  "Economics",
  "Regional",
  "Settled Markets",
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
    "Terms of Service": "/terms",
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
    terms: "Terms of Service",
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
    useState<MarketFilter>("All Markets");
  const [search, setSearch] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [proposalFormOpen, setProposalFormOpen] = useState(false);
  const [proposalMessage, setProposalMessage] = useState("");
  const [referralMessage, setReferralMessage] = useState("");
  const [referralLink, setReferralLink] = useState("");
  const [referralLeaderboard, setReferralLeaderboard] = useState<ReferralLeaderboardEntry[]>([]);
  const [referralLeaderboardLoading, setReferralLeaderboardLoading] = useState(false);
  const [referralLeaderboardError, setReferralLeaderboardError] = useState("");
  const [referralActionLoading, setReferralActionLoading] = useState(false);
  const [personalReferralStats, setPersonalReferralStats] = useState<PersonalReferralStats | null>(null);
  const [accountData, setAccountData] = useState<WalletAccountData | null>(null);
  const [accountDataLoading, setAccountDataLoading] = useState(false);
  const [accountDataError, setAccountDataError] = useState("");

  const [publishedMarkets, setPublishedMarkets] =
    useState<DisplayMarket[]>([]);

  // Read each published market's canonical status from its verified manager.
  // These reads are public and refresh automatically, independent of wallet connection.
  const onchainPublishedMarkets = publishedMarkets.filter(
    (market) =>
      market.onchainMarketId &&
      market.onchainManagerAddress &&
      market.onchainChainId === ASSET_CHAIN_TESTNET_ID,
  );
  const marketStatusReads = useReadContracts({
    contracts: onchainPublishedMarkets.map((market) => ({
      address: market.onchainManagerAddress as `0x${string}`,
      abi: assetOracleMarketManagerAbi,
      functionName: "getMarket" as const,
      args: [BigInt(market.onchainMarketId!)] as const,
    })),
    query: {
      enabled: onchainPublishedMarkets.length > 0,
      refetchInterval: 15_000,
    },
  });
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
    handleConnect,
    handleOpenAccount,
    handleSwitchNetwork,
    handleDisconnectWallet,
  } = useWalletStatus();

  const { signMessageAsync } = useSignMessage();
  const isAdmin = useIsAdmin(address);

  useEffect(() => {
    if (!helpOpen) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setHelpOpen(false);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [helpOpen]);

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

    // Only expose markets whose publication metadata is complete and matches
    // the configured Enugu manager. Approval alone is not on-chain publication.
    const markets: DisplayMarket[] = result.markets
      .filter((market) =>
        market.status === "APPROVED" &&
        typeof market.onchainMarketId === "string" &&
        /^[1-9][0-9]*$/.test(market.onchainMarketId) &&
        typeof market.onchainTxHash === "string" &&
        /^0x[0-9a-fA-F]{64}$/.test(market.onchainTxHash) &&
        typeof market.onchainManagerAddress === "string" &&
        isAddress(market.onchainManagerAddress) &&
        market.onchainChainId === ASSET_CHAIN_TESTNET_ID
      )
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

  // Hash-based navigation can preserve the previous scroll position. Start
  // the Terms page at its heading whenever it is opened, including via footer.
  useEffect(() => {
    if (page === "Terms of Service") {
      window.scrollTo({ top: 0, behavior: "auto" });
    }
  }, [page]);

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
    setPersonalReferralStats(null);
    setAccountData(null);
    setAccountDataError("");
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


  const loadWalletAccountData = useCallback(async () => {
    const requestedAddress = addressRef.current;
    if (!requestedAddress) {
      setAccountData(null);
      setAccountDataError("");
      return;
    }
    setAccountDataLoading(true);
    setAccountDataError("");
    try {
      const result = await getWalletAccountData(requestedAddress);
      if (addressRef.current?.toLowerCase() !== requestedAddress.toLowerCase()) return;
      setAccountData(result);
    } catch (error) {
      if (addressRef.current?.toLowerCase() !== requestedAddress.toLowerCase()) return;
      setAccountDataError(error instanceof Error ? error.message : "Unable to load wallet account data.");
    } finally {
      if (addressRef.current?.toLowerCase() === requestedAddress.toLowerCase()) setAccountDataLoading(false);
    }
  }, []);

  useEffect(() => {
    if (page !== "Claims" && page !== "History") return;
    if (!address) {
      setAccountData(null);
      setAccountDataLoading(false);
      setAccountDataError("");
      return;
    }
    void loadWalletAccountData();
  }, [page, address, loadWalletAccountData]);

  useEffect(() => {
    if (page !== "Referrals" || !address) return;
    const session = getWalletSession(address);
    if (!session) {
      setPersonalReferralStats(null);
      return;
    }
    let active = true;
    void getPersonalReferralStats(address).then((stats) => {
      if (active) setPersonalReferralStats(stats);
    }).catch(() => {
      if (active) setPersonalReferralStats(null);
    });
    return () => { active = false; };
  }, [page, address]);

  const selectedMarket = selectedMarketId
    ? publishedMarkets.find((market) => market.id === selectedMarketId) ?? null
    : null;

  function navigateTo(nextPage: Page) {
    if (nextPage === "Home" || nextPage === "Markets") {
      void loadMarkets();
    }
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

  const marketLifecycle = new Map<string, { status: number; closeTime: number }>();
  onchainPublishedMarkets.forEach((market, index) => {
    const read = marketStatusReads.data?.[index];
    if (read?.status !== "success" || !read.result) return;
    const onchainMarket = read.result as unknown as {
      status?: bigint;
      closeTime?: bigint;
      13?: bigint;
      6?: bigint;
    };
    const statusValue = onchainMarket.status ?? onchainMarket[13];
    const closeTimeValue = onchainMarket.closeTime ?? onchainMarket[6];
    if (statusValue === undefined) return;
    marketLifecycle.set(market.id, {
      status: Number(statusValue),
      closeTime: closeTimeValue === undefined ? 0 : Number(closeTimeValue),
    });
  });

  const settledMarkets = publishedMarkets.filter(
    (market) => marketLifecycle.get(market.id)?.status === MARKET_STATUS.SETTLED,
  );
  const liveMarkets = publishedMarkets.filter((market) => {
    const lifecycle = marketLifecycle.get(market.id);
    return lifecycle?.status === MARKET_STATUS.OPEN &&
      lifecycle.closeTime > Math.floor(Date.now() / 1000);
  });
  const activeMarkets = publishedMarkets.filter(
    (market) => marketLifecycle.get(market.id)?.status !== MARKET_STATUS.SETTLED,
  );
  const sourceMarkets =
    activeCategory === "Live" ? liveMarkets :
    activeCategory === "Settled Markets" ? settledMarkets :
    activeMarkets;

  const filteredMarkets = sourceMarkets
    .filter((market) => {
      const matchesCategory =
        activeCategory === "All Markets" ||
        activeCategory === "Live" ||
        activeCategory === "Settled Markets" ||
        (activeCategory === "Digital Assets" ? market.category === "Crypto" : market.category === activeCategory);

      const matchesSearch =
        market.question.toLowerCase().includes(query) ||
        market.category.toLowerCase().includes(query) ||
        market.label.toLowerCase().includes(query) ||
        market.description.toLowerCase().includes(query);

      return matchesCategory && matchesSearch;
    })
    .sort((a, b) => {
      const idA = a.onchainMarketId ? Number(a.onchainMarketId) : Number.MAX_SAFE_INTEGER;
      const idB = b.onchainMarketId ? Number(b.onchainMarketId) : Number.MAX_SAFE_INTEGER;
      return idA - idB;
    });

  function renderMarketCard(market: DisplayMarket) {
    return (
      <article className="market-card market-card-compact" key={market.id}>
        <div className="market-card-top">
          <span className="market-symbol">{market.symbol}</span>
          <div className="market-card-badges">
            <span className="market-category">{market.label}</span>
            {marketLifecycle.get(market.id)?.status === MARKET_STATUS.SETTLED ? (
              <span className="market-status market-status-settled">SETTLED</span>
            ) : liveMarkets.some((item) => item.id === market.id) ? (
              <span className="market-status market-status-live"><span className="live-indicator" aria-hidden="true" />LIVE</span>
            ) : (
              <span className="market-status">{market.status || "Published"}</span>
            )}
          </div>
        </div>
        <h3>{market.question}</h3>
        <div className="market-card-bottom">
          <span className="market-status-note">Closes {market.closesAt ? formatDate(market.closesAt) : "date unavailable"}</span>
          <button className="primary-button open-market-button" type="button" onClick={() => openMarket(market)}>
            Open Market <ArrowUpRight size={15} />
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
      await ensureWalletSession(requestedAddress, signMessageAsync);
      const result = await getWalletRole(requestedAddress);

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
      await ensureWalletSession(requestedAddress, signMessageAsync);
      const result = await getMyProposals(requestedAddress);

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
      await ensureWalletSession(requestedAddress, signMessageAsync);
      const { code } = await createReferralCode(requestedAddress);
      const stats = await getPersonalReferralStats(requestedAddress);
      if (addressRef.current?.toLowerCase() !== requestedAddress.toLowerCase()) return;
      setPersonalReferralStats(stats);
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
      await ensureWalletSession(requestedAddress, signMessageAsync);
      const result = await attributeReferral(requestedAddress, referralCode);
      const stats = await getPersonalReferralStats(requestedAddress);
      setPersonalReferralStats(stats);
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
          onchainManagerAddress={selectedMarket.onchainManagerAddress}
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
          liveMarketIds={new Set(liveMarkets.map((market) => market.id))}
          settledMarketIds={new Set(settledMarkets.map((market) => market.id))}
          marketsLoading={marketsLoading}
          marketsError={marketsError}
          proposalMessage={proposalMessage}
          walletConnected={Boolean(wallet)}
          onConnect={() => void handleConnect()}
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
          personalStats={personalReferralStats}
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

    if (page === "Terms of Service") {
      return <TermsOfServicePage onBack={() => navigateTo("Home")} />;
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
        address={address}
        accountData={accountData}
        loading={accountDataLoading}
        error={accountDataError}
        onRetry={() => void loadWalletAccountData()}
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

        <span>Building on Asset Chain</span>
        <button className="footer-legal-link footer-help-button" type="button" onClick={() => setHelpOpen(true)}>
          <CircleHelp size={15} aria-hidden="true" /> Help
        </button>
        <a className="footer-legal-link" href="#/terms">Terms of Service</a>

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

      {helpOpen && (
        <div className="help-overlay" role="presentation" onClick={() => setHelpOpen(false)}>
          <section
            className="help-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="help-dialog-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="help-dialog-header">
              <div className="help-dialog-heading">
                <span className="help-dialog-icon"><CircleHelp size={22} aria-hidden="true" /></span>
                <div>
                  <p className="help-eyebrow">ASSET ORACLE GUIDE</p>
                  <h2 id="help-dialog-title">How can we help?</h2>
                </div>
              </div>
              <button className="help-close-button" type="button" onClick={() => setHelpOpen(false)} aria-label="Close help">
                <X size={20} />
              </button>
            </div>

            <p className="help-intro">A quick guide to exploring markets and using the platform safely.</p>

            <div className="help-topics">
              <article className="help-topic">
                <span className="help-topic-number">01</span>
                <div>
                  <h3>Explore markets</h3>
                  <p>Open <strong>Markets</strong> to browse published markets. Use search and category filters to find a topic. <strong>Live</strong> shows markets currently open, while <strong>Settled Markets</strong> shows markets whose on-chain status is settled.</p>
                </div>
              </article>
              <article className="help-topic">
                <span className="help-topic-number">02</span>
                <div>
                  <h3>Read the market details</h3>
                  <p>Before taking any action, review the market question, closing time, resolution time, and resolution rules. Those rules explain what evidence determines the outcome.</p>
                </div>
              </article>
              <article className="help-topic">
                <span className="help-topic-number">03</span>
                <div>
                  <h3>Connect your wallet</h3>
                  <p>Use a wallet you control and check every request before approving it. The app is configured for Asset Chain Testnet (Chain ID 42421). Never share your recovery phrase or private keys.</p>
                </div>
              </article>
              <article className="help-topic">
                <span className="help-topic-number">04</span>
                <div>
                  <h3>Proposals and your account</h3>
                  <p>Use <strong>My Proposals</strong> to submit or review proposals, and <strong>Portfolio</strong>, <strong>Claims</strong>, and <strong>History</strong> to inspect the information those sections make available to your wallet. Available actions depend on the market state and enabled features.</p>
                </div>
              </article>
              <article className="help-topic">
                <span className="help-topic-number">05</span>
                <div>
                  <h3>Stay safe</h3>
                  <p>Asset Oracle is a developing testnet platform. Market availability and features can change; do not assume a market action is enabled just because a market is visible. Testnet assets may have no real-world value. This platform is not financial advice.</p>
                </div>
              </article>
            </div>

            <div className="help-dialog-footer">
              <span>Still need assistance?</span>
              <div className="help-contact-links">
                <a href="https://t.me/assetoracle" target="_blank" rel="noopener noreferrer">Telegram</a>
                <a href="https://discord.gg/2HfFcsWEFq" target="_blank" rel="noopener noreferrer">Discord</a>
              </div>
            </div>
          </section>
        </div>
      )}

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
