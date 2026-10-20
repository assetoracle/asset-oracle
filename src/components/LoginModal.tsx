import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, LoaderCircle, Mail, ShieldCheck, Wallet, X } from "lucide-react";
import { useAppKit } from "@reown/appkit/react";
import { useAppKitWallet } from "@reown/appkit-wallet-button/react";
import type { Wallet as AppKitWallet } from "@reown/appkit-wallet-button";

type LoginModalProps = {
  onClose: () => void;
};

export default function LoginModal({ onClose }: LoginModalProps) {
  const { open } = useAppKit();
  const [statusMessage, setStatusMessage] = useState("");
  const [activeMethod, setActiveMethod] = useState<AppKitWallet | null>(null);

  const { connect, isPending, isError } = useAppKitWallet({
    namespace: "eip155",
    onSuccess: () => {
      setStatusMessage("Connected. Preparing your Asset Oracle session…");
      onClose();
    },
    onError: (error) => {
      setActiveMethod(null);
      setStatusMessage(error.message || "Sign-in did not complete. Please try again.");
    },
  });

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isPending) onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPending, onClose]);

  async function startLogin(method: AppKitWallet) {
    if (isPending) return;
    setActiveMethod(method);
    setStatusMessage("");
    // Keep this call directly inside the click path: Reown opens its social
    // authentication popup from this user gesture, which is important on mobile.
    await connect(method);
  }

  async function openExternalWallets() {
    if (isPending) return;
    onClose();
    try {
      await open({ view: "Connect", namespace: "eip155" });
    } catch {
      // AppKit reports wallet-modal failures through its own connection UI.
    }
  }

  return (
    <div
      className="asset-login-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isPending) onClose();
      }}
    >
      <section
        className="asset-login-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="asset-login-title"
        aria-describedby="asset-login-description"
      >
        <button
          className="asset-login-close"
          type="button"
          onClick={onClose}
          disabled={isPending}
          aria-label="Close sign in"
        >
          <X size={20} />
        </button>

        <div className="asset-login-brand">
          <span className="asset-login-mark" aria-hidden="true">A</span>
          <div>
            <span className="asset-login-brand-name">ASSET ORACLE</span>
            <span className="asset-login-brand-tagline">REAL-WORLD TRUTH, ON-CHAIN.</span>
          </div>
        </div>

        <div className="asset-login-heading">
          <span className="asset-login-shield"><ShieldCheck size={23} /></span>
          <h2 id="asset-login-title">Welcome back</h2>
          <p id="asset-login-description">
            Sign in to explore markets and manage your Asset Oracle account.
          </p>
        </div>

        <div className="asset-login-options">
          <button
            className="asset-login-option asset-login-option-primary"
            type="button"
            onClick={() => void startLogin("email")}
            disabled={isPending}
          >
            <span className="asset-login-option-icon"><Mail size={19} /></span>
            <span className="asset-login-option-copy">
              <strong>Continue with email</strong>
              <small>Get a secure sign-in link or code</small>
            </span>
            {isPending && activeMethod === "email" ? <LoaderCircle className="asset-login-spinner" size={18} /> : <ArrowRight size={18} />}
          </button>

          <button
            className="asset-login-option"
            type="button"
            onClick={() => void startLogin("google")}
            disabled={isPending}
          >
            <span className="asset-login-google-mark" aria-hidden="true">G</span>
            <span className="asset-login-option-copy">
              <strong>Continue with Google</strong>
              <small>Use your Google account</small>
            </span>
            {isPending && activeMethod === "google" ? <LoaderCircle className="asset-login-spinner" size={18} /> : <ArrowRight size={18} />}
          </button>

          <button
            className="asset-login-option"
            type="button"
            onClick={() => void startLogin("x")}
            disabled={isPending}
          >
            <span className="asset-login-x-mark" aria-hidden="true">𝕏</span>
            <span className="asset-login-option-copy">
              <strong>Continue with X</strong>
              <small>Use your X account</small>
            </span>
            {isPending && activeMethod === "x" ? <LoaderCircle className="asset-login-spinner" size={18} /> : <ArrowRight size={18} />}
          </button>

          <div className="asset-login-divider"><span>OR</span></div>

          <button
            className="asset-login-wallet"
            type="button"
            onClick={() => void openExternalWallets()}
            disabled={isPending}
          >
            <Wallet size={19} />
            <span>Connect an external wallet</span>
          </button>
        </div>

        {(statusMessage || isError) && (
          <p className="asset-login-status" role="status">{statusMessage || "Sign-in failed. Please try again."}</p>
        )}

        <p className="asset-login-footnote">
          <CheckCircle2 size={14} />
          <span>Secure sign-in · Asset Chain Testnet</span>
        </p>
      </section>
    </div>
  );
}
