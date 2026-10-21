import { createConfig } from "@privy-io/wagmi";
import { http } from "wagmi";
import { assetChainTestnet } from "./config/assetChain";

// Privy is the single authentication and wallet-connection provider.
// Keep Asset Chain Testnet configured for existing contract and signing flows.
export const wagmiConfig = createConfig({
  chains: [assetChainTestnet],
  transports: {
    [assetChainTestnet.id]: http("https://enugu-rpc.assetchain.org/"),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
