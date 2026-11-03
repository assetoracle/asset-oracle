import { useEffect, useMemo, useState } from "react";
import { useAccount, useReadContract, useReadContracts, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { isAddress, type Address } from "viem";
import { assetOracleMarketManagerAbi, assetOracleMarketManagerAddress } from "../contracts/assetOracle";

const OWNER_WALLET = "0x3d3724d20d9d5db5a40819869057b37465a0c67d" as Address;
const CREATOR_WALLETS = [
  OWNER_WALLET,
  "0x8b8a6fb521d372c19a5ff913049475f4c8fb9459",
  "0x96adb1c2ea8a816d68d27363a55e88b4c507691a",
] as Address[];
const AUTOMATION_WALLET = "0xc476bcbbf4ebf0d11afa513b19b70e1f1a1af39e" as Address;

function shortAddress(value: string) {
  return value ? `${value.slice(0, 8)}…${value.slice(-6)}` : "Not configured";
}

export default function AdminWalletManagement() {
  const { address, chainId } = useAccount();
  const [newCreator, setNewCreator] = useState("");
  const [removeCreator, setRemoveCreator] = useState("");
  const [newAutomation, setNewAutomation] = useState("");
  const [validators, setValidators] = useState<string[]>(["", "", ""]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pendingAction, setPendingAction] = useState("");
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();

  const ownerRead = useReadContract({
    address: assetOracleMarketManagerAddress,
    abi: assetOracleMarketManagerAbi,
    functionName: "owner",
    query: { refetchInterval: 15000 },
  });
  const validatorReads = useReadContracts({
    contracts: [0, 1, 2].map((index) => ({
      address: assetOracleMarketManagerAddress,
      abi: assetOracleMarketManagerAbi,
      functionName: "validators" as const,
      args: [BigInt(index)] as const,
    })),
    query: { refetchInterval: 15000 },
  });
  const automationRole = useReadContract({
    address: assetOracleMarketManagerAddress,
    abi: assetOracleMarketManagerAbi,
    functionName: "AUTOMATED_MARKET_CREATOR_ROLE",
  });
  const creatorRole = useReadContract({
    address: assetOracleMarketManagerAddress,
    abi: assetOracleMarketManagerAbi,
    functionName: "MARKET_CREATOR_ROLE",
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
        <div className="market-meta"><span>Creator 1 · Owner</span><strong>{shortAddress(OWNER_WALLET)}</strong></div>
        {CREATOR_WALLETS.slice(1).map((wallet, index) => (
          <div className="market-meta" key={wallet}><span>Configured creator {index + 2}</span><strong>{shortAddress(wallet)}</strong></div>
        ))}
        <label htmlFor="add-market-creator">Add manual creator wallet</label>
        <input id="add-market-creator" value={newCreator} onChange={(event) => setNewCreator(event.target.value)} placeholder="0x…" autoComplete="off" />
        <button className="primary-button" type="button" disabled={!validAddress(newCreator) || isPending || Boolean(txHash)} onClick={() => { void send("setMarketCreator", [newCreator.trim() as Address, true], "Adding market creator"); setNewCreator(""); }}>Add creator</button>
        <label htmlFor="remove-market-creator">Remove manual creator wallet</label>
        <input id="remove-market-creator" value={removeCreator} onChange={(event) => setRemoveCreator(event.target.value)} placeholder="0x…" autoComplete="off" />
        <button className="text-action" type="button" disabled={!validAddress(removeCreator) || removeCreator.toLowerCase() === OWNER_WALLET.toLowerCase() || isPending || Boolean(txHash)} onClick={() => { void send("setMarketCreator", [removeCreator.trim() as Address, false], "Removing market creator"); setRemoveCreator(""); }}>Remove creator</button>
        <small>The owner cannot be removed from the creator role.</small>
      </article>

      <article className="market-card">
        <h3>Automated market creator</h3>
        <p>Replace the automation wallet in one owner-authorized transaction. The old wallet loses the role as the new wallet receives it.</p>
        <div className="market-meta"><span>Configured automation wallet</span><strong>{shortAddress(AUTOMATION_WALLET)}</strong></div>
        <label htmlFor="replace-automation">New automation wallet</label>
        <input id="replace-automation" value={newAutomation} onChange={(event) => setNewAutomation(event.target.value)} placeholder="0x…" autoComplete="off" />
        <button className="primary-button" type="button" disabled={!validAddress(newAutomation) || newAutomation.toLowerCase() === AUTOMATION_WALLET.toLowerCase() || isPending || Boolean(txHash)} onClick={() => { void send("replaceAutomatedMarketCreator", [AUTOMATION_WALLET, newAutomation.trim() as Address], "Replacing automation wallet"); setNewAutomation(""); }}>Replace automation wallet</button>
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
      <p><small>Role reads and validator slots are on-chain. Creator and automation wallet labels above are the deployment's configured addresses; refresh deployment settings after a wallet replacement.</small></p>
    </section>
  );
}
