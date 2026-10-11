import { useEffect, useMemo, useState } from "react";
import {
  isAddress,
  parseEventLogs,
  type Address,
} from "viem";
import {
  useAccount,
  useChainId,
  usePublicClient,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import {
  ASSET_CHAIN_TESTNET_EXPLORER,
  ASSET_CHAIN_TESTNET_ID,
  assetOracleMarketManagerAddress,
} from "../contracts/assetOracle";
import type { StoredMarketProposal } from "../markets/marketApi";

const marketPublisherAbi = [
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
    type: "event",
    name: "MarketCreated",
    anonymous: false,
    inputs: [
      { indexed: true, name: "marketId", type: "uint256" },
      { indexed: true, name: "creator", type: "address" },
      { indexed: false, name: "stablecoin", type: "uint8" },
      { indexed: false, name: "closeTime", type: "uint64" },
      { indexed: false, name: "question", type: "string" },
    ],
  },
] as const;

type Props = {
  proposal: StoredMarketProposal;
};

export default function PublishApprovedMarket({ proposal }: Props) {
  const chainId = useChainId();
  const { address, isConnected } = useAccount();
  const client = usePublicClient();
  const manager = assetOracleMarketManagerAddress;
  const [contractVerified, setContractVerified] = useState(false);
  const [checkingContract, setCheckingContract] = useState(false);
  const [error, setError] = useState("");
  const [marketId, setMarketId] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const { writeContractAsync, isPending, error: walletError } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({
    hash: txHash,
    query: { enabled: Boolean(txHash) },
  });

  const tokenConfig = useReadContract({
    address: manager,
    abi: marketPublisherAbi,
    functionName: "stablecoins",
    args: [0],
    query: { enabled: Boolean(manager) && chainId === ASSET_CHAIN_TESTNET_ID },
  });

  useEffect(() => {
    let cancelled = false;
    async function verify() {
      setCheckingContract(true);
      setContractVerified(false);
      if (!client || !manager || !isAddress(manager) || chainId !== ASSET_CHAIN_TESTNET_ID) {
        setCheckingContract(false);
        return;
      }
      try {
        const code = await client.getBytecode({ address: manager });
        if (!cancelled) setContractVerified(Boolean(code && code !== "0x"));
      } catch {
        if (!cancelled) setContractVerified(false);
      } finally {
        if (!cancelled) setCheckingContract(false);
      }
    }
    void verify();
    return () => { cancelled = true; };
  }, [client, manager, chainId]);

  useEffect(() => {
    if (!receipt.isSuccess || !receipt.data) return;
    try {
      const events = parseEventLogs({
        abi: marketPublisherAbi,
        logs: receipt.data.logs,
        eventName: "MarketCreated",
        strict: false,
      });
      const matching = events.find((event) =>
        event.args.question === proposal.question &&
        (!address || event.args.creator?.toLowerCase() === address.toLowerCase())
      );
      if (!matching || matching.args.marketId === undefined) {
        setError("Transaction confirmed, but the MarketCreated event could not be matched. Verify the transaction on the explorer before retrying.");
        return;
      }
      setMarketId(matching.args.marketId.toString());
      setError("");
    } catch {
      setError("Transaction confirmed, but its market ID could not be decoded. Verify the transaction on the explorer before retrying.");
    }
  }, [receipt.isSuccess, receipt.data, proposal.question, address]);

  const stablecoinReady = Boolean(
    tokenConfig.data &&
    tokenConfig.data[2] &&
    isAddress(tokenConfig.data[0]) &&
    Number(tokenConfig.data[1]) > 0
  );

  const closeTimestamp = useMemo(
    () => Math.floor(new Date(proposal.closesAt).getTime() / 1000),
    [proposal.closesAt],
  );

  async function publish() {
    setError("");
    setMarketId(null);
    setTxHash(undefined);
    if (proposal.status !== "APPROVED") {
      setError("Only owner-approved proposals can be published.");
      return;
    }
    if (!address || !isConnected) {
      setError("Connect the authorized market-creator wallet.");
      return;
    }
    if (chainId !== ASSET_CHAIN_TESTNET_ID) {
      setError("Switch your wallet to Asset Chain Enugu testnet (Chain ID 42421).");
      return;
    }
    if (!manager || !contractVerified || !stablecoinReady) {
      setError("Publishing is disabled until the configured manager contract and testnet stablecoin are verified and enabled.");
      return;
    }
    if (!Number.isFinite(closeTimestamp) || closeTimestamp <= Math.floor(Date.now() / 1000)) {
      setError("The proposal closing time has passed. Edit or recreate the proposal before publishing.");
      return;
    }
    if (!window.confirm("Publish this approved proposal on Asset Chain Enugu testnet? Your wallet will ask you to confirm a blockchain transaction.")) return;

    const rules = JSON.stringify({
      ...proposal.resolutionRule,
      resolvesAt: proposal.resolvesAt,
      description: proposal.resolutionRule.description,
    });

    try {
      const hash = await writeContractAsync({
        address: manager as Address,
        abi: marketPublisherAbi,
        functionName: "createMarket",
        args: [
          0,
          proposal.question,
          rules,
          proposal.resolutionRule.sourceId,
          BigInt(closeTimestamp),
          86400n,
        ],
      });
      setTxHash(hash);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Wallet rejected or failed to submit the transaction.");
    }
  }

  return (
    <div className="resolution-preview" style={{ marginTop: 16 }}>
      <h4>On-chain publication</h4>
      {marketId ? (
        <>
          <p role="status">Market created on-chain. Market ID: <strong>{marketId}</strong></p>
          {txHash && <p><a href={`${ASSET_CHAIN_TESTNET_EXPLORER}/tx/${txHash}`} target="_blank" rel="noreferrer">View confirmed transaction</a></p>}
        </>
      ) : (
        <>
          <p className="disabled-note">
            {checkingContract ? "Checking the configured testnet contract…" :
              !manager ? "Unavailable: no verified market-manager address is configured." :
              chainId !== ASSET_CHAIN_TESTNET_ID ? "Switch to Asset Chain Enugu testnet to publish." :
              !contractVerified ? "Blocked: contract bytecode has not been verified." :
              !stablecoinReady ? "Blocked: testnet stablecoin is not enabled on the manager." :
              "This submits a separate on-chain transaction. Approval alone does not publish a market."}
          </p>
          {receipt.isLoading && <p role="status">Waiting for blockchain confirmation…</p>}
          {receipt.isError && <p role="alert">The transaction receipt failed. Check the explorer before retrying.</p>}
          <button
            className="primary-button"
            type="button"
            disabled={!address || !isConnected || chainId !== ASSET_CHAIN_TESTNET_ID || !manager || !contractVerified || !stablecoinReady || checkingContract || isPending || receipt.isLoading || Boolean(txHash)}
            onClick={() => void publish()}
          >
            {isPending ? "Confirm in wallet…" : receipt.isLoading ? "Confirming on-chain…" : "Publish on testnet"}
          </button>
        </>
      )}
      {(error || walletError) && <p role="alert">{error || "Wallet transaction failed or was rejected."}</p>}
      <p className="disabled-note">Testnet only. The wallet must have the contract’s on-chain market-creator permission and the contract must be independently verified before use.</p>
    </div>
  );
}
