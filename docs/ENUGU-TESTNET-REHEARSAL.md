# Asset Oracle Enugu Testnet Rehearsal

Status: **Prepared — execution evidence not yet recorded**  
Scope: end-to-end testnet rehearsal only. This runbook does not authorize mainnet use, real funds, contract upgrades, or production market publication.

## Rehearsal metadata

- Date/time (UTC):
- Tester:
- Wallet address (public address only; never record a seed phrase or private key):
- App build / commit:
- Network: Asset Chain Enugu Testnet
- Chain ID expected: `42421`
- RPC: `https://enugu-rpc.assetchain.org`
- Explorer: `https://scan-testnet.assetchain.org`
- Market Manager expected: `0x5fc327f55cf533ed5d05337f835be37ff1e0db1f`
- Approved test USDC expected: `0xc33741fddEBeA854d265db6F9707900Efb0211a2` (6 decimals)

Record transaction hashes and public addresses only. Never paste credentials, recovery phrases, private keys, signed raw transactions, or API secrets into this document or an issue.

## Entry gates — verify before transactions

| Check | Expected result | Result / evidence |
|---|---|---|
| Production frontend | Current intended build loads over HTTPS | |
| Wallet network | Chain ID is 42421; no mainnet selected | |
| Native test gas | Test RWA balance is sufficient for planned calls | |
| Market Manager | Contract has code at the configured address on chain 42421 | |
| Test USDC | Contract has code; `decimals()` returns 6; token identity matches approved test USDC | |
| Manager stablecoin config | Configured USDC address and decimals match approved values and token is enabled | |
| Validator roster | `validatorRosterConfigured()` returns true before validator-flow testing | |
| Validator membership | Test addresses are checked against `isValidator(address)`; do not assume roster members | |
| Existing market inventory | `marketCount()` and sampled `getMarket(id)` results are recorded before testing | |
| Test market | Use an existing published test market or obtain explicit operator approval before creating one | |

**Stop immediately** if the network ID, contract address, token address, decimals, manager configuration, or roster state differs from the expected value. Do not substitute a different token or repeat a transaction because the UI failed to refresh.

## Scenario A — wallet and read-only market discovery

- [ ] Connect a dedicated test wallet on chain 42421.
- [ ] Confirm the app identifies the correct network and wallet.
- [ ] Open a published on-chain market.
- [ ] Confirm the market detail shows the expected market ID, manager, close time, and approved USDC configuration.
- [ ] Confirm an unlisted proposal is clearly distinguished from a published on-chain market and cannot be staked.
- [ ] Capture the public market URL, market ID, and screenshots or console-free UI observations.

Expected: read-only browsing succeeds without sending a transaction. Wrong-network or unlisted-market states must not enable a usable stake action.

## Scenario B — test USDC and stake lifecycle

Use only approved test USDC and a small, explicitly chosen test amount. Do not use mainnet funds.

- [ ] Confirm test USDC balance and 6-decimal display.
- [ ] If public minting is explicitly enabled in the app, mint only to the connected test wallet after inspecting the wallet prompt; otherwise request distribution from the testnet administrator.
- [ ] Choose YES or NO and enter a small amount.
- [ ] Review the token, spender, amount, and network in the wallet before approving.
- [ ] Confirm the allowance transaction, if required, and verify its receipt.
- [ ] Submit one stake transaction and record its transaction hash.
- [ ] Wait for confirmation; refresh the app once and verify the position and token balance against on-chain reads.
- [ ] Check the transaction in the Enugu explorer.

Expected: the position is associated with the correct wallet, market ID, side, and amount. If a transaction succeeds but UI tracking does not update, inspect the explorer and contract state before taking any further action.

## Scenario C — close, evidence-based resolution, and claims

Only run this scenario on a dedicated test market whose timing and lifecycle are safe to exercise. Do not resolve or dispute a market belonging to another tester.

- [ ] Verify the market close-time semantics and wait until the test market is eligible to close.
- [ ] Confirm unauthorized wallets cannot close or resolve markets.
- [ ] Have an authorized operator close the market; record the receipt.
- [ ] Verify the resolution evidence is retrievable and its hash is computed from the exact retained evidence artifact.
- [ ] Test one valid resolution path with the required authorized validators.
- [ ] Confirm one validator vote alone does not reach the 2-of-3 quorum.
- [ ] Confirm a second distinct authorized validator can reach quorum, and duplicate voting by the same validator is rejected.
- [ ] Verify dispute and timeout/refund paths only in separately prepared test markets where the path can be safely exercised.
- [ ] Verify claims/refunds are available only when contract state permits them, and balances update after confirmation.

Expected: contract state and explorer receipts agree with UI state. Record the exact tested path; do not infer untested branches passed.

## Scenario D — proposal submission and publication tracking

- [ ] Submit a clearly labelled test proposal using the guided Define → Resolve → Review flow.
- [ ] Confirm step navigation works, validation blocks incomplete forward navigation, and Back/previous steps remain accessible.
- [ ] Confirm dates display legibly and WAT/UTC interpretation is understood before submission.
- [ ] Confirm the proposal appears under the submitting wallet and retains the same reference after refresh.
- [ ] Confirm a non-authorized wallet cannot approve, reject, or publish.
- [ ] If the authorized owner approves and publishes a dedicated test proposal, record the transaction hash and resulting on-chain market ID.
- [ ] Confirm the backend tracks the confirmed market ID and the UI only marks the market published after that confirmation.
- [ ] Confirm a failed tracking refresh does not encourage resubmitting a second create-market transaction.

Expected: database/API proposal state and on-chain publication state remain distinct and consistent.

## Negative and recovery checks

- [ ] Wrong network: writes are blocked and the user receives a clear network instruction.
- [ ] Wrong token or decimals: staking is blocked; no fallback token is silently substituted.
- [ ] Insufficient gas or balance: transaction does not proceed as if successful.
- [ ] Rejected wallet prompt: app remains usable and no success state is shown.
- [ ] Pending/failed/reverted transaction: status is accurate and retry guidance does not risk duplicate writes.
- [ ] Stale or unavailable evidence: no automatic NO outcome is inferred from missing data.
- [ ] Refresh after confirmed transaction: on-chain truth can be recovered without repeating the write.

## Evidence log

For each executed scenario, record:

| Field | Value |
|---|---|
| Scenario and step | |
| Result (PASS / FAIL / BLOCKED / NOT RUN) | |
| Wallet public address | |
| Network / chain ID | |
| Market ID, if applicable | |
| Transaction hash, if applicable | |
| Explorer URL | |
| Expected state | |
| Observed state | |
| Screenshot or sanitized evidence reference | |
| Defect / follow-up issue | |

Do not mark a scenario PASS without observable evidence. Use BLOCKED when a prerequisite such as test USDC distribution, validator availability, or a dedicated test market is missing. A runbook being prepared or a CI build passing is not evidence that on-chain rehearsal passed.

## Exit criteria

The rehearsal is complete only when:
1. All entry gates are verified and recorded.
2. At least one read-only discovery path and one stake path pass with transaction evidence.
3. The 2-of-3 validator quorum is demonstrated using distinct authorized test validators, or explicitly marked BLOCKED with the missing dependency.
4. Proposal submission, owner authorization, publication tracking, and refresh recovery are checked.
5. Failures are documented with reproduction steps and transaction hashes where applicable.
6. No mainnet assets or real-value funds were used.

## Existing setup reference

See [TESTNET-TESTER-GUIDE.md](./TESTNET-TESTER-GUIDE.md) for wallet network setup, test gas, approved test USDC, and the user-facing staking walkthrough.
