import { useEffect, useMemo, useState } from "react";
import { ShieldCheck } from "lucide-react";
import {
  isAddress,
  keccak256,
  parseEventLogs,
  toBytes,
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
  TESTNET_USDC_ADDRESS,
  TESTNET_USDC_DECIMALS,
} from "../contracts/assetOracle";
import { recordMarketPublication, type StoredMarketProposal } from "../markets/marketApi";

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
    name: "validatorRosterConfigured",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "hasRole",
    stateMutability: "view",
    inputs: [
      { name: "role", type: "bytes32" },
      { name: "account", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
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
  signMessage: (message: string) => Promise<string>;
};

export default function PublishApprovedMarket({ proposal, signMessage }: Props) {
  const chainId = useChainId();
  const { address, isConnected } = useAccount();
  const client = usePublicClient();
  const manager = assetOracleMarketManagerAddress;
  const [contractVerified, setContractVerified] = useState(false);
  const [checkingContract, setCheckingContract] = useState(false);
  const [error, setError] = useState("");
  const [marketId, setMarketId] = useState<string | null>(proposal.onchainMarketId ?? null);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>(proposal.onchainTxHash as `0x${string}` | undefined);
  const [publicationSaved, setPublicationSaved] = useState(Boolean(proposal.onchainTxHash));
  const [savingPublication, setSavingPublication] = useState(false);
  const [publishConfirmation, setPublishConfirmation] = useState(false);
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

  const validatorRoster = useReadContract({
    address: manager,
    abi: marketPublisherAbi,
    functionName: "validatorRosterConfigured",
    query: { enabled: Boolean(manager) && chainId === ASSET_CHAIN_TESTNET_ID },
  });

  const marketCreatorRole = useReadContract({
    address: manager,
    abi: marketPublisherAbi,
    functionName: "hasRole",
    args: [
      keccak256(toBytes("MARKET_CREATOR_ROLE")),
      (address ?? "0x0000000000000000000000000000000000000000") as Address,
    ],
    query: { enabled: Boolean(manager && address) && chainId === ASSET_CHAIN_TESTNET_ID },
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

  const savePublication = async (resolvedMarketId: string, hash: `0x${string}`) => {
    if (!address) {
      setError("Transaction confirmed. Connect the publishing wallet to record this publication with the backend.");
      return;
    }
    setSavingPublication(true);
    try {
      await recordMarketPublication(proposal.id, hash, resolvedMarketId, address, signMessage);
      setPublicationSaved(true);
      setError("");
      // Keep the administrator in the current publishing workflow after a successful save.
    } catch (err) {
      setPublicationSaved(false);
      setError(err instanceof Error
        ? `Transaction confirmed, but publication tracking failed: ${err.message}. Retry saving the publication; do not submit another blockchain transaction.`
        : "Transaction confirmed, but publication tracking failed. Retry saving the publication; do not submit another blockchain transaction.");
    } finally {
      setSavingPublication(false);
    }
  };

  useEffect(() => {
    if (!receipt.isSuccess || !receipt.data || !txHash || marketId) return;
    try {
      const events = parseEventLogs({
        abi: marketPublisherAbi,
        logs: receipt.data.logs,
        eventName: "MarketCreated",
        strict: true,
      });
      const matching = events.find((event) =>
        event.args.question === proposal.question &&
        (!address || event.args.creator?.toLowerCase() === address.toLowerCase())
      );
      if (!matching || matching.args.marketId === undefined) {
        setError("Transaction confirmed, but the MarketCreated event could not be matched. Verify the transaction on the explorer before retrying.");
        return;
      }
      const id = matching.args.marketId.toString();
      setMarketId(id);
      void savePublication(id, txHash);
    } catch {
      setError("Transaction confirmed, but its market ID could not be decoded. Verify the transaction on the explorer before retrying.");
    }
  }, [receipt.isSuccess, receipt.data, proposal.question, proposal.id, address, txHash, marketId, signMessage]);

  const stablecoinReady = Boolean(
    tokenConfig.data &&
    tokenConfig.data[2] &&
    isAddress(tokenConfig.data[0]) &&
    tokenConfig.data[0].toLowerCase() === TESTNET_USDC_ADDRESS.toLowerCase() &&
    Number(tokenConfig.data[1]) === TESTNET_USDC_DECIMALS
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
    if (!manager || !contractVerified || !stablecoinReady ||
        validatorRoster.data !== true || marketCreatorRole.data !== true) {
      setError("Publishing is blocked until the current manager interface, configured validator roster, USDC token, and this wallet's on-chain market-creator permission are verified.");
      return;
    }
    if (!Number.isFinite(closeTimestamp) || closeTimestamp <= Math.floor(Date.now() / 1000)) {
      setError("The proposal closing time has passed. Edit or recreate the proposal before publishing.");
      return;
    }
    setPublishConfirmation(true);
  }

  async function confirmPublish() {
    setPublishConfirmation(false);
    setError("");
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
          <p className="disabled-note">{publicationSaved ? "Publication verified and saved to Asset Oracle." : "The chain transaction is confirmed, but backend publication tracking is not yet saved."}</p>
          {!publicationSaved && marketId && txHash && <button className="primary-button" type="button" disabled={savingPublication || !address} onClick={() => void savePublication(marketId, txHash)}>{savingPublication ? "Saving publication…" : "Retry saving publication"}</button>}
        </>
      ) : (
        <>
          <p className="disabled-note">
            {checkingContract ? "Checking the configured testnet contract…" :
              !manager ? "Unavailable: no verified market-manager address is configured." :
              chainId !== ASSET_CHAIN_TESTNET_ID ? "Switch to Asset Chain Enugu testnet to publish." :
              !contractVerified ? "Blocked: contract bytecode has not been verified." :
              !stablecoinReady ? "Blocked: testnet stablecoin is not enabled on the manager." :
              validatorRoster.data !== true ? "Blocked: this manager does not expose a configured validator roster; it may be an outdated deployment." :
              marketCreatorRole.data !== true ? "Blocked: connected wallet lacks the on-chain market-creator role." :
              "This submits a separate on-chain transaction. Approval alone does not publish a market."}
          </p>
          {receipt.isLoading && <p role="status">Waiting for blockchain confirmation…</p>}
          {receipt.isError && <p role="alert">The transaction receipt failed. Check the explorer before retrying.</p>}
          <button
            className="primary-button"
            type="button"
            disabled={!address || !isConnected || chainId !== ASSET_CHAIN_TESTNET_ID || !manager || !contractVerified || !stablecoinReady || validatorRoster.data !== true || marketCreatorRole.data !== true || checkingContract || isPending || receipt.isLoading || Boolean(txHash)}
            onClick={() => void publish()}
          >
            {isPending ? "Confirm in wallet…" : receipt.isLoading ? "Confirming on-chain…" : "Publish on testnet"}
          </button>
        </>
      )}
      {(error || walletError) && <p role="alert">{error || "Wallet transaction failed or was rejected."}</p>}
      <p className="disabled-note">Testnet only. The wallet must have the contract’s on-chain market-creator permission and the contract must be independently verified before use.</p>
      {publishConfirmation && (
        <div
          className="approval-modal-backdrop"
          onClick={() => setPublishConfirmation(false)}
        >
          <section
            className="approval-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="publish-modal-title"
            aria-describedby="publish-modal-description"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="approval-modal-icon" aria-hidden="true">
              <ShieldCheck size={25} />
            </div>
            <span className="approval-modal-eyebrow">ON-CHAIN ACTION · ASSET ORACLE</span>
            <h2 id="publish-modal-title">Publish this market?</h2>
            <p id="publish-modal-description">
              This will submit the approved proposal to Asset Chain Enugu testnet. Your connected wallet will open next so you can review and confirm the blockchain transaction.
            </p>
            <div className="approval-modal-proposal">
              <span>APPROVED PROPOSAL</span>
              <strong>{proposal.question}</strong>
              <small>Asset Chain Enugu · Testnet only</small>
            </div>
            <div className="approval-modal-actions">
              <button
                className="approval-modal-cancel"
                type="button"
                onClick={() => setPublishConfirmation(false)}
              >
                Cancel
              </button>
              <button
                className="approval-modal-confirm"
                type="button"
                onClick={() => void confirmPublish()}
                disabled={isPending}
              >
                <ShieldCheck size={16} />
                Continue to wallet
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
