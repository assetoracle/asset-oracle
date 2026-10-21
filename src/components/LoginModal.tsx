import { useConnectModal } from "@rainbow-me/rainbowkit";
import { Wallet, X } from "lucide-react";

type LoginModalProps = { onClose: () => void };

export default function LoginModal({ onClose }: LoginModalProps) {
  const { openConnectModal } = useConnectModal();

  async function connectExternalWallet() {
    onClose();
    openConnectModal?.();
  }

  return (
    <div className="asset-login-overlay" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="asset-login-dialog" role="dialog" aria-modal="true" aria-labelledby="asset-login-title">
        <button className="asset-login-close" type="button" onClick={onClose} aria-label="Close wallet connection">
          <X size={20} />
        </button>
        <div className="asset-login-brand">
          <span className="asset-login-mark" aria-hidden="true">
            <img src="/asset-oracle-logo-transparent.svg" alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          </span>
          <div>
            <span className="asset-login-brand-name">ASSET ORACLE</span>
            <span className="asset-login-brand-tagline">REAL-WORLD TRUTH, ON-CHAIN.</span>
          </div>
        </div>
        <div className="asset-login-heading">
          <h2 id="asset-login-title">Connect your wallet</h2>
          <p>Connect an external wallet that you control. Asset Oracle does not create or custody an embedded wallet.</p>
        </div>
        <button className="asset-login-wallet" type="button" onClick={() => void connectExternalWallet()}>
          <Wallet size={19} />
          <span>Choose an external wallet</span>
        </button>
        <p className="asset-login-footnote">Self-custody · You approve transactions in your wallet</p>
      </section>
    </div>
  );
}
