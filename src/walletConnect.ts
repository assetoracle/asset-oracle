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
    url: "https://assetoracleapp.xyz",
    icons: [],
  },
  // Enable built-in email and social authentication alongside external wallets.
  // Existing Wagmi wallet and contract interactions remain in place.
  features: {
    analytics: false,
    email: true,
    socials: ["google", "x"],
    allWallets: true,
  },
  themeMode: "dark",
  themeVariables: {
    "--w3m-accent": "#12D9F5",
    "--w3m-border-radius-master": "2px",
  },
});
