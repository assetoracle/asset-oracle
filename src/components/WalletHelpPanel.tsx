
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

  const buttonStyle = {
    width: "100%",
    padding: 15,
    border: "1px solid #12D9F5",
    borderRadius: 12,
    background: "linear-gradient(110deg, #12D9F5, #00B8A9)",
    color: "#071A24",
    fontSize: 15,
    fontWeight: 800,
    cursor: "pointer",
  } as const;

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
        background: "rgba(3, 13, 19, 0.86)",
        overflowY: "auto",
        backdropFilter: "blur(8px)",
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
          background:
            "radial-gradient(ellipse at 100% 0%, rgba(18,217,245,0.09), transparent 45%), #071A24",
          color: "#F2FCFF",
          border: "1px solid #1D6675",
          borderRadius: 20,
          padding: 24,
          boxSizing: "border-box",
          boxShadow: "0 20px 70px rgba(0,0,0,0.45)",
          fontFamily: "'Bricolage Grotesque', sans-serif",
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
                color: "#12D9F5",
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: 2.5,
                margin: "0 0 8px",
              }}
            >
              ASSET ORACLE
            </p>

            <h2
              id="wallet-help-title"
              style={{
                fontSize: 25,
                fontWeight: 800,
                letterSpacing: "-0.6px",
                lineHeight: 1.2,
                margin: 0,
              }}
            >
              Connect your wallet
            </h2>

            <p
              style={{
                color: "#8DA9B3",
                fontSize: 12,
                letterSpacing: 0.5,
                margin: "8px 0 0",
              }}
            >
              CONNECT TO ON-CHAIN INTELLIGENCE
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close wallet assistance"
            style={{
              display: "grid",
              placeItems: "center",
              width: 38,
              height: 38,
              flexShrink: 0,
              background: "#0B2A35",
              color: "#63F3FF",
              border: "1px solid rgba(18,217,245,0.25)",
              borderRadius: 10,
              fontSize: 18,
              cursor: "pointer",
            }}
          >
            ×
          </button>
        </div>

        <p
          style={{
            color: "#8DA9B3",
            lineHeight: 1.8,
            fontSize: 14,
            margin: "18px 0 20px",
          }}
        >
          Connect using the wallet selector, or get help opening
          Asset Oracle inside your preferred wallet app.
        </p>

        <button
          type="button"
          onClick={onConnect}
          style={buttonStyle}
        >
          Open wallet selector →
        </button>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            margin: "24px 0",
            color: "#8DA9B3",
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 1.5,
          }}
        >
          <span
            style={{
              height: 1,
              flex: 1,
              background: "rgba(29,102,117,0.7)",
            }}
          />
          OTHER WALLET OPTIONS
          <span
            style={{
              height: 1,
              flex: 1,
              background: "rgba(29,102,117,0.7)",
            }}
          />
        </div>

        <h3
          style={{
            fontSize: 17,
            fontWeight: 800,
            margin: "0 0 8px",
          }}
        >
          Having trouble connecting?
        </h3>

        <p
          style={{
            color: "#8DA9B3",
            fontSize: 13,
            lineHeight: 1.8,
            margin: "0 0 16px",
          }}
        >
          On mobile, try opening Asset Oracle in your wallet's
          built-in browser before connecting.
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
                minWidth: 0,
                textDecoration: "none",
                color: "#F2FCFF",
                background:
                  "linear-gradient(145deg, #102F3A, #0B2A35)",
                border: "1px solid rgba(29,102,117,0.65)",
                borderRadius: 12,
                padding: 13,
                transition:
                  "border-color 160ms ease, background 160ms ease",
              }}
              onMouseEnter={(event) => {
                event.currentTarget.style.borderColor = "#12D9F5";
                event.currentTarget.style.background = "#103744";
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.borderColor =
                  "rgba(29,102,117,0.65)";
                event.currentTarget.style.background =
                  "linear-gradient(145deg, #102F3A, #0B2A35)";
              }}
            >
              <strong
                style={{
                  display: "block",
                  fontSize: 14,
                  fontWeight: 700,
                  overflowWrap: "anywhere",
                }}
              >
                {wallet.name}
              </strong>

              <span
                style={{
                  display: "block",
                  color: "#8DA9B3",
                  fontSize: 12,
                  lineHeight: 1.6,
                  marginTop: 7,
                }}
              >
                {wallet.description}
              </span>

              <span
                style={{
                  display: "block",
                  color: "#63F3FF",
                  fontSize: 11,
                  fontWeight: 700,
                  marginTop: 10,
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
            padding: 14,
            background: "rgba(18,217,245,0.04)",
            border: "1px solid rgba(18,217,245,0.2)",
            borderRadius: 10,
            color: "#63F3FF",
            textAlign: "left",
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {showTroubleshooting
            ? "Hide troubleshooting ↑"
            : "Connection troubleshooting ↓"}
        </button>

        {showTroubleshooting && (
          <div
            style={{
              background: "#0B2A35",
              border: "1px solid rgba(29,102,117,0.55)",
              borderRadius: 10,
              padding: 15,
              marginTop: 10,
              color: "#8DA9B3",
              fontSize: 13,
              lineHeight: 1.8,
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

        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 9,
            marginTop: 20,
            paddingTop: 16,
            borderTop: "1px solid rgba(29,102,117,0.45)",
          }}
        >
          <span
            style={{
              color: "#00B8A9",
              fontSize: 15,
              lineHeight: 1.5,
            }}
          >
            ●
          </span>

          <p
            style={{
              color: "#8DA9B3",
              fontSize: 11,
              lineHeight: 1.7,
              margin: 0,
            }}
          >
            Wallet links open official wallet websites. They do not
            guarantee that the wallet app will open or that a connection
            will succeed.
          </p>
        </div>
      </section>
    </div>
  );
}
