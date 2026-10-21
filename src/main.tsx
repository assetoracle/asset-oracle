import React from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { PrivyProvider } from "@privy-io/react-auth";
import App from "./App";
import { wagmiConfig } from "./walletConnect";
import { assetChainTestnet, privySupportedChains } from "./config/privyChains";
import "./style.css";

const queryClient = new QueryClient();
const privyAppId = import.meta.env.VITE_PRIVY_APP_ID;

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Asset Oracle root element was not found.");
}

if (!privyAppId) {
  console.warn(
    "VITE_PRIVY_APP_ID is not configured. Privy sign-in will not be available until the hosting environment is updated.",
  );
}

createRoot(rootElement).render(
  <React.StrictMode>
    <PrivyProvider
      appId={privyAppId || "missing-privy-app-id"}
      config={{
        loginMethods: ["email", "google", "twitter"],
        appearance: {
          theme: "dark",
          accentColor: "#12D9F5",
          logo: "/asset-oracle-logo-transparent.svg",
          landingHeader: "Sign in to Asset Oracle",
        },
        defaultChain: assetChainTestnet,
        supportedChains: [...privySupportedChains],
        embeddedWallets: {
          ethereum: {
            createOnLogin: "users-without-wallets",
          },
        },
      }}
    >
      <WagmiProvider config={wagmiConfig as never}>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </WagmiProvider>
    </PrivyProvider>
  </React.StrictMode>,
);
