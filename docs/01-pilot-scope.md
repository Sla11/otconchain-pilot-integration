# Desk & terminal pilot.

Proposal for joint review · 28 October 2026 · Pilot packet 0.1.0-draft. This scope combines the liquidity desk and trading terminal as two roles within the same partner organization. It is not an announcement of an agreed partnership, an existing connector or permission to trade.

## Objective and initial boundary

Test whether a request originating in a trading terminal can obtain a genuine maker sandbox response, receive an explicit client decision and produce a reconciled record through OTConChain. The first phase is a single-maker workflow. It does not demonstrate competitive best execution.

| Item | Proposed pilot |
| --- | --- |
| Entry point | Trading-terminal request action with authenticated handoff to OTConChain |
| Desk | Maker-owned pricing/signing service; separate desk identity and credential |
| Institution | One enrolled test organization and an authorized direct EOA |
| Assets | One mutually approved standard ERC-20 pair, e.g. mock WETH / mock USDC |
| Environment | One agreed EVM test chain and verified test proxy; configuration is initially unfilled |
| Execution | Full requested fill, zero native transaction value, client wallet approval |
| Modes | Joint sandbox with test assets; shadow requests with execution disabled |
| Commercial scope | Effort, IP, client attribution, support and invoicing agreed before work |
| Excluded | Real-asset activation, Safe/custody, delegated keys, automated bots, partial allocation, cross-chain execution and new fee contracts |

The older Sepolia MVP uses a different custom settlement flow. Its link is not evidence of a ready native RFQ sandbox. Use the approved native environment sheet, not recovered public settings or placeholder addresses.

## Read and download in order

