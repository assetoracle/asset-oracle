const API_BASE_URL =
  "https://asset-oracle-backend.onrender.com";

export type MarketProposalInput = {
  question: string;
  description: string;
  category: "Crypto" | "Sports" | "Economics" | "RWA" | "Regional";
  closesAt: string;
  resolvesAt: string;
  resolutionRule: {
    sourceId: string;
    metric: string;
    comparison: "ABOVE" | "BELOW" | "EQUALS";
    targetValue: number;
    currency?: string;
    observationTime: string;
    description: string;
  };
};

export type StoredMarketProposal = MarketProposalInput & {
  id: string;
  status: "PENDING_APPROVAL" | "APPROVED" | "REJECTED";
  submittedAt: string;
};

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      data?.error ||
      data?.message ||
      `Request failed with status ${response.status}`;

    throw new Error(message);
  }

  return data as T;
}

export async function validateMarketProposal(
  proposal: MarketProposalInput,
) {
  return request<{
    valid: boolean;
    message?: string;
    errors?: { field: string; message: string }[];
    proposal?: MarketProposalInput;
    status?: string;
    persisted?: boolean;
  }>("/api/markets/proposals/validate", {
    method: "POST",
    body: JSON.stringify(proposal),
  });
}

export async function createMarketProposal(
  proposal: MarketProposalInput,
) {
  return request<{
    message: string;
    proposal: StoredMarketProposal;
  }>("/api/markets/proposals", {
    method: "POST",
    body: JSON.stringify(proposal),
  });
}

export async function listMarketProposals() {
  return request<{
    proposals: StoredMarketProposal[];
    count: number;
  }>("/api/markets/proposals");
}

export async function getMarketProposal(id: string) {
  return request<{
    proposal: StoredMarketProposal;
  }>(`/api/markets/proposals/${encodeURIComponent(id)}`);
}
export async function listPublishedMarkets() {
  return request<{
    markets: StoredMarketProposal[];
    count: number;
  }>("/api/markets/public");
}
export async function requestWalletNonce(address: string) {
  return request<{
    nonce: string;
    message: string;
  }>("/api/markets/auth/nonce", {
    method: "POST",
    body: JSON.stringify({ address }),
  });
}

export async function getMyProposals(
  address: string,
  message: string,
  signature: string,
) {
  return request<{
    proposals: StoredMarketProposal[];
    count: number;
  }>("/api/markets/proposals/mine", {
    method: "POST",
    body: JSON.stringify({
      address,
      message,
      signature,
    }),
  });
}