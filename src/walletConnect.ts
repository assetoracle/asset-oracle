import { connectorsForWallets, darkTheme } from "@rainbow-me/rainbowkit";
import {
  binanceWallet,
  coinbaseWallet,
  injectedWallet,
  metaMaskWallet,
  okxWallet,
  rabbyWallet,
  rainbowWallet,
  safePalWallet,
  trustWallet,
  walletConnectWallet,
  zerionWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { createConfig, http } from "wagmi";
import { assetChainTestnet } from "./config/assetChain";

const projectId =
  import.meta.env.VITE_REOWN_PROJECT_ID || "31b59192af5764277976dd36db7754ba";

const chains = [assetChainTestnet] as const;

const connectors = connectorsForWallets(
  [
    {
      groupName: "Recommended",
      wallets: [metaMaskWallet, walletConnectWallet, rainbowWallet, injectedWallet],
    },
    {
      groupName: "More",
      wallets: [
        rabbyWallet,
        okxWallet,
        trustWallet,
        zerionWallet,
        safePalWallet,
        binanceWallet,
        coinbaseWallet,
      ],
    },
  ],
  { appName: "Assets Oracle", projectId },
);

export const wagmiConfig = createConfig({
  chains,
  connectors,
  transports: {
    [assetChainTestnet.id]: http("https://enugu-rpc.assetchain.org"),
  },
  ssr: false,
});

export const rainbowKitTheme = darkTheme({
  accentColor: "#12D9F5",
  accentColorForeground: "#071A24",
  borderRadius: "large",
  fontStack: "system",
  overlayBlur: "small",
});
