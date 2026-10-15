import { friendlyError } from "../utils/friendlyError";
import { useEffect, useState } from "react";
import { formatUnits } from "viem";
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
  TESTNET_USDC_ADDRESS,
  TESTNET_USDC_DECIMALS,
  erc20TestnetAbi,
} from "../contracts/assetOracle";

const FAUCET_AMOUNT = 100_000000n;

type Props = {
  onConnect: () => void;
};

export default function TestnetUsdcFaucet({ onConnect }: Props) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const client = usePublicClient();
  const [mintReady, setMintReady] = useState(false);
  const [checkingMint, setCheckingMint] = useState(false);
  const [faucetError, setFaucetError] = useState("");
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [notice, setNotice] = useState("");

  const tokenName = useReadContract({
    address: TESTNET_USDC_ADDRESS,
    abi: erc20TestnetAbi,
    functionName: "name",
    query: { enabled: chainId === ASSET_CHAIN_TESTNET_ID },
  });
  const tokenSymbol = useReadContract({
    address: TESTNET_USDC_ADDRESS,
    abi: erc20TestnetAbi,
    functionName: "symbol",
    query: { enabled: chainId === ASSET_CHAIN_TESTNET_ID },
  });
  const decimals = useReadContract({
    address: TESTNET_USDC_ADDRESS,
    abi: erc20TestnetAbi,
    functionName: "decimals",
    query: { enabled: chainId === ASSET_CHAIN_TESTNET_ID },
  });
  const balance = useReadContract({
    address: TESTNET_USDC_ADDRESS,
    abi: erc20TestnetAbi,
    functionName: "balanceOf",
    args: [address!],
    query: { enabled: Boolean(address) && chainId === ASSET_CHAIN_TESTNET_ID },
  });

  const isExpectedToken =
    tokenName.data === "USD Coin Test" &&
    tokenSymbol.data === "USDC" &&
    decimals.data === TESTNET_USDC_DECIMALS;

  const { writeContractAsync, isPending, error: walletError } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({
    hash: txHash,
    query: { enabled: Boolean(txHash) },
  });

  useEffect(() => {
    let cancelled = false;
    setMintReady(false);
    setFaucetError("");
    if (!client || !address || chainId !== ASSET_CHAIN_TESTNET_ID || !isExpectedToken) {
      setCheckingMint(false);
      return;
    }

    setCheckingMint(true);
    void client.simulateContract({
      account: address,
      address: TESTNET_USDC_ADDRESS,
      abi: erc20TestnetAbi,
      functionName: "mint",
      args: [address, FAUCET_AMOUNT],
    }).then(() => {
      if (!cancelled) setMintReady(true);
    }).catch(() => {
      if (!cancelled) {
        setMintReady(false);
        setFaucetError("This test USDC contract does not allow this wallet to mint. Ask the testnet administrator to distribute test USDC.");
      }
    }).finally(() => {
      if (!cancelled) setCheckingMint(false);
    });

    return () => { cancelled = true; };
  }, [client, address, chainId, isExpectedToken]);

  useEffect(() => {
    if (receipt.isSuccess && receipt.data?.status === "success") {
      setNotice("100 test USDC claimed successfully.");
      void balance.refetch();
    } else if (receipt.isError) {
      setFaucetError("The faucet transaction failed. Check the testnet explorer and try again.");
    }
  }, [receipt.isSuccess, receipt.isError, receipt.data?.status]);

  useEffect(() => {
    if (walletError) setFaucetError(friendlyError(walletError, "Wallet error."));
  }, [walletError]);

  async function claim() {
    if (!address || !isConnected || chainId !== ASSET_CHAIN_TESTNET_ID || !isExpectedToken || !mintReady || isPending || receipt.isLoading) return;
    setFaucetError("");
    setNotice("");
    setTxHash(undefined);
    try {
      const hash = await writeContractAsync({
        address: TESTNET_USDC_ADDRESS,
        abi: erc20TestnetAbi,
        functionName: "mint",
        args: [address, FAUCET_AMOUNT],
      });
      setTxHash(hash);
      setNotice("Transaction submitted. Waiting for testnet confirmation…");
    } catch (error) {
      setFaucetError(friendlyError(error, "Faucet failed."));
    }
  }

  return (
    <section className="resolution-preview" aria-live="polite">
      <span className="eyebrow">TESTNET TOKENS</span>
      <h3>Get test USDC</h3>
      <p>Claim 100 test USDC for market participation. These tokens are for Asset Oracle testing on Enugu testnet only and have no real-world value.</p>
      {!isConnected ? (
        <button className="primary-button" type="button" onClick={onConnect}>Connect wallet to claim</button>
      ) : chainId !== ASSET_CHAIN_TESTNET_ID ? (
        <p className="disabled-note">Switch your wallet to Asset Chain Enugu testnet (Chain ID 42421) to claim test USDC.</p>
      ) : tokenName.isPending || tokenSymbol.isPending || decimals.isPending ? (
        <p className="disabled-note">Verifying the configured test USDC contract…</p>
      ) : !isExpectedToken ? (
        <p className="disabled-note">The configured token identity does not match USD Coin Test (USDC, 6 decimals). Faucet disabled for safety; ask the testnet administrator to distribute tokens.</p>
      ) : checkingMint ? (
        <p className="disabled-note">Checking whether public test-token minting is available…</p>
      ) : mintReady ? (
        <button className="primary-button" type="button" disabled={isPending || receipt.isLoading} onClick={() => void claim()}>
          {isPending ? "Confirm in wallet…" : receipt.isLoading ? "Waiting for confirmation…" : "Claim 100 test USDC"}
        </button>
      ) : (
        <p className="disabled-note">{faucetError || "Public minting is unavailable. Ask the testnet administrator to distribute test USDC."}</p>
      )}
      {balance.data !== undefined && <p className="disabled-note">Current balance: {formatUnits(balance.data, TESTNET_USDC_DECIMALS)} USDC</p>}
      {notice && <p role="status">{notice}</p>}
      {faucetError && mintReady && <p role="alert">{faucetError}</p>}
      {txHash && <p><a href={`${ASSET_CHAIN_TESTNET_EXPLORER}/tx/${txHash}`} target="_blank" rel="noreferrer">View faucet transaction</a></p>}
      <p className="disabled-note">Token: {TESTNET_USDC_ADDRESS}</p>
    </section>
  );
}
