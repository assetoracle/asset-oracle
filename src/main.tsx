
import React from "react";
import { createRoot } from "react-dom/client";
import "./style.css";

function AssetOracle() {
  return (
    <main className="app">
      <header className="header">
        <div className="brand">
          <div className="brand-mark">A</div>
          <div>
            <h1>ASSET ORACLE</h1>
            <p>REAL-WORLD TRUTH, ON-CHAIN.</p>
          </div>
        </div>
        <button className="connect-button" type="button">
          Connect Wallet
        </button>
      </header>

      <section className="hero">
        <span className="eyebrow">PREDICT · VERIFY · BUILD</span>
        <h2>Turn real-world events into on-chain outcomes.</h2>
        <p>
          Predict what happens next. Back your conviction.
          Follow transparent verification and settlement.
        </p>
        <div className="hero-actions">
          <button type="button" className="primary-button">
            Explore Markets
          </button>
          <span className="network-label">
            Asset Chain · Testnet development
          </span>
        </div>
      </section>

      <section className="section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">THE MARKETPLACE</span>
            <h2>Prediction markets</h2>
          </div>
          <span className="status">Development preview</span>
        </div>

        <div className="empty-state">
          <div className="empty-icon">◎</div>
          <h3>Your next prediction starts here.</h3>
          <p>
            Market listings will appear here once the market
            data and smart contracts are connected.
          </p>
        </div>
      </section>

      <footer>
        <span>ASSET ORACLE</span>
        <span>REAL-WORLD TRUTH, ON-CHAIN.</span>
      </footer>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AssetOracle />
  </React.StrictMode>
);
