import { createAppKit } from "@reown/appkit/react";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { assetChainTestnet } from "./config/assetChain";
import { injected } from "wagmi/connectors";

type RabbyProvider = {
  isRabby?: boolean;
  request: (...args: any[]) => Promise<any>;
};

type Eip6963RabbyDetail = {
  info?: { name?: string; rdns?: string; uuid?: string };
  provider?: RabbyProvider;
};

type RabbyWindow = Window & {
  ethereum?: RabbyProvider & {
    providers?: RabbyProvider[];
  };
};

let announcedRabbyProvider: RabbyProvider | undefined;

function getRabbyProvider(): RabbyProvider | undefined {
  if (typeof window === "undefined") return undefined;
  if (announcedRabbyProvider) return announcedRabbyProvider;
  const ethereum = (window as RabbyWindow).ethereum;
  if (ethereum?.isRabby) return ethereum;
  return ethereum?.providers?.find((provider) => provider.isRabby);
}

export async function discoverRabbyProvider(): Promise<RabbyProvider | undefined> {
  if (typeof window === "undefined") return undefined;
  const directProvider = getRabbyProvider();
  if (directProvider) return directProvider;

  return await new Promise<RabbyProvider | undefined>((resolve) => {
    let settled = false;
    const finish = (provider?: RabbyProvider) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      window.removeEventListener("eip6963:announceProvider", onAnnouncement);
      if (provider) announcedRabbyProvider = provider;
      resolve(provider);
    };
    const onAnnouncement = (event: Event) => {
      const detail = (event as CustomEvent<Eip6963RabbyDetail>).detail;
      const name = detail?.info?.name?.toLowerCase() ?? "";
      const rdns = detail?.info?.rdns?.toLowerCase() ?? "";
      if (
        detail?.provider &&
        (detail.provider.isRabby || name.includes("rabby") || rdns.includes("rabby"))
      ) {
        finish(detail.provider);
      }
    };
    const timer = window.setTimeout(() => finish(), 500);
    window.addEventListener("eip6963:announceProvider", onAnnouncement);
    window.dispatchEvent(new Event("eip6963:requestProvider"));
  });
}

const projectId =
  import.meta.env.VITE_REOWN_PROJECT_ID || "31b59192af5764277976dd36db7754ba";

const networks = [assetChainTestnet] as const;

export const wagmiAdapter = new WagmiAdapter({
  projectId,
  networks: [...networks],
  // Keep a Rabby-targeted connector alongside AppKit's generic injected
  // connector. Multi-provider browsers can expose several wallets through
  // window.ethereum.providers; the generic connector may select the wrong one.
  connectors: [
    injected({
      target: {
        id: "rabby",
        name: "Rabby",
        provider: () => getRabbyProvider() as never,
      },
    }),
  ],
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
    icons: ["/asset-oracle-logo-transparent.svg"],
  },
  // External wallets only: no email/social login or embedded-wallet onboarding.
  features: {
    analytics: false,
    email: false,
    socials: false,
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
