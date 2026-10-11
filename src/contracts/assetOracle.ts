import { isAddress, type Address } from "viem";

export const ASSET_CHAIN_TESTNET_ID = 42421;
export const ASSET_CHAIN_TESTNET_RPC = "https://enugu-rpc.assetchain.org";
export const ASSET_CHAIN_TESTNET_EXPLORER = "https://scan-testnet.assetchain.org";

/** Approved Enugu testnet USDC. Contract deployment must independently verify code and decimals. */
export const TESTNET_USDC_ADDRESS = "0xc33741fddEBeA854d265db6F9707900Efb0211a2" as Address;
export const TESTNET_USDC_DECIMALS = 6;

/**
 * Set VITE_ASSET_ORACLE_MARKET_MANAGER only after the contract has been deployed
 * and its address verified on Enugu testnet. Never use a guessed address.
 */
const configuredAddress = import.meta.env.VITE_ASSET_ORACLE_MARKET_MANAGER?.trim();

export const assetOracleMarketManagerAddress: Address | undefined =
  configuredAddress && isAddress(configuredAddress)
    ? (configuredAddress as Address)
    : undefined;

export const isAssetOracleContractConfigured =
  assetOracleMarketManagerAddress !== undefined;

export const assetOracleMarketManagerAbi = [
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
      { name: "upheld", type: "bool" },
    ],
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
} as const;

export const MARKET_OUTCOME = {
  UNRESOLVED: 0,
  YES: 1,
  NO: 2,
  INVALID: 3,
} as const;
