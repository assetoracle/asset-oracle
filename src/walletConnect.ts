import { createAppKit } from "@reown/appkit/react";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import type { AppKitNetwork } from "@reown/appkit/networks";
import { http } from "viem";
import { assetChainTestnet } from "./config/assetChain";
import { ASSET_CHAIN_RPC_URL } from "./config/env";

const projectId =
  import.meta.env.VITE_REOWN_PROJECT_ID || "31b59192af5764277976dd36db7754ba";

const networks: [AppKitNetwork, ...AppKitNetwork[]] = [assetChainTestnet];

export const wagmiAdapter = new WagmiAdapter({
  projectId,
  networks,
  transports: {
    [assetChainTestnet.id]: http(ASSET_CHAIN_RPC_URL),
  },
  ssr: false,
});

createAppKit({
  adapters: [wagmiAdapter],
  networks,
  projectId,
  metadata: {
    name: "Asset Oracle",
    description: "Real-world truth, on-chain.",
    url: "https://assetoracleapp.xyz",
    icons: ["https://assetoracleapp.xyz/asset-oracle-logo-transparent.svg"],
  },
  themeMode: "dark",
  themeVariables: {
    "--w3m-accent": "#12D9F5",
    "--w3m-border-radius-master": "16px",
  },
  features: {
    analytics: false,
    email: false,
    socials: [],
  },
});

export const wagmiConfig = wagmiAdapter.wagmiConfig;
