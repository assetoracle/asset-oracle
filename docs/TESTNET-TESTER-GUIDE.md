# Asset Oracle Enugu Testnet Tester Guide

Asset Oracle is open for **testnet-only** participation at [asset-oracle.onrender.com](https://asset-oracle.onrender.com). All staking in this phase uses the dedicated Enugu testnet USDC contract. Test tokens have no real-world value.

## 1. Add Asset Chain Enugu testnet

Use these network settings in MetaMask or another EVM-compatible wallet:

- Network name: Asset Chain Enugu Testnet
- RPC: `https://enugu-rpc.assetchain.org`
- Chain ID: `42421`
- Native currency: `RWA`
- Explorer: [scan-testnet.assetchain.org](https://scan-testnet.assetchain.org)

Official network setup guide: [Asset Chain documentation](https://docs.assetchain.org/general-info/add-asset-chain).

## 2. Get test gas and test USDC

1. Claim native test RWA from the [Asset Chain testnet faucet](https://faucet.assetchain.org/) to pay transaction gas.
2. On Asset Oracle, open **Markets** and connect your test wallet.
3. Use the **Get test USDC** panel if it confirms that public minting is available. Claiming requires an explicit wallet confirmation.
4. If the faucet is disabled, do not use a different token address. Ask the testnet administrator to distribute the approved test USDC.

Approved test USDC address for this deployment: `0xc33741fddEBeA854d265db6F9707900Efb0211a2` (6 decimals).

## 3. Test a published market

1. Open **Markets** and choose a market marked as published on-chain.
2. Open its details and wait for the app to verify the market manager, market ID, USDC configuration, and close time.
3. Enter an amount and choose **YES** or **NO**.
4. Confirm the exact USDC allowance in your wallet if prompted. Then press **Stake** and confirm the stake transaction.
5. Check your USDC balance and position after the transaction confirms. Use the explorer links to verify transactions.

If the app says the market is not listed on-chain, do not try to stake on that proposal. It has not been published as a usable on-chain market.

## Safety and known limitations

- Use a test wallet and testnet assets only. Never send mainnet assets to this testnet contract.
- Only the configured test USDC is accepted by this Market Manager.
- A submitted proposal is not a live market until an authorized publisher confirms the on-chain transaction and the backend records the market ID.
- Market outcomes are not automatically settled by price monitors. Resolution remains an authorized, evidence-based process.
- If a transaction confirms but the app does not refresh, check the explorer before retrying. Do not repeat a market-creation transaction solely because publication tracking failed.
