
import React from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import App from "./App";
import { rainbowKitTheme, wagmiConfig } from "./walletConnect";
import "@rainbow-me/rainbowkit/styles.css";
import "./style.css";

const queryClient = new QueryClient();

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Asset Oracle root element was not found.");
}

createRoot(rootElement).render(
  <React.StrictMode>
    <WagmiProvider config={wagmiConfig as never}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={rainbowKitTheme}
          appInfo={{
            appName: "Assets Oracle",
            learnMoreUrl: "https://assetoracleapp.xyz",
          }}
        >
          <App />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>
);