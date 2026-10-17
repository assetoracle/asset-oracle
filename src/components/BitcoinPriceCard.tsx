
import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { getBitcoinPrice, type CryptoPriceResult } from "../data/cryptoPrices";

export default function BitcoinPriceCard() {
  const [result, setResult] = useState<CryptoPriceResult | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadPrice() {
    setLoading(true);

    try {
      const price = await getBitcoinPrice();
      setResult(price);
    } catch {
      setResult({
        coinId: "bitcoin",
        currency: "USD",
        price: null,
        fetchedAt: new Date().toISOString(),
        success: false,
        message: "Unable to load the Bitcoin price.",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPrice();
  }, []);

  return (
    <article className="bitcoin-price-card">
      <div className="bitcoin-price-heading">
        <span className="bitcoin-symbol">₿</span>
        <div>
          <strong>Bitcoin</strong>
          <span>BTC / USD</span>
        </div>
        <span className="price-source">COINGECKO</span>
      </div>

      <div className="bitcoin-price-value">
        {loading
          ? "Loading price..."
          : result?.success && result.price !== null
            ? `$${result.price.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}`
            : "Price unavailable"}
      </div>

      {!loading && result && !result.success && (
        <p className="price-error">{result.message}</p>
      )}

      {result?.success && (
        <p className="price-timestamp">
          Retrieved {new Date(result.fetchedAt).toLocaleString()}
        </p>
      )}

      <button
        className="refresh-action-button price-refresh-button"
        type="button"
        onClick={() => void loadPrice()}
        disabled={loading}
      >
        <RefreshCw size={15} className={loading ? "refresh-action-spinning" : ""} />\n        {loading ? "Refreshing price..." : "Refresh price"}
      </button>

      <p className="price-disclaimer">
        Reference price only. This is not a market outcome or settlement result.
      </p>
    </article>
  );
}
