import { defineChain } from "viem";

/** Asset Oracle's active network during Privy integration: Enugu Testnet only. */
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

export const privySupportedChains = [assetChainTestnet] as const;
