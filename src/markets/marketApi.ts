import { API_BASE_URL } from "../config/env";

export type MarketProposalInput = {
  question: string;
  description: string;
  category: "Crypto" | "Sports" | "Economics" | "RWA" | "Regional";
  sport?: "football" | "basketball" | "tennis";
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
  origin?: "MANUAL" | "AUTOMATED";
  visibility?: "PRIVATE" | "PUBLIC";
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
  // Do not expose unknown backend/provider text in the UI.
  return fallback.length > 0 && fallback.length <= 40 ? fallback : "Request failed.";
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
    const raw = window.sessionStorage.getItem(WALLET_SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as WalletSession;
    if (!session.token || !session.address || !Number.isFinite(session.expiresAt) || session.expiresAt <= Date.now()) {
      window.sessionStorage.removeItem(WALLET_SESSION_KEY);
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
  window.sessionStorage.setItem(WALLET_SESSION_KEY, JSON.stringify(session));
  return session;
}

export function clearWalletSession(): void {
  try { window.sessionStorage.removeItem(WALLET_SESSION_KEY); } catch { /* ignore unavailable storage */ }
}


export type WalletPositionRecord = {
  managerAddress?: string;
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
  managerAddress?: string;
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
  positionsStatus: string;
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

export async function getPrivateAutomatedMarkets(address: string) {
  await ensureWalletSession(address, async () => { throw new Error("Wallet session is not established."); });
  return request<{ proposals: StoredMarketProposal[]; count: number }>("/api/markets/automated/private/session", {
    method: "POST",
    body: JSON.stringify({ address }),
  });
}

export async function decideAutomatedMarket(
  id: string,
  address: string,
  status: "APPROVED" | "REJECTED",
) {
  return request<{ message: string; proposal: StoredMarketProposal }>(
    `/api/markets/automated/${encodeURIComponent(id)}/decision/session`,
    { method: "POST", body: JSON.stringify({ address, status }) },
  );
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

type InjectedWalletProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

async function signedWalletAuth(
  address: string,
  signMessage: (message: string) => Promise<string>,
) {
  const { message } = await requestWalletNonce(address);
  const signature = await signMessage(message);
  return { address, message, signature };
}

/**
 * Submit a regular user's proposal after paying exactly 10 USDC on Asset Chain Testnet.
 * The backend independently verifies the token, amount, recipient, chain, receipt and confirmations.
 */
/** Project-approved Asset Chain Enugu testnet USDC. Do not replace without explicit approval. */
export const ASSET_CHAIN_TESTNET_USDC_ADDRESS =
  "0xc33741fddEBeA854d265db6F9707900Efb0211a2";

export async function createPaidMarketProposal(
  proposal: MarketProposalInput,
  address: string,
  signMessage: (message: string) => Promise<string>,
) {
  const provider = (window as Window & { ethereum?: InjectedWalletProvider }).ethereum;
  if (!provider) throw new Error("Connect a wallet that supports Asset Chain Testnet payments.");
  const chainIdValue = await provider.request({ method: "eth_chainId" });
  const chainId = typeof chainIdValue === "string" ? Number.parseInt(chainIdValue, 16) : Number.NaN;
  if (chainId !== 42421) throw new Error("Switch your wallet to Asset Chain Testnet (chain ID 42421) before paying.");
  const accountsValue = await provider.request({ method: "eth_accounts" });
  if (!Array.isArray(accountsValue) ||
      !accountsValue.some((account) => typeof account === "string" && account.toLowerCase() === address.toLowerCase())) {
    throw new Error("The connected wallet account does not match the proposal creator.");
  }

  const quote = await request<{
    quoteId: string;
    network: "TESTNET";
    token: "USDC";
    tokenAddress: string;
    tokenDecimals: number;
    amountAtomic: string;
    expiresAtMs: number;
  }>("/api/markets/paid-submissions/quote", {
    method: "POST",
    body: JSON.stringify({ token: "USDC", walletAuth: await signedWalletAuth(address, signMessage) }),
  });
  if (quote.network !== "TESTNET" || quote.token !== "USDC" ||
      quote.tokenAddress.toLowerCase() !== ASSET_CHAIN_TESTNET_USDC_ADDRESS.toLowerCase() ||
      quote.tokenDecimals !== 6 || quote.amountAtomic !== "10000000") {
    throw new Error("The server returned an invalid or unapproved testnet USDC proposal fee quote.");
  }

  const intent = await request<{
    submissionId: string;
    proposal: { id: string; question: string; status: "PENDING_APPROVAL"; submittedAt: string };
    payment: {
      network: "TESTNET";
      token: "USDC";
      tokenAddress: string;
      tokenDecimals: number;
      amountAtomic: string;
      treasuryAddress: string;
      expiresAtMs: number;
    };
  }>("/api/markets/paid-submissions/intent", {
    method: "POST",
    body: JSON.stringify({
      proposal,
      quoteId: quote.quoteId,
      walletAuth: await signedWalletAuth(address, signMessage),
    }),
  });

  if (intent.payment.network !== "TESTNET" || intent.payment.token !== "USDC" ||
      intent.payment.tokenAddress.toLowerCase() !== ASSET_CHAIN_TESTNET_USDC_ADDRESS.toLowerCase() ||
      intent.payment.tokenAddress.toLowerCase() !== quote.tokenAddress.toLowerCase() ||
      intent.payment.amountAtomic !== "10000000" || intent.payment.tokenDecimals !== 6) {
    throw new Error("The payment intent does not match the 10 USDC testnet quote.");
  }

  const recipient = intent.payment.treasuryAddress.toLowerCase().replace(/^0x/, "");
  if (!/^0x[0-9a-fA-F]{40}$/.test(intent.payment.treasuryAddress) ||
      !/^0x[0-9a-fA-F]{40}$/.test(intent.payment.tokenAddress)) {
    throw new Error("The configured testnet USDC contract or treasury address is invalid.");
  }
  // Recheck immediately before prompting the wallet in case the user changed accounts or networks.
  const currentChainValue = await provider.request({ method: "eth_chainId" });
  const currentChainId = typeof currentChainValue === "string" ? Number.parseInt(currentChainValue, 16) : Number.NaN;
  const currentAccounts = await provider.request({ method: "eth_accounts" });
  if (currentChainId !== 42421 || !Array.isArray(currentAccounts) ||
      !currentAccounts.some((account) => typeof account === "string" && account.toLowerCase() === address.toLowerCase())) {
    throw new Error("Wallet account or network changed. Reconnect to the proposal wallet on Asset Chain Testnet and try again.");
  }
  const amountHex = BigInt(intent.payment.amountAtomic).toString(16).padStart(64, "0");
  const transferData = `0xa9059cbb${recipient.padStart(64, "0")}${amountHex}`;
  const transactionHash = await provider.request({
    method: "eth_sendTransaction",
    params: [{
      from: address,
      to: intent.payment.tokenAddress,
      data: transferData,
      value: "0x0",
    }],
  });
  if (typeof transactionHash !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(transactionHash)) {
    throw new Error("Wallet did not return a valid USDC payment transaction hash.");
  }

  await request<{ status: string; message: string }>("/api/markets/paid-submissions/verify-payment", {
    method: "POST",
    body: JSON.stringify({
      submissionId: intent.submissionId,
      transactionHash,
      walletAuth: await signedWalletAuth(address, signMessage),
    }),
  });

  return {
    message: "10 USDC payment verified. Your proposal is pending admin review.",
    proposal: {
      ...proposal,
      id: intent.proposal.id,
      status: "PENDING_APPROVAL" as const,
      submittedAt: intent.proposal.submittedAt,
    } satisfies StoredMarketProposal,
  };
}

export async function updateMarketProposal(
  id: string,
  proposal: MarketProposalInput,
  address: string,
  signMessage: (message: string) => Promise<string>,
) {
  await ensureWalletSession(address, signMessage);
  return request<{
    message: string;
    proposal: StoredMarketProposal;
  }>(`/api/markets/proposals/${encodeURIComponent(id)}/session`, {
    method: "PUT",
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

export type WalletRole = "OWNER" | "VALIDATOR_2" | "VALIDATOR_3" | "MARKET_CREATOR" | "USER";

export type WalletRoleResponse = {
  address: string;
  role: WalletRole;
  isOwner: boolean;
  humanValidator: boolean;
  validatorNumber: 1 | 2 | 3 | null;
  permissions: {
    createMarketProposal: boolean;
    viewOwnProposals: boolean;
    reviewAllProposals: boolean;
    approveOrRejectProposals: boolean;
    isHumanValidator: boolean;
    validatorNumber: 1 | 2 | 3 | null;
  };
};

export async function getPublicWalletRole(address: string) {
  return request<WalletRoleResponse>("/api/markets/auth/role/public", {
    method: "POST",
    body: JSON.stringify({ address }),
  });
}

export async function getWalletRole(address: string) {
  const session = getWalletSession(address);
  if (!session) {
    throw new Error("Wallet session is not established.");
  }
  return request<WalletRoleResponse>("/api/markets/auth/role/session", {
    method: "POST",
    body: JSON.stringify({ address }),
  });
}


export type ReferralLeaderboardEntry = {
  rank: number;
  wallet: string;
  referrals: number;
  referralPoints: number;
};

export type PointsLeaderboardEntry = {
  rank: number;
  wallet: string;
  points: number;
};

export type TotalLeaderboardEntry = {
  rank: number;
  wallet: string;
  referrals: number;
  referralPoints: number;
  activityPoints: number;
  totalPoints: number;
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
  referralPoints: number;
  totalPoints: number;
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
  }>("/api/referrals/referral-leaderboard");
}

export async function getPointsLeaderboard() {
  return request<{
    period: "ALL_TIME";
    leaderboard: PointsLeaderboardEntry[];
  }>("/api/referrals/points-leaderboard");
}

export async function getTotalLeaderboard() {
  return request<{
    period: "ALL_TIME";
    leaderboard: TotalLeaderboardEntry[];
  }>("/api/referrals/total-leaderboard");
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


export type ValidatorSourceLink = {
  marketId: string;
  managerAddress: string;
  validatorAddress: string;
  outcome: number;
  sourceUrl: string;
  transactionHash: string;
  recordedAt: string;
};

export async function recordValidatorSourceLink(input: {
  address: string;
  marketId: string;
  managerAddress: string;
  outcome: number;
  sourceUrl: string;
  transactionHash: string;
  signMessage: (message: string) => Promise<string>;
}) {
  await ensureWalletSession(input.address, input.signMessage);
  return request<{ link: ValidatorSourceLink }>("/api/validator-evidence", {
    method: "POST",
    body: JSON.stringify({
      address: input.address,
      marketId: input.marketId,
      managerAddress: input.managerAddress,
      outcome: input.outcome,
      sourceUrl: input.sourceUrl,
      transactionHash: input.transactionHash,
    }),
  });
}

export async function getValidatorSourceLinks(marketId: string, managerAddress: string) {
  return request<{ links: ValidatorSourceLink[] }>(
    `/api/validator-evidence/${encodeURIComponent(marketId)}?managerAddress=${encodeURIComponent(managerAddress)}`,
  );
}
