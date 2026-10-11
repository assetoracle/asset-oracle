
import { useEffect, useRef, useState } from "react";
import {
  useAccount,
  useDisconnect,
  useConfig,
} from "wagmi";
import { useAppKit } from "@reown/appkit/react";
import {
  displayChainId,
  isTestnet,
  normalizeChainId,
  ASSET_CHAIN_ID,
} from "../utils/chain";

export type WalletConnection = {
  address: string;
  chainId: string | null;
};

export function useWalletStatus() {
  const { open } = useAppKit();
  const { address, chainId, isConnected } = useAccount();
  const { disconnectAsync } = useDisconnect();
  const config = useConfig();

  const [walletBusy, setWalletBusy] = useState(false);
  const [walletMessage, setWalletMessage] = useState("");

  const userInitiatedDisconnectRef = useRef(false);

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

  const networkState:
    | "disconnected"
    | "detecting"
    | "correct"
    | "wrong" = !wallet
    ? "disconnected"
    : wallet.chainId === null
      ? "detecting"
      : isTestnet(wallet.chainId)
        ? "correct"
        : "wrong";

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
  }, [address, chainId, isConnected]);

  async function handleConnect() {
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
    if (!wallet || wallet.chainId === null) {
      setWalletMessage("Detecting network...");
      return;
    }

    setWalletBusy(true);
    setWalletMessage("");

    try {
      const connector = config.connectors.find(
        (item) => item.uid === config.state.current,
      );

      if (!connector) {
        throw new Error("No active wallet connector found.");
      }

      const provider = await connector.getProvider();

      if (
        !provider ||
        typeof provider !== "object" ||
        !("request" in provider) ||
        typeof provider.request !== "function"
      ) {
        throw new Error(
          "Wallet provider does not support network switching.",
        );
      }

      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [
          {
            chainId: `0x${ASSET_CHAIN_ID.toString(16)}`,
          },
        ],
      });

      setWalletMessage(
        "Successfully switched to Asset Chain Testnet (42421).",
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "";

      console.error("Asset Chain network switch failed:", error);

      if (/user rejected|user denied|user cancelled/i.test(errorMessage)) {
        setWalletMessage(
          "Network switch was cancelled. Try again, or switch to Asset Chain Testnet in your wallet.",
        );
      } else {
        setWalletMessage(
          "Automatic network switching failed. Switch to Asset Chain Testnet manually. Chain ID: 42421.",
        );
      }
    } finally {
      setWalletBusy(false);
    }
  }

  async function handleDisconnectWallet() {
    setWalletBusy(true);
    setWalletMessage("");

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
