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

  isMetaMask?: boolean;
  isRabby?: boolean;
  isTrust?: boolean;
  isOKXWallet?: boolean;
  isBitgetWallet?: boolean;
  isZerion?: boolean;
};

type EIP6963ProviderDetail = {
  info: {
    uuid: string;
    name: string;
    rdns: string;
  };
  provider: EthereumProvider;
};

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }

  interface WindowEventMap {
    "eip6963:announceProvider": CustomEvent<EIP6963ProviderDetail>;
  }
}

export const ASSET_CHAIN_TESTNET = {
  chainId: "42421",
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

let selectedProvider: EthereumProvider | null = null;

const discoveredProviders = new Map<string, EthereumProvider>();

function normalizeChainId(chainId: string): string {
  return chainId.toLowerCase();
}

function withTimeout<T>(
  promise: Promise<T>,
  milliseconds: number,
  message: string,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error(message));
    }, milliseconds);

    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function discoverProviders(): Promise<void> {
  return new Promise((resolve) => {
    const handleAnnouncement = (
      event: WindowEventMap["eip6963:announceProvider"],
    ) => {
      const detail = event.detail;

      if (detail?.provider && detail.info?.uuid) {
        discoveredProviders.set(
          detail.info.uuid,
          detail.provider,
        );
      }
    };

    window.addEventListener(
      "eip6963:announceProvider",
      handleAnnouncement,
    );

    window.dispatchEvent(new Event("eip6963:requestProvider"));

    window.setTimeout(() => {
      window.removeEventListener(
        "eip6963:announceProvider",
        handleAnnouncement,
      );

      resolve();
    }, 300);
  });
}

export async function getAvailableWallets(): Promise<
  { name: string; provider: EthereumProvider }[]
> {
  await discoverProviders();

  const wallets = Array.from(discoveredProviders.values()).map(
    (provider) => ({
      name:
        provider.isRabby
          ? "Rabby"
          : provider.isMetaMask
            ? "MetaMask"
            : provider.isOKXWallet
              ? "OKX Wallet"
              : provider.isBitgetWallet
                ? "Bitget Wallet"
                : provider.isTrust
                  ? "Trust Wallet"
                  : provider.isZerion
                    ? "Zerion"
                    : "Browser Wallet",
      provider,
    }),
  );

  if (wallets.length === 0 && window.ethereum) {
    wallets.push({
      name: "Injected Wallet",
      provider: window.ethereum,
    });
  }

  return wallets;
}

function getProvider(): EthereumProvider {
  if (selectedProvider) {
    return selectedProvider;
  }

  if (window.ethereum) {
    selectedProvider = window.ethereum;
    return selectedProvider;
  }

  throw new Error(
    "No wallet provider was detected. Check that your wallet extension is enabled and that Asset Oracle is open in the same browser profile.",
  );
}

export async function connectWallet(): Promise<WalletConnection> {
  const wallets = await getAvailableWallets();

  if (wallets.length === 0) {
    throw new Error(
      "No compatible wallet was detected. Enable your wallet extension and reload Asset Oracle.",
    );
  }

  if (!selectedProvider) {
    selectedProvider = wallets[0].provider;
  }

  const provider = getProvider();

  const accounts = (await withTimeout(
    provider.request({
      method: "eth_requestAccounts",
    }) as Promise<string[]>,
    60000,
    "Wallet connection timed out. Open your wallet extension, approve the request, and try again.",
  )) as string[];

  if (!accounts || accounts.length === 0) {
    throw new Error("No wallet account was selected.");
  }

  const chainId = (await withTimeout(
    provider.request({ method: "eth_chainId" }) as Promise<string>,
    15000,
    "The wallet did not respond when checking the network.",
  )) as string;

  return {
    address: accounts[0],
    chainId: normalizeChainId(chainId),
  };
}

export async function switchToAssetChainTestnet(): Promise<void> {
  const provider = getProvider();

  const currentChainId = normalizeChainId(
    (await withTimeout(
      provider.request({ method: "eth_chainId" }) as Promise<string>,
      15000,
      "The wallet did not respond. Unlock it and try again.",
    )) as string,
  );

  if (currentChainId === ASSET_CHAIN_TESTNET.chainId) {
    return;
  }

  try {
    await withTimeout(
      provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: ASSET_CHAIN_TESTNET.chainId }],
      }),
      30000,
      "The network switch timed out. Check your wallet for a pending request.",
    );
  } catch (error) {
    const walletError = error as { code?: number };

    if (walletError.code === 4001) {
      throw new Error("You rejected the network-switch request.");
    }

    if (walletError.code !== 4902) {
      throw error;
    }

    await withTimeout(
      provider.request({
        method: "wallet_addEthereumChain",
        params: [ASSET_CHAIN_TESTNET],
      }),
      30000,
      "Adding Asset Chain Testnet timed out. Check your wallet.",
    );

    await withTimeout(
      provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: ASSET_CHAIN_TESTNET.chainId }],
      }),
      30000,
      "The network was added, but switching to it timed out.",
    );
  }

  const verifiedChainId = normalizeChainId(
    (await withTimeout(
      provider.request({ method: "eth_chainId" }) as Promise<string>,
      15000,
      "Unable to verify the active network.",
    )) as string,
  );

  if (verifiedChainId !== ASSET_CHAIN_TESTNET.chainId) {
    throw new Error(
      `Network verification failed. Expected ${ASSET_CHAIN_TESTNET.chainId}, received ${verifiedChainId}.`,
    );
  }
}