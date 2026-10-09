
import { useState } from "react";
import { getMarketSourceStatuses } from "../data/marketSourceStatus";
import { checkCoinGecko } from "../data/checkMarketSource";

export default function MarketSourcePanel() {
  const sources = getMarketSourceStatuses();

  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<
    Awaited<ReturnType<typeof checkCoinGecko>> | null
  >(null);

  async function handleCheck() {
    setChecking(true);
    setCheckResult(null);

    try {
      const result = await checkCoinGecko();
      setCheckResult(result);
    } catch {
      setCheckResult({
        sourceId: "coingecko",
        reachable: false,
        checkedAt: new Date().toISOString(),
        message: "An unexpected error occurred during the provider check.",
      });
    } finally {
      setChecking(false);
    }
  }

  return (
    <section className="source-panel">
      <div className="source-panel-heading">
        <div>
          <span className="eyebrow">DATA INFRASTRUCTURE</span>
          <h2>Verification sources</h2>
          <p>
            Check provider connectivity before building live market
            verification.
          </p>
        </div>

        <span className="source-count">
          {sources.length} registered
        </span>
      </div>

      <div className="source-list">
        {sources.map((source) => (
          <article className="source-item" key={source.id}>
            <div className="source-indicator" aria-hidden="true" />

            <div className="source-details">
              <strong>{source.name}</strong>
              <span>{source.id}</span>
            </div>

            <span
              className={
                source.enabled
                  ? "source-status enabled"
                  : "source-status disabled"
              }
            >
              {source.enabled ? "Registered" : "Disabled"}
            </span>
          </article>
        ))}
      </div>

      <button
        className="primary-button source-check-button"
        type="button"
        onClick={handleCheck}
        disabled={checking}
      >
        {checking ? "Checking provider..." : "Check CoinGecko"}
      </button>

      {checkResult && (
        <div className="source-check-result" role="status">
          <strong>
            {checkResult.reachable
              ? "Provider responded"
              : "Provider check failed"}
          </strong>
          <p>{checkResult.message}</p>
          <span>
            Checked: {new Date(checkResult.checkedAt).toLocaleString()}
          </span>
        </div>
      )}

      <p className="source-note">
        A successful connectivity check confirms only that the endpoint
        responded. It does not verify market data accuracy or authorize
        market settlement.
      </p>
    </section>
  );
}
