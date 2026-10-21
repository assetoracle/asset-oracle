# Privy + Asset Chain Testnet migration notes

## Custom EVM network

The frontend has a separate Viem chain definition at `src/config/privyChains.ts` for Asset Chain Testnet:

| Setting | Value |
| --- | --- |
| Network | Asset Chain Testnet |
| Chain ID | 42421 |
| RPC | https://enugu-rpc.assetchain.org/ |
| Native currency | RWA |
| Explorer | https://scan-testnet.assetchain.org |

These values follow the official Asset Chain network guide:
https://docs.assetchain.org/general-info/add-asset-chain

**Mainnet is intentionally not configured. Asset Oracle is using Testnet for this migration and validation phase.**

## Privy dashboard setup

1. Create/select the Asset Oracle app at https://dashboard.privy.io/.
2. Configure allowed origins:
   - Production frontend: `https://assetoracleapp.xyz`
   - Local development: `http://localhost:5173`
3. Enable email, Google, and Twitter/X authentication.
4. Enable embedded Ethereum wallet creation for users who do not already have a wallet.
5. Keep external wallet connections available.
6. Configure the public app ID in the frontend deployment environment as `VITE_PRIVY_APP_ID`. Do not commit environment-specific values to source control. This app ID is a public client identifier, not a server secret.

Privy documentation:
- Authentication methods: https://docs.privy.io/authentication
- React SDK setup: https://docs.privy.io/basics/react/overview
- Wagmi integration: https://docs.privy.io/guide/react/wallets/using-wallets/ethereum
- Access-token verification: https://docs.privy.io/authentication/user-authentication/access-tokens

## Integration requirements before cutover

- Configure the Privy provider with `privySupportedChains` and use Asset Chain Testnet as the default.
- Verify the installed Privy SDK/Wagmi connector versions accept the custom chain definition. A chain definition alone does not prove Privy embedded-wallet signing is supported on this network.
- Test email, Google, and X sign-in, embedded-wallet creation, external wallet connection, message signing, switching to chain 42421, contract reads, and test transactions.
- Keep the current Reown provider active until the integration builds and all wallet flows pass.
- Preserve the existing backend nonce/signature session verification. If backend identity is migrated to Privy, verify Privy access tokens server-side (signature, issuer, audience/app ID, and expiry); never trust a client-provided user ID.
- Do not grant backend roles based only on email/social authentication. Continue to verify wallet ownership and enforce authorization on the server.
- Do not add or enable Asset Chain Mainnet until the user explicitly requests a mainnet rollout and testnet validation is complete.

## Scope of this preparation

This change adds a testnet-only custom chain definition and setup documentation. It does not replace Reown at runtime and does not claim that Privy embedded-wallet transactions have been verified on Asset Chain yet.
