import { friendlyError } from "../utils/friendlyError";
import { useAccountModal, useConnectModal } from "@rainbow-me/rainbowkit";
import { useAccount, useDisconnect } from "wagmi";
import { useEffect, useRef, useState } from "react";
import { assetChainTestnet } from "../config/assetChain";
import {
  displayChainId,
  isTestnet,
  normalizeChainId,
} from "../utils/chain";

// Wallet providers can leave switch requests pending forever on mobile.
// Bound the wait so the UI always returns control to the user.
async function withSwitchTimeout<T>(promise: Promise<T>, timeoutMs = 30000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("Network switch request timed out")),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

export type WalletConnection = {
  address: string;
  chainId: string | null;
};

type Eip1193Provider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

async function requestAssetChainSwitch(
  connector: { getProvider: () => Promise<unknown> } | undefined,
): Promise<void> {
  if (!connector) throw new Error("No active wallet connector");
  const provider = await connector.getProvider() as Eip1193Provider;
  const chainId = `0x${assetChainTestnet.id.toString(16)}`;
  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId }],
    });
  } catch (error) {
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? (error as { code?: number }).code
        : undefined;
    if (code !== 4902) throw error;
    await provider.request({
      method: "wallet_addEthereumChain",
      params: [{
        chainId,
        chainName: assetChainTestnet.name,
        nativeCurrency: assetChainTestnet.nativeCurrency,
        rpcUrls: [...assetChainTestnet.rpcUrls.default.http],
        blockExplorerUrls: [assetChainTestnet.blockExplorers.default.url],
      }],
    });
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId }],
    });
  }
}

export function useWalletStatus() {
  const { openConnectModal } = useConnectModal();
  const { openAccountModal } = useAccountModal();
  const { address, chainId, isConnected, connector } = useAccount();
  const { disconnectAsync } = useDisconnect();

  const [walletBusy, setWalletBusy] = useState(false);
  const [walletMessage, setWalletMessage] = useState("");
  const [unknownChainTimedOut, setUnknownChainTimedOut] =
    useState(false);

  const userInitiatedDisconnectRef = useRef(false);
  const networkSwitchTimerRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);

  const wallet: WalletConnection | null =
    isConnected && address
      ? {
          address,
          chainId:
            chainId === undefined
              ? null
              : normalizeChainId(chainId),
        }
      : null;

  const hasUnknownChain = Boolean(wallet && wallet.chainId === null);

  useEffect(() => {
    setUnknownChainTimedOut(false);

    if (!hasUnknownChain) return;

    const timer = setTimeout(() => {
      setUnknownChainTimedOut(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, [address, chainId, hasUnknownChain]);

  const networkState:
    | "disconnected"
    | "detecting"
    | "correct"
    | "wrong" = !wallet
    ? "disconnected"
    : wallet.chainId === null
      ? unknownChainTimedOut
        ? "wrong"
        : "detecting"
      : isTestnet(wallet.chainId)
        ? "correct"
        : "wrong";

  useEffect(() => {
    if (
      networkState === "correct" ||
      networkState === "disconnected"
    ) {
      if (networkSwitchTimerRef.current !== null) {
        clearTimeout(networkSwitchTimerRef.current);
        networkSwitchTimerRef.current = null;
      }
    }
  }, [networkState]);

  useEffect(() => {
    return () => {
      if (networkSwitchTimerRef.current !== null) {
        clearTimeout(networkSwitchTimerRef.current);
        networkSwitchTimerRef.current = null;
      }
    };
  }, []);

  // Never trigger a network-switch request automatically after a mobile
  // wallet deep-link return. The user initiates switching with the visible control.

  useEffect(() => {
    if (!wallet) {
      if (userInitiatedDisconnectRef.current) {
        userInitiatedDisconnectRef.current = false;
        return;
      }

      setWalletMessage("");
      return;
    }

    if (networkState === "detecting") {
      setWalletMessage("Detecting network...");
    } else if (networkState === "correct") {
      setWalletMessage("Wallet connected to Asset Chain Testnet.");
    } else if (wallet.chainId !== null) {
      setWalletMessage(
        `Wallet connected on chain ID ${displayChainId(
          wallet.chainId,
        )}. Switch to Asset Chain Testnet to continue.`,
      );
    }
    // Keep wallet status messages synchronized with account/network changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, chainId, isConnected, networkState]);

  async function handleConnect() {
    userInitiatedDisconnectRef.current = false;
    setWalletMessage("");
    if (!openConnectModal) {
      setWalletMessage("Wallet connection is unavailable. Please reload the page and try again.");
      return;
    }
    openConnectModal();
  }

  async function handleOpenAccount() {
    if (!openAccountModal) {
      setWalletMessage("Wallet account controls are unavailable. Please reload the page and try again.");
      return;
    }
    openAccountModal();
  }

  async function handleSwitchNetwork() {
    if (!wallet || networkState === "detecting") {
      setWalletMessage("Detecting network...");
      return;
    }

    if (networkSwitchTimerRef.current !== null) {
      clearTimeout(networkSwitchTimerRef.current);
      networkSwitchTimerRef.current = null;
    }

    setWalletBusy(true);
    setWalletMessage(
      "Open your wallet app and approve the network switch.",
    );

    try {
      await withSwitchTimeout(requestAssetChainSwitch(connector));

      networkSwitchTimerRef.current = setTimeout(() => {
        networkSwitchTimerRef.current = null;
        setWalletMessage(
          "No wallet approval prompt was received. Reopen your wallet and switch to Asset Chain Testnet (Chain ID: 42421), then return here and reconnect. You can also tap Switch network to retry.",
        );
      }, 45000);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "";

      if (/user rejected|user denied|user cancelled/i.test(errorMessage)) {
        setWalletMessage(
          "Network switch was cancelled. Try again, or switch to Asset Chain Testnet in your wallet.",
        );
      } else {
        setWalletMessage(
          "The wallet did not switch networks. Open your wallet app, check for a pending request, or add Asset Chain Testnet manually (Chain ID: 42421).",
        );
      }
    } finally {
      setWalletBusy(false);
    }
  }

  async function handleDisconnectWallet() {
    setWalletBusy(true);
    setWalletMessage("");

    if (networkSwitchTimerRef.current !== null) {
      clearTimeout(networkSwitchTimerRef.current);
      networkSwitchTimerRef.current = null;
    }

    try {
      userInitiatedDisconnectRef.current = true;
      await disconnectAsync();
      setWalletMessage("Wallet disconnected from Asset Oracle.");
    } catch (error) {
      userInitiatedDisconnectRef.current = false;
      setWalletMessage(
        friendlyError(error, "Unable to disconnect wallet."),
      );
    } finally {
      setWalletBusy(false);
    }
  }

  return {
    address,
    wallet,
    networkState,
    walletBusy,
    walletMessage,
    setWalletMessage,
    handleConnect,
    handleOpenAccount,
    handleSwitchNetwork,
    handleDisconnectWallet,
  };
}
