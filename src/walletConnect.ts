
import { createAppKit } from "@reown/appkit/react";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { assetChainTestnet } from "./walletConfig";

const projectId = "31b59192af5764277976dd36db7754ba";

if (!projectId) {
  throw new Error(
    "Missing VITE_REOWN_PROJECT_ID environment variable."
  );
}

const networks = [assetChainTestnet] as const;

export const wagmiAdapter = new WagmiAdapter({
  networks: [...networks],
  projectId,
});

export const appKit = createAppKit({
  adapters: [wagmiAdapter],
  networks: [...networks],
  projectId,
  metadata: {
    name: "Asset Oracle",
    description: "Real-world prediction markets on Asset Chain",
    url: "https://asset-oracle.onrender.com",
    icons: [],
  },
  features: {
    analytics: false,
    email: false,
    socials: false,
  },
  themeMode: "dark",
  themeVariables: {
    "--w3m-accent": "#2563eb",
    "--w3m-border-radius-master": "2px",
  },
});
