import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  assetOracleMarketManagerAbi,
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
    name: "createAutomatedMarket",
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
    name: "AUTOMATED_MARKET_CREATOR_ROLE",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bytes32" }],
  },
  {
    type: "function",
    name: "DISPUTE_RESOLUTION_TIMEOUT",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint64" }],
  },
  {
    type: "function",
    name: "disputeConsensusReached",
    stateMutability: "view",
    inputs: [{ name: "marketId", type: "uint256" }],
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
  const publishInFlight = useRef(false);
  const { writeContractAsync, isPending, error: walletError } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({
    hash: txHash,
    query: { enabled: Boolean(txHash) },
  });

  const pendingPublicationStorageKey = "asset-oracle:pending-publication:" + proposal.id;

  useEffect(() => {
    if (txHash || proposal.onchainTxHash || typeof window === "undefined") return;
    try {
      const savedHash = window.localStorage.getItem(pendingPublicationStorageKey);
      if (savedHash && /^0x[0-9a-fA-F]{64}$/.test(savedHash)) {
        setTxHash(savedHash as `0x${string}`);
        setError("Restored a pending publication transaction. Checking its receipt; do not submit another transaction.");
      }
    } catch {
      // Storage can be disabled by browser policy; the current session can still proceed.
    }
  }, [pendingPublicationStorageKey, proposal.onchainTxHash, txHash]);

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

  // Fail closed unless the configured manager exposes the expected audited-manager interface.
  const disputeTimeout = useReadContract({
    address: manager,
    abi: marketPublisherAbi,
    functionName: "DISPUTE_RESOLUTION_TIMEOUT",
    query: { enabled: Boolean(manager) && chainId === ASSET_CHAIN_TESTNET_ID },
  });
  const disputeConsensusProbe = useReadContract({
    address: manager,
    abi: marketPublisherAbi,
    functionName: "disputeConsensusReached",
    args: [0n],
    query: { enabled: Boolean(manager) && chainId === ASSET_CHAIN_TESTNET_ID },
  });

  // This role getter exists on the current manager and is absent from the retired interface.
  const currentAutomatedRoleInterface = useReadContract({
    address: manager,
    abi: marketPublisherAbi,
    functionName: "AUTOMATED_MARKET_CREATOR_ROLE",
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

  const automatedMarketCreatorRole = useReadContract({
    address: manager,
    abi: marketPublisherAbi,
    functionName: "hasRole",
    args: [
      keccak256(toBytes("AUTOMATED_MARKET_CREATOR_ROLE")),
      (address ?? "0x0000000000000000000000000000000000000000") as Address,
    ],
    query: { enabled: Boolean(manager && address && proposal.origin === "AUTOMATED") && chainId === ASSET_CHAIN_TESTNET_ID },
  });
  const requiredRole = proposal.origin === "AUTOMATED" ? automatedMarketCreatorRole : marketCreatorRole;


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
      try {
        if (typeof window !== "undefined") window.localStorage.removeItem(pendingPublicationStorageKey);
      } catch {
        // Failure to clear recovery metadata must not invalidate a verified publication.
      }
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
        logs: receipt.data.logs.filter((log: { address: string }) => log.address.toLowerCase() === manager.toLowerCase()),
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
  }, [receipt.isSuccess, receipt.data, proposal.question, proposal.id, address, txHash, marketId, signMessage, manager]);

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
    if (marketId || txHash || receipt.isLoading || isPending || publishInFlight.current) {
      setError("A publication or transaction is already in progress or recorded. Do not submit another transaction; check the transaction status first.");
      return;
    }
    if (proposal.status !== "APPROVED") {
      setError("Only owner-approved proposals can be published.");
      return;
    }
    if (!Number.isFinite(closeTimestamp) || closeTimestamp <= Math.floor(Date.now() / 1000)) {
      setError("The proposal closing time has passed. Edit or recreate the proposal before publishing.");
      return;
    }
    setPublishConfirmation(true);
  }

  async function confirmPublish() {
    if (marketId || txHash || isPending || publishInFlight.current) {
      setPublishConfirmation(false);
      setError("A publication or transaction is already in progress or recorded. Check its status before trying again.");
      return;
    }
    setError("");
    if (!address || !isConnected) {
      setPublishConfirmation(false);
      setError("Connect the authorized market-creator wallet, then click Publish again.");
      return;
    }
    if (chainId !== ASSET_CHAIN_TESTNET_ID) {
      setPublishConfirmation(false);
      setError("Switch your wallet to Asset Chain Enugu testnet (Chain ID 42421), then click Publish again.");
      return;
    }
    if (checkingContract || !contractVerified) {
      setPublishConfirmation(false);
      setError("The configured market-manager contract has not been verified on this network. Wait for the contract check to finish, then retry.");
      return;
    }
    if (tokenConfig.isLoading || validatorRoster.isLoading || requiredRole.isLoading || disputeTimeout.isLoading || disputeConsensusProbe.isLoading || currentAutomatedRoleInterface.isLoading) {
      setPublishConfirmation(false);
      setError("The contract configuration is still loading. Wait a moment and click Publish again.");
      return;
    }
    const currentRoleInterfaceVerified = Boolean(
      typeof currentAutomatedRoleInterface.data === "string" &&
      /^0x[0-9a-fA-F]{64}$/.test(currentAutomatedRoleInterface.data) &&
      currentAutomatedRoleInterface.data !== `0x${"0".repeat(64)}`
    );
    if (disputeTimeout.isError || disputeTimeout.data !== 604800n || disputeConsensusProbe.isError || typeof disputeConsensusProbe.data !== "boolean" || currentAutomatedRoleInterface.isError || !currentRoleInterfaceVerified) {
      setPublishConfirmation(false);
      setError("Cannot publish: the configured manager does not expose the expected audited contract interface. No transaction was submitted.");
      return;
    }
    if (tokenConfig.isError || !stablecoinReady) {
      setPublishConfirmation(false);
      setError("Cannot publish: the configured manager does not confirm the approved USDC token and decimals. Check the canonical manager configuration.");
      return;
    }
    if (validatorRoster.isError || validatorRoster.data !== true) {
      setPublishConfirmation(false);
      setError("Cannot publish: validator roster verification failed on the configured manager.");
      return;
    }
    if (requiredRole.isError || requiredRole.data !== true) {
      setPublishConfirmation(false);
      setError(proposal.origin === "AUTOMATED"
        ? "Cannot publish: the connected wallet does not have AUTOMATED_MARKET_CREATOR_ROLE on the canonical manager."
        : "Cannot publish: the connected wallet does not have MARKET_CREATOR_ROLE on the canonical manager. This is an on-chain permission, not an admin dashboard permission.");
      return;
    }
    publishInFlight.current = true;
    setPublishConfirmation(false);
    const rules = JSON.stringify({
      ...proposal.resolutionRule,
      resolvesAt: proposal.resolvesAt,
      description: proposal.resolutionRule.description,
    });

    try {
      const hash = await writeContractAsync({
        address: manager as Address,
        abi: marketPublisherAbi,
        functionName: proposal.origin === "AUTOMATED" ? "createAutomatedMarket" : "createMarket",
        args: [
          0,
          proposal.question,
          rules,
          proposal.resolutionRule.sourceId,
          BigInt(closeTimestamp),
          3600n, // 1-hour challenge period; minimum accepted by the deployed contract.
        ],
      });
      setTxHash(hash);
      try {
        if (typeof window !== "undefined") window.localStorage.setItem(pendingPublicationStorageKey, hash);
      } catch {
        setError("Transaction submitted. Keep this page open until the receipt is confirmed; browser recovery storage is unavailable.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Wallet rejected or failed to submit the transaction.");
    } finally {
      publishInFlight.current = false;
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
          <p className="disabled-note" role="status">
            {checkingContract ? "Checking the configured testnet contract…" :
              !address || !isConnected ? "Connect the wallet authorized to publish markets." :
              chainId !== ASSET_CHAIN_TESTNET_ID ? "Switch your wallet to Asset Chain Enugu testnet (Chain ID 42421)." :
              !manager ? "Unavailable: no market-manager address is configured." :
              !contractVerified ? "Blocked: contract bytecode has not been verified on this network." :
              tokenConfig.isLoading ? "Checking the manager's approved USDC configuration…" :
              tokenConfig.isError ? "Unable to read the manager's USDC configuration. Check the network/RPC and retry." :
              !stablecoinReady ? "Blocked: testnet USDC is not enabled on the configured manager." :
              validatorRoster.isLoading ? "Checking validator configuration…" :
              validatorRoster.isError ? "Unable to read validator configuration from the manager." :
              validatorRoster.data !== true ? "Blocked: the configured manager does not report a configured validator roster." :
              requiredRole.isLoading ? "Checking this wallet's required market-creator permission…" :
              requiredRole.isError ? "Unable to verify this wallet's required on-chain permission." :
              requiredRole.data !== true ? (proposal.origin === "AUTOMATED"
                ? "Blocked: connected wallet lacks the automated market-creator role on this contract."
                : "Blocked: connected wallet lacks the on-chain market-creator role.") :
              proposal.status !== "APPROVED" ? "Only owner-approved proposals can be published." :
              !Number.isFinite(closeTimestamp) || closeTimestamp <= Math.floor(Date.now() / 1000) ? "The proposal closing time has passed; it cannot be published as-is." :
              "Ready to publish to the configured Asset Chain testnet market manager. Approval alone does not publish a market."}
          </p>
          {txHash && (
            <p role="status">
              A transaction is already associated with this proposal:{" "}
              <a href={`${ASSET_CHAIN_TESTNET_EXPLORER}/tx/${txHash}`} target="_blank" rel="noreferrer">check its status on the explorer</a>.
              Do not submit another transaction until its result is verified.
            </p>
          )}
          {receipt.isLoading && <p role="status">Waiting for blockchain confirmation…</p>}
          {receipt.isError && <p role="alert">The saved transaction receipt could not be loaded. Check the explorer link above before retrying.</p>}
          <button
            className="primary-button"
            type="button"
            disabled={isPending || receipt.isLoading || Boolean(txHash) || Boolean(marketId) || publishInFlight.current}
            onClick={() => void publish()}
          >
            {isPending ? "Confirm in wallet…" : receipt.isLoading ? "Confirming on-chain…" : "Publish on testnet"}
          </button>
        </>
      )}
      {(error || walletError) && <p role="alert">{error || "Wallet transaction failed or was rejected."}</p>}
      <p className="disabled-note">Testnet only. The wallet must have the contract’s on-chain market-creator permission and the contract must be independently verified before use.</p>
      {publishConfirmation && createPortal((
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
      ), document.body)}
    </div>
  );
}
