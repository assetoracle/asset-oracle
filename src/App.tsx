import { useEffect, useState } from "react";
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
import {
  connectWallet,
  switchToAssetChainTestnet,
  ASSET_CHAIN_TESTNET,
  type WalletConnection,
} from "./wallet";
import { listPublishedMarkets } from "./markets/marketApi";

type Page =
  | "Home"
  | "Markets"
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

type PublishedMarket = {
  id: string;
  question: string;
  description: string;
  category: Exclude<MarketCategory, "All Markets">;
  closesAt: string;
  resolvesAt: string;
  status: string;
};

type DisplayMarket = PublishedMarket & {
  symbol: string;
  label: string;
  endDate: string;
};

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

function App() {
  const [page, setPage] = useState<Page>("Home");

  const [activeCategory, setActiveCategory] =
    useState<MarketCategory>("All Markets");

  const [search, setSearch] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [publishedMarkets, setPublishedMarkets] =
    useState<DisplayMarket[]>([]);

  const [marketsLoading, setMarketsLoading] = useState(true);
  const [marketsError, setMarketsError] = useState("");

  const [selectedMarket, setSelectedMarket] =
    useState<DisplayMarket | null>(null);

  const [wallet, setWallet] = useState<WalletConnection | null>(null);
  const [walletBusy, setWalletBusy] = useState(false);
  const [walletMessage, setWalletMessage] = useState("");
  const [referralMessage, setReferralMessage] = useState("");

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
        if (active) {
          setMarketsLoading(false);
        }
      }
    }

    void loadMarkets();

    return () => {
      active = false;
    };
  }, []);

  async function handleConnectWallet() {
    setWalletBusy(true);
    setWalletMessage("");

    try {
      const connection = await connectWallet();

      setWallet(connection);

      setWalletMessage(
        connection.chainId.toLowerCase() ===
          ASSET_CHAIN_TESTNET.chainId.toLowerCase()
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

      if (