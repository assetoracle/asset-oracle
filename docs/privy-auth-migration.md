# Privy authentication migration preparation

Status: preparation only. The current Reown email/social flow remains active until a Privy app is configured and the frontend + backend integration is implemented and tested. Do not deploy a frontend that assumes a Privy App ID exists.

## 1. Create the Privy app

1. Open the [Privy Dashboard](https://dashboard.privy.io/) and sign in or create a developer account.
2. Create a new app named **Asset Oracle**.
3. In the app's API keys / app overview area, copy the **App ID**. This is a public client identifier, not the App Secret.
4. In the app's authentication settings, enable these methods:
   - **Email** (one-time passcode / OTP).
   - **Google**.
   - **Twitter** (this is the provider name Privy uses for X).
5. If the dashboard asks for OAuth credentials for Google or Twitter/X, follow its provider-specific instructions. Configure the correct client ID/secret and callback/redirect URLs exactly as shown by Privy. Do not put OAuth client secrets or the Privy App Secret in Vite variables or frontend source.
6. In the app's allowed domains / origins / application URLs settings, allow:
   - Production: `https://assetoracleapp.xyz`
   - Local development: `http://localhost:5173`
   - Any other real preview/staging host used for testing, added explicitly.
7. Set the app's branding to Asset Oracle and use the public logo URL `https://assetoracleapp.xyz/asset-oracle-logo-transparent.svg` if the dashboard supports a logo.
8. Save the changes and test each enabled method in Privy's own test environment before using the App ID in Asset Oracle.

Dashboard labels can change as Privy updates its UI. Use the app's Authentication / User management settings and the official [Privy authentication overview](https://docs.privy.io/authentication) if a label differs.

## 2. Frontend environment variable

Copy `.env.example` to a local `.env.local` file and set:

```dotenv
VITE_PRIVY_APP_ID=your_public_privy_app_id
```

Add the same variable to the frontend hosting environment (production and each preview environment that should support sign-in), then trigger a fresh build/deploy. Vite only exposes variables prefixed with `VITE_` to browser code, so this variable must contain the **App ID only**. Never use `VITE_PRIVY_APP_SECRET`, OAuth client secrets, or other server credentials.

The application should fail closed or show a clear configuration message when the App ID is missing; it must not silently claim that Privy sign-in is available.

## 3. Planned frontend integration

The migration should use Privy's React SDK with a custom login UI to preserve Asset Oracle's branded modal. Enable only email, Google and Twitter/X for social/email authentication. Keep Reown/AppKit available for external-wallet selection while integrating Privy's wallet with Wagmi in a supported way.

Important: Asset Oracle uses Wagmi's active EVM address and signer throughout the application, including wallet sessions, role checks, proposals and on-chain actions. Successful Privy authentication by itself does **not** automatically connect a Privy embedded wallet to Wagmi. Use the supported Privy-Wagmi integration (and test the exact versions together) so the selected embedded or external wallet is reflected consistently in Wagmi. Do not simulate a wallet connection by copying an address into UI state.

Relevant official docs:
- [Privy React SDK setup](https://docs.privy.io/guide/guides/basics/react/basics/react/setup)
- [Privy authentication methods](https://docs.privy.io/authentication)
- [Privy access tokens](https://docs.privy.io/authentication/user-authentication/access-tokens)
- [Privy + Wagmi integration](https://docs.privy.io/guide/react/wallets/embedded/third-party-auth)

## 4. Backend verification required before enabling social/email sign-in

The current frontend's market API uses `POST /api/markets/auth/nonce` and `POST /api/markets/auth/session` to establish a session from an EVM wallet signature. The frontend stores the returned wallet session in session storage and sends it as a bearer token. Do not replace this with a client-provided email, social profile, or wallet address.

Before the new flow is enabled, implement and deploy one of these secure patterns on the **backend service that actually serves** `https://asset-oracle-backend.onrender.com`:

### Preferred: verify a Privy access token server-side

1. After Privy login, the frontend obtains the current Privy access token using the SDK.
2. Send it to a backend endpoint over HTTPS, e.g. `POST /api/auth/privy/session` with `Authorization: Bearer <Privy access token>`.
3. The backend verifies the token with Privy's supported server SDK / verification library, checking signature, issuer, audience (the configured App ID), expiry and required claims. Never trust decoded JWT claims without signature verification.
4. Resolve or create the application's internal user by stable Privy user ID (DID), not email alone. Treat email as a mutable profile attribute; do not merge accounts solely because an email string matches.
5. Return an Asset Oracle session token using the backend's established signing/session mechanism. Authorize all privileged actions from that server-issued session, not from frontend state.
6. Link a wallet to the authenticated identity only through a verified wallet-linking flow. Verify ownership by a fresh wallet signature or use a documented, supported Privy-linked-wallet proof. Never accept an arbitrary address sent by the browser.
7. Preserve role and admin/validator checks on the backend. A new Privy identity must not inherit privileged wallet roles based on an unverified address.

### Alternative: continue wallet-signature sessions

If social/email users receive a Privy embedded EVM wallet, the app may retain the current nonce/signature session endpoint only after the embedded wallet is connected to Wagmi and can sign the backend's exact nonce message. Confirm the signature scheme and recovery behavior on the server with a real test wallet before relying on this path. This establishes wallet control, but does not by itself establish or persist the Privy identity-to-wallet account mapping.

## 5. Verification and rollout checklist

- [ ] Email OTP succeeds on desktop and Android Chrome.
- [ ] Google OAuth returns to the original Asset Oracle tab without a stuck provider loading page.
- [ ] X/Twitter OAuth returns to the app and completes the login callback.
- [ ] A non-wallet user gets an embedded EVM wallet according to the chosen wallet-creation policy.
- [ ] The active wallet address and signer are consistent across Privy, Wagmi and Asset Oracle.
- [ ] Backend rejects missing, expired, malformed, wrong-audience and invalid-signature Privy tokens.
- [ ] Backend rejects arbitrary client-supplied user IDs, emails and wallet addresses.
- [ ] Existing external wallet connection, network switching to Asset Chain Testnet (42421), wallet-signature sessions and admin/validator authorization continue to work.
- [ ] Sign-out clears both the Privy authentication state and the Asset Oracle backend session.
- [ ] Test on production origin and the deployed preview origin before enabling the migration for all users.

## Repository / backend note

The frontend points at `https://asset-oracle-backend.onrender.com` for market-session APIs. The separately named public repository `Asset-Oracle/AssestOracle_Backend` exposes a different legacy `/api/auth/connect-wallet` route in its checked-in `server.js`; it does not show the market nonce/session routes consumed by this frontend. Confirm the source repository and deployment linked to the live Render service before implementing backend endpoints or environment variables. Do not assume changes to that legacy repository will affect the production market API.
