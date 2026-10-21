import { defineChain } from "@reown/appkit/networks";

export const ASSET_CHAIN_ID = 42421;

export const assetChainTestnet = defineChain({
  id: 42421,
  caipNetworkId: "eip155:42421",
  chainNamespace: "eip155",
  name: "Asset Chain Testnet",
  nativeCurrency: {
    name: "Real World Asset",
    symbol: "RWA",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://enugu-rpc.assetchain.org"],
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
