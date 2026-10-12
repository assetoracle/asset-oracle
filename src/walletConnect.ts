import { createAppKit } from "@reown/appkit/react";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { assetChainTestnet } from "./config/assetChain";

const projectId = "31b59192af5764277976dd36db7754ba";

const networks = [assetChainTestnet] as const;

export const wagmiAdapter = new WagmiAdapter({
  projectId,
  networks: [...networks],
});

export const wagmiConfig = wagmiAdapter.wagmiConfig;

export const appKit = createAppKit({
  adapters: [wagmiAdapter],
  projectId,
  networks: [...networks],
  defaultNetwork: assetChainTestnet,
  metadata: {
    name: "Asset Oracle",
    description: "Real-world prediction markets on Asset Chain",
    url: "https://asset-oracle.onrender.com",
    icons: [],
  },
  // Keep the full wallet list available, including mobile wallet deep links.
  // This is important when the site is opened in a mobile browser without
  // browser-extension support.
  features: {
    analytics: false,
    email: false,
    socials: false,
    allWallets: true,
  },
  themeMode: "dark",
  themeVariables: {
    "--w3m-accent": "#12D9F5",
    "--w3m-border-radius-master": "2px",
  },
});
