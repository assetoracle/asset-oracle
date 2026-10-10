import { useState } from "react";

type WalletHelpPanelProps = {
  onConnect: () => void;
  onClose: () => void;
};

const wallets = [
  {
    name: "MetaMask",
    description: "Mobile wallet and browser extension",
    url: "https://metamask.io/",
  },
  {
    name: "Trust Wallet",
    description: "Open Asset Oracle in the Trust Wallet browser",
    url: "https://trustwallet.com/",
  },
  {
    name: "OKX Wallet",
    description: "Mobile wallet and browser extension",
    url: "https://www.okx.com/web3",
  },
  {
    name: "Bitget Wallet",
    description: "Mobile wallet and Web3 browser",
    url: "https://web3.bitget.com/",
  },
  {
    name: "Coinbase Wallet",
    description: "Mobile wallet and browser",
    url: "https://www.coinbase.com/wallet",
  },
  {
    name: "Rabby Wallet",
    description: "EVM wallet and browser extension",
    url: "https://rabby.io/",
  },
];

export default function WalletHelpPanel({
  onConnect,
  onClose,
}: WalletHelpPanelProps) {
  const [showTroubleshooting, setShowTroubleshooting] =
    useState(false);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="wallet-help-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        background: "rgba(0, 0, 0, 0.72)",
        overflowY: "auto",
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: 520,
          maxHeight: "90vh",
          overflowY: "auto",
          background: "#111827",
          color: "#f9fafb",
          border: "1px solid #293548",
          borderRadius: 20,
          padding: 24,
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 12,
          }}
        >
          <div>
            <p
              style={{
                color: "#60a5fa",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: 2,
                margin: "0 0 8px",
              }}
            >
              ASSET ORACLE
            </p>

            <h2
              id="wallet-help-title"
              style={{
                fontSize: 24,
                margin: 0,
              }}
            >
              Connect your wallet
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close wallet assistance"
            style={{
              background: "#1f2937",
              color: "#fff",
              border: "1px solid #374151",
              borderRadius: 10,
              padding: "8px 12px",
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        <p
          style={{
            color: "#9ca3af",
            lineHeight: 1.6,
            margin: "14px 0 20px",
          }}
        >
          Connect using Reown's wallet selector, or get help
          opening Asset Oracle inside your preferred wallet app.
        </p>

        <button
          type="button"
          onClick={onConnect}
          style={{
            width: "100%",
            padding: 15,
            border: 0,
            borderRadius: 12,
            background: "#2563eb",
            color: "#fff",
            fontSize: 16,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Open wallet selector
        </button>

        <div
          style={{
            height: 1,
            background: "#293548",
            margin: "24px 0",
          }}
        />

        <h3 style={{ fontSize: 17, margin: "0 0 8px" }}>
          Having trouble connecting?
        </h3>

        <p
          style={{
            color: "#9ca3af",
            fontSize: 14,
            lineHeight: 1.6,
            margin: "0 0 16px",
          }}
        >
          On mobile, open Asset Oracle in your wallet's
          built-in browser, then select Connect Wallet.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 10,
          }}
        >
          {wallets.map((wallet) => (
            <a
              key={wallet.name}
              href={wallet.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "block",
                textDecoration: "none",
                color: "#f9fafb",
                background: "#1b2535",
                border: "1px solid #354257",
                borderRadius: 12,
                padding: 13,
              }}
            >
              <strong style={{ display: "block", fontSize: 14 }}>
                {wallet.name}
              </strong>

              <span
                style={{
                  display: "block",
                  color: "#9ca3af",
                  fontSize: 12,
                  lineHeight: 1.5,
                  marginTop: 6,
                }}
              >
                {wallet.description}
              </span>

              <span
                style={{
                  display: "block",
                  color: "#60a5fa",
                  fontSize: 12,
                  marginTop: 8,
                }}
              >
                Official website ↗
              </span>
            </a>
          ))}
        </div>

        <button
          type="button"
          onClick={() =>
            setShowTroubleshooting((current) => !current)
          }
          aria-expanded={showTroubleshooting}
          style={{
            width: "100%",
            marginTop: 20,
            padding: 13,
            background: "transparent",
            border: "1px solid #354257",
            borderRadius: 10,
            color: "#dbeafe",
            textAlign: "left",
            cursor: "pointer",
          }}
        >
          {showTroubleshooting ? "Hide troubleshooting ▲" : "Connection troubleshooting ▼"}
        </button>

        {showTroubleshooting && (
          <div
            style={{
              background: "#1b2535",
              borderRadius: 10,
              padding: 14,
              marginTop: 10,
              color: "#d1d5db",
              fontSize: 14,
              lineHeight: 1.7,
            }}
          >
            <ol style={{ paddingLeft: 20, margin: 0 }}>
              <li>Unlock your wallet app.</li>
              <li>Open Asset Oracle in its built-in browser.</li>
              <li>Return to Asset Oracle and select Connect Wallet.</li>
              <li>Approve the connection in your wallet.</li>
              <li>If it still fails, close the pending connection and try again.</li>
            </ol>

            <p style={{ marginBottom: 0 }}>
              Asset Chain Testnet uses chain ID 42421. Connect first;
              switch networks only when your wallet requests it.
            </p>
          </div>
        )}

        <p
          style={{
            color: "#6b7280",
            fontSize: 11,
            lineHeight: 1.5,
            margin: "18px 0 0",
          }}
        >
          Wallet links open official wallet websites. They do not
          guarantee that the wallet app will open or that a connection
          will succeed.
        </p>
      </section>
    </div>
  );
}