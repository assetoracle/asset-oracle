import { createAppKit } from "@reown/appkit/react";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { createConfig } from "@privy-io/wagmi";
import { http } from "wagmi";
import { assetChainTestnet } from "./config/assetChain";

const projectId = "31b59192af5764277976dd36db7754ba";
const networks = [assetChainTestnet] as const;

// Privy owns the active wagmi connector so embedded and external Privy wallets
// can power the app's existing wagmi signing and contract hooks. Testnet only.
export const wagmiConfig = createConfig({
  chains: [...networks],
  transports: {
    [assetChainTestnet.id]: http("https://enugu-rpc.assetchain.org/"),
  },
});

// Keep the Reown modal initialized for the existing wallet-status controls while
// the app's active wagmi config is now supplied by Privy.
export const wagmiAdapter = new WagmiAdapter({
  projectId,
  networks: [...networks],
});

export const appKit = createAppKit({
  adapters: [wagmiAdapter],
  projectId,
  networks: [...networks],
  defaultNetwork: assetChainTestnet,
  metadata: {
    name: "Asset Oracle",
    description: "Real-world prediction markets on Asset Chain",
    url: "https://assetoracleapp.xyz",
    icons: ["/asset-oracle-logo-transparent.svg"],
  },
  features: {
    analytics: false,
    email: false,
    socials: [],
    allWallets: true,
  },
  themeMode: "dark",
  themeVariables: {
    "--w3m-accent": "#12D9F5",
    "--w3m-color-mix": "#071A24",
    "--w3m-color-mix-strength": 38,
    "--w3m-font-family": "'Bricolage Grotesque', sans-serif",
    "--w3m-border-radius-master": "12px",
  },
});
