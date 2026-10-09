export type WalletConnection = {
  address: string;
  chainId: string;
};

type EthereumProvider = {
  request: (args: {
    method: string;
    params?: unknown[];
  }) => Promise<unknown>;
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
    name: "ASSET",
    symbol: "ASSET",
    decimals: 18,
  },
  rpcUrls: ["https://enugu-rpc.assetchain.org"],
  blockExplorerUrls: ["https://scan.assetchain.org"],
};

function getProvider(): EthereumProvider {
  if (!window.ethereum) {
    throw new Error(
      "No compatible wallet found. Open Asset Oracle in a browser with a supported wallet.",
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
    chainId,
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

    if (walletError.code !== 4902) {
      throw error;
    }

    await provider.request({
      method: "wallet_addEthereumChain",
      params: [ASSET_CHAIN_TESTNET],
    });
  }
}