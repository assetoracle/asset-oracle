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
    listener: (...args: unknown[]) => void
  ) => void;

  removeListener?: (
    event: string,
    listener: (...args: unknown[]) => void
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

type AvailableWallet = {
  name: string;
  provider: EthereumProvider;
};

type EthereumWindow = Window & {
  ethereum?: EthereumProvider;
};

function getEthereumWindow(): EthereumWindow {
  return window as EthereumWindow;
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

let selectedProvider: EthereumProvider | null = null;

const discoveredProviders = new Map<
  string,
  EthereumProvider
>();

function normalizeChainId(chainId: string): string {
  return chainId.toLowerCase();
}

function withTimeout<T>(
  promise: Promise<T>,
  milliseconds: number,
  message: string
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
      (error: unknown) => {
        window.clearTimeout(timer);
        reject(error);
      }
    );
  });
}

function getWalletName(
  detail: EIP6963ProviderDetail
): string {
  const name = detail.info.name.toLowerCase();
  const rdns = detail.info.rdns.toLowerCase();
  const provider = detail.provider;

  if (name.includes("rabby") || rdns.includes("rabby")) {
    return "Rabby";
  }

  if (
    name.includes("metamask") ||
    rdns.includes("metamask") ||
    provider.isMetaMask
  ) {
    return "MetaMask";
  }

  if (
    name.includes("trust") ||
    rdns.includes("trust") ||
    provider.isTrust
  ) {
    return "Trust Wallet";
  }

  if (
    name.includes("okx") ||
    rdns.includes("okx") ||
    provider.isOKXWallet
  ) {
    return "OKX Wallet";
  }

  if (
    name.includes("bitget") ||
    rdns.includes("bitget") ||
    provider.isBitgetWallet
  ) {
    return "Bitget Wallet";
  }

  if (
    name.includes("zerion") ||
    rdns.includes("zerion") ||
    provider.isZerion
  ) {
    return "Zerion";
  }

  return detail.info.name || "Injected Wallet";
}

async function discoverProviders(): Promise<void> {
  await new Promise<void>((resolve) => {
    const handleAnnouncement = (event: Event) => {
      const detail = (
        event as CustomEvent<EIP6963ProviderDetail>
      ).detail;

      if (
        detail?.provider &&
        detail.info?.uuid
      ) {
        discoveredProviders.set(
          detail.info.uuid,
          detail.provider
        );
      }
    };

    window.addEventListener(
      "eip6963:announceProvider",
      handleAnnouncement
    );

    window.dispatchEvent(
      new Event("eip6963:requestProvider")
    );

    window.setTimeout(() => {
      window.removeEventListener(
        "eip6963:announceProvider",
        handleAnnouncement
      );

      resolve();
    }, 500);
  });
}

export async function getAvailableWallets(): Promise<
  AvailableWallet[]
> {
  await discoverProviders();

  const wallets: AvailableWallet[] = [];
  const seenProviders = new Set<EthereumProvider>();

  for (const [uuid, provider] of discoveredProviders) {
    if (seenProviders.has(provider)) {
      continue;
    }

    seenProviders.add(provider);

    wallets.push({
      name: getWalletName({
        info: {
          uuid,
          name: "",
          rdns: "",
        },
        provider,
      }),
      provider,
    });
  }

  const injectedProvider = getEthereumWindow().ethereum;

  if (
    wallets.length === 0 &&
    injectedProvider
  ) {
    wallets.push({
      name: injectedProvider.isRabby
        ? "Rabby"
        : injectedProvider.isMetaMask
          ? "MetaMask"
          : "Injected Wallet",
      provider: injectedProvider,
    });
  }

  return wallets;
}

function getProvider(): EthereumProvider {
  if (selectedProvider) {
    return selectedProvider;
  }

  const provider = getEthereumWindow().ethereum;

  if (provider) {
    selectedProvider = provider;
    return provider;
  }

  throw new Error(
    "No wallet provider detected. Use Reown AppKit to connect a wallet, or open Asset Oracle in your wallet's browser."
  );
}

export async function connectWallet(): Promise<
  WalletConnection
> {
  const wallets = await getAvailableWallets();

  if (wallets.length === 0) {
    throw new Error(
      "No injected wallet detected. Use Reown AppKit to connect a compatible wallet."
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
    "Wallet connection timed out. Open your wallet and approve the connection."
  )) as string[];

  if (!accounts?.length) {
    throw new Error(
      "No wallet account was returned. Unlock your wallet and try again."
    );
  }

  const chainId = (await withTimeout(
    provider.request({
      method: "eth_chainId",
    }) as Promise<string>,
    15000,
    "Could not read the wallet's current network."
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
      provider.request({
        method: "eth_chainId",
      }) as Promise<string>,
      15000,
      "Could not read the current chain ID."
    )) as string
  );

  if (currentChainId === ASSET_CHAIN_TESTNET.chainId) {
    return;
  }

  try {
    await withTimeout(
      provider.request({
        method: "wallet_switchEthereumChain",
        params: [
          {
            chainId: ASSET_CHAIN_TESTNET.chainId,
          },
        ],
      }),
      30000,
      "The wallet did not respond to the network-switch request."
    );
  } catch (error) {
    const walletError = error as {
      code?: number;
      message?: string;
    };

    if (walletError.code === 4001) {
      throw new Error(
        "Network switch was rejected in your wallet."
      );
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
      "The wallet did not respond while adding Asset Chain Testnet."
    );

    await withTimeout(
      provider.request({
        method: "wallet_switchEthereumChain",
        params: [
          {
            chainId: ASSET_CHAIN_TESTNET.chainId,
          },
        ],
      }),
      30000,
      "Asset Chain was added, but the wallet did not complete the network switch."
    );
  }

  const verifiedChainId = normalizeChainId(
    (await withTimeout(
      provider.request({
        method: "eth_chainId",
      }) as Promise<string>,
      15000,
      "Could not verify the resulting chain ID."
    )) as string
  );

  if (verifiedChainId !== ASSET_CHAIN_TESTNET.chainId) {
    throw new Error(
      `Wrong network detected. Expected ${ASSET_CHAIN_TESTNET.chainId}, but received ${verifiedChainId}.`
    );
  }
}

export function disconnectWallet(): void {
  selectedProvider = null;
}
export async function signWalletMessage(
  message: string,
): Promise<string> {
  const provider = getProvider();

  const accounts = (await provider.request({
    method: "eth_accounts",
  })) as string[];

  if (!accounts?.length) {
    throw new Error("Connect your wallet before signing.");
  }

  return (await provider.request({
    method: "personal_sign",
    params: [message, accounts[0]],
  })) as string;
}