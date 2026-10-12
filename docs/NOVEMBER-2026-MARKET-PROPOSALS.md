# November 2026 Market Proposals

Status: proposed only. These definitions are not live markets and must not be presented as published until the corresponding on-chain creation transactions are confirmed.

Network context: Asset Chain Enugu testnet (chain ID 42421). Any initial publication on this deployment uses test USDC and is on testnet, not mainnet.

All deadlines are UTC. A YES outcome requires reliable evidence that the stated threshold was reached at least once on or before the deadline. A NO outcome means the threshold was not reached during the defined observation window. The price/index source, token identity, timestamp handling, and evidence retention must be finalized before publication.

## 1. Bitcoin — $100,000

Question: Will Bitcoin (BTC) reach or exceed $100,000 USD by November 1, 2026?

- Deadline: 2026-11-01 23:59:59 UTC.
- YES: the approved BTC/USD reference source records a price of at least $100,000 at any time from publication through the deadline.
- NO: no qualifying observation reaches $100,000 during that window.
- Proposed source: CoinGecko historical market data, with the exact BTC asset ID and source methodology recorded before publication.
- Evidence: retain source URL/API identifier, timestamp, value, and a retrievable snapshot or response record.

## 2. Ethereum — $4,000

Question: Will Ethereum (ETH) reach or exceed $4,000 USD by November 1, 2026?

- Deadline: 2026-11-01 23:59:59 UTC.
- YES: the approved ETH/USD reference source records a price of at least $4,000 at any time from publication through the deadline.
- NO: no qualifying observation reaches $4,000 during that window.
- Proposed source: CoinGecko historical market data, with the exact ETH asset ID and source methodology recorded before publication.
- Evidence: retain source URL/API identifier, timestamp, value, and a retrievable snapshot or response record.

## 3. BNB — $1,000

Question: Will BNB reach or exceed $1,000 USD by November 1, 2026?

- Deadline: 2026-11-01 23:59:59 UTC.
- YES: the approved BNB/USD reference source records a price of at least $1,000 at any time from publication through the deadline.
- NO: no qualifying observation reaches $1,000 during that window.
- Proposed source: CoinGecko historical market data, with the exact BNB asset ID and source methodology recorded before publication.
- Evidence: retain source URL/API identifier, timestamp, value, and a retrievable snapshot or response record.

## 4. WKC — $50 million market capitalization

Question: Will WKC reach or exceed a USD market capitalization of $50,000,000 by November 1, 2026?

- Deadline: 2026-11-01 23:59:59 UTC.
- YES: the pre-approved data source reports a market capitalization of at least $50,000,000 at any time from publication through the deadline.
- NO: no qualifying observation reaches that value during that window.
- Publication blocker: confirm the exact WKC token/project and contract address, the intended market-cap provider, and its circulating-supply methodology. Do not publish until these are unambiguous.
- Evidence: retain provider, asset identifier, market-cap value, timestamp, circulating supply methodology, and a retrievable snapshot.

## 5. Shalom Token ($SHALOM) — $1 by first anniversary

Question: Will Shalom Token ($SHALOM) reach or exceed $1.00 USD per token by November 7, 2026, its stated first-anniversary deadline?

- Deadline: 2026-11-07 23:59:59 UTC.
- YES: the pre-approved USD price source records at least $1.00 per token at any time from publication through the deadline.
- NO: no qualifying observation reaches $1.00 during that window.
- Publication blocker: confirm the exact SHALOM token contract/address and anniversary date, and select a source with sufficient coverage and a clearly defined price methodology. Do not publish until confirmed.
- Evidence: retain provider, asset identifier, price, timestamp, and a retrievable snapshot.

## Shared pre-publication checklist

- Confirm the exact token identities and source asset IDs for WKC and SHALOM.
- Confirm the selected provider's historical/intraday coverage is suitable for threshold-touch questions.
- Finalize source-failure, stale-data, and conflicting-source handling; do not silently treat missing data as NO.
- Confirm the contract's deadline semantics and align the UI countdown with UTC.
- Verify that the five questions and rules fit the deployed contract's question/metadata model.
- Publish only after explicit owner approval and a confirmed on-chain transaction. Never describe these proposals as live before confirmation.
- The deployed manager is currently on Enugu testnet. Test USDC only; this does not create mainnet markets or authorize real-fund use.
