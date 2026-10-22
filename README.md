# Asset Oracle

Asset Oracle is a React 19 + TypeScript + Vite frontend for prediction markets with on-chain market verification and wallet-based interactions on Asset Chain Enugu Testnet.

## Requirements

- Node.js 22
- npm
- A compatible EVM wallet for testnet interaction

## Local setup

```bash
npm ci
cp .env.example .env
npm run dev
```

Set `VITE_REOWN_PROJECT_ID` to your public Reown/WalletConnect project ID. Optional `VITE_API_URL` overrides the backend URL; `VITE_ADMIN_WALLET_ADDRESSES` is a comma-separated list of public wallet addresses used only to display admin navigation. Backend authorization remains authoritative. Vite environment values are public and must never contain secrets.

## Scripts

- `npm run dev` — start Vite development server
- `npm run build` — TypeScript project build and production bundle
- `npm run preview` — preview the production bundle locally
- `npm test` — run Vitest unit tests

## Testnet

- Network: Asset Chain Enugu Testnet
- Chain ID: `42421` (hex `0xa5b5`)
- RPC: `https://enugu-rpc.assetchain.org`
- Explorer: `https://scan-testnet.assetchain.org`
- App: [assetoracleapp.xyz](https://assetoracleapp.xyz)
- Market manager: `0x5fc327f55cf533ed5d05337f835be37ff1e0db1f`
- Approved test USDC: `0xc33741fddEBeA854d265db6F9707900Efb0211a2` (6 decimals)

Use testnet assets only. Verify network, contract, token, transaction destination, and amounts in your wallet before signing. Never share seed phrases or private keys.

## Deploy

The repository includes `render.yaml` for a Render static site deployment. Configure the public Vite environment variables in the Render dashboard, then deploy from the intended branch. CI runs tests and the production build on pushes to `main` and pull requests.

## Security

Report vulnerabilities privately using GitHub Security Advisories; see [SECURITY.md](./SECURITY.md).
