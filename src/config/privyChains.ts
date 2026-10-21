import { defineChain } from "viem";

/**
 * Asset Chain EVM networks for Privy/Wagmi integration.
 *
 * Keep these definitions separate from the active Reown configuration until
 * the Privy migration is reviewed and end-to-end wallet signing is verified.
 * Chain metadata is based on the official Asset Chain network documentation.
 */
export const assetChainTestnet = defineChain({
  id: 42421,
  name: "Asset Chain Testnet",
  nativeCurrency: {
    name: "Real World Asset",
    symbol: "RWA",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://enugu-rpc.assetchain.org/"],
    },
  },
  blockExplorers: {
    default: {
      name: "Asset Chain Testnet Explorer",
      url: "https://scan-testnet.assetchain.org",
    },
  },
  testnet: true,
});

export const assetChainMainnet = defineChain({
  id: 42420,
  name: "Asset Chain Mainnet",
  nativeCurrency: {
    name: "Real World Asset",
    symbol: "RWA",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://mainnet-rpc.assetchain.org"],
    },
  },
  blockExplorers: {
    default: {
      name: "Asset Chain Explorer",
      url: "https://scan.assetchain.org",
    },
  },
});

/** Use testnet by default during the Privy integration and verification phase. */
export const privySupportedChains = [
  assetChainTestnet,
  assetChainMainnet,
] as const;
