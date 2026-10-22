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
  CircleHelp,
  X,
} from "lucide-react";
import { useReadContracts, useSignMessage } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { MARKET_STATUS, assetOracleMarketManagerAbi, assetOracleMarketManagerAddress } from "./contracts/assetOracle";
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
import MarketVerificationPage from "./components/MarketVerificationPage";
import { MarketProposalForm } from "./components/MarketProposalForm";
import AdminDashboard from "./components/AdminDashboard";
import ValidatorDashboard from "./components/ValidatorDashboard";
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
  ensureWalletSession,
  clearWalletSession,
  getWalletSession,
  getWalletAccountData,
  getMyProposals,
  getWalletRole,
  getPublicWalletRole,
  createReferralCode,
  getPersonalReferralStats,
  getReferralLeaderboard,
  getPointsLeaderboard,
  getTotalLeaderboard,
  attributeReferral,
  type ReferralLeaderboardEntry,
  type PointsLeaderboardEntry,
  type TotalLeaderboardEntry,
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
import { friendlyError } from "./utils/friendlyError";
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
    Validators: "/validators",
    "Terms of Service": "/terms",
  };

  return paths[page];
}

function navigatePath(path: string): void {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function decodeRoutePath(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    // Keep malformed URL encoding from crashing route parsing.
    return value;
  }
}

