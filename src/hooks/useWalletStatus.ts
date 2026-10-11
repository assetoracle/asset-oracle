
import { useAppKit, useAppKitNetwork } from "@reown/appkit/react";
import { useAccount, useDisconnect } from "wagmi";
import { useEffect, useRef, useState } from "react";
import { assetChainTestnet } from "../config/assetChain";
import {
  displayChainId,
  isTestnet,
  normalizeChainId,
} from "../utils/chain";

export type WalletConnection = {
  address: string;
  chainId: string | null;
};

type NetworkSwitch = (
  network: typeof assetChainTestnet,
) => Promise<unknown>;

export function useWalletStatus() {
  const { open } = useAppKit();
  const { switchNetwork } = useAppKitNetwork();
  const { address, chainId, isConnected } = useAccount();
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
    setWalletBusy(true);
    setWalletMessage("");

    try {
      await open({ view: "Connect" });
    } catch (error) {
      setWalletMessage(
        error instanceof Error
          ? error.message
          : "Unable to open the wallet selector.",
      );
    } finally {
      setWalletBusy(false);
    }
  }

  async function handleOpenAccount() {
    try {
      await open({ view: "Account" });
    } catch (error) {
      setWalletMessage(
        error instanceof Error
          ? error.message
          : "Unable to open wallet account details.",
      );
    }
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
      await (switchNetwork as NetworkSwitch)(assetChainTestnet);

      networkSwitchTimerRef.current = setTimeout(() => {
        networkSwitchTimerRef.current = null;
        setWalletMessage(
          "The wallet did not switch networks. Open your wallet app, check for a pending request, or add Asset Chain Testnet manually (Chain ID: 42421).",
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
        error instanceof Error
          ? error.message
          : "Unable to disconnect the wallet.",
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