1. [Terminal and platform partners](02-architecture-and-authority.md): roles, authority, affiliation and authenticated handoff.
2. [Partner API](03-partner-api.md): exact caller/service direction, scopes, schemas, operation semantics and recovery.
3. [Lifecycle and evidence](06-lifecycle-and-recovery.md): disclosure lease, expiry, cancellation, receipts and finality.
4. [Maker guide](https://otconchain.exchange/docs/market-makers) and [native maker API](04-maker-api.md): desk response, signing and inventory.
5. [Settlement](05-settlement.md) and [readiness](10-readiness.md): protocol checks and connection-day controls.

See the [partner contract](../contracts/partner.openapi.json), [partner fixtures](../examples/partner.json), [environment template](../config/pilot-environment.example.json), [acceptance matrix](../acceptance/matrix.json) and [dry-run client](../clients/partner-client.mjs). The [maker kit](../maker-kit/README.md) is included as source.

The partner packet contains the proposed OpenAPI, linked JSON fixtures, unfilled environment sheet, acceptance matrix, a dry-run client scaffold, the native maker contract, these pilot guides and the runnable maker-kit ZIP. Extract the maker kit separately to exercise its local HTTP/signature/calldata fixtures. Neither package supplies genuine maker inventory, a hosted coordinator or the partner terminal’s connector.

## Work split and deliverables

| Owner | Before the connection session | Required evidence |
| --- | --- | --- |
| OTConChain | Implement the proposed authenticated request/status/handoff/receipt service, portal organization/wallet checks, maker transport, durable leases and chain reconciliation | Release/config pins, accessible agreed sandbox, test report, request-to-receipt trace and stop/recovery runbook |
| Liquidity desk | Confirm the maker adapter, approved pair/limits, signer authority, test inventory/allowance and outstanding-exposure policy | Real sandbox response from their service, public wallet/signer addresses, authorization evidence and failure-case results |
| Trading terminal | Confirm the request entry point, server integration, project-to-organization mapping, handoff POST and status polling | Working client path, correct account/context, no leaked credentials and authenticated return/status recovery |
| Institution / authorized tester | Consent to participation/data access, nominate approver and fund only the agreed test wallet/assets/gas | Approved mandate, verified wallet policy and explicit user decisions |
| Joint technical and operational owners | Agree configuration, data visibility, affiliation disclosure, support and acceptance criteria | Signed/versioned scope and completed acceptance record; no secret material in the packet |

The contracting entity, desk authority, terminal operator, named owners and actual interface availability must be confirmed at kickoff. The partner must confirm its connector and wallet capabilities directly. A terminal’s existing exchange connections do not establish an OTConChain integration. A scripting runtime is not a prerequisite for this first phase.

## Readiness gates

| Gate | Exit condition | Current evidence |
| --- | --- | --- |
| Design agreement | Roles, one chain/pair, EOA mode, boundaries, disclosures, limits and contracts approved | This documentation is a proposal; partner review outstanding |
| Local conformance | Maker kit runs; native signatures/calldata and draft partner fixtures validate | Local artifacts are available; not desk connectivity |
| Joint sandbox | Both real service endpoints plus test wallets/deployment pass the agreed matrix | Hosted coordinator, terminal connector and genuine desk acceptance remain to be established |
| Shadow evaluation | Consenting participants complete realistic RFQs with execution disabled | Requires agreed participants, samples and data access |
| Next-stage decision | Review results, defects, effort and commercial fit | No automatic live activation; a real-asset phase needs a separate signed scope |

Manual entry can support discovery only when clearly labeled manual. Do not count an emulator as a real maker integration, or a prepared transaction as a settled trade.

## Environment and operational agreement

Fill the downloadable sheet with chain/RPC owner, proxy and source/deployment evidence, token addresses/decimals, test limits, maker inventory/signer, taker/executor, approved origins/return targets, base URLs, scopes, time windows, polling/rate limits, event/idempotency retention and finality policy. Empty fields are undecided; never production defaults.

Exchange all credentials through the agreed secure channel. Each side retains private keys. Record separate desk and terminal service identities even within the same partner company. Agree whose team handles client eligibility, incidents, data retention/export and customer communication. No funding or revenue-share terms are implied by an API credential.

## Connection-day sequence

1. Compare deployed release, contract versions and the completed environment record. Reject placeholders and unapproved assets.
2. Run the maker kit locally; then verify the actual maker sandbox transport, signer authorization, balance, allowance and requested validity.
3. Create one request from the real terminal integration path. Retry it identically and confirm the same request/correlation ID.
4. Exchange the handoff; ensure client authentication and wallet checks occur before confidential disclosure. Verify wrong-organization and expired-ticket rejection.
5. Receive and validate a fresh firm response. The client explicitly selects, reviews spender/amount/deadline and authorizes the exact native full-fill call after simulation.
6. Observe the test-chain transaction. Match native fill and both transfers, then apply the agreed confirmation policy. Retrieve the same linked evidence from the partner API.
7. Run every negative/recovery case below. Stop new requests if exposure or execution outcome is unresolved.
8. Record case IDs, evidence, defects, owners and rerun results. Both technical owners approve the sandbox outcome before any stage change.

## Acceptance and evidence

The downloadable matrix assigns stable case IDs and expected results. Proposed minimum coverage:

| Group | Cases |
| --- | --- |
| Transport and isolation | Valid credentials, wrong scope, cross-organization access, secret redaction, rate limit and replay rejection |
| Request integrity | Identical replay, changed correlation/body conflict, wrong pair/decimals/chain, size limit and repeated handoff |
| Maker responses | Genuine firm success, indicative, decline, timeout, late quote, expiry, wrong native domain/executor and signer revocation |
| Client control | Wrong organization/wallet, wallet rejection, stale preparation, exactly one disclosure and forbidden cancellation after disclosure |
| Execution | Insufficient balance/allowance, exact full fill, revert, duplicate submission handling, pending transaction and replacement |
| Evidence and recovery | Correct fill/transfers, no synthetic confirmed receipt, finality, reorg revision, dropped event cursor and terminal reconnect |
| Shadow boundary | No executable payload, trade approval or transaction in shadow mode |
| Affiliation and competition | Single-maker disclosure; independent-maker stage blocked until separate consent and access-isolation tests |

Proposed evaluation sample: at least 20 replay/shadow requests across agreed size bands, with mode/source recorded; calibrate this target jointly. Measure actual quote/decline latency, workflow completion, desk effort, error/recovery quality and participant willingness to continue. Do not promise a response SLA or carry the earlier proposal's savings targets into acceptance as established facts. A modeled price or TWAP comparison is not realized savings.

## CTO decisions before implementation

Confirm the terminal extension/handoff mechanism; actual desk API and signer/inventory model; how the correct organization and EOA are verified; single-maker disclosure and any future bid visibility; configuration and retention values; test/deployment evidence; and named incident/acceptance owners. No one needs to transfer a private key to answer these questions.

A CTO can use the packet to agree and implement this scoped pilot. Starting the joint run still requires the working services, configured wallets/deployment and recorded acceptance gates above.

## Reference basis

Use the maintained [maker API](04-maker-api.md), [settlement guide](05-settlement.md) and [evidence guide](07-evidence.md) for native signing and execution rules. Desk & Terminal Pilot is a general integration pattern. Validate the actual partner’s terminal extension, wallet flow, quoting service, affiliation and operating responsibilities before accepting this scope.
