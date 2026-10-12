import { useEffect, useMemo, useState } from "react";
import { encodeAbiParameters, formatUnits, isAddress, keccak256, parseUnits, toBytes, type Address } from "viem";
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
  const [evidenceText, setEvidenceText] = useState("");
  const [resolutionOutcome, setResolutionOutcome] = useState<1 | 2 | 3>(1);
  const [yesSide, setYesSide] = useState(true);
  const [codeVerified, setCodeVerified] = useState(false);
  const [codeCheckDone, setCodeCheckDone] = useState(false);
  const [message, setMessage] = useState("");
  const [lastAction, setLastAction] = useState<"approve" | "stake" | "close" | "resolve" | "resolveDispute" | "finalize" | "dispute" | "claim" | "refund" | "timeout" | "disputeTimeout" | null>(null);
  const [referralQualificationAttempted, setReferralQualificationAttempted] = useState<string | null>(null);
  const [referralAttributionReady, setReferralAttributionReady] = useState(false);
  const [referralPreparing, setReferralPreparing] = useState(false);
  const manager = assetOracleMarketManagerAddress;

  const managerCode = useMemo(() => manager, [manager]);
  useEffect(() => {
    let cancelled = false;
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
    return () => { cancelled = true; };
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
  const validatorRoster = useReadContract({
    address: manager,
    abi: assetOracleMarketManagerAbi,
    functionName: "validatorRosterConfigured",
    query: { enabled: Boolean(manager) && chainId === ASSET_CHAIN_TESTNET_ID, refetchInterval: 30_000 },
  });
  const validatorStatus = useReadContract({
    address: manager,
    abi: assetOracleMarketManagerAbi,
    functionName: "isValidator",
    args: [address!],
    query: { enabled: Boolean(manager && address) && chainId === ASSET_CHAIN_TESTNET_ID, refetchInterval: 30_000 },
  });
  const hasVoted = useReadContract({
    address: manager,
    abi: assetOracleMarketManagerAbi,
    functionName: "hasVoted",
    args: [marketId, address!],
    query: { enabled: Boolean(manager && address) && chainId === ASSET_CHAIN_TESTNET_ID, refetchInterval: 15_000 },
  });
  const hasVotedOnDispute = useReadContract({
    address: manager,
    abi: assetOracleMarketManagerAbi,
    functionName: "hasVotedOnDispute",
    args: [marketId, address!],
    query: { enabled: Boolean(manager && address) && chainId === ASSET_CHAIN_TESTNET_ID, refetchInterval: 15_000 },
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
  const canClose = safe && isConnected && Number(marketData?.status) === MARKET_STATUS.OPEN &&
    Date.now() / 1000 >= closeTime;
  const canClaim = safe && isConnected && hasPosition && !claimed &&
    Number(marketData?.status) === MARKET_STATUS.SETTLED;
  const canRefund = safe && isConnected && hasPosition && !claimed &&
    (Number(marketData?.status) === MARKET_STATUS.CANCELLED ||
     Number(marketData?.status) === MARKET_STATUS.REFUNDABLE);
  const canStartTimeoutRefund = safe && isConnected && hasPosition && !claimed &&
    Number(marketData?.status) === MARKET_STATUS.CLOSED &&
    Date.now() / 1000 >= closeTime + Number(marketData?.challengePeriod ?? 0n);
  const canStartDisputeTimeoutRefund = safe && isConnected && hasPosition && !claimed &&
    Number(marketData?.status) === MARKET_STATUS.ARBITRATION &&
    Date.now() / 1000 >= Number(marketData?.resolvedAt ?? 0n) + 7 * 24 * 60 * 60;

  const isConfiguredValidator = validatorStatus.data === true && validatorRoster.data === true;
  const evidenceHash = evidenceText.trim() ? keccak256(toBytes(evidenceText.trim())) : undefined;
  const emptyVoteKey = `0x${"0".repeat(64)}` as const;
  const voteKey = evidenceHash
    ? keccak256(encodeAbiParameters([{ type: "uint8" }, { type: "bytes32" }], [resolutionOutcome, evidenceHash]))
    : emptyVoteKey;
  const initialVoteCount = useReadContract({
    address: manager,
    abi: assetOracleMarketManagerAbi,
    functionName: "voteCountByKey",
    args: [marketId, voteKey],
    query: { enabled: Boolean(manager && evidenceHash) && chainId === ASSET_CHAIN_TESTNET_ID, refetchInterval: 10_000 },
  });
  const disputeVoteCount = useReadContract({
    address: manager,
    abi: assetOracleMarketManagerAbi,
    functionName: "disputeVoteCountByKey",
    args: [marketId, voteKey],
    query: { enabled: Boolean(manager && evidenceHash) && chainId === ASSET_CHAIN_TESTNET_ID, refetchInterval: 10_000 },
  });
  const canResolve = safe && isConnected && isConfiguredValidator && !hasVoted.data && evidenceHash !== undefined &&
    Number(marketData?.status) === MARKET_STATUS.CLOSED;
  const canResolveDispute = safe && isConnected && isConfiguredValidator && !hasVotedOnDispute.data &&
    evidenceHash !== undefined && Number(marketData?.status) === MARKET_STATUS.ARBITRATION;
  const canFinalize = safe && isConnected &&
    Number(marketData?.status) === MARKET_STATUS.DISPUTED &&
    Date.now() / 1000 >= Number(marketData?.resolvedAt ?? 0n) + Number(marketData?.challengePeriod ?? 0n);
  const canDispute = safe && isConnected && hasPosition && evidenceHash !== undefined &&
    Number(marketData?.status) === MARKET_STATUS.DISPUTED &&
    Date.now() / 1000 < Number(marketData?.resolvedAt ?? 0n) + Number(marketData?.challengePeriod ?? 0n);

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

  async function submitStake() {
    if (!canStake || !manager || parsedAmount === 0n || referralPreparing) return;
    setMessage("");
    const referralCode = new URLSearchParams(window.location.search).get("ref");
    if (referralCode && !referralAttributionReady && address) {
      setReferralPreparing(true);
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
        const attributionResponse = await fetch(`${base}/api/referrals/attribute`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ address, message: nonceData.message, signature, referralCode }),
        });
        const attributionData = await attributionResponse.json();
        if (!attributionResponse.ok) throw new Error(attributionData.error || "Referral attribution could not be confirmed.");
        setReferralAttributionReady(true);
        setMessage("Referral attribution confirmed. Continue with the stake transaction.");
      } catch (error) {
        setMessage("Stake paused: " + (error instanceof Error ? error.message : "referral attribution failed. You can retry."));
        setReferralPreparing(false);
        return;
      }
      setReferralPreparing(false);
    }
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

  function submitAction(action: "close" | "claim" | "refund" | "timeout" | "disputeTimeout") {
    if (!manager) return;
    if (action === "close" && !canClose) return;
    if (action === "claim" && !canClaim) return;
    if (action === "refund" && !canRefund) return;
    if (action === "timeout" && !canStartTimeoutRefund) return;
    if (action === "disputeTimeout" && !canStartDisputeTimeoutRefund) return;
    setMessage("");
    reset();
    setLastAction(action);
    writeContract({
      address: manager,
      abi: assetOracleMarketManagerAbi,
      functionName: action === "close"
        ? "closeMarket"
        : action === "claim"
          ? "claim"
        : action === "timeout"
          ? "refundTimedOutMarket"
          : action === "disputeTimeout"
            ? "refundDisputedTimeout"
            : "refundCancelled",
      args: [marketId],
    });
  }

  function submitResolution(action: "resolve" | "resolveDispute" | "finalize" | "dispute") {
    if (!manager) return;
    if (action === "resolve" && (!canResolve || !evidenceHash)) return;
    if (action === "resolveDispute" && (!canResolveDispute || !evidenceHash)) return;
    if (action === "finalize" && !canFinalize) return;
    if (action === "dispute" && (!canDispute || !evidenceHash)) return;
    setMessage("");
    reset();
    setLastAction(action);
    if (action === "resolve") {
      writeContract({
        address: manager,
        abi: assetOracleMarketManagerAbi,
        functionName: "resolveMarket",
        args: [marketId, resolutionOutcome, evidenceHash!],
      });
    } else if (action === "resolveDispute") {
      writeContract({
        address: manager,
        abi: assetOracleMarketManagerAbi,
        functionName: "resolveDispute",
        args: [marketId, resolutionOutcome, evidenceHash!],
      });
    } else if (action === "dispute") {
      writeContract({
        address: manager,
        abi: assetOracleMarketManagerAbi,
        functionName: "disputeResolution",
        args: [marketId, evidenceHash!],
      });
    } else {
      writeContract({
        address: manager,
        abi: assetOracleMarketManagerAbi,
        functionName: "finalizeMarket",
        args: [marketId],
      });
    }
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
            {new URLSearchParams(window.location.search).get("ref") && <p>Referral link detected. By continuing to stake, you can sign once to record the referral attribution; it counts only after this wallet’s first confirmed prediction.</p>}
            <label htmlFor={`onchain-amount-${marketId}`}>Stake amount (test USDC)</label>
            <input id={`onchain-amount-${marketId}`} inputMode="decimal" autoComplete="off" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="e.g. 5.00" />
            <div className="outcome-preview">
              <button type="button" aria-pressed={yesSide} onClick={() => setYesSide(true)}>YES</button>
              <button type="button" aria-pressed={!yesSide} onClick={() => setYesSide(false)}>NO</button>
            </div>
            <button className="primary-button" type="button" disabled={!canStake || isWalletPending || receipt.isLoading || referralPreparing || !amount.trim()} onClick={submitStake}>
              {referralPreparing ? "Confirm referral in wallet…" : isWalletPending ? "Confirm in wallet…" : receipt.isLoading ? "Waiting for confirmation…" : (allowance.data ?? 0n) < parsedAmount ? "Approve exact USDC amount" : `Stake ${amount || "USDC"} on ${yesSide ? "YES" : "NO"}`}
            </button>
            {balance.data !== undefined && parsedAmount > balance.data && <p role="alert">Amount exceeds your test USDC balance.</p>}
          </>}
          {Number(marketData?.status) === MARKET_STATUS.OPEN && Date.now() / 1000 >= closeTime && <button className="primary-button" type="button" disabled={!canClose || isWalletPending || receipt.isLoading} onClick={() => submitAction("close")}>Close expired market</button>}
          {(Number(marketData?.status) === MARKET_STATUS.CLOSED || Number(marketData?.status) === MARKET_STATUS.DISPUTED || Number(marketData?.status) === MARKET_STATUS.ARBITRATION) && <>
            <label htmlFor={`onchain-evidence-${marketId}`}>Evidence reference or description</label>
            <input id={`onchain-evidence-${marketId}`} value={evidenceText} onChange={(event) => setEvidenceText(event.target.value)} placeholder="Paste official source URL or evidence reference" autoComplete="off" />
            <p className="disabled-note">The evidence text is hashed locally and only its hash is submitted on-chain. Keep the original source available for public verification.</p>
          </>}
          {Number(marketData?.status) === MARKET_STATUS.CLOSED && <>
            {validatorRoster.data === true && isConnected && !isConfiguredValidator && <p>Connected wallet is not one of the three configured validators.</p>}
            {isConfiguredValidator && <>
              <label htmlFor={`onchain-outcome-${marketId}`}>Validator outcome vote</label>
              <select id={`onchain-outcome-${marketId}`} value={resolutionOutcome} onChange={(event) => setResolutionOutcome(Number(event.target.value) as 1 | 2 | 3)}>
                <option value={1}>YES</option><option value={2}>NO</option><option value={3}>INVALID</option>
              </select>
              <p>Matching votes: {evidenceHash ? Number(initialVoteCount.data ?? 0n) : 0}/2. Validators must match both outcome and evidence hash.</p>
              {hasVoted.data && <p>You have already submitted your vote for this market.</p>}
              <button className="primary-button" type="button" disabled={!canResolve || isWalletPending || receipt.isLoading} onClick={() => submitResolution("resolve")}>Submit validator vote</button>
            </>}
            {validatorRoster.data === false && <p>Validator roster is not configured on this contract. Resolution is unavailable until the approved contract is deployed and configured.</p>}
          </>}
          {Number(marketData?.status) === MARKET_STATUS.ARBITRATION && <>
            {isConfiguredValidator && <>
              <label htmlFor={`onchain-arbitration-outcome-${marketId}`}>Arbitration outcome vote</label>
              <select id={`onchain-arbitration-outcome-${marketId}`} value={resolutionOutcome} onChange={(event) => setResolutionOutcome(Number(event.target.value) as 1 | 2 | 3)}>
                <option value={1}>YES</option><option value={2}>NO</option><option value={3}>INVALID</option>
              </select>
              <p>Matching arbitration votes: {evidenceHash ? Number(disputeVoteCount.data ?? 0n) : 0}/2.</p>
              {hasVotedOnDispute.data && <p>You have already submitted an arbitration vote for this market.</p>}
              <button className="primary-button" type="button" disabled={!canResolveDispute || isWalletPending || receipt.isLoading} onClick={() => submitResolution("resolveDispute")}>Submit arbitration vote</button>
            </>}
            {validatorRoster.data === true && isConnected && !isConfiguredValidator && <p>Connected wallet is not one of the three configured validators.</p>}
          </>}
          {Number(marketData?.status) === MARKET_STATUS.DISPUTED && <>
            <p>Outcome recorded. Eligible participants may challenge it before the challenge window closes.</p>
            <button className="primary-button" type="button" disabled={!canDispute || isWalletPending || receipt.isLoading} onClick={() => submitResolution("dispute")}>Dispute outcome with evidence</button>
            <button className="primary-button" type="button" disabled={!canFinalize || isWalletPending || receipt.isLoading} onClick={() => submitResolution("finalize")}>Finalize after challenge window</button>
          </>}

          {Number(marketData?.status) === MARKET_STATUS.SETTLED && <button className="primary-button" type="button" disabled={!canClaim || isWalletPending || receipt.isLoading} onClick={() => submitAction("claim")}>Claim settlement</button>}
          {Number(marketData?.status) === MARKET_STATUS.CLOSED && <p>This market has closed but has not been resolved. After the contract timeout, an eligible participant can enable refunds.</p>}
          {Number(marketData?.status) === MARKET_STATUS.CLOSED && <button className="primary-button" type="button" disabled={!canStartTimeoutRefund || isWalletPending || receipt.isLoading} onClick={() => submitAction("timeout")}>Enable timeout refunds</button>}
          {Number(marketData?.status) === MARKET_STATUS.ARBITRATION && <p>A resolution dispute is under review. Refunds become available if arbitration is not completed within seven days of the dispute.</p>}
          {Number(marketData?.status) === MARKET_STATUS.ARBITRATION && <button className="primary-button" type="button" disabled={!canStartDisputeTimeoutRefund || isWalletPending || receipt.isLoading} onClick={() => submitAction("disputeTimeout")}>Enable dispute timeout refunds</button>}
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
