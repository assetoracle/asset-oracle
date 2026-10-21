# Dynamic authentication migration preparation

Status: provider selection pivoted from Privy to Dynamic because Asset Oracle requires an explicitly configurable custom EVM network. The current Reown sign-in flow remains active until the Dynamic SDK is integrated and tested. This document is preparation, not a completed auth replacement.

## Why Dynamic

Dynamic documents support for custom EVM networks through `DynamicContextProvider`'s `overrides.evmNetworks`, including RPC and explorer configuration. It supports email and social sign-in including Google and Twitter/X, and can create embedded EVM wallets for users who authenticate without an existing wallet.

Official docs:
- [Dynamic custom EVM networks](https://docs.dynamic.xyz/chains/evmNetwork)
- [Email and social authentication](https://docs.dynamic.xyz/authentication-methods/email-social-sms)
- [Embedded wallet creation](https://docs.dynamic.xyz/wallets/embedded-wallets/create-embedded-wallets)
- [Dynamic React quickstart](https://docs.dynamic.xyz/quickstart)

## 1. Create the Dynamic environment

1. Open the [Dynamic Dashboard](https://app.dynamic.xyz/) and create/sign in to your developer account.
2. Create an application/environment named **Asset Oracle**.
3. Copy its **Environment ID**.
4. In login/authentication settings, enable **Email**, **Google**, and **Twitter** (the dashboard's name for X). Complete any provider-specific OAuth configuration and callback URLs shown in the dashboard.
5. In the wallet settings, enable embedded wallet creation on sign-up for non-wallet login. Enable external wallet connectors and ensure EVM wallets are enabled.
6. Configure the environment's allowed domains / application origins for:
   - `https://assetoracleapp.xyz`
   - `http://localhost:5173`
   - Any actual preview/staging host used for testing.
7. Use the dashboard's branded UI options if desired; Asset Oracle's own modal can remain custom. Save and test the methods in the Dynamic environment.

## 2. Asset Chain Testnet custom EVM network

Asset Chain is EVM-compatible. Add this network to Dynamic's custom EVM network configuration, and add the same viem/Wagmi chain to the frontend's Wagmi config:

- Name: `Asset Chain Testnet`
- Chain ID / network ID: `42421`
- RPC: `https://enugu-rpc.assetchain.org/`
- Native currency: `RWA`, 18 decimals
- Explorer: `https://scan-testnet.assetchain.org`

Dynamic's `EvmNetwork` object requires chainId, networkId, name, chainName, nativeCurrency, rpcUrls, blockExplorerUrls, and iconUrls. For the icon, use an approved public Asset Oracle/Asset Chain logo URL or a neutral supported icon URL; do not use a fabricated URL.

Important: configuring a custom network in Dynamic does not, by itself, prove every embedded-wallet flow, chain switch, or transaction path works. Test embedded wallets and external wallets on chain 42421, including signing the backend's nonce message and submitting a harmless test transaction, before rollout.

## 3. Frontend environment variable

Copy `.env.example` to `.env.local` and set:

```dotenv
VITE_DYNAMIC_ENVIRONMENT_ID=your_dynamic_environment_id
```

Set the same value in the frontend hosting environment for production and each preview environment that should support login, then rebuild. The environment ID is a public client identifier. Do not place server API keys or private credentials in `VITE_` variables.

## 4. Frontend integration requirements

- Use compatible Dynamic React SDK packages at matching versions, including the Ethereum connector package.
- Configure `DynamicContextProvider` with `VITE_DYNAMIC_ENVIRONMENT_ID`, the custom Asset Chain network, and the Ethereum wallet connectors.
- Keep Asset Oracle's branded login surface for Email, Google, X and external wallets if the SDK supports the required headless flows. Otherwise style the provider UI consistently with Asset Oracle.
- Integrate Dynamic wallets with Wagmi without maintaining a separate, conflicting Wagmi wallet state. Existing code uses Wagmi for the address, `useSignMessage`, chain reads, transactions, role checks and network switching.
- Configure embedded wallet creation on signup for email/social users who do not have a wallet. Do not treat social login alone as proof of wallet ownership.
- Keep external wallet login/connection, chain ID 42421, existing app session lifecycle and sign-out behavior working.

## 5. Backend verification required before rollout

The market frontend currently establishes a backend wallet session using `POST /api/markets/auth/nonce` and `POST /api/markets/auth/session`. Do not grant a session based only on a browser-provided email, social profile, or address.

Two secure approaches are possible:

### Preferred identity-backed session

1. Frontend sends a Dynamic-issued user JWT to a backend endpoint over HTTPS, e.g. `POST /api/auth/dynamic/session` with `Authorization: Bearer <JWT>`.
2. Backend verifies the JWT signature using Dynamic's documented JWKS/JWT verification method and validates issuer, expiry and expected environment/application claims. Never trust merely decoded JWT claims.
3. Resolve/create the internal user by the verified Dynamic user ID, not by email alone. Email is a mutable profile attribute; do not merge accounts only because email strings match.
4. Backend issues its own Asset Oracle session token. Every privileged action continues to enforce backend authorization and roles.
5. Link a wallet to the authenticated identity only through a verified wallet-linking process. Verify wallet control with a fresh signature or supported provider proof; never trust an arbitrary browser-submitted address.

### Alternative wallet-signature session

Continue the current nonce/signature session endpoint only after proving that Dynamic's embedded wallet is connected to Wagmi and can sign the exact server-issued nonce. Verify signature recovery on the backend with real test accounts. This proves control of the wallet, but does not by itself establish a persistent mapping from Dynamic identity to wallet.

## 6. Rollout checklist

- [ ] Email OTP, Google and Twitter/X login work on desktop and Android Chrome.
- [ ] OAuth returns to the Asset Oracle tab and does not hang on a provider loading screen.
- [ ] Email/social users receive an embedded EVM wallet as configured.
- [ ] External wallets connect and can sign messages.
- [ ] Embedded and external wallets both work on chain ID 42421.
- [ ] Wallet address/signer is consistent across Dynamic, Wagmi and Asset Oracle.
- [ ] Backend rejects invalid, expired, wrong-environment and bad-signature Dynamic tokens.
- [ ] Backend rejects arbitrary user IDs, emails and wallet addresses from the client.
- [ ] Admin/validator permissions remain server-authorized.
- [ ] Sign-out clears Dynamic state and the Asset Oracle backend session.
- [ ] Production and preview domains are tested before rollout.

## Backend source clarification

The frontend calls `https://asset-oracle-backend.onrender.com` for market-session APIs. The separately named public repository `Asset-Oracle/AssestOracle_Backend` exposes a legacy `/api/auth/connect-wallet` route but does not show the market nonce/session endpoints consumed by this frontend. Confirm the actual source repository connected to the live Render service before adding the Dynamic JWT endpoint. Do not assume edits to that legacy repository will change the production market API.
