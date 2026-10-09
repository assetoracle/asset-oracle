
export type SourceCheckResult = {
  sourceId: string;
  reachable: boolean;
  checkedAt: string;
  message: string;
};

export async function checkCoinGecko(): Promise<SourceCheckResult> {
  const checkedAt = new Date().toISOString();

  try {
    const response = await fetch(
      "https://api.coingecko.com/api/v3/ping",
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      },
    );

    if (!response.ok) {
      return {
        sourceId: "coingecko",
        reachable: false,
        checkedAt,
        message: `Provider returned HTTP ${response.status}.`,
      };
    }

    return {
      sourceId: "coingecko",
      reachable: true,
      checkedAt,
      message: "Provider responded successfully.",
    };
  } catch {
    return {
      sourceId: "coingecko",
      reachable: false,
      checkedAt,
      message: "Could not reach the provider. Check network access or CORS.",
    };
  }
}
