
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
  CircleAlert,
  ExternalLink,
} from "lucide-react";

type PortfolioProps = {
  address?: Address;
  onConnect: () => void;
};

const TESTNET_CHAIN_ID = 42421;
const TESTNET_RPC = "https://enugu-rpc.assetchain.org";
const TESTNET_EXPLORER = "https://scan-testnet.assetchain.org";

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

const TOKENS = [
  {
    symbol: "USDT",
    name: "Tether USD",
    address: "0x04f868C5b3F0A100a207c7e9312946c2C2c48a7a3",
  },
  {
    symbol: "USDC",
    name: "USD Coin",
    address: "0x39C6b75fAeAb6B54541BE34860AE6250263377e9",
  },
  {
    symbol: "cNGN",
    name: "Compliant Nigerian Naira",
    address: "0x069404d2F76Aa4519819a41B4E385074A9F4E8eA",
  },
] as const;

type TokenBalance = {
  symbol: string;
  name: string;
  address: Address;
  balance: string;
  loading: boolean;
  error: string;
};

function initialBalances(): TokenBalance[] {
  return TOKENS.map((token) => ({
    ...token,
    address: token.address as Address,
    balance: "",
    loading: false,
    error: "",
  }));
}

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
  const [balances, setBalances] =
    useState<TokenBalance[]>(initialBalances);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [networkError, setNetworkError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadBalances() {
      if (!address || !isAddress(address)) {
        setBalances(initialBalances());
        setNetworkError("");
        setLoading(false);
        return;
      }

      setLoading(true);
      setNetworkError("");
      setBalances(
        TOKENS.map((token) => ({
          ...token,
          address: token.address as Address,
          balance: "",
          loading: true,
          error: "",
        })),
      );

      try {
        const actualChainId = await publicClient.getChainId();

        if (actualChainId !== TESTNET_CHAIN_ID) {
          throw new Error(
            `RPC returned chain ID ${actualChainId}; expected ${TESTNET_CHAIN_ID}.`,
          );
        }

        const results = await Promise.all(
          TOKENS.map(async (token): Promise<TokenBalance> => {
            const tokenAddress = token.address as Address;

            try {
              if (!isAddress(tokenAddress)) {
                throw new Error("Token contract address is invalid.");
              }

              const code = await publicClient.getBytecode({
                address: tokenAddress,
              });

              if (!code || code === "0x") {
                throw new Error(
                  "No contract code found at this address on testnet.",
                );
              }

              const [rawBalance, decimals, onChainSymbol] =
                await Promise.all([
                  publicClient.readContract({
                    address: tokenAddress,
                    abi: ERC20_ABI,
                    functionName: "balanceOf",
                    args: [address],
                  }),
                  publicClient.readContract({
                    address: tokenAddress,
                    abi: ERC20_ABI,
                    functionName: "decimals",
                  }),
                  publicClient.readContract({
                    address: tokenAddress,
                    abi: ERC20_ABI,
                    functionName: "symbol",
                  }),
                ]);

              if (
                onChainSymbol.trim().toLowerCase() !==
                token.symbol.toLowerCase()
              ) {
                throw new Error(
                  `Expected ${token.symbol}, but contract reports ${onChainSymbol}.`,
                );
              }

              return {
                ...token,
                address: tokenAddress,
                balance: formatUnits(rawBalance, decimals),
                loading: false,
                error: "",
              };
            } catch (error) {
              return {
                ...token,
                address: tokenAddress,
                balance: "",
                loading: false,
                error:
                  error instanceof Error
                    ? error.message
                    : "Unable to read this token contract.",
              };
            }
          }),
        );

        if (active) setBalances(results);
      } catch (error) {
        if (!active) return;

        setNetworkError(
          error instanceof Error
            ? error.message
            : "Unable to connect to Asset Chain Testnet.",
        );

        setBalances(
          TOKENS.map((token) => ({
            ...token,
            address: token.address as Address,
            balance: "",
            loading: false,
            error: "Could not verify the network.",
          })),
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadBalances();

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
            View USDT, USDC, and cNGN held by your connected
            wallet on Asset Chain Testnet.
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
            Connect a wallet to read your token balances
            directly from Asset Chain Testnet.
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

          {networkError && (
            <div className="portfolio-error" role="alert">
              <CircleAlert size={19} />
              <div>
                <strong>Network verification failed</strong>
                <p>{networkError}</p>
              </div>
            </div>
          )}

          <div className="portfolio-token-heading">
            <div>
              <h2>Token balances</h2>
              <p>Read directly from token contracts.</p>
            </div>
            <button
              className="portfolio-refresh-button"
              type="button"
              onClick={() => setRefreshKey((value) => value + 1)}
              disabled={loading}
            >
              <RefreshCw
                size={16}
                className={loading ? "portfolio-spinning" : ""}
              />
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>

          <div className="portfolio-token-list">
            {balances.map((token) => (
              <article
                className="portfolio-token-card"
                key={token.symbol}
              >
                <div className="portfolio-token-identity">
                  <div
                    className={`portfolio-token-icon portfolio-token-${token.symbol.toLowerCase()}`}
                  >
                    {token.symbol.slice(0, 1)}
                  </div>
                  <div>
                    <strong>{token.symbol}</strong>
                    <p>{token.name}</p>
                  </div>
                </div>

                <div className="portfolio-token-balance">
                  <span>Balance</span>
                  <strong>
                    {token.loading
                      ? "Loading..."
                      : token.error
                        ? "Unavailable"
                        : formatBalance(token.balance)}
                  </strong>
                  {!token.loading && !token.error && (
                    <small>{token.symbol}</small>
                  )}
                </div>

                {token.error && (
                  <p className="portfolio-token-error" role="status">
                    {token.error}
                  </p>
                )}

                <a
                  className="portfolio-token-link"
                  href={`${TESTNET_EXPLORER}/address/${token.address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View contract <ExternalLink size={14} />
                </a>
              </article>
            ))}
          </div>

          <p className="portfolio-disclaimer">
            Balances are read from Asset Chain Testnet. They do not
            represent market positions, staked funds, or USD valuations.
            Testnet tokens may have no monetary value.
          </p>
        </>
      )}
    </section>
  );
}
