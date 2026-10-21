import { defineChain } from "viem";

/**
 * Asset Chain Testnet configuration for the planned Privy/Wagmi integration.
 *
 * Mainnet is intentionally excluded while Asset Oracle is testing on Enugu.
 * Keep this separate from active Reown configuration until the Privy migration
 * is reviewed and end-to-end wallet signing is verified.
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

/** Only enable Asset Chain Testnet until testnet validation is complete. */
export const privySupportedChains = [assetChainTestnet] as const;
