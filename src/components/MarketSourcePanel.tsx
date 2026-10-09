
import { getMarketSourceStatuses } from "../data/marketSourceStatus";

export default function MarketSourcePanel() {
  const sources = getMarketSourceStatuses();

  return (
    <section className="source-panel">
      <div className="source-panel-heading">
        <div>
          <span className="eyebrow">DATA INFRASTRUCTURE</span>
          <h2>Verification sources</h2>
          <p>
            Data providers planned for transparent market verification.
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
              {source.enabled ? "Enabled" : "Disabled"}
            </span>
          </article>
        ))}
      </div>

      <p className="source-note">
        Enabled means registered in this interface. Live API connectivity
        and data verification have not yet been confirmed.
      </p>
    </section>
  );
}
