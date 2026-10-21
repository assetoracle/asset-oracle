import { Menu, X } from "lucide-react";
import type { Page, NavItem } from "./Nav";
import { DesktopNav, MobileNav } from "./Nav";
import type { WalletConnection } from "../hooks/useWalletStatus";

type HeaderProps = {
  page: Page;
  navItems: NavItem[];
  wallet: WalletConnection | null;
  walletBusy: boolean;
  mobileMenuOpen: boolean;
  onNavigate: (page: Page) => void;
  onConnect: () => void;
  onOpenAccount: () => void;
  onDisconnect: () => void;
  onToggleMobileMenu: () => void;
};

export default function Header({
  page,
  navItems,
  wallet,
  walletBusy,
  mobileMenuOpen,
  onNavigate,
  onConnect,
  onOpenAccount,
  onDisconnect,
  onToggleMobileMenu,
}: HeaderProps) {
  return (
    <>
      <header className="header">
        <button
          className="brand"
          type="button"
          onClick={() => onNavigate("Home")}
          aria-label="Go to Asset Oracle home"
        >
          <img
            className="brand-logo"
            src="/asset-oracle-logo-transparent.svg"
            alt="Asset Oracle"
          />
          <span>
            <span className="brand-name">ASSET ORACLE</span>
            <span className="brand-tagline">
              REAL-WORLD TRUTH, ON-CHAIN.
            </span>
          </span>
        </button>

        <DesktopNav
          items={navItems}
          page={page}
          onNavigate={onNavigate}
        />

        <div className="header-actions">
          {wallet ? (
            <div className="wallet-header-actions">
              <button className="connect-button" type="button" onClick={onOpenAccount} disabled={walletBusy} aria-label="Open connected wallet account">
                {walletBusy ? "Wallet…" : `${wallet.address.slice(0, 6)}…${wallet.address.slice(-4)}`}
              </button>
              <button className="disconnect-button" type="button" onClick={onDisconnect} disabled={walletBusy} aria-label="Disconnect wallet">Disconnect</button>
            </div>
          ) : (
            <button className="connect-button" type="button" onClick={onConnect} disabled={walletBusy}>
              {walletBusy ? "Connecting…" : "Connect Wallet"}
            </button>
          )}

          <button
            className="mobile-menu-button"
            type="button"
            onClick={onToggleMobileMenu}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
      </header>

      {mobileMenuOpen && (
        <MobileNav
          items={navItems}
          page={page}
          onNavigate={onNavigate}
        />
      )}
    </>
  );
}