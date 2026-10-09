
export type CryptoPriceResult = {
  coinId: string;
  currency: string;
  price: number | null;
  fetchedAt: string;
  success: boolean;
  message: string;
};

export async function getBitcoinPrice(): Promise<CryptoPriceResult> {
  const fetchedAt = new Date().toISOString();

  try {
    const response = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd",
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      },
    );

    if (!response.ok) {
      return {
        coinId: "bitcoin",
        currency: "USD",
        price: null,
        fetchedAt,
        success: false,
        message: `CoinGecko returned HTTP ${response.status}.`,
      };
    }

    const data: unknown = await response.json();

    if (
      typeof data !== "object" ||
      data === null ||
      !("bitcoin" in data) ||
      typeof data.bitcoin !== "object" ||
      data.bitcoin === null ||
      !("usd" in data.bitcoin) ||
      typeof data.bitcoin.usd !== "number" ||
      !Number.isFinite(data.bitcoin.usd)
    ) {
      return {
        coinId: "bitcoin",
        currency: "USD",
        price: null,
        fetchedAt,
        success: false,
        message: "The provider returned an unexpected price response.",
      };
    }

    return {
      coinId: "bitcoin",
      currency: "USD",
      price: data.bitcoin.usd,
      fetchedAt: new Date().toISOString(),
      success: true,
      message: "Bitcoin price retrieved successfully.",
    };
  } catch {
    return {
      coinId: "bitcoin",
      currency: "USD",
      price: null,
      fetchedAt,
      success: false,
      message: "Could not retrieve the price. Check network access or CORS.",
    };
  }
}
