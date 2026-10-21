import { assetChainTestnet } from "./assetChain";

/** Canonical Asset Chain configuration shared by Privy and Wagmi. */
export { assetChainTestnet };
export const privySupportedChains = [assetChainTestnet] as const;
