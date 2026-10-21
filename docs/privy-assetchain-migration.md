# Privy + Asset Chain migration notes

## Custom EVM networks

The frontend now has a separate Viem chain definition at `src/config/privyChains.ts` for:

| Network | Chain ID | RPC | Explorer |
| --- | ---: | --- | --- |
| Asset Chain Testnet | 42421 | https://enugu-rpc.assetchain.org/ | https://scan-testnet.assetchain.org |
| Asset Chain Mainnet | 42420 | https://mainnet-rpc.assetchain.org | https://scan.assetchain.org |

These values follow the official Asset Chain network guide:
https://docs.assetchain.org/general-info/add-asset-chain

## Privy dashboard setup

1. Create/select the Asset Oracle app at https://dashboard.privy.io/.
2. Configure the production and local development origins:
   - `https://assetoracleapp.xyz`
   - `http://localhost:5173`
3. Enable email, Google, and Twitter/X authentication.
4. Enable embedded Ethereum wallet creation for users who do not already have a wallet.
5. Keep external wallet connections available.
6. Add the public app ID to the deployment environment as `VITE_PRIVY_APP_ID`. This is a public client identifier, not an API secret.

Privy documentation:
- Authentication methods: https://docs.privy.io/authentication
- React SDK setup: https://docs.privy.io/basics/react/overview
- Wagmi integration: https://docs.privy.io/guide/react/wallets/using-wallets/ethereum
- Access-token verification: https://docs.privy.io/authentication/user-authentication/access-tokens

## Integration requirements before cutover

- Configure the Privy provider with `privySupportedChains` and use Asset Chain Testnet as the default during validation.
- Verify that the installed Privy SDK/Wagmi connector versions accept both custom chain definitions. A chain definition by itself does not prove Privy embedded-wallet signing is supported on that network.
- Test email, Google, and X sign-in, embedded-wallet creation, external wallet connection, message signing, chain switching, contract reads, and test transactions on chain 42421.
- Keep the current Reown provider active until the integration builds and all wallet flows pass.
- Preserve the existing backend nonce/signature session verification. If backend identity is migrated to Privy, verify the Privy access token server-side (issuer, audience/app ID, signature and expiry); never trust a client-provided user ID.
- Do not grant backend roles based only on email/social authentication. Continue to verify wallet ownership and enforce authorization on the server.
- Validate mainnet chain 42420 separately before enabling it for production transactions.

## Scope of this preparation

This change adds the custom network definitions and environment/documentation preparation only. It does not replace Reown at runtime and does not claim that Privy embedded-wallet transactions have been verified on Asset Chain yet.
