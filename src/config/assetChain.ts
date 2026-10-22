import { defineChain } from "viem";
import { ASSET_CHAIN_RPC_URL } from "./env";

export const ASSET_CHAIN_ID = 42421;

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
      http: [ASSET_CHAIN_RPC_URL],
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
