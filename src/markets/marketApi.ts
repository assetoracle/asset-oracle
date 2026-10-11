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
    throw new Error(
      data?.error ||
        data?.message ||
        `Request failed with status ${response.status}`,
    );
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

export async function requestWalletNonce(address: string) {
  return request<{ nonce: string; message: string }>(
    "/api/markets/auth/nonce",
    {
      method: "POST",
      body: JSON.stringify({ address }),
    },
  );
}

export async function createMarketProposal(
  proposal: MarketProposalInput,
  address: string,
  signMessage: (message: string) => Promise<string>,
) {
  const { message } = await requestWalletNonce(address);
  const signature = await signMessage(message);

  return request<{
    message: string;
    proposal: StoredMarketProposal;
  }>("/api/markets/proposals", {
    method: "POST",
    body: JSON.stringify({
      proposal,
      walletAuth: {
        address,
        message,
        signature,
      },
    }),
  });
}

export async function getMarketProposal(id: string) {
  return request<{
    proposal: StoredMarketProposal;
  }>(
    `/api/markets/proposals/${encodeURIComponent(id)}`,
  );
}

export async function listPublishedMarkets() {
  return request<{
    markets: StoredMarketProposal[];
    count: number;
  }>("/api/markets/public");
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

export type WalletRole = "OWNER" | "MARKET_CREATOR" | "USER";

export type WalletRoleResponse = {
  address: string;
  role: WalletRole;
  permissions: {
    createMarketProposal: boolean;
    viewOwnProposals: boolean;
    reviewAllProposals: boolean;
    approveOrRejectProposals: boolean;
  };
};

export async function getWalletRole(
  address: string,
  message: string,
  signature: string,
) {
  return request<WalletRoleResponse>("/api/markets/auth/role", {
    method: "POST",
    body: JSON.stringify({ address, message, signature }),
  });
}


export type ReferralLeaderboardEntry = {
  rank: number;
  wallet: string;
  verifiedReferrals: number;
};

export async function createReferralCode(
  address: string,
  message: string,
  signature: string,
) {
  return request<{ code: string }>("/api/referrals/code", {
    method: "POST",
    body: JSON.stringify({ address, message, signature }),
  });
}

export async function getReferralLeaderboard() {
  return request<{
    period: "ALL_TIME";
    leaderboard: ReferralLeaderboardEntry[];
  }>("/api/referrals/leaderboard");
}

export async function attributeReferral(
  address: string,
  message: string,
  signature: string,
  referralCode: string,
) {
  return request<{
    status: string;
    message: string;
    reviewFlagged?: boolean;
  }>("/api/referrals/attribute", {
    method: "POST",
    body: JSON.stringify({ address, message, signature, referralCode }),
  });
}
