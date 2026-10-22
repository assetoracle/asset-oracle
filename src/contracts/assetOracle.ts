import type { Address } from "viem";

export const ASSET_CHAIN_TESTNET_ID = 42421;
export const ASSET_CHAIN_TESTNET_RPC = "https://enugu-rpc.assetchain.org";
export const ASSET_CHAIN_TESTNET_EXPLORER = "https://scan-testnet.assetchain.org";

/** Approved Enugu testnet USDC. Contract deployment must independently verify code and decimals. */
export const TESTNET_USDC_ADDRESS = "0xc33741fddEBeA854d265db6F9707900Efb0211a2" as Address;
export const TESTNET_USDC_DECIMALS = 6;

/**
 * Canonical Asset Oracle manager implementing the 2-of-3 human-validator flow.
 * Asset Chain Enugu testnet only (chain ID 42421).
 */
export const CURRENT_ASSET_ORACLE_MARKET_MANAGER_ADDRESS =
  "0x5fc327f55cf533ed5d05337f835be37ff1e0db1f" as Address;

export const assetOracleMarketManagerAddress: Address =
  CURRENT_ASSET_ORACLE_MARKET_MANAGER_ADDRESS;

export const isAssetOracleContractConfigured = true;

export const assetOracleMarketManagerAbi = [
  {
    type: "function",
    name: "owner",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "hasRole",
    stateMutability: "view",
    inputs: [{ name: "role", type: "bytes32" }, { name: "account", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "validatorRosterConfigured",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "isValidator",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "hasVoted",
    stateMutability: "view",
    inputs: [{ name: "marketId", type: "uint256" }, { name: "validator", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "voteCountByKey",
    stateMutability: "view",
    inputs: [{ name: "marketId", type: "uint256" }, { name: "voteKey", type: "bytes32" }],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    type: "function",
    name: "hasVotedOnDispute",
    stateMutability: "view",
    inputs: [{ name: "marketId", type: "uint256" }, { name: "validator", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "disputeVoteCountByKey",
    stateMutability: "view",
    inputs: [{ name: "marketId", type: "uint256" }, { name: "voteKey", type: "bytes32" }],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    type: "function",
    name: "marketCount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "getMarket",
    stateMutability: "view",
    inputs: [{ name: "marketId", type: "uint256" }],
    outputs: [
      {
        name: "market",
        type: "tuple",
        components: [
          { name: "id", type: "uint256" },
          { name: "creator", type: "address" },
          { name: "stablecoin", type: "uint8" },
          { name: "question", type: "string" },
          { name: "resolutionRules", type: "string" },
          { name: "evidenceSource", type: "string" },
          { name: "closeTime", type: "uint64" },
          { name: "challengePeriod", type: "uint64" },
          { name: "resolvedAt", type: "uint64" },
          { name: "totalYes", type: "uint256" },
          { name: "totalNo", type: "uint256" },
          { name: "totalStaked", type: "uint256" },
          { name: "outcome", type: "uint8" },
          { name: "status", type: "uint8" },
          { name: "evidenceHash", type: "bytes32" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "positions",
    stateMutability: "view",
    inputs: [
      { name: "", type: "uint256" },
      { name: "", type: "address" },
    ],
    outputs: [
      { name: "yes", type: "uint256" },
      { name: "no", type: "uint256" },
      { name: "claimed", type: "bool" },
    ],
  },
  {
    type: "function",
    name: "stablecoins",
    stateMutability: "view",
    inputs: [{ name: "", type: "uint8" }],
    outputs: [
      { name: "token", type: "address" },
      { name: "decimals", type: "uint8" },
      { name: "enabled", type: "bool" },
    ],
  },
  {
    type: "function",
    name: "createMarket",
    stateMutability: "nonpayable",
    inputs: [
      { name: "stablecoin", type: "uint8" },
      { name: "question", type: "string" },
      { name: "resolutionRules", type: "string" },
      { name: "evidenceSource", type: "string" },
      { name: "closeTime", type: "uint64" },
      { name: "challengePeriod", type: "uint64" },
    ],
    outputs: [{ name: "marketId", type: "uint256" }],
  },
  {
    type: "function",
    name: "stake",
    stateMutability: "nonpayable",
    inputs: [
      { name: "marketId", type: "uint256" },
      { name: "yesSide", type: "bool" },
      { name: "grossAmount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "closeMarket",
    stateMutability: "nonpayable",
    inputs: [{ name: "marketId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "resolveMarket",
    stateMutability: "nonpayable",
    inputs: [
      { name: "marketId", type: "uint256" },
      { name: "outcome", type: "uint8" },
      { name: "evidenceHash", type: "bytes32" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "disputeResolution",
    stateMutability: "nonpayable",
    inputs: [
      { name: "marketId", type: "uint256" },
      { name: "evidenceHash", type: "bytes32" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "resolveDispute",
    stateMutability: "nonpayable",
    inputs: [
      { name: "marketId", type: "uint256" },
      { name: "outcome", type: "uint8" },
      { name: "evidenceHash", type: "bytes32" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "refundDisputedTimeout",
    stateMutability: "nonpayable",
    inputs: [{ name: "marketId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "refundTimedOutMarket",
    stateMutability: "nonpayable",
    inputs: [{ name: "marketId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "finalizeMarket",
    stateMutability: "nonpayable",
    inputs: [{ name: "marketId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "claim",
    stateMutability: "nonpayable",
    inputs: [{ name: "marketId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "refundCancelled",
    stateMutability: "nonpayable",
    inputs: [{ name: "marketId", type: "uint256" }],
    outputs: [],
  },
] as const;

export const erc20TestnetAbi = [
  {
    type: "function",
    name: "name",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
  {
    type: "function",
    name: "symbol",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
  {
    type: "function",
    name: "mint",
    stateMutability: "nonpayable",
    inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "value", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
] as const;

export const MARKET_STATUS = {
  OPEN: 0,
  CLOSED: 1,
  DISPUTED: 2,
  SETTLED: 3,
  REFUNDABLE: 4,
  CANCELLED: 5,
  ARBITRATION: 6,
} as const;

export const MARKET_OUTCOME = {
  UNRESOLVED: 0,
  YES: 1,
  NO: 2,
  INVALID: 3,
} as const;
