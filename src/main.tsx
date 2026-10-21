import React from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "@privy-io/wagmi";
import { PrivyProvider } from "@privy-io/react-auth";
import App from "./App";
import { wagmiConfig } from "./walletConnect";
import { assetChainTestnet, privySupportedChains } from "./config/privyChains";
import "./style.css";

const queryClient = new QueryClient();
const privyAppId = import.meta.env.VITE_PRIVY_APP_ID;
const rootElement = document.getElementById("root");

function StartupFailure({ message }: { message: string }) {
  return (
    <main style={{ minHeight: "100vh", background: "#071A24", color: "#F2FCFF", padding: "28px 20px", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ color: "#12D9F5" }}>Asset Oracle could not start</h1>
      <p>The page caught a startup error. Share the message below with the site developer.</p>
      <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", background: "#102F3A", padding: 16, borderRadius: 10 }}>{message}</pre>
      <button onClick={() => window.location.reload()} style={{ padding: "12px 18px", borderRadius: 8, border: 0, fontWeight: 700 }}>Reload site</button>
    </main>
  );
}

class StartupErrorBoundary extends React.Component<React.PropsWithChildren, { error: string | null }> {
  state = { error: null as string | null };
  static getDerivedStateFromError(error: unknown) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("Asset Oracle startup/render error:", error, info.componentStack);
  }
  render() {
    if (this.state.error) return <StartupFailure message={this.state.error} />;
    return this.props.children;
  }
}

if (!rootElement) {
  throw new Error("Asset Oracle root element was not found.");
}

// Catch errors that happen outside React's render lifecycle too, and show them
// on-screen so mobile users can report the actual failure without DevTools.
window.addEventListener("error", (event) => {
  const root = document.getElementById("root");
  if (root && !root.querySelector("h1")) {
    createRoot(root).render(<StartupFailure message={event.message || "Unknown JavaScript error"} />);
  }
});
window.addEventListener("unhandledrejection", (event) => {
  const root = document.getElementById("root");
  if (root && !root.querySelector("h1")) {
    const reason = event.reason;
    createRoot(root).render(<StartupFailure message={reason instanceof Error ? reason.message : String(reason)} />);
  }
});

if (!privyAppId) {
  console.warn("VITE_PRIVY_APP_ID is not configured. Privy sign-in will not be available until the hosting environment is updated.");
}

createRoot(rootElement).render(
  <StartupErrorBoundary>
    <React.StrictMode>
      <PrivyProvider
        appId={privyAppId || "missing-privy-app-id"}
        config={{
          loginMethods: ["email", "google", "twitter", "wallet", "passkey"],
          appearance: {
            theme: "dark",
            accentColor: "#22C55E",
            logo: "/asset-oracle-logo-transparent.svg",
            landingHeader: "Sign in to Asset Oracle",
          },
          defaultChain: assetChainTestnet,
          supportedChains: [...privySupportedChains],
          embeddedWallets: { ethereum: { createOnLogin: "users-without-wallets" } },
        }}
      >
        <QueryClientProvider client={queryClient}>
          <WagmiProvider config={wagmiConfig}>
            <App />
          </WagmiProvider>
        </QueryClientProvider>
      </PrivyProvider>
    </React.StrictMode>
  </StartupErrorBoundary>,
);
