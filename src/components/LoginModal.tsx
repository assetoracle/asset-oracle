import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, LoaderCircle, Mail, ShieldCheck, Wallet, X } from "lucide-react";
import { usePrivy } from "@privy-io/react-auth";
import { useAccount } from "wagmi";

type LoginMethod = "email" | "google" | "twitter" | "wallet";
type LoginModalProps = { onClose: () => void };

function GoogleMark() {
  return <svg viewBox="0 0 48 48" width="23" height="23" aria-hidden="true">
    <path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.6c3.9-3.6 6.1-8.8 6.1-15Z" />
    <path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.8l-6.6-5.1c-1.8 1.2-4.1 2-6.9 2-5.3 0-9.8-3.6-11.4-8.4H5.8v5.3A20 20 0 0 0 24 44Z" />
    <path fill="#FBBC05" d="M12.6 27.7a12 12 0 0 1 0-7.4V15H5.8a20 20 0 0 0 0 18l6.8-5.3Z" />
    <path fill="#EA4335" d="M24 11.9c3 0 5.7 1 7.8 3.1l5.8-5.8C34.1 5.9 29.5 4 24 4A20 20 0 0 0 5.8 15l6.8 5.3c1.6-4.8 6.1-8.4 11.4-8.4Z" />
  </svg>;
}
function XMark() {
  return <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
    <path d="M18.9 2H22l-6.8 7.8L23.2 22h-6.3L12 13.9 4.9 22H1.8l7.3-8.4L1.3 2h6.5l4.5 7.5L18.9 2Zm-1.1 18h1.7L6.8 3.9H5L17.8 20Z" />
  </svg>;
}

export default function LoginModal({ onClose }: LoginModalProps) {
  const { login, ready } = usePrivy();
  const { address, isConnected } = useAccount();
  const [statusMessage, setStatusMessage] = useState("");
  const [activeMethod, setActiveMethod] = useState<LoginMethod | null>(null);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    if (isConnected && address) onClose();
  }, [isConnected, address, onClose]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isPending) onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPending, onClose]);

  async function startLogin(method: LoginMethod) {
    if (isPending || !ready) return;
    setActiveMethod(method);
    setIsPending(true);
    setStatusMessage(method === "email"
      ? "Complete email verification in the secure sign-in window."
      : method === "wallet"
        ? "Choose your external wallet in the secure sign-in window."
        : "Complete sign-in in the secure browser window, then return to Asset Oracle.");
    try {
      await login({ loginMethods: [method] });
      setStatusMessage("Sign-in complete. If your wallet is not connected yet, reopen Sign in and choose Connect an external wallet.");
      setIsPending(false);
      setActiveMethod(null);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Sign-in did not complete. Please try again.");
      setIsPending(false);
      setActiveMethod(null);
    }
  }

  return <div className="asset-login-overlay" role="presentation" onMouseDown={(event) => {
    if (event.target === event.currentTarget && !isPending) onClose();
  }}>
    <section className="asset-login-dialog" role="dialog" aria-modal="true" aria-labelledby="asset-login-title" aria-describedby="asset-login-description">
      <button className="asset-login-close" type="button" onClick={onClose} disabled={isPending} aria-label="Close sign in"><X size={20} /></button>
      <div className="asset-login-brand">
        <span className="asset-login-mark" aria-hidden="true"><img src="/asset-oracle-logo-transparent.svg" alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} /></span>
        <div><span className="asset-login-brand-name">ASSET ORACLE</span><span className="asset-login-brand-tagline">REAL-WORLD TRUTH, ON-CHAIN.</span></div>
      </div>
      <div className="asset-login-heading">
        <span className="asset-login-shield"><ShieldCheck size={23} /></span>
        <h2 id="asset-login-title">Sign in to Asset Oracle</h2>
        <p id="asset-login-description">Choose email, Google, X, or an external wallet to sign in to Asset Oracle.</p>
      </div>
      <div className="asset-login-options">
        <button className="asset-login-option asset-login-option-primary" type="button" onClick={() => void startLogin("email")} disabled={isPending || !ready}>
          <span className="asset-login-option-icon"><Mail size={19} /></span><span className="asset-login-option-copy"><strong>Continue with email</strong><small>Get a secure sign-in code</small></span>
          {isPending && activeMethod === "email" ? <LoaderCircle className="asset-login-spinner" size={18} /> : <ArrowRight size={18} />}
        </button>
        <button className="asset-login-option" type="button" onClick={() => void startLogin("google")} disabled={isPending || !ready}>
          <span className="asset-login-google-mark"><GoogleMark /></span><span className="asset-login-option-copy"><strong>Continue with Google</strong><small>Use your Google account</small></span>
          {isPending && activeMethod === "google" ? <LoaderCircle className="asset-login-spinner" size={18} /> : <ArrowRight size={18} />}
        </button>
        <button className="asset-login-option" type="button" onClick={() => void startLogin("twitter")} disabled={isPending || !ready}>
          <span className="asset-login-x-mark"><XMark /></span><span className="asset-login-option-copy"><strong>Continue with X</strong><small>Use your X account</small></span>
          {isPending && activeMethod === "twitter" ? <LoaderCircle className="asset-login-spinner" size={18} /> : <ArrowRight size={18} />}
        </button>
        <div className="asset-login-divider"><span>OR</span></div>
        <button className="asset-login-wallet" type="button" onClick={() => void startLogin("wallet")} disabled={isPending || !ready}>
          <Wallet size={19} /><span>Connect an external wallet</span>{isPending && activeMethod === "wallet" ? <LoaderCircle className="asset-login-spinner" size={18} /> : null}
        </button>
      </div>
      {(statusMessage || !ready) && <p className="asset-login-status" role="status">{statusMessage || "Preparing secure sign-in…"}</p>}
      <p className="asset-login-footnote"><CheckCircle2 size={14} /><span>Secure sign-in · Asset Chain Testnet</span></p>
    </section>
  </div>;
}