function parseRoutePath(pathname: string): {
  page: Page;
  marketId: string | null;
  verificationMarketId: string | null;
} {
  const raw = pathname || "/";
  const parts = raw.split("/").filter(Boolean);

  if (parts[0] === "verify" && parts[1]) {
    return {
      page: "Markets",
      marketId: null,
      verificationMarketId: decodeRoutePath(parts.slice(1).join("/")),
    };
  }

  if (parts[0] === "markets" && parts[1]) {
    return {
      page: "Markets",
      marketId: decodeRoutePath(parts.slice(1).join("/")),
      verificationMarketId: null,
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
    validators: "Validators",
    terms: "Terms of Service",
  };

  return {
    page: routes[parts[0] ?? ""] ?? "Home",
    marketId: null,
    verificationMarketId: null,
  };
}

export default function App() {
  const [page, setPage] = useState<Page>("Home");
  const [selectedMarketId, setSelectedMarketId] = useState<string | null>(
    null,
  );
  const [verificationMarketId, setVerificationMarketId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] =
    useState<MarketFilter>("All Markets");
  const [search, setSearch] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [proposalFormOpen, setProposalFormOpen] = useState(false);
  const [proposalBeingEdited, setProposalBeingEdited] = useState<StoredMarketProposal | null>(null);
  const [proposalMessage, setProposalMessage] = useState("");
  const [referralMessage, setReferralMessage] = useState("");
  const [referralLink, setReferralLink] = useState("");
  const [referralLeaderboard, setReferralLeaderboard] = useState<ReferralLeaderboardEntry[]>([]);
  const [pointsLeaderboard, setPointsLeaderboard] = useState<PointsLeaderboardEntry[]>([]);
  const [totalLeaderboard, setTotalLeaderboard] = useState<TotalLeaderboardEntry[]>([]);
  const [referralLeaderboardLoading, setReferralLeaderboardLoading] = useState(false);
  const [referralLeaderboardError, setReferralLeaderboardError] = useState("");
  const [referralActionLoading, setReferralActionLoading] = useState(false);
  const [personalReferralStats, setPersonalReferralStats] = useState<PersonalReferralStats | null>(null);
  const [accountData, setAccountData] = useState<WalletAccountData | null>(null);
  const [accountDataLoading, setAccountDataLoading] = useState(false);
  const [accountDataError, setAccountDataError] = useState("");
  // The originating route for market detail and verification views. Direct links fall back to Markets.
  const returnHashRef = useRef<string | null>(null);

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
  const [roleError, setRoleError] = useState("");

  const {
    address,
    wallet,
    networkState,
    walletBusy,
    walletMessage,
    handleOpenAccount,
    handleSwitchNetwork,
    handleDisconnectWallet,
  } = useWalletStatus();

  const { signMessageAsync } = useSignMessage();
  const { openConnectModal } = useConnectModal();
  const isAdmin = useIsAdmin(address);

  const validatorStatusReads = useReadContracts({
    contracts: address && assetOracleMarketManagerAddress ? [
      {
        address: assetOracleMarketManagerAddress,
        abi: assetOracleMarketManagerAbi,
        functionName: "isValidator" as const,
        args: [address] as const,
      },
      {
        address: assetOracleMarketManagerAddress,
        abi: assetOracleMarketManagerAbi,
        functionName: "validatorRosterConfigured" as const,
      },
    ] : [],
    query: {
      enabled: Boolean(address && assetOracleMarketManagerAddress && networkState === "correct"),
      refetchInterval: 30_000,
    },
  });
  const onchainValidatorStatus =
    validatorStatusReads.data?.[0]?.status === "success"
      ? validatorStatusReads.data[0].result === true
      : null;
  const onchainValidatorRosterConfigured =
    validatorStatusReads.data?.[1]?.status === "success"
      ? validatorStatusReads.data[1].result === true
      : null;
  const canAccessValidatorDashboard = onchainValidatorStatus === true;

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
    if (canAccessValidatorDashboard) {
      items.push({ label: "Validators", icon: ShieldCheck });
    }

    return items;
  }, [isAdmin, canAccessValidatorDashboard]);

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
        sport: market.sport,
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
      friendlyError(error, "Markets unavailable."),
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
      // Preserve legacy links such as /#/markets by moving the route into the pathname.
      if (window.location.hash.startsWith("#/")) {
        const legacyPath = window.location.hash.slice(1) || "/";
        window.history.replaceState({}, "", `${legacyPath}${window.location.search}`);
      }
      const route = parseRoutePath(window.location.pathname);
      setPage(route.page);
      setSelectedMarketId(route.marketId);
      setVerificationMarketId(route.verificationMarketId);
      setMobileMenuOpen(false);
    }

    window.addEventListener("popstate", syncFromHash);
    syncFromHash();

    return () => window.removeEventListener("popstate", syncFromHash);
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

    const route = parseRoutePath(window.location.pathname);
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
    if (!address || !getWalletSession(address)) clearWalletSession();
  }, [address]);

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
  }, [address]);

  // Establish and cache the wallet session once after the wallet connects.
  // Role checks and protected actions reuse this session until it expires or
  // the active account changes.
  useEffect(() => {
    if (!address || networkState !== "correct") return;
    let active = true;
    setRoleError("");
    // Show the configured role immediately from the connected address. This is
    // display-only; all protected actions continue to require a verified session.
    void getPublicWalletRole(address)
      .then((role) => {
        if (active && addressRef.current?.toLowerCase() === address.toLowerCase()) setWalletRole(role);
      })
      .catch(() => { /* A public role preview failure must not trigger a signature prompt. */ });

    // Establish the one-time session in the connection flow, never from My Proposals.
    void ensureWalletSession(address, (message) => signMessageAsync({ message }))
      .then(async () => {
        const role = await getWalletRole(address);
        if (active) setWalletRole(role);
        const { code } = await createReferralCode(address);
        const stats = await getPersonalReferralStats(address);
        if (!active || addressRef.current?.toLowerCase() !== address.toLowerCase()) return;
        setPersonalReferralStats(stats);
        const url = new URL(window.location.href);
        url.searchParams.set("ref", code);
        url.pathname = "/referrals";
        url.hash = "";
        setReferralLink(url.toString());
      })
      .catch((error) => {
        if (!active) return;
        const message = friendlyError(error, "Wallet setup failed.");
        // Keep the role preview visible if the user declines the one-time session signature.
        if (!getWalletSession(address)) setRoleError("");
        setReferralMessage(message);
      })
      .finally(() => { /* Role preview and session are handled independently. */ });
    return () => { active = false; };
  }, [address, networkState, signMessageAsync]);

  useEffect(() => {
    if (page !== "Referrals") return;
    let active = true;
    setReferralLeaderboardLoading(true);
    setReferralLeaderboardError("");
    void Promise.all([getReferralLeaderboard(), getPointsLeaderboard(), getTotalLeaderboard()])
      .then(([referralsResult, pointsResult, totalResult]) => {
        if (!active) return;
        setReferralLeaderboard(referralsResult.leaderboard);
        setPointsLeaderboard(pointsResult.leaderboard);
        setTotalLeaderboard(totalResult.leaderboard);
      })
      .catch((error) => {
        if (active) setReferralLeaderboardError(friendlyError(error, "Leaderboard unavailable."));
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
      setAccountDataError(friendlyError(error, "Account data unavailable."));
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
    returnHashRef.current = null;
    if (nextPage === "Home" || nextPage === "Markets") {
      void loadMarkets();
    }
    setProposalMessage("");
    setMobileMenuOpen(false);
    setSearch("");
    setActiveCategory("All Markets");
    setReferralMessage("");
    navigatePath(pathForPage(nextPage));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function rememberReturnLocation() {
    const currentRoute = parseRoutePath(window.location.pathname);
    // Avoid stacking detail pages as return destinations; direct links use the Markets fallback.
    if (currentRoute.marketId || currentRoute.verificationMarketId) {
      returnHashRef.current = null;
      return;
    }
    returnHashRef.current = `${window.location.pathname}${window.location.search}` || "/";
  }

  function openMarket(market: DisplayMarket) {
    // Open details for published markets regardless of lifecycle status.
    // On-chain status and deadline checks still disable staking on closed markets.
    rememberReturnLocation();
    navigatePath(pathForPage("Markets", market.id));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goBackToMarkets() {
    // Return to the actual originating route. A directly opened detail/verification link has no in-app origin.
    const returnHash = returnHashRef.current || "/markets";
    returnHashRef.current = null;
    navigatePath(returnHash);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openVerification(market: DisplayMarket) {
    rememberReturnLocation();
    navigatePath(`/verify/${encodeURIComponent(market.id)}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const query = search.trim().toLowerCase();

  const marketLifecycle = new Map<string, { status: number; closeTime: number; outcome: number; resolvedAt: number; evidenceHash: string; evidenceSource: string; totalYes: bigint; totalNo: bigint }>();
  onchainPublishedMarkets.forEach((market, index) => {
    const read = marketStatusReads.data?.[index];
    if (read?.status !== "success" || !read.result) return;
    const onchainMarket = read.result as unknown as {
      status?: bigint; closeTime?: bigint; outcome?: bigint; resolvedAt?: bigint;
      evidenceHash?: string; evidenceSource?: string; totalYes?: bigint; totalNo?: bigint;
      5?: string; 6?: bigint; 8?: bigint; 9?: bigint; 10?: bigint; 12?: bigint; 13?: bigint; 14?: string;
    };
    const statusValue = onchainMarket.status ?? onchainMarket[13];
    const closeTimeValue = onchainMarket.closeTime ?? onchainMarket[6];
    if (statusValue === undefined) return;
    marketLifecycle.set(market.id, {
      status: Number(statusValue),
      closeTime: closeTimeValue === undefined ? 0 : Number(closeTimeValue),
      outcome: Number(onchainMarket.outcome ?? onchainMarket[12] ?? 0n),
      resolvedAt: Number(onchainMarket.resolvedAt ?? onchainMarket[8] ?? 0n),
      evidenceHash: String(onchainMarket.evidenceHash ?? onchainMarket[14] ?? ""),
      evidenceSource: String(onchainMarket.evidenceSource ?? onchainMarket[5] ?? ""),
      totalYes: BigInt(onchainMarket.totalYes ?? onchainMarket[9] ?? 0n),
      totalNo: BigInt(onchainMarket.totalNo ?? onchainMarket[10] ?? 0n),
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
  // Keep closed, disputed, arbitration, refundable and settled markets visible
  // in All Markets; participation is restricted separately to verified live markets.
  const activeMarkets = publishedMarkets;
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

  async function handleLoadMyProposals() {
    const requestedAddress = addressRef.current;

    if (!requestedAddress) {
      setMyProposalsError("Sign in to continue first.");
      return;
    }

    setMyProposalsLoading(true);
    setMyProposalsError("");

    try {
      // My Proposals must never initiate a wallet signature. The one-time
      // verification session is established by the wallet-connected effect.
      // If the user reaches this page before that completes, ask them to wait
      // or retry rather than prompting for a second signature here.
      const session = getWalletSession(requestedAddress);
      if (!session) {
        throw new Error("Wallet verification is not ready yet. Complete the one-time verification requested after connecting your wallet, then try again.");
      }
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
        friendlyError(error, "Proposals unavailable."),
      );
    } finally {
      if (addressRef.current?.toLowerCase() === requestedAddress.toLowerCase()) {
        setMyProposalsLoading(false);
      }
    }
  }

  function handleProposalCreated(proposal: StoredMarketProposal) {
    setProposalFormOpen(false);
    setProposalBeingEdited(null);
    setProposalMessage(
      `Proposal submitted successfully. Status: ${proposal.status}. Reference: ${proposal.id}`,
    );
    setMyProposalsLoaded(false);
  }

  function handleProposalUpdated(proposal: StoredMarketProposal) {
    setProposalFormOpen(false);
    setProposalBeingEdited(null);
    setMyProposals((current) => current.map((item) => item.id === proposal.id ? proposal : item));
    setMyProposalsLoaded(true);
    setProposalMessage(`Proposal updated and resubmitted for approval. Status: ${proposal.status}. Reference: ${proposal.id}`);
  }

  async function handleGetReferralLink() {
    const requestedAddress = addressRef.current;
    if (!requestedAddress || !wallet) {
      setReferralMessage("Sign in to continue before generating a referral link.");
      return;
    }
    if (networkState !== "correct") {
      setReferralMessage("Switch to Asset Chain testnet before continuing.");
      return;
    }

    setReferralActionLoading(true);
    setReferralMessage("");
    try {
      await ensureWalletSession(requestedAddress, (message) => signMessageAsync({ message }));
      const { code } = await createReferralCode(requestedAddress);
      const stats = await getPersonalReferralStats(requestedAddress);
      if (addressRef.current?.toLowerCase() !== requestedAddress.toLowerCase()) return;
      setPersonalReferralStats(stats);
      const url = new URL(window.location.href);
      url.searchParams.set("ref", code);
      url.pathname = "/referrals";
      url.hash = "";
      setReferralLink(url.toString());
      setReferralMessage("Your referral link is ready. Copy it to share.");
    } catch (error) {
      if (addressRef.current?.toLowerCase() !== requestedAddress.toLowerCase()) return;
      setReferralMessage(friendlyError(error, "Referral link unavailable."));
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
      setReferralMessage("Sign in to continue to register this referral.");
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
      await ensureWalletSession(requestedAddress, (message) => signMessageAsync({ message }));
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
      setReferralMessage(friendlyError(error, "Referral registration failed."));
    } finally {
      if (addressRef.current?.toLowerCase() === requestedAddress.toLowerCase()) {
        setReferralActionLoading(false);
      }
    }
  }

  const isWalletBrowser = useMemo(() => {
    if (typeof navigator === "undefined") return false;
    const ua = navigator.userAgent || "";
    if (/MetaMaskMobile|TrustWallet|TokenPocket|imToken|CoinbaseWallet|OKApp|OKXWallet|BitKeep|BitgetWallet|SafePal|MathWallet|OneKey|Zerion|Rainbow/i.test(ua)) return true;
    const mobile = /android|iphone|ipad|ipod/i.test(ua);
    const ethereum = (window as Window & { ethereum?: { isMetaMask?: boolean; isTrust?: boolean; isCoinbaseWallet?: boolean; isTokenPocket?: boolean } }).ethereum;
    return Boolean(mobile && (ethereum?.isMetaMask || ethereum?.isTrust || ethereum?.isCoinbaseWallet || ethereum?.isTokenPocket));
  }, []);

  function openWalletHelp() {
    openConnectModal?.();
  }

  useEffect(() => {
    if (isWalletBrowser) return;
    const installWalletGuide = () => {
      const dialog = document.querySelector<HTMLElement>('[data-rk] [role="dialog"]');
      if (!dialog || dialog.querySelector(".ao-rainbowkit-guide")) return;
      const heading = [...dialog.querySelectorAll<HTMLElement>("h1,h2,h3,h4,div,span,p")].find((element) => element.textContent?.trim() === "What is a Wallet?");
      if (!heading) return;
      // RainbowKit's mobile chooser lays out its wallet list and its "What is a Wallet?" panel side-by-side.
      // Place the guide inside that existing lower panel, not as a sibling of the modal panels.
      let panel: HTMLElement | null = heading.parentElement;
      while (panel && panel !== dialog && !(panel.textContent?.includes("Get a Wallet") && panel.textContent?.includes("Learn More"))) {
        panel = panel.parentElement;
      }
      if (!panel || panel === dialog) return;
      const guide = document.createElement("section");
      guide.className = "ao-rainbowkit-guide";
      guide.innerHTML = '<div class="ao-rainbowkit-guide-heading"><span class="ao-rainbowkit-guide-icon">◎</span><div><h3>Wallet not connecting?</h3><p>Copy the official site link and open it in your wallet browser.</p></div></div><p>Copy <strong>https://assetoracleapp.xyz</strong>, then open MetaMask, Trust Wallet, or OKX Wallet. Go to its Browser or Discover tab and paste the link.</p><button type="button" class="ao-wallet-copy-link">Copy https://assetoracleapp.xyz</button><p class="ao-rainbowkit-guide-safety">Never share your recovery phrase or private keys.</p>';
      const copyButton = guide.querySelector<HTMLButtonElement>(".ao-wallet-copy-link");
      copyButton?.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText("https://assetoracleapp.xyz");
          copyButton.textContent = "Copied!";
        } catch {
          const field = document.createElement("textarea");
          field.value = "https://assetoracleapp.xyz";
          field.setAttribute("readonly", "");
          field.style.position = "fixed";
          field.style.opacity = "0";
          document.body.appendChild(field);
          field.select();
          const copied = document.execCommand("copy");
          field.remove();
          copyButton.textContent = copied ? "Copied!" : "Copy failed — select the link above";
        }
      });
      panel.appendChild(guide);
    };
    installWalletGuide();
    const observer = new MutationObserver(installWalletGuide);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [isWalletBrowser]);

  function renderContent() {
    if (verificationMarketId && marketsLoading) {
      return <div className="empty-state" role="status"><h3>Loading verification record</h3><p>Retrieving the market and its on-chain result.</p></div>;
    }

    if (verificationMarketId && !marketsLoading) {
      const market = publishedMarkets.find((item) => item.id === verificationMarketId);
      if (!market) return <div className="empty-state"><h3>Verification record unavailable</h3><p>This market has not been found in the published market records.</p><button className="primary-button" type="button" onClick={goBackToMarkets}>Back to settled markets</button></div>;
      const record = marketLifecycle.get(market.id);
      if (!record || record.status !== MARKET_STATUS.SETTLED) return <div className="empty-state"><h3>Market not confirmed as settled</h3><p>Verification details are shown only after the on-chain market status confirms settlement.</p><button className="primary-button" type="button" onClick={goBackToMarkets}>Back to markets</button></div>;
      return <MarketVerificationPage market={market} outcome={record.outcome} resolvedAt={record.resolvedAt} evidenceHash={record.evidenceHash} evidenceSource={record.evidenceSource} managerAddress={market.onchainManagerAddress} onBack={goBackToMarkets} backLabel={returnHashRef.current === "/" ? "Back to home" : "Back to markets"} />;
    }

    if (selectedMarketId && marketsLoading) {
      return (
        <div className="empty-state" role="status">
          <h3>Loading published markets</h3>
          <p>Retrieving approved markets from Asset Oracle.</p>
        </div>
      );
    }

    if (selectedMarket) {
      const lifecycle = marketLifecycle.get(selectedMarket.id);
      const marketClosed = !(
        lifecycle &&
        lifecycle.status === MARKET_STATUS.OPEN &&
        lifecycle.closeTime > Math.floor(Date.now() / 1000)
      );
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
          onchainTxHash={selectedMarket.onchainTxHash}
          marketClosed={marketClosed}
          onBack={goBackToMarkets}
          backLabel={returnHashRef.current === "/" ? "Back to home" : "Back to markets"}
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
          markets={liveMarkets}
          marketsLoading={marketsLoading}
          marketsError={marketsError}
          onExploreMarkets={() => navigateTo("Markets")}
          onOpenMarket={openMarket}
          onOpenReferrals={() => navigateTo("Referrals")}
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
          marketOutcomes={new Map(settledMarkets.map((market) => [market.id, marketLifecycle.get(market.id)?.outcome ?? 0]))}
          marketEvidenceSources={new Map(settledMarkets.map((market) => [market.id, marketLifecycle.get(market.id)?.evidenceSource ?? ""]))}
          marketStakeDistribution={new Map(publishedMarkets.map((market) => {
            const lifecycle = marketLifecycle.get(market.id);
            const totalYes = lifecycle?.totalYes ?? 0n;
            const totalNo = lifecycle?.totalNo ?? 0n;
            const total = totalYes + totalNo;
            const hasSideStake = total > 0n;
            const yesPercent = hasSideStake ? Number((totalYes * 10000n) / total) / 100 : 0;
            return [market.id, {
              yesPercent,
              noPercent: hasSideStake ? 100 - yesPercent : 0,
              hasSideStake,
            }] as const;
          }))}
          onVerify={openVerification}
          marketsLoading={marketsLoading}
          marketsError={marketsError}
          proposalMessage={proposalMessage}
          walletConnected={Boolean(wallet)}
          onConnect={openWalletHelp}
          onCategoryChange={setActiveCategory}
          onSearchChange={setSearch}
          onPropose={() => {
            setProposalMessage("");
            setProposalBeingEdited(null);
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
          onConnect={openWalletHelp}
          onLoad={() => void handleLoadMyProposals()}
          onEdit={(proposal) => { setProposalBeingEdited(proposal); setProposalFormOpen(true); }}
          walletRole={walletRole}
          roleError={roleError}
          onchainValidatorStatus={onchainValidatorStatus}
          onchainValidatorRosterConfigured={onchainValidatorRosterConfigured}
        />
      );
    }

    if (page === "Portfolio") {
      return (
        <Portfolio
          address={address}
          onConnect={openWalletHelp}
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
          pointsLeaderboard={pointsLeaderboard}
          totalLeaderboard={totalLeaderboard}
          leaderboardLoading={referralLeaderboardLoading}
          leaderboardError={referralLeaderboardError}
          actionLoading={referralActionLoading}
          onGetReferralLink={() => void handleGetReferralLink()}
          onAttributeReferral={() => void handleAttributeReferral()}
          onRetryLeaderboard={() => {
            setReferralLeaderboardLoading(true);
            setReferralLeaderboardError("");
            void Promise.all([getReferralLeaderboard(), getPointsLeaderboard(), getTotalLeaderboard()])
              .then(([referralsResult, pointsResult, totalResult]) => {
                setReferralLeaderboard(referralsResult.leaderboard);
                setPointsLeaderboard(pointsResult.leaderboard);
                setTotalLeaderboard(totalResult.leaderboard);
              })
              .catch((error) => setReferralLeaderboardError(friendlyError(error, "Leaderboard unavailable.")))
              .finally(() => setReferralLeaderboardLoading(false));
          }}
        />
      );
    }

    if (page === "Terms of Service") {
      return <TermsOfServicePage onBack={() => navigateTo("Home")} />;
    }

    if (page === "Validators") {
      if (!canAccessValidatorDashboard) {
        return (
          <div className="empty-state">
            <h3>Validator access unavailable</h3>
            <p>This dashboard is restricted to designated validator wallets that are authorized by the on-chain manager.</p>
          </div>
        );
      }
      return <ValidatorDashboard />;
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
        onRetry={loadWalletAccountData}
        onConnect={openWalletHelp}
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
        onConnect={openWalletHelp}
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
        <a className="footer-legal-link" href="/terms">Terms of Service</a>

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
                  <h3>Sign in to continue</h3>
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
          initialProposal={proposalBeingEdited}
          onUpdated={handleProposalUpdated}
        />
      )}
    </div>
  );
}
