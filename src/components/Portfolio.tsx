import { friendlyError } from "../utils/friendlyError";

import { useEffect, useState } from "react";
import {
  createPublicClient,
  formatUnits,
  http,
  isAddress,
  type Address,
} from "viem";
import {
  RefreshCw,
  WalletCards,
  ExternalLink,
} from "lucide-react";

type PortfolioProps = {
  address?: Address;
  onConnect: () => void;
};

const TESTNET_CHAIN_ID = 42421;
const TESTNET_RPC = "https://enugu-rpc.assetchain.org";
const TESTNET_EXPLORER = "https://scan-testnet.assetchain.org";

const USDC_ADDRESS =
  "0xc33741fddEBeA854d265db6F9707900Efb0211a2" as Address;

const publicClient = createPublicClient({
  transport: http(TESTNET_RPC, {
    timeout: 12_000,
    retryCount: 0,
  }),
});

const ERC20_ABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    type: "function",
    name: "symbol",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
] as const;

type PortfolioData = {
  balance: string;
  loading: boolean;
  error: string;
};

function formatBalance(value: string): string {
  const number = Number(value);

  if (!Number.isFinite(number)) return value;
  if (number === 0) return "0";
  if (number < 0.000001) return "< 0.000001";

  return number.toLocaleString(undefined, {
    maximumFractionDigits: 6,
  });
}

export default function Portfolio({
  address,
  onConnect,
}: PortfolioProps) {
  const [data, setData] = useState<PortfolioData>({
    balance: "",
    loading: false,
    error: "",
  });
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadBalance() {
      if (!address || !isAddress(address)) {
        setData({ balance: "", loading: false, error: "" });
        return;
      }

      setData({ balance: "", loading: true, error: "" });

      try {
        const chainId = await publicClient.getChainId();

        if (chainId !== TESTNET_CHAIN_ID) {
          throw new Error(
            `RPC returned chain ID ${chainId}; expected ${TESTNET_CHAIN_ID}.`,
          );
        }

        const code = await publicClient.getBytecode({
          address: USDC_ADDRESS,
        });

        if (!code || code === "0x") {
          throw new Error(
            "No contract code found at the configured USDC address.",
          );
        }

        const [rawBalance, decimals, symbol] = await Promise.all([
          publicClient.readContract({
            address: USDC_ADDRESS,
            abi: ERC20_ABI,
            functionName: "balanceOf",
            args: [address],
          }),
          publicClient.readContract({
            address: USDC_ADDRESS,
            abi: ERC20_ABI,
            functionName: "decimals",
          }),
          publicClient.readContract({
            address: USDC_ADDRESS,
            abi: ERC20_ABI,
            functionName: "symbol",
          }),
        ]);

        if (active) {
          setData({
            balance: formatUnits(rawBalance, decimals),
            loading: false,
            error:
              symbol.trim().toLowerCase() === "usdc" ||
              symbol.trim().toLowerCase() === "ausdc.e"
                ? ""
                : `Unexpected token symbol: ${symbol}`,
          });
        }
      } catch (error) {
        if (active) {
          setData({
            balance: "",
            loading: false,
            error:
              friendlyError(error, "Balance unavailable."),
          });
        }
      }
    }

    void loadBalance();

    return () => {
      active = false;
    };
  }, [address, refreshKey]);

  return (
    <section className="page-section account-page">
      <div className="section-heading">
        <div>
          <span className="eyebrow">YOUR ASSETS</span>
          <h1>Your portfolio</h1>
          <p>
            View your USDC testnet balance on Asset Chain.
          </p>
        </div>
        <div className="account-page-icon">
          <WalletCards size={25} />
        </div>
      </div>

      <div className="portfolio-network-banner">
        <span className="network-dot" />
        <div>
          <strong>Asset Chain Testnet</strong>
          <p>Chain ID: {TESTNET_CHAIN_ID}</p>
        </div>
        <a
          href={TESTNET_EXPLORER}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open Asset Chain Testnet explorer"
        >
          <ExternalLink size={17} />
        </a>
      </div>

      {!address ? (
        <div className="account-empty-state">
          <div className="account-empty-icon">
            <WalletCards size={25} />
          </div>
          <h2>Connect your wallet</h2>
          <p>
            Connect your wallet to read your USDC balance.
          </p>
          <button
            className="primary-button"
            type="button"
            onClick={onConnect}
          >
            Connect wallet
          </button>
        </div>
      ) : (
        <>
          <div className="portfolio-wallet-card">
            <span>Connected wallet</span>
            <strong>
              {address.slice(0, 10)}...{address.slice(-8)}
            </strong>
          </div>

          <div className="portfolio-token-heading">
            <div>
              <h2>Token balance</h2>
              <p>Read directly from the token contract.</p>
            </div>
            <button
              className="portfolio-refresh-button"
              type="button"
              onClick={() => setRefreshKey((value) => value + 1)}
              disabled={data.loading}
            >
              <RefreshCw
                size={16}
                className={data.loading ? "portfolio-spinning" : ""}
              />
              {data.loading ? "Loading..." : "Refresh"}
            </button>
          </div>

          <div className="portfolio-token-list">
            <article className="portfolio-token-card">
              <div className="portfolio-token-identity">
             
<div className="portfolio-token-icon portfolio-token-usdc">
  <svg
    viewBox="0 0 48 48"
    width="42"
    height="42"
    role="img"
    aria-label="USDC logo"
  >
    <circle cx="24" cy="24" r="24" fill="#2775CA" />
    <g
      fill="none"
      stroke="#FFFFFF"
      strokeWidth="2.6"
      strokeLinecap="round"
    >
      <path d="M17 10.5c-4 3.2-6.2 8-6.2 13.5s2.2 10.3 6.2 13.5" />
      <path d="M31 10.5c4 3.2 6.2 8 6.2 13.5s-2.2 10.3-6.2 13.5" />
    </g>
    <path
      d="M28.5 17.8c-1.1-1-2.7-1.5-4.6-1.5-3.2 0-5.2 1.5-5.2 3.9 0 2.3 1.8 3.3 5.1 4l1.5.3c2.2.5 3.2 1.1 3.2 2.4 0 1.4-1.5 2.3-3.9 2.3-2 0-3.8-.7-5-2"
      fill="none"
      stroke="#FFFFFF"
      strokeWidth="2.8"
      strokeLinecap="round"
    />
    <path
      d="M24 13.5v21"
      stroke="#FFFFFF"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
  </svg>
</div>

                <div>
                  <strong>USDC</strong>
                  <p>Bridged USD Coin</p>
                </div>
              </div>

              <div className="portfolio-token-balance">
                <span>Balance</span>
                <strong>
                  {data.loading
                    ? "Loading..."
                    : data.error
                      ? "Unavailable"
                      : formatBalance(data.balance)}
                </strong>
                {!data.loading && !data.error && <small>USDC</small>}
              </div>

              {data.error && (
                <p className="portfolio-token-error" role="status">
                  {data.error}
                </p>
              )}

              <a
                className="portfolio-token-link"
                href={`${TESTNET_EXPLORER}/address/${USDC_ADDRESS}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                View contract <ExternalLink size={14} />
              </a>
            </article>
          </div>

          <p className="portfolio-disclaimer">
            Balance is read from Asset Chain Testnet. Testnet tokens
            may have no monetary value.
          </p>
        </>
      )}
    </section>
  );
}
