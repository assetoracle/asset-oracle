import { useState } from "react";

type WalletHelpPanelProps = {
  onConnect: () => void;
  onClose: () => void;
};

const recommendedWallets = [
  {
    rank: "01",
    name: "MetaMask",
    note: "Top recommendation",
    description: "Our first choice for testing on Asset Chain Enugu Testnet.",
    url: "https://metamask.io/",
    featured: true,
  },
  {
    rank: "02",
    name: "OKX Wallet",
    note: "Recommended alternative",
    description: "A strong alternative to try for EVM testnet access.",
    url: "https://www.okx.com/web3",
    featured: false,
  },
  {
    rank: "03",
    name: "Rabby Wallet",
    note: "Recommended alternative",
    description: "Another EVM wallet option for testnet interactions.",
    url: "https://rabby.io/",
    featured: false,
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
            <p className="wallet-recommendation-eyebrow">ASSET ORACLE · TESTNET SETUP</p>
            <h2 id="wallet-recommendation-title">Choose a wallet</h2>
            <p className="wallet-recommendation-subtitle">
              Recommended wallets for Asset Chain Enugu Testnet
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
          <strong>Our top pick is MetaMask.</strong>
          <p>
            For testing, we recommend trying the wallets below in this order:
            MetaMask first, followed by OKX Wallet and Rabby Wallet. Wallet
            behavior can vary by device, so confirm you are using Asset Chain
            Testnet (Chain ID 42421) before testing.
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
                <span className="wallet-recommendation-top-pick">TOP PICK</span>
              )}
              <strong>{wallet.name}</strong>
              <span className="wallet-recommendation-note-label">{wallet.note}</span>
              <span className="wallet-recommendation-description">{wallet.description}</span>
              <span className="wallet-recommendation-link">Official website ↗</span>
            </a>
          ))}
        </div>

        <button
          className="wallet-recommendation-continue"
          type="button"
          onClick={onConnect}
        >
          Continue to wallet selector
          <span aria-hidden="true">→</span>
        </button>
        <p className="wallet-recommendation-hint">
          The wallet selector opens next. Choose your wallet there to connect;
          these recommendations do not connect or authorize anything by themselves.
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
              <li>Unlock your wallet app.</li>
              <li>On mobile, try opening Asset Oracle in the wallet's built-in browser.</li>
              <li>Return to Asset Oracle and open the wallet selector.</li>
              <li>Approve only the connection request you initiated.</li>
            </ol>
            <p>
              Asset Chain Enugu Testnet uses Chain ID 42421. Never share your
              recovery phrase or private keys.
            </p>
          </div>
        )}

        <p className="wallet-recommendation-disclaimer">
          Wallet links lead to the providers' websites and do not guarantee
          compatibility or a successful connection on every device.
        </p>
      </section>
    </div>
  );
}
