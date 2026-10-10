export type WalletConnection = {
  address: string;
  chainId: string;
};

type EthereumProvider = {
  request: (args: {
    method: string;
    params?: unknown[];
  }) => Promise<unknown>;
  on?: (
    event: string,
    listener: (...args: unknown[]) => void,
  ) => void;
  removeListener?: (
    event: string,
    listener: (...args: unknown[]) => void,
  ) => void;
};

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

export const ASSET_CHAIN_TESTNET = {
  chainId: "0xa575",
  chainName: "Asset Chain Testnet",
  nativeCurrency: {
    name: "Real World Asset",
    symbol: "RWA",
    decimals: 18,
  },
  rpcUrls: ["https://enugu-rpc.assetchain.org"],
  blockExplorerUrls: [
    "https://scan-testnet.assetchain.org",
  ],
};

function getProvider(): EthereumProvider {
  if (!window.ethereum) {
    throw new Error(
      "No compatible wallet was detected. Open Asset Oracle in a supported wallet browser or enable your browser wallet extension.",
    );
  }

  return window.ethereum;
}

export async function connectWallet(): Promise<WalletConnection> {
  const provider = getProvider();

  const accounts = (await provider.request({
    method: "eth_requestAccounts",
  })) as string[];

  if (!accounts || accounts.length === 0) {
    throw new Error("No wallet account was selected.");
  }

  const chainId = (await provider.request({
    method: "eth_chainId",
  })) as string;

  return {
    address: accounts[0],
    chainId: chainId.toLowerCase(),
  };
}

export async function switchToAssetChainTestnet(): Promise<void> {
  const provider = getProvider();

  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: ASSET_CHAIN_TESTNET.chainId }],
    });
  } catch (error) {
    const walletError = error as { code?: number };

    if (walletError.code === 4001) {
      throw new Error(
        "You rejected the network-switching request.",
      );
    }

    if (walletError.code !== 4902) {
      throw new Error(
        "Unable to switch networks. Check your wallet and try again.",
      );
    }

    await provider.request({
      method: "wallet_addEthereumChain",
      params: [ASSET_CHAIN_TESTNET],
    });

    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: ASSET_CHAIN_TESTNET.chainId }],
    });
  }

  const activeChainId = (
    (await provider.request({
      method: "eth_chainId",
    })) as string
  ).toLowerCase();

  if (activeChainId !== ASSET_CHAIN_TESTNET.chainId) {
    throw new Error(
      "Network verification failed. Your wallet is not connected to Asset Chain Testnet.",
    );
  }
}