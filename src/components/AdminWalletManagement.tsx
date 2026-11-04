import { useEffect, useMemo, useState } from "react";
import { useAccount, useReadContract, useReadContracts, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { isAddress, type Address } from "viem";
import { assetOracleMarketManagerAbi, assetOracleMarketManagerAddress, isAssetOracleContractConfigured } from "../contracts/assetOracle";

function shortAddress(value: string) {
  return value ? `${value.slice(0, 8)}…${value.slice(-6)}` : "Not configured";
}

export default function AdminWalletManagement() {
  const { address, chainId } = useAccount();
  const [newCreator, setNewCreator] = useState("");
  const [removeCreator, setRemoveCreator] = useState("");
  const [previousAutomation, setPreviousAutomation] = useState("");
  const [newAutomation, setNewAutomation] = useState("");
  const [creatorLookup, setCreatorLookup] = useState("");
  const [validators, setValidators] = useState<string[]>(["", "", ""]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pendingAction, setPendingAction] = useState("");
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();

  const ownerRead = useReadContract({
    address: assetOracleMarketManagerAddress,
    abi: assetOracleMarketManagerAbi,
    functionName: "owner",
    query: { enabled: isAssetOracleContractConfigured, refetchInterval: 15000 },
  });
  const validatorReads = useReadContracts({
    contracts: [0, 1, 2].map((index) => ({
      address: assetOracleMarketManagerAddress,
      abi: assetOracleMarketManagerAbi,
      functionName: "validators" as const,
      args: [BigInt(index)] as const,
    })),
    query: { enabled: isAssetOracleContractConfigured, refetchInterval: 15000 },
  });
  const automationRole = useReadContract({
    address: assetOracleMarketManagerAddress,
    abi: assetOracleMarketManagerAbi,
    functionName: "AUTOMATED_MARKET_CREATOR_ROLE",
    query: { enabled: isAssetOracleContractConfigured },
  });
  const creatorRole = useReadContract({
    address: assetOracleMarketManagerAddress,
    abi: assetOracleMarketManagerAbi,
    functionName: "MARKET_CREATOR_ROLE",
    query: { enabled: isAssetOracleContractConfigured },
  });
  const creatorLookupRead = useReadContract({
    address: assetOracleMarketManagerAddress,
    abi: assetOracleMarketManagerAbi,
    functionName: "hasRole",
    args: creatorRole.data && isAddress(creatorLookup.trim()) ? [creatorRole.data, creatorLookup.trim() as Address] : undefined,
    query: { enabled: Boolean(isAssetOracleContractConfigured && creatorRole.data && isAddress(creatorLookup.trim())), refetchInterval: 10000 },
  });
  const automationLookupRead = useReadContract({
    address: assetOracleMarketManagerAddress,
    abi: assetOracleMarketManagerAbi,
    functionName: "hasRole",
    args: automationRole.data && isAddress(previousAutomation.trim()) ? [automationRole.data, previousAutomation.trim() as Address] : undefined,
    query: { enabled: Boolean(isAssetOracleContractConfigured && automationRole.data && isAddress(previousAutomation.trim())), refetchInterval: 10000 },
  });
  const { writeContractAsync, isPending } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash: txHash, query: { enabled: Boolean(txHash) } });

  const isOwner = Boolean(address && ownerRead.data && address.toLowerCase() === String(ownerRead.data).toLowerCase());
  const networkOkay = chainId === 42421;
  const currentValidators = useMemo(
    () => validatorReads.data?.map((item) => String(item.result ?? "")) ?? ["", "", ""],
    [validatorReads.data],
  );

  useEffect(() => {
    if (currentValidators.length === 3 && currentValidators.every(Boolean)) setValidators(currentValidators);
  }, [currentValidators]);

  useEffect(() => {
    if (receipt.isSuccess) {
      setMessage(`Transaction confirmed: ${txHash}`);
      setPendingAction("");
      setTxHash(undefined);
      void ownerRead.refetch();
      void validatorReads.refetch();
    }
    if (receipt.isError) {
      setError("The transaction was not confirmed. Check the wallet and network, then refresh.");
      setPendingAction("");
      setTxHash(undefined);
    }
  }, [receipt.isSuccess, receipt.isError]);

  async function send(functionName: string, args: readonly unknown[], label: string) {
    if (!isAssetOracleContractConfigured) { setError("The active market manager address is not configured."); return; }
    setError("");
    setMessage("");
    setPendingAction(label);
    try {
      const hash = await writeContractAsync({
        address: assetOracleMarketManagerAddress,
        abi: assetOracleMarketManagerAbi,
        functionName: functionName as never,
        args: args as never,
        chainId: 42421,
      });
      setTxHash(hash);
      setMessage(`${label}: waiting for on-chain confirmation…`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Wallet transaction failed.");
      setPendingAction("");
    }
  }

  function validAddress(value: string) {
    return isAddress(value.trim());
  }

  if (!isAssetOracleContractConfigured) return <div className="empty-state"><h3>Market manager not configured</h3><p>Set the verified active manager address in the frontend environment before using wallet management.</p></div>;
  if (!address) return <div className="empty-state"><h3>Connect the owner wallet</h3><p>Wallet management requires the connected on-chain contract owner.</p></div>;
  if (ownerRead.isLoading) return <p role="status">Checking contract ownership…</p>;
  if (!isOwner) return <div className="empty-state"><h3>Owner access required</h3><p>This section verifies the manager’s on-chain owner before showing management actions.</p></div>;
  if (!networkOkay) return <div className="empty-state"><h3>Switch to Asset Chain Enugu</h3><p>Wallet management is enabled only on chain ID 42421.</p></div>;

  return (
    <section className="admin-wallet-management">
      <div className="section-heading"><div><span className="eyebrow">ON-CHAIN ACCESS CONTROL</span><h2>Admin management</h2><p>Changes are signed by the connected owner wallet and take effect only after confirmation.</p></div></div>
      <div className="account-summary-grid">
        <article className="account-summary-card"><span>Contract owner</span><strong>{shortAddress(String(ownerRead.data))}</strong><small>Also Manual Market Creator 1</small></article>
        <article className="account-summary-card"><span>Validator roster</span><strong>{validatorReads.isLoading ? "Loading…" : "3 active slots"}</strong><small>New roster applies to new markets only</small></article>
      </div>

      <article className="market-card">
        <h3>Manual market creators</h3>
        <p>The owner is permanently shown as Creator 1. Other creator permissions are checked against the contract role.</p>
        <div className="market-meta"><span>Creator 1 · Contract owner</span><strong>{shortAddress(String(ownerRead.data))}</strong></div>
        <label htmlFor="creator-role-lookup">Check a creator wallet</label>
        <input id="creator-role-lookup" value={creatorLookup} onChange={(event) => setCreatorLookup(event.target.value)} placeholder="0x…" autoComplete="off" />
        {validAddress(creatorLookup) && <p role="status">{creatorLookupRead.isLoading ? "Checking on-chain role…" : creatorLookupRead.data ? "This wallet has the manual creator role." : "This wallet does not have the manual creator role."}</p>}
        <label htmlFor="add-market-creator">Add manual creator wallet</label>
        <input id="add-market-creator" value={newCreator} onChange={(event) => setNewCreator(event.target.value)} placeholder="0x…" autoComplete="off" />
        <button className="primary-button" type="button" disabled={!validAddress(newCreator) || isPending || Boolean(txHash)} onClick={() => { void send("setMarketCreator", [newCreator.trim() as Address, true], "Adding market creator"); setNewCreator(""); }}>Add creator</button>
        <label htmlFor="remove-market-creator">Remove manual creator wallet</label>
        <input id="remove-market-creator" value={removeCreator} onChange={(event) => setRemoveCreator(event.target.value)} placeholder="0x…" autoComplete="off" />
        <button className="text-action" type="button" disabled={!validAddress(removeCreator) || removeCreator.toLowerCase() === String(ownerRead.data).toLowerCase() || isPending || Boolean(txHash)} onClick={() => { void send("setMarketCreator", [removeCreator.trim() as Address, false], "Removing market creator"); setRemoveCreator(""); }}>Remove creator</button>
        <small>The owner cannot be removed from the creator role.</small>
      </article>

      <article className="market-card">
        <h3>Automated market creator</h3>
        <p>Replace the automation wallet in one owner-authorized transaction. The old wallet loses the role as the new wallet receives it.</p>
        <label htmlFor="previous-automation">Current automation wallet to replace</label>
        <input id="previous-automation" value={previousAutomation} onChange={(event) => setPreviousAutomation(event.target.value)} placeholder="0x…" autoComplete="off" />
        {validAddress(previousAutomation) && <p role="status">{automationLookupRead.isLoading ? "Checking role…" : automationLookupRead.data ? "This wallet currently has the automation role." : "This wallet does not have the automation role."}</p>}
        <label htmlFor="replace-automation">New automation wallet</label>
        <input id="replace-automation" value={newAutomation} onChange={(event) => setNewAutomation(event.target.value)} placeholder="0x…" autoComplete="off" />
        <button className="primary-button" type="button" disabled={!validAddress(previousAutomation) || !automationLookupRead.data || !validAddress(newAutomation) || newAutomation.toLowerCase() === previousAutomation.toLowerCase() || isPending || Boolean(txHash)} onClick={() => { void send("replaceAutomatedMarketCreator", [previousAutomation.trim() as Address, newAutomation.trim() as Address], "Replacing automation wallet"); setPreviousAutomation(""); setNewAutomation(""); }}>Replace automation wallet</button>
      </article>

      <article className="market-card">
        <h3>Validator wallets</h3>
        <p>Each market keeps the three validators assigned when it was created. Updating this roster affects only future markets.</p>
        {validators.map((value, index) => (
          <div key={index}>
            <label htmlFor={`validator-${index}`}>Validator {index + 1}</label>
            <input id={`validator-${index}`} value={value} onChange={(event) => setValidators((current) => current.map((item, slot) => slot === index ? event.target.value : item))} placeholder="0x…" autoComplete="off" />
          </div>
        ))}
        <button className="primary-button" type="button" disabled={validators.length !== 3 || !validators.every(validAddress) || new Set(validators.map((value) => value.toLowerCase())).size !== 3 || isPending || Boolean(txHash)} onClick={() => { void send("configureValidators", [validators.map((value) => value.trim() as Address)], "Updating validator roster"); }}>Save new validator roster</button>
      </article>

      {pendingAction && <p role="status">{pendingAction}{txHash ? ` · ${txHash}` : ""}</p>}
      {message && <p role="status">{message}</p>}
      {error && <p role="alert">{error}</p>}
      <p><small>Creator and automation permissions are checked directly against the manager contract. The owner is protected from removal as Manual Market Creator 1.</small></p>
    </section>
  );
}
