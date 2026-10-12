# November 2026 Market Proposals

Status: proposed only. These definitions are not live markets and must not be presented as published until the corresponding on-chain creation transactions are confirmed.

Network context: Asset Chain Enugu testnet (chain ID 42421). Any initial publication on this deployment uses test USDC and is on testnet, not mainnet.

All deadlines are UTC. A YES outcome requires reliable evidence that the stated threshold was reached at least once on or before the deadline. A NO outcome means the threshold was not reached during the defined observation window. The price/index source, token identity, timestamp handling, and evidence retention must be finalized before publication.

## 1. Bitcoin — $100,000

Question: Will Bitcoin (BTC) reach or exceed $100,000 USD by November 1, 2026?

- Deadline: 2026-11-01 23:59:59 UTC.
- YES: the Asset Oracle CoinGecko monitor captures a fresh, timestamped BTC/USD observation of at least $100,000 from publication through the deadline.
- NO: the monitor has sufficient continuous coverage for the full window and no valid captured observation reaches $100,000. Missing/stale data or monitoring gaps require unresolved/invalid review, not NO.
- Sampling rule: the market measures recorded provider observations, not every instantaneous price tick. The monitor polls once per minute; the published rule must disclose that sampling limitation.
- Proposed source: CoinGecko market data, with the exact BTC asset ID and source methodology recorded before publication.
- Evidence: retain source URL/API identifier, timestamp, value, and a retrievable snapshot or response record.

## 2. Ethereum — $4,000

Question: Will Ethereum (ETH) reach or exceed $4,000 USD by November 1, 2026?

- Deadline: 2026-11-01 23:59:59 UTC.
- YES: the Asset Oracle CoinGecko monitor captures a fresh, timestamped ETH/USD observation of at least $4,000 from publication through the deadline.
- NO: the monitor has sufficient continuous coverage for the full window and no valid captured observation reaches $4,000. Missing/stale data or monitoring gaps require unresolved/invalid review, not NO.
- Sampling rule: the market measures recorded provider observations, not every instantaneous price tick. The monitor polls once per minute; the published rule must disclose that sampling limitation.
- Proposed source: CoinGecko market data, with the exact ETH asset ID and source methodology recorded before publication.
- Evidence: retain source URL/API identifier, timestamp, value, and a retrievable snapshot or response record.

## 3. BNB — $1,000

Question: Will BNB reach or exceed $1,000 USD by November 1, 2026?

- Deadline: 2026-11-01 23:59:59 UTC.
- YES: the Asset Oracle CoinGecko monitor captures a fresh, timestamped BNB/USD observation of at least $1,000 from publication through the deadline.
- NO: the monitor has sufficient continuous coverage for the full window and no valid captured observation reaches $1,000. Missing/stale data or monitoring gaps require unresolved/invalid review, not NO.
- Sampling rule: the market measures recorded provider observations, not every instantaneous price tick. The monitor polls once per minute; the published rule must disclose that sampling limitation.
- Proposed source: CoinGecko market data, with the exact BNB asset ID and source methodology recorded before publication.
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
- Network and token identity: Asset Chain mainnet. **Publication blocker:** pin the exact SHALOM contract used by the live xRWA/SHALOM pool. Public documentation lists `0xf20f989CAf263C513f9183B4Fed88F14Fc04c8dB`, while a newer explorer result lists a different SHALOM token contract (`0xd90E8d3c74d9f804082C06BEaD0a0133C82E3d69`). Do not choose either address until the live pool's `token0`/`token1` and project identity are verified.
- Preferred price source: Asset Chain Swap, using the SHALOM/USDT pool or a documented swap quote that converts SHALOM to USDT. The pool/route address and quote method must be pinned before publication so the source cannot silently switch.
- USD conversion: use the approved USDT/USD reference and document the conversion. Do not assume USDT is exactly $1 without a defined tolerance/source.
- YES: the calculated 5-minute TWAP for SHALOM/USD, derived from the pinned SHALOM/xRWA and xRWA/USDT pools and a timestamped USDT/USD reference, reaches or exceeds $1.00 in a valid, non-stale observation at any time from publication through the deadline.
- NO: the monitor has continuous, sufficient coverage for the full observation window and no valid 5-minute TWAP observation reaches $1.00. Missing, stale, failed, or materially illiquid data must result in an unresolved/invalid review—not automatic NO.
- Monitoring requirement: the DEX interface alone is not a historical evidence archive. Before publication, deploy or configure a monitor to record timestamped observations, pool/route identity, quoted price, liquidity/slippage context, source response, and immutable evidence hashes at a defined interval. Record a threshold crossing immediately. Set a minimum liquidity/maximum-slippage policy and a manipulation rule before launch.
- Cross-check: FireScreener may be used as a secondary verification source if its token mapping and API coverage for this exact contract are verified. It is not the primary settlement source under this proposal.
- Evidence: retain the exact token address, pool/route address, quote path, timestamp, USDT/USD conversion, raw response or on-chain quote details, liquidity/slippage context, and retrievable evidence snapshot.

## Shared pre-publication checklist

- Confirm the exact WKC token/project, contract address, provider asset ID, and circulating-supply methodology.
- Resolve the conflicting SHALOM contract references by verifying the exact token address inside the live Asset Chain Swap pool before enabling monitoring or publishing.
- Confirm the selected providers' historical/intraday coverage is suitable for threshold-touch questions. For SHALOM, the DEX monitoring/evidence archive must be operational before the observation window starts.
- Finalize source-failure, stale-data, liquidity, manipulation, and conflicting-source handling; do not silently treat missing data as NO.
- Confirm the contract's deadline semantics and align the UI countdown with UTC.
- Verify that the five questions and rules fit the deployed contract's question/metadata model.
- Publish only after explicit owner approval and a confirmed on-chain transaction. Never describe these proposals as live before confirmation.
- The deployed manager is currently on Enugu testnet. Test USDC only; this does not create mainnet markets or authorize real-fund use.
