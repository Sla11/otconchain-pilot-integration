# Map every request to a reconciled outcome.

Pilot handoff profile 0.1.0-draft. The terminal consumes OTConChain's canonical request and execution states. Exchange order labels, bot status and HTTP acceptance are not sufficient evidence of an on-chain fill.

## Two state machines

| Auction state | Meaning | Terminal behavior |
| --- | --- | --- |
| open | Exact terms frozen; maker responses being collected | Show collecting; no quote approval |
| closed | Cut-off reached; responses validated | Offer portal review if a valid offer remains |
| selected | Client chose an eligible offer | Show awaiting wallet decision or actual execution state |
| no_valid_quotes | No eligible firm response | Show unavailable; a new request needs an explicit user action |
| expired | No unsubmitted executable offer remains valid | Disable preparation; do not infer the outcome of a submitted transaction |
| cancelled | Application workflow closed before executable disclosure | Show cancelled workflow; native exposure is managed separately |

| Execution state | Meaning | Evidence rule |
| --- | --- | --- |
| not_started | No execution preparation | No transaction or settlement assertion |
| awaiting_authorization | Exact selected envelope prepared for client | Not submitted; client may reject or time out |
| submitted | A transaction is known; no accepted mined result yet | Retain hash and replacement lineage; keep reconciling |
| mined | Matching successful fill and transfers observed | Show confirmations, not final settlement |
| confirmed | Matching evidence satisfies the agreed chain policy | Show confirmed with policy/version and block reference |
| reverted | Actual failed receipt observed | Report revert and gas if known; no token settlement claim |
| dropped | Authoritative reconciliation resolves a dropped/cancelled submission | No successful fill; user review before a new trade |
| reorged | Previous accepted block/receipt became noncanonical | Withdraw the confirmation assertion; reconcile to submitted/mined/confirmed again |

A replaced transaction remains submitted until its actual outcome is known; keep original and replacement hashes rather than inventing a second trade. Quote expiry cannot settle an unknown pending transaction. Distinguish a business cancellation, an effective maker order cancellation and a client nonce-replacement transaction.

## Exactly one disclosed execution

Use an atomic, persistent selection/disclosure lease tied to request version, quoteId, native orderHash, client wallet and signed expiry. Repeated preparation returns the same lease and payload, not a new quote. Keep losing signatures server-side.

After disclosure, API cancellation or a terminal Stop action cannot promise revocation. Return 409 RECONCILIATION_REQUIRED while the envelope or transaction may still execute. Revalidate order fill/cancel state and inventory. Before releasing another maker's quote, establish that the first is filled, safely expired or effectively cancelled and resolve pending submissions. A failure never silently switches maker or invokes a public market order.

The native contract does not enforce our auction's one-winner policy across different signed offers. The application must control disclosure; retained records do not create a protocol prohibition against misuse of signatures obtained elsewhere.

## Quote eligibility and ranking

Validate the maker authorization, native domain, configured chain/proxy, exact sell amount, token pair, taker/executor, signature type, pool, receipt cut-off and expiry headroom. Exclude indicative, declined, late, expired, changed, superseded and out-of-policy responses from executable selection. Integer range and decimals are checked independently of JSON schema patterns.

For comparable economics, represent the offered buy amount and charges in the same buy-token base units. Proposed pilot commercial treatment: no added on-chain software-fee mechanism; any software invoice is off-chain and agreed separately. This is a proposed scope, not an agreed price or free service commitment. Disclose any cost treatment before comparing offers.

When all comparable costs are known or explicitly modeled, compute estimated net proceeds as gross maker output minus the disclosed platform charge and the gas estimate converted to buy-token units with a recorded conversion source/time. Keep estimated and realized amounts separate. Do not insert zero for an unknown gas estimate, conversion or invoice assumption.

If costs cannot be made comparable, present gross output with costs unknown, set rankingBasis=gross_output and economicComparison=unavailable. Do not mark it a verified best-net-price result. The client minimumNetBuyAmount must not be treated as satisfied until the agreed net-cost policy can evaluate it. Reject or hold execution preparation rather than silently dropping that constraint. For fixed test fixtures, record the explicit illustrative assumptions; they establish no live savings.

One maker response is single_maker, regardless of how many software adapters represent it. A later competition test needs at least two independent eligible makers and agreed access isolation. Tie-breaking follows the existing auction rule: net proceeds, valid server receipt time, then stable quote ID.

## Receipt contract and visibility

The partner receipt includes schemaVersion, mode, receiptId, requestId, receiptVersion, generatedAt, auctionState, executionState, selectedQuote, costComparison, and executionEvidence. All data is scoped to the authorized institution. Before selection, selectedQuote is null. Before an actual observed submission, executionEvidence is null. A pending report may be returned; its state must remain explicit.

SelectedQuote links makerId, quoteId, orderHash, exact sell/gross buy amounts and expiry. It omits the raw native signature. CostComparison distinguishes gross amount, estimated charges, estimated net, rankingBasis, economicComparison and any indicative benchmark. ExecutionEvidence, when available, records actual transaction hash, chainId, blockNumber/blockHash, confirmation count/policy, decoded native fill and both token movements. Nullable fields mean unknown, never zero or success.

The schema is separate from the homepage's illustrative receipt. It does not turn a mock receipt into production evidence. A canonical integrity digest, if implemented, detects record changes; it is not independent timestamping, proof of complete quote capture or a best-execution certificate.

For confirmed status, match the trusted proxy, native orderHash, maker/taker, token addresses and filled base-unit amounts; validate the native fill and supported-token movements under the agreed chain policy. Reorgs invalidate earlier finality assumptions and require a new receipt revision. See the [full evidence specification](07-evidence.md).

## Failure and recovery matrix

| Scenario | Required behavior |
| --- | --- |
| Repeated request / lost HTTP response | Same correlation resolves to the original trade; no duplicate auction |
| Changed amount under same ID | 409; a deliberate new version only after prior exposure is resolved |
| Maker unavailable | Explicit decline/timeout; no fabricated or stale fallback |
| Portal exit / wallet rejection | No submitted state; offer expires or is safely closed |
| Wrong chain / spender / executor | Block approval and report the precise configured mismatch |
| Balance or allowance changes | Fail preflight; refresh review, not the selected amount |
| Expiry during wallet review | Revalidate; obtain a new quote only through the safe lease lifecycle |
| Pending transaction and lost terminal connection | Poll canonical state and reconcile chain; never retry a new economic trade automatically |
| Maker cancellation / signer revocation | Observe protocol state; disable affected preparation and reconcile submissions |
| Reorg or replacement | Retain lineage, revise evidence and restore the correct pending state |
| Terminal bot Stop | Treat according to the agreed RFQ state; do not reuse exchange-bot cancellation semantics |

A terminal may support partial fills, scheduled exchange orders and different stop behavior across bot types. Confirm those semantics for the actual partner. This pilot is a human-approved full-fill RFQ; TWAP/VWAP, futures positions and bot cancellation rules must not be translated automatically.

## Recovery agreement

Freeze the polling floor, replay window, retention, authoritative clock, quote review headroom, confirmation policy and incident contacts in the environment sheet. Define who can stop new requests, revoke a machine credential, cancel maker exposure and reconcile the chain. A software stop does not erase signed exposure or pending transactions.

Use the [pilot acceptance matrix](01-pilot-scope.md#acceptance-and-evidence) to record actual case results, defects, owners and rerun evidence. Unknown outcomes remain unresolved until reconciled.
