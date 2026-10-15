import { useState } from "react";

type WalletHelpPanelProps = {
  onConnect: () => void;
  onClose: () => void;
};

const appUrl = "https://assetoracleapp.xyz";
const encodedAppUrl = encodeURIComponent(appUrl);

const recommendedWallets = [
  {
    rank: "01",
    name: "MetaMask",
    note: "Highly recommended",
    description: "Open Asset Oracle directly in MetaMask's in-app browser.",
    url: `https://link.metamask.io/dapp/${new URL(appUrl).host}`,
    featured: true,
    action: "Open in MetaMask ↗",
  },
  {
    rank: "02",
    name: "Rabby Wallet",
    note: "Recommended",
    description: "Open Rabby Wallet, then use its built-in browser to visit Asset Oracle.",
    url: "https://go.rabby.io/mobile/",
    featured: false,
    action: "Open Rabby Wallet ↗",
  },
  {
    rank: "03",
    name: "OKX Wallet",
    note: "Recommended",
    description: "Open Asset Oracle through OKX Wallet's mobile DApp browser.",
    url: `https://web3.okx.com/ul/dapp?dappUrl=${encodedAppUrl}`,
    featured: false,
    action: "Open in OKX Wallet ↗",
  },
];

const otherWallets = [
  { name: "Trust Wallet", url: "https://trustwallet.com/" },
  { name: "Bitget Wallet", url: "https://web3.bitget.com/" },
  { name: "Coinbase Wallet", url: "https://www.coinbase.com/wallet" },
];

export default function WalletHelpPanel({
  onConnect,
  onClose,
}: WalletHelpPanelProps) {
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);

  return (
    <div
      className="wallet-recommendation-overlay"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="wallet-recommendation-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="wallet-recommendation-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="wallet-recommendation-header">
          <div>
            <p className="wallet-recommendation-eyebrow">ASSET ORACLE · WALLET CONNECTION</p>
            <h2 id="wallet-recommendation-title">Open Asset Oracle in your wallet</h2>
            <p className="wallet-recommendation-subtitle">
              Choose a wallet to open Asset Oracle app.xyz in its mobile browser, then connect.
            </p>
          </div>
          <button
            className="wallet-recommendation-close"
            type="button"
            onClick={onClose}
            aria-label="Close wallet recommendations"
          >
            ×
          </button>
        </div>

        <div className="wallet-recommendation-note">
          <strong>Choose your wallet below</strong>
          <p>
            Tap a wallet to open Asset Oracle in its app where supported. If the app
            opens to its home screen instead, open its built-in browser and visit
            assetoracleapp.xyz. Your wallet will only connect after you approve the
            connection request.
          </p>
        </div>

        <div className="wallet-recommendation-grid">
          {recommendedWallets.map((wallet) => (
            <a
              key={wallet.name}
              className={`wallet-recommendation-card${wallet.featured ? " wallet-recommendation-card-featured" : ""}`}
              href={wallet.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="wallet-recommendation-rank">{wallet.rank}</span>
              {wallet.featured && (
                <span className="wallet-recommendation-top-pick">HIGHLY RECOMMENDED</span>
              )}
              <strong>{wallet.name}</strong>
              <span className="wallet-recommendation-note-label">{wallet.note}</span>
              <span className="wallet-recommendation-description">{wallet.description}</span>
              <span className="wallet-recommendation-link">{wallet.action}</span>
            </a>
          ))}
        </div>

        <button
          className="wallet-recommendation-continue"
          type="button"
          onClick={onConnect}
        >
          Use the wallet selector instead
          <span aria-hidden="true">→</span>
        </button>
        <p className="wallet-recommendation-hint">
          Already have a wallet connected? Continue to the existing wallet selector.
          Deep links can behave differently depending on your device and installed app.
        </p>

        <div className="wallet-recommendation-other">
          <span>Other wallet options</span>
          {otherWallets.map((wallet) => (
            <a key={wallet.name} href={wallet.url} target="_blank" rel="noopener noreferrer">
              {wallet.name}
            </a>
          ))}
        </div>

        <button
          className="wallet-recommendation-troubleshoot-toggle"
          type="button"
          onClick={() => setShowTroubleshooting((current) => !current)}
          aria-expanded={showTroubleshooting}
        >
          {showTroubleshooting
            ? "Hide connection tips ↑"
            : "Having trouble connecting? View tips ↓"}
        </button>

        {showTroubleshooting && (
          <div className="wallet-recommendation-troubleshooting">
            <ol>
              <li>Make sure your wallet app is installed and unlocked.</li>
              <li>If a wallet opens to its home screen, open its built-in browser.</li>
              <li>Visit assetoracleapp.xyz inside that browser and tap Connect Wallet.</li>
              <li>Confirm Asset Chain Enugu Testnet (Chain ID 42421) when prompted.</li>
              <li>Approve only the connection request you initiated.</li>
            </ol>
            <p>
              Never share your recovery phrase or private keys. Connecting a wallet
              does not itself authorize a transaction.
            </p>
          </div>
        )}

        <p className="wallet-recommendation-disclaimer">
          App handoff depends on the wallet version, device, and browser. If a link
          does not open the DApp directly, use the wallet's built-in browser to visit
          assetoracleapp.xyz.
        </p>
      </section>
    </div>
  );
}
