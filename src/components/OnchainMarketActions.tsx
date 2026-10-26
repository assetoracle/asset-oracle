import { friendlyError } from "../utils/friendlyError";
import { API_BASE_URL } from "../config/env";
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
import { ensureWalletSession } from "../markets/marketApi";

type Props = { marketId: bigint; managerAddress?: string | null; closeTime: number };

const MINIMUM_STAKE = 5_000_000n; // 5 USDC with the approved 6-decimal testnet token.


export default function OnchainMarketActions({ marketId, managerAddress, closeTime }: Props) {
  const chainId = useChainId();
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const client = usePublicClient();
  const [amount, setAmount] = useState("");
  const [stakeSuccessHandled, setStakeSuccessHandled] = useState<string | null>(null);
  const [pendingStakeAmount, setPendingStakeAmount] = useState<bigint | null>(null);
  const [pendingStakeSide, setPendingStakeSide] = useState<"YES" | "NO">("YES");
  const [yesSide, setYesSide] = useState(true);
  const [codeVerified, setCodeVerified] = useState(false);
  const [codeCheckDone, setCodeCheckDone] = useState(false);
  const [message, setMessage] = useState("");
  const [lastAction, setLastAction] = useState<"approve" | "stake" | "close" | "claim" | "refund" | "timeout" | null>(null);
  const [referralQualificationAttempted, setReferralQualificationAttempted] = useState<string | null>(null);
  const [referralAttributionReady, setReferralAttributionReady] = useState(false);
  const [referralPreparing, setReferralPreparing] = useState(false);
  const manager = managerAddress == null ||
    (isAddress(managerAddress) && managerAddress.toLowerCase() === assetOracleMarketManagerAddress.toLowerCase())
    ? assetOracleMarketManagerAddress
    : undefined;
  const isCurrentManager = Boolean(manager);

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
  const participantCount = useReadContract({
    address: manager,
    abi: assetOracleMarketManagerAbi,
    functionName: "participantCountByMarket",
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
    isCurrentManager && manager && chainId === ASSET_CHAIN_TESTNET_ID && codeCheckDone && codeVerified &&
    stablecoinVerified && marketVerified && !market.isError && !tokenConfig.isError &&
    !tokenDecimals.isError && !position.isError && !balance.isError && !allowance.isError &&
    balance.data !== undefined && allowance.data !== undefined
  );
  const canStake = safe && isConnected && Boolean(address) &&
    Number(marketData?.status) === MARKET_STATUS.OPEN &&
    Date.now() / 1000 < closeTime && parsedAmount >= MINIMUM_STAKE &&
    balance.data !== undefined && parsedAmount <= balance.data;
  const stakeDisabledReason = !isConnected
    ? "Connect your wallet to stake."
    : chainId !== ASSET_CHAIN_TESTNET_ID
      ? "Switch your wallet to Asset Chain Testnet (Chain ID 42421)."
      : !codeCheckDone
        ? "Verifying the market and USDC contracts…"
        : !codeVerified
          ? "Staking is blocked because the configured market manager or USDC contract could not be verified."
          : market.isPending || tokenConfig.isPending || tokenDecimals.isPending
            ? "Waiting for on-chain market and USDC verification…"
            : !stablecoinVerified
              ? "Staking is blocked because the approved USDC configuration is not verified."
              : !marketVerified
                ? "Staking is blocked because this market's on-chain details do not match the listing."
                : market.isError || tokenConfig.isError || tokenDecimals.isError || position.isError || balance.isError || allowance.isError
                  ? "A required on-chain read failed. Check your network connection and try again."
                  : Number(marketData?.status) !== MARKET_STATUS.OPEN
                    ? "This market is not currently open for staking."
                    : Date.now() / 1000 >= closeTime
                      ? "The staking window has closed."
                      : !amount.trim()
                        ? ""
                        : parsedAmount <= 0n
                          ? "Enter a valid amount greater than zero (up to 6 decimal places)."
                          : parsedAmount < MINIMUM_STAKE
                            ? "Minimum stake is 5 USDC."
                            : balance.data !== undefined && parsedAmount > balance.data
                            ? "Your USDC balance is too low for this stake."
                            : "Staking is temporarily unavailable. Check your wallet and market status.";
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


  useEffect(() => {
    if (receipt.isSuccess && receipt.data?.status === "success") {
      if (lastAction === "stake" && txHash && stakeSuccessHandled !== txHash) {
        setMessage(`Successfully staked ${formatUnits(pendingStakeAmount ?? parsedAmount, TESTNET_USDC_DECIMALS)} USDC on ${pendingStakeSide}.`);
        setAmount("");
        setStakeSuccessHandled(txHash);
      } else if (lastAction !== "stake" && lastAction !== "approve") {
        setMessage("Transaction confirmed. Refreshing your on-chain position and balance.");
      }
      void market.refetch();
      void position.refetch();
      void balance.refetch();
      void allowance.refetch();
      void tokenConfig.refetch();
    } else if (receipt.isError) {
      setMessage("Transaction receipt failed. Check the transaction in the testnet explorer.");
    }
  }, [receipt.isSuccess, receipt.isError, receipt.data?.status, lastAction, txHash, stakeSuccessHandled, pendingStakeAmount, pendingStakeSide, parsedAmount]);

  useEffect(() => {
    if (writeError) setMessage(friendlyError(writeError, "Transaction failed."));
  }, [writeError]);

  async function submitStake() {
    if (!canStake || !manager || parsedAmount === 0n || referralPreparing) return;
    setMessage("");
    const referralCode = new URLSearchParams(window.location.search).get("ref");
    if (referralCode && !referralAttributionReady && address) {
      setReferralPreparing(true);
      try {
        const base = API_BASE_URL;
        const session = await ensureWalletSession(address, (message) => signMessageAsync({ message }));
        const attributionResponse = await fetch(`${base}/api/referrals/attribute`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: `Bearer ${session.token}` },
          body: JSON.stringify({ address, referralCode }),
        });
        const attributionData = await attributionResponse.json();
        if (!attributionResponse.ok) throw new Error(attributionData.error || "Referral attribution could not be confirmed.");
        setReferralAttributionReady(true);
        setMessage("Referral attribution confirmed. Continue with the stake transaction.");
      } catch (error) {
        setMessage(friendlyError(error, "Referral check failed."));
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
    setPendingStakeAmount(parsedAmount);
    setPendingStakeSide(yesSide ? "YES" : "NO");
    setLastAction("stake");
    writeContract({
      address: manager,
      abi: assetOracleMarketManagerAbi,
      functionName: "stake",
      args: [marketId, yesSide, parsedAmount],
    });
  }

  function submitAction(action: "close" | "claim" | "refund" | "timeout") {
    if (!manager) return;
    if (action === "close" && !canClose) return;
    if (action === "claim" && !canClaim) return;
    if (action === "refund" && !canRefund) return;
    if (action === "timeout" && !canStartTimeoutRefund) return;
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
          : "refundCancelled",
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
    // Qualify any existing attribution after the wallet's confirmed first stake.
    // The referred wallet may have navigated away from the original ?ref= URL.
    setReferralQualificationAttempted(txHash);
    
    void (async () => {
      try {
        const base = API_BASE_URL;
        const session = await ensureWalletSession(address, (message) => signMessageAsync({ message }));
        const qualificationResponse = await fetch(`${base}/api/referrals/qualify/session`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: `Bearer ${session.token}` },
          body: JSON.stringify({ address, transactionHash: txHash }),
        });
        const qualificationData = await qualificationResponse.json();
        if (!qualificationResponse.ok) throw new Error(qualificationData.error || "Referral qualification could not be verified.");
        // Keep the stake-success confirmation visible; referral qualification runs in the background.
        void qualificationData;
      } catch (error) {
        // A wallet without a referral attribution is expected to receive 404 here.
        // Do not replace a successful stake confirmation with a referral warning.
        void error;
      }
    })();
    
  }, [receipt.isSuccess, receipt.data?.status, txHash, manager, lastAction, address, referralQualificationAttempted, signMessageAsync]);

  return (
    <section className="resolution-preview onchain-status" aria-live="polite">
      <span className="eyebrow">TESTNET PARTICIPATION</span>
      <div className="onchain-market-title-row">
      <div>
        <span className="eyebrow">ON-CHAIN MARKET ID</span>
        <h3 className="onchain-market-id">#{marketId.toString()}</h3>
      </div>
      <span className="onchain-market-asset">USDC · TESTNET</span>
    </div>
      {!manager ? <p>Transactions are disabled: this market belongs to a retired deployment or has no verified manager.</p>
      : chainId !== ASSET_CHAIN_TESTNET_ID ? <p>Switch to Asset Chain Testnet (Chain ID 42421).</p>
      : !codeCheckDone ? <p>Verifying deployed contract bytecode…</p>
      : !codeVerified ? <p>Transactions blocked: market manager or USDC contract has no deployed bytecode at the configured address.</p>
      : tokenConfig.isPending || tokenDecimals.isPending || market.isPending || (address && position.isPending) ? <p>Verifying on-chain market, USDC configuration, and wallet position…</p>
      : !stablecoinVerified ? <p>Transactions blocked: the manager must explicitly enable the approved testnet USDC address with 6 decimals.</p>
      : !marketVerified ? <p>Transactions blocked: on-chain market ID, USDC asset, or close time does not match the displayed market record.</p>
      : market.isError || tokenConfig.isError || tokenDecimals.isError || position.isError ? <p>Transactions blocked because one or more verification reads failed.</p>
      : !isConnected ? <p>Sign in on Asset Chain Testnet to check your position and participate.</p>
      : <>
          <div className="market-detail-grid">
            <article className="detail-info-card"><span>Participants</span><strong>{participantCount.data === undefined ? "Unavailable" : participantCount.data.toString()}</strong></article>
            <article className="detail-info-card"><span>Total amount staked</span><strong>{marketData?.totalStaked === undefined ? "Unavailable" : `${formatUnits(marketData.totalStaked, TESTNET_USDC_DECIMALS)} USDC`}</strong></article>
            <article className="detail-info-card"><span>Your YES stake</span><strong>{formatUnits(positionYes, 6)} USDC</strong></article>
            <article className="detail-info-card"><span>Your NO stake</span><strong>{formatUnits(positionNo, 6)} USDC</strong></article>
            <article className="detail-info-card"><span>USDC balance</span><strong>{balance.data === undefined ? "Unavailable" : formatUnits(balance.data, 6)}</strong></article>
            <article className="detail-info-card"><span>Position status</span><strong>{claimed ? (hasPosition ? "Already claimed" : "No active position") : hasPosition ? "Unclaimed" : "No position"}</strong></article>
          </div>
          {Number(marketData?.status) === MARKET_STATUS.OPEN && Date.now() / 1000 < closeTime && <>
            {new URLSearchParams(window.location.search).get("ref") && <p>Referral link detected. By continuing to stake, you can sign once to record the referral attribution; it counts only after this wallet’s first confirmed prediction.</p>}
            <label htmlFor={`onchain-amount-${marketId}`}>Stake amount (test USDC · minimum 5 USDC)</label>
            <input id={`onchain-amount-${marketId}`} inputMode="decimal" autoComplete="off" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="Minimum 5.00 USDC" disabled={isWalletPending || receipt.isLoading || referralPreparing} />
            <div className="outcome-preview">
              <button className="outcome-choice-yes" type="button" aria-pressed={yesSide} onClick={() => setYesSide(true)}>YES</button>
              <button className="outcome-choice-no" type="button" aria-pressed={!yesSide} onClick={() => setYesSide(false)}>NO</button>
            </div>
            <button className="primary-button" type="button" disabled={!canStake || isWalletPending || receipt.isLoading || referralPreparing || !amount.trim()} onClick={submitStake}>
              {referralPreparing ? "Confirm referral in wallet…" : isWalletPending ? "Confirm in wallet…" : receipt.isLoading ? "Waiting for confirmation…" : (allowance.data ?? 0n) < parsedAmount ? "Approve exact USDC amount" : `Stake ${amount || "USDC"} on ${yesSide ? "YES" : "NO"}`}
            </button>
            {!canStake && stakeDisabledReason && !isWalletPending && !receipt.isLoading && <p className="stake-disabled-note" role="status">{stakeDisabledReason}</p>}
            {balance.data !== undefined && parsedAmount > balance.data && <p role="alert">Amount exceeds your test USDC balance.</p>}
          </>}
          {Number(marketData?.status) === MARKET_STATUS.OPEN && Date.now() / 1000 >= closeTime && <button className="primary-button" type="button" disabled={!canClose || isWalletPending || receipt.isLoading} onClick={() => submitAction("close")}>Close expired market</button>}
          {Number(marketData?.status) === MARKET_STATUS.CLOSED && <p className="disabled-note">This market is closed.</p>}
          {Number(marketData?.status) === MARKET_STATUS.SETTLED && <button className="primary-button" type="button" disabled={!canClaim || isWalletPending || receipt.isLoading} onClick={() => submitAction("claim")}>Claim settlement</button>}
          {Number(marketData?.status) === MARKET_STATUS.CLOSED && <p>This market has closed but has not been resolved. After the contract timeout, an eligible participant can enable refunds.</p>}
          {Number(marketData?.status) === MARKET_STATUS.CLOSED && <button className="primary-button" type="button" disabled={!canStartTimeoutRefund || isWalletPending || receipt.isLoading} onClick={() => submitAction("timeout")}>Enable timeout refunds</button>}
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
