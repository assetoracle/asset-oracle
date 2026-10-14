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
    comparison: "ABOVE" | "AT_LEAST" | "BELOW" | "EQUALS";
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
  onchainMarketId?: string | null;
  onchainTxHash?: string | null;
  onchainManagerAddress?: string | null;
  onchainChainId?: number | null;
};

function compactErrorMessage(value: unknown, fallback = "Request failed. Try again."): string {
  if (typeof value !== "string" || !value.trim()) return fallback;
  const message = value.trim();
  const lower = message.toLowerCase();
  if (lower.includes("user rejected") || lower.includes("user denied")) return "Request cancelled.";
  if (lower.includes("insufficient funds")) return "Insufficient funds.";
  if (lower.includes("wrong network") || lower.includes("chain id")) return "Switch to Asset Chain.";
  if (lower.includes("failed to fetch") || lower.includes("networkerror")) return "Network error. Try again.";
  if (lower.includes("nonce")) return "Wallet verification failed. Retry.";
  if (lower.includes("unauthorized") || lower.includes("forbidden")) return "Not authorized.";
  if (lower.includes("not found")) return "Record not found.";
  const firstSentence = message.split(/[\\n.!?]/, 1)[0].replace(/^error:\\s*/i, "").trim();
  if (!firstSentence) return fallback;
  return firstSentence.length > 84 ? `${firstSentence.slice(0, 81).trimEnd()}…` : firstSentence;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const activeSession = getStoredWalletSession();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(activeSession && activeSession.expiresAt > Date.now() ? { Authorization: `Bearer ${activeSession.token}` } : {}),
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => null);

  if (response.status === 401 && activeSession) clearWalletSession();

  if (!response.ok) {
    throw new Error(
      compactErrorMessage(
        data?.error || data?.message,
        `Request failed (${response.status}).`,
      ),
    );
  }

  return data as T;
}


export type WalletSession = {
  address: string;
  token: string;
  expiresAt: number;
  role: WalletRole;
};

const WALLET_SESSION_KEY = "asset-oracle-wallet-session";

function getStoredWalletSession(): WalletSession | null {
  try {
    const raw = window.localStorage.getItem(WALLET_SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as WalletSession;
    if (!session.token || !session.address || !Number.isFinite(session.expiresAt) || session.expiresAt <= Date.now()) {
      window.localStorage.removeItem(WALLET_SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function getWalletSession(address: string): WalletSession | null {
  const session = getStoredWalletSession();
  return session && session.address.toLowerCase() === address.toLowerCase() ? session : null;
}

export async function ensureWalletSession(
  address: string,
  signMessage: (message: string) => Promise<string>,
): Promise<WalletSession> {
  const existing = getWalletSession(address);
  if (existing) return existing;
  const { message } = await requestWalletNonce(address);
  const signature = await signMessage(message);
  const created = await request<{ address: string; token: string; expiresAt: string; role: WalletRole }>("/api/markets/auth/session", {
    method: "POST",
    body: JSON.stringify({ address, message, signature }),
  });
  const session: WalletSession = {
    address: created.address,
    token: created.token,
    expiresAt: new Date(created.expiresAt).getTime(),
    role: created.role,
  };
  window.localStorage.setItem(WALLET_SESSION_KEY, JSON.stringify(session));
  return session;
}

export function clearWalletSession(): void {
  try { window.localStorage.removeItem(WALLET_SESSION_KEY); } catch { /* ignore unavailable storage */ }
}


export type WalletPositionRecord = {
  marketId: number;
  question: string;
  yesStake: string;
  noStake: string;
  status: number;
  outcome: number;
  claimed: boolean;
  timestamp: string | null;
  tokenDecimals: number;
  claimableAmount: string;
};

export type WalletHistoryRecord = {
  type: "Staked" | "MarketFinalized" | "Claimed" | "Refunded";
  transactionHash: string;
  blockNumber: string;
  timestamp: string;
  marketId: string;
  amount: string | null;
  outcome: number | null;
};

export type WalletAccountData = {
  address: string;
  chainId: number;
  positions: WalletPositionRecord[];
  claimable: WalletPositionRecord[];
  history: WalletHistoryRecord[];
  historyStatus: string;
};

export async function getWalletAccountData(address: string) {
  return request<WalletAccountData>("/api/stats/wallet/" + encodeURIComponent(address));
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
  await ensureWalletSession(address, signMessage);
  return request<{
    message: string;
    proposal: StoredMarketProposal;
  }>("/api/markets/proposals/session", {
    method: "POST",
    body: JSON.stringify({ proposal, address }),
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

export async function getMyProposals(address: string) {
  return request<{
    proposals: StoredMarketProposal[];
    count: number;
  }>("/api/markets/proposals/mine/session", {
    method: "POST",
    body: JSON.stringify({ address }),
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

export async function getWalletRole(address: string) {
  const session = getWalletSession(address);
  if (!session) {
    throw new Error("Verify your wallet once to establish a secure session.");
  }
  return request<WalletRoleResponse>("/api/markets/auth/role/session", {
    method: "POST",
    body: JSON.stringify({ address }),
  });
}


export type ReferralLeaderboardEntry = {
  rank: number;
  wallet: string;
  points: number;
};

export async function createReferralCode(address: string) {
  return request<{ code: string }>("/api/referrals/code/session", {
    method: "POST",
    body: JSON.stringify({ address }),
  });
}

export type PersonalReferralStats = {
  address: string;
  code: string | null;
  verifiedReferrals: number;
  pendingReferrals: number;
  flaggedReferrals: number;
  leaderboardRank: number | null;
  rewardsEarned: number | null;
  rewardsAvailable: boolean;
};

export async function getPersonalReferralStats(address: string) {
  return request<PersonalReferralStats>("/api/referrals/me/session?address=" + encodeURIComponent(address));
}

export async function getReferralLeaderboard() {
  return request<{
    period: "ALL_TIME";
    leaderboard: ReferralLeaderboardEntry[];
  }>("/api/referrals/points-leaderboard");
}

export async function attributeReferral(address: string, referralCode: string) {
  return request<{
    status: string;
    message: string;
    reviewFlagged?: boolean;
  }>("/api/referrals/attribute", {
    method: "POST",
    body: JSON.stringify({ address, referralCode }),
  });
}


export async function recordMarketPublication(
  proposalId: string,
  txHash: string,
  marketId: string,
  address: string,
  signMessage: (message: string) => Promise<string>,
) {
  // Reuse the session created during initial wallet/role verification.
  // A verification signature is needed only if the session is missing or expired.
  await ensureWalletSession(address, signMessage);
  return request<{
    message: string;
    proposal: StoredMarketProposal;
    publication: {
      marketId: string;
      txHash: string;
      managerAddress: string;
      chainId: number;
      explorerUrl: string;
    };
  }>(`/api/markets/admin/proposals/${encodeURIComponent(proposalId)}/publish/session`, {
    method: "POST",
    body: JSON.stringify({ txHash, marketId, address }),
  });
}
