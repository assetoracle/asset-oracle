import { useEffect, useMemo, useState } from "react";
import { formatUnits, isAddress, parseUnits, type Address } from "viem";
import { useSignMessage } from "wagmi";
import {
  useAccount,
  useChainId,
  usePublicClient,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import {
  ASSET_CHAIN_TESTNET_ID,
  assetOracleMarketManagerAbi,
  assetOracleMarketManagerAddress,
  erc20TestnetAbi,
  MARKET_OUTCOME,
  MARKET_STATUS,
  TESTNET_USDC_ADDRESS,
  TESTNET_USDC_DECIMALS,
} from "../contracts/assetOracle";

type Props = { marketId: bigint; closeTime: number };

export default function OnchainMarketActions({ marketId, closeTime }: Props) {
  const chainId = useChainId();
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const client = usePublicClient();
  const [amount, setAmount] = useState("");
  const [yesSide, setYesSide] = useState(true);
  const [codeVerified, setCodeVerified] = useState(false);
  const [codeCheckDone, setCodeCheckDone] = useState(false);
  const [message, setMessage] = useState("");
  const [lastAction, setLastAction] = useState<"approve" | "stake" | "claim" | "refund" | null>(null);
  const [referralQualificationAttempted, setReferralQualificationAttempted] = useState<string | null>(null);
  const manager = assetOracleMarketManagerAddress;

  const managerCode = useMemo(() => manager, [manager]);
  useEffect(() => {
    
    setCodeCheckDone(false);
    setCodeVerified(false);
    if (!client || !managerCode || chainId !== ASSET_CHAIN_TESTNET_ID || !isAddress(TESTNET_USDC_ADDRESS)) {
      setCodeCheckDone(true);
      return;
    }
    Promise.all([
      client.getBytecode({ address: managerCode }),
      client.getBytecode({ address: TESTNET_USDC_ADDRESS as Address }),
    ]).then(([managerBytecode, tokenBytecode]) => {
      if (cancelled) return;
      setCodeVerified(Boolean(managerBytecode && managerBytecode !== "0x" && tokenBytecode && tokenBytecode !== "0x"));
      setCodeCheckDone(true);
    }).catch(() => {
      if (cancelled) return;
      setCodeVerified(false);
      setCodeCheckDone(true);
    });
    
  }, [client, managerCode, chainId]);

  const market = useReadContract({
    address: manager,
    abi: assetOracleMarketManagerAbi,
    functionName: "getMarket",
    args: [marketId],
    query: { enabled: Boolean(manager) && chainId === ASSET_CHAIN_TESTNET_ID, refetchInterval: 15_000 },
  });
  const tokenConfig = useReadContract({
    address: manager,
    abi: assetOracleMarketManagerAbi,
    functionName: "stablecoins",
    args: [0],
    query: { enabled: Boolean(manager) && chainId === ASSET_CHAIN_TESTNET_ID, refetchInterval: 30_000 },
  });
  const tokenDecimals = useReadContract({
    address: TESTNET_USDC_ADDRESS,
    abi: erc20TestnetAbi,
    functionName: "decimals",
    query: { enabled: chainId === ASSET_CHAIN_TESTNET_ID, refetchInterval: 60_000 },
  });
  const position = useReadContract({
    address: manager,
    abi: assetOracleMarketManagerAbi,
    functionName: "positions",
    args: [marketId, address!],
    query: { enabled: Boolean(manager && address) && chainId === ASSET_CHAIN_TESTNET_ID, refetchInterval: 15_000 },
  });
  const balance = useReadContract({
    address: TESTNET_USDC_ADDRESS,
    abi: erc20TestnetAbi,
    functionName: "balanceOf",
    args: [address!],
    query: { enabled: Boolean(address) && chainId === ASSET_CHAIN_TESTNET_ID, refetchInterval: 15_000 },
  });
  const parsedAmount = (() => {
    try {
      if (!amount.trim() || !/^\d+(\.\d{1,6})?$/.test(amount.trim())) return 0n;
      return parseUnits(amount.trim(), TESTNET_USDC_DECIMALS);
    } catch { return 0n; }
  })();
  const allowance = useReadContract({
    address: TESTNET_USDC_ADDRESS,
    abi: erc20TestnetAbi,
    functionName: "allowance",
    args: [address!, manager!],
    query: { enabled: Boolean(address && manager) && chainId === ASSET_CHAIN_TESTNET_ID, refetchInterval: 10_000 },
  });

  const { writeContract, data: txHash, isPending: isWalletPending, error: writeError, reset } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash: txHash, query: { enabled: Boolean(txHash) } });

  const stablecoinVerified = Boolean(
    tokenConfig.data &&
    tokenConfig.data[2] &&
    tokenConfig.data[0].toLowerCase() === TESTNET_USDC_ADDRESS.toLowerCase() &&
    Number(tokenConfig.data[1]) === TESTNET_USDC_DECIMALS &&
    tokenDecimals.data === TESTNET_USDC_DECIMALS
  );
  const marketData = market.data;
  const marketVerified = Boolean(
    marketData &&
    marketData.id === marketId &&
    Number(marketData.stablecoin) === 0 &&
    Number(marketData.closeTime) === closeTime
  );
  const positionYes = position.data?.[0] ?? 0n;
  const positionNo = position.data?.[1] ?? 0n;
  const claimed = position.data?.[2] ?? true;
  const hasPosition = positionYes > 0n || positionNo > 0n;
  const safe = Boolean(
    manager && chainId === ASSET_CHAIN_TESTNET_ID && codeCheckDone && codeVerified &&
    stablecoinVerified && marketVerified && !market.isError && !tokenConfig.isError &&
    !tokenDecimals.isError && !position.isError && !balance.isError && !allowance.isError &&
    balance.data !== undefined && allowance.data !== undefined
  );
  const canStake = safe && isConnected && Boolean(address) &&
    Number(marketData?.status) === MARKET_STATUS.OPEN &&
    Date.now() / 1000 < closeTime && parsedAmount > 0n &&
    balance.data !== undefined && parsedAmount <= balance.data;
  const canClaim = safe && isConnected && hasPosition && !claimed &&
    Number(marketData?.status) === MARKET_STATUS.SETTLED;
  const canRefund = safe && isConnected && hasPosition && !claimed &&
    (Number(marketData?.status) === MARKET_STATUS.CANCELLED ||
     Number(marketData?.status) === MARKET_STATUS.REFUNDABLE);

  useEffect(() => {
    if (receipt.isSuccess) {
      setMessage("Transaction confirmed. Refreshing your on-chain position and balance.");
      void market.refetch();
      void position.refetch();
      void balance.refetch();
      void allowance.refetch();
      void tokenConfig.refetch();
    } else if (receipt.isError) {
      setMessage("Transaction receipt failed. Check the transaction in the testnet explorer.");
    }
  }, [receipt.isSuccess, receipt.isError]);

  useEffect(() => {
    if (writeError) setMessage(writeError.message);
  }, [writeError]);

  function submitStake() {
    if (!canStake || !manager || parsedAmount === 0n) return;
    setMessage("");
    reset();
    if ((allowance.data ?? 0n) < parsedAmount) {
      setLastAction("approve");
      writeContract({
        address: TESTNET_USDC_ADDRESS,
        abi: erc20TestnetAbi,
        functionName: "approve",
        args: [manager, parsedAmount],
      });
      return;
    }
    setLastAction("stake");
    writeContract({
      address: manager,
      abi: assetOracleMarketManagerAbi,
      functionName: "stake",
      args: [marketId, yesSide, parsedAmount],
    });
  }

  function submitAction(action: "claim" | "refund") {
    if (!manager) return;
    if (action === "claim" && !canClaim) return;
    if (action === "refund" && !canRefund) return;
    setMessage("");
    reset();
    setLastAction(action);
    writeContract({
      address: manager,
      abi: assetOracleMarketManagerAbi,
      functionName: action === "claim" ? "claim" : "refundCancelled",
      args: [marketId],
    });
  }

  useEffect(() => {
    if (!receipt.isSuccess || !txHash || !manager || !lastAction) return;
    if (lastAction === "approve" && (allowance.data ?? 0n) < parsedAmount) {
      setMessage("USDC approval confirmed. Press Stake again to submit the stake transaction.");
    }
  }, [receipt.isSuccess, txHash, manager, lastAction, allowance.data, parsedAmount]);

  useEffect(() => {
    if (!receipt.isSuccess || receipt.data?.status !== "success" || !txHash ||
        lastAction !== "stake" || !address || referralQualificationAttempted === txHash) return;
    const referralCode = new URLSearchParams(window.location.search).get("ref");
    if (!referralCode) return;
    setReferralQualificationAttempted(txHash);
    
    void (async () => {
      try {
        const base = "https://asset-oracle-backend.onrender.com";
        const nonceResponse = await fetch(`${base}/api/markets/auth/nonce`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ address }),
        });
        const nonceData = await nonceResponse.json();
        if (!nonceResponse.ok || typeof nonceData.message !== "string") throw new Error("Could not obtain referral verification nonce.");
        const signature = await signMessageAsync({ message: nonceData.message });
        const qualificationResponse = await fetch(`${base}/api/referrals/qualify`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            address,
            message: nonceData.message,
            signature,
            transactionHash: txHash,
          }),
        });
        const qualificationData = await qualificationResponse.json();
        if (!qualificationResponse.ok) throw new Error(qualificationData.error || "Referral qualification could not be verified.");
        setMessage("Stake confirmed on-chain. " + (qualificationData.message || "Referral qualification checked."));
      } catch (error) {
        setMessage("Stake confirmed on-chain. Referral verification is pending: " + (error instanceof Error ? error.message : "try again from Referrals."));
      }
    })();
    
  }, [receipt.isSuccess, receipt.data?.status, txHash, manager, lastAction, address, referralQualificationAttempted, signMessageAsync]);

  return (
    <section className="resolution-preview onchain-status" aria-live="polite">
      <span className="eyebrow">TESTNET PARTICIPATION</span>
      <h3>Market #{marketId.toString()} · USDC</h3>
      {!manager ? <p>Transactions are disabled: no verified market-manager address is configured.</p>
      : chainId !== ASSET_CHAIN_TESTNET_ID ? <p>Switch to Asset Chain Testnet (Chain ID 42421).</p>
      : !codeCheckDone ? <p>Verifying deployed contract bytecode…</p>
      : !codeVerified ? <p>Transactions blocked: market manager or USDC contract has no deployed bytecode at the configured address.</p>
      : tokenConfig.isPending || tokenDecimals.isPending || market.isPending || (address && position.isPending) ? <p>Verifying on-chain market, USDC configuration, and wallet position…</p>
      : !stablecoinVerified ? <p>Transactions blocked: the manager must explicitly enable the approved testnet USDC address with 6 decimals.</p>
      : !marketVerified ? <p>Transactions blocked: on-chain market ID, USDC asset, or close time does not match the displayed market record.</p>
      : market.isError || tokenConfig.isError || tokenDecimals.isError || position.isError ? <p>Transactions blocked because one or more verification reads failed.</p>
      : !isConnected ? <p>Connect a wallet on Asset Chain Testnet to check your position and participate.</p>
      : <>
          <div className="market-detail-grid">
            <article className="detail-info-card"><span>Your YES stake</span><strong>{formatUnits(positionYes, 6)} USDC</strong></article>
            <article className="detail-info-card"><span>Your NO stake</span><strong>{formatUnits(positionNo, 6)} USDC</strong></article>
            <article className="detail-info-card"><span>USDC balance</span><strong>{balance.data === undefined ? "Unavailable" : formatUnits(balance.data, 6)}</strong></article>
            <article className="detail-info-card"><span>Position status</span><strong>{claimed ? (hasPosition ? "Already claimed" : "No active position") : hasPosition ? "Unclaimed" : "No position"}</strong></article>
          </div>
          {Number(marketData?.status) === MARKET_STATUS.OPEN && Date.now() / 1000 < closeTime && <>
            <label htmlFor={`onchain-amount-${marketId}`}>Stake amount (test USDC)</label>
            <input id={`onchain-amount-${marketId}`} inputMode="decimal" autoComplete="off" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="e.g. 5.00" />
            <div className="outcome-preview">
              <button type="button" aria-pressed={yesSide} onClick={() => setYesSide(true)}>YES</button>
              <button type="button" aria-pressed={!yesSide} onClick={() => setYesSide(false)}>NO</button>
            </div>
            <button className="primary-button" type="button" disabled={!canStake || isWalletPending || receipt.isLoading || !amount.trim()} onClick={submitStake}>
              {isWalletPending ? "Confirm in wallet…" : receipt.isLoading ? "Waiting for confirmation…" : (allowance.data ?? 0n) < parsedAmount ? "Approve exact USDC amount" : `Stake ${amount || "USDC"} on ${yesSide ? "YES" : "NO"}`}
            </button>
            {balance.data !== undefined && parsedAmount > balance.data && <p role="alert">Amount exceeds your test USDC balance.</p>}
          </>}
          {Number(marketData?.status) === MARKET_STATUS.SETTLED && <button className="primary-button" type="button" disabled={!canClaim || isWalletPending || receipt.isLoading} onClick={() => submitAction("claim")}>Claim settlement</button>}
          {(Number(marketData?.status) === MARKET_STATUS.CANCELLED || Number(marketData?.status) === MARKET_STATUS.REFUNDABLE) && <button className="primary-button" type="button" disabled={!canRefund || isWalletPending || receipt.isLoading} onClick={() => submitAction("refund")}>Refund position</button>}
          {Number(marketData?.outcome) === MARKET_OUTCOME.INVALID && <p>Invalid outcome: the contract returns the net stake through the settlement claim path.</p>}
        </>}
      {txHash && <p>Transaction: <a href={`https://scan-testnet.assetchain.org/tx/${txHash}`} target="_blank" rel="noreferrer">{txHash.slice(0, 12)}…</a></p>}
      {message && <p role="status">{message}</p>}
      {writeError && <p role="alert">Wallet transaction failed or was rejected.</p>}
      <p className="disabled-note">Testnet only. Approval is limited to the entered amount. Review the transaction in your wallet before confirming.</p>
    </section>
  );
}
