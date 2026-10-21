import { createConfig, http } from "@privy-io/wagmi";
import { assetChainTestnet } from "./config/assetChain";

// Privy is the single authentication and wallet-connection provider.
// Keep the existing Asset Chain Testnet wagmi client for all contract reads,
// writes, and message-signing flows throughout the application.
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
