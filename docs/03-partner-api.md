# Partner API and handoff contract.

Version 0.1.0-draft · Documentation proposal only. The `.invalid` server and mock-address examples are intentionally non-executable. The authenticated coordinator, ticket exchange, client portal and receipt service must be implemented and jointly accepted before connection. The website's mock trades and application intake do not implement this API.

See the [partner contract](../contracts/partner.openapi.json), [partner fixtures](../examples/partner.json), [environment template](../config/pilot-environment.example.json), [acceptance matrix](../acceptance/matrix.json) and [dry-run client](../clients/partner-client.mjs). The [maker kit](../maker-kit/README.md) is included as source.

## Two interfaces, two directions

| Interface | Caller | Service owner | Purpose |
| --- | --- | --- | --- |
| Maker adapter 1.0.0-draft | OTConChain | Maker desk | Exact RFQ → native signed quote, indicative or decline |
| Partner handoff 0.1.0-draft | Terminal backend | OTConChain | Request → client portal handoff → status and evidence |

Native order/domain/signature types remain unchanged. The partner interface intentionally has no endpoint for a terminal credential to select a quote, acquire executable calldata, approve, sign or broadcast. Those actions stay inside the authenticated client portal for the first pilot.

## Transport, authentication and identity

Use HTTPS and server-side scoped bearer credentials, separate by environment and role. No credential belongs in browser code. Provision partnerId and the permitted workspace/organization mappings out of band. Requested scope is not self-granted; every resource is checked against that mapping. Unauthorized cross-organization access returns 404 without disclosing whether the resource exists.

Every POST requires Idempotency-Key and X-Request-Timestamp (integer Unix seconds, proposed replay tolerance 60 seconds). Retain idempotency results for at least the agreed workflow recovery period; 24 hours is the proposal, not an operating SLA. Identical retries return the original operation/result. Changed content under the same key returns 409. A repeat handoff POST with the same key never mints another ticket; after expiry, use a fresh operation key for a new ticket on the same request.

Use clientRequestId as a stable partner correlation ID. Uniqueness is scoped to partner/workspace. Identical creation retries must resolve to the same request; changed terms under that correlation ID return 409 even if the HTTP operation key changes. Rate-limit and replay failures never create a partial request. Authentication secrets and rotation are delivered through the agreed secure channel.

Scope HTTP idempotency to credential identity plus operation method/path. For handoffs, store the redemption hash and retain any encrypted replay response only until ticket expiry. An expired operation replay returns 410; it never issues a new secret under the old key. Retain only the redacted operation record after expiry. Fetch capabilities and confirm the agreed contract version before creating requests.

## Operations

| Method and path | Scope | Result |
| --- | --- | --- |
| GET /v1/pilot/capabilities | capabilities:read | Approved modes, chains/assets, wallet policy, limits and configured rule version |
| POST /v1/pilot/requests | requests:write | 201 new request; 200 identical replay; freezes terms and starts the quote workflow |
| GET /v1/pilot/requests/{requestId} | requests:read | Canonical auction/execution state, version, deadlines, response counts and terminal display guidance |
| POST /v1/pilot/requests/{requestId}/handoffs | handoffs:write | One-use form POST envelope for the client portal; no trading permission |
| GET /v1/pilot/requests/{requestId}/events | requests:read | Ordered lifecycle events with afterSequence/limit cursors |
| POST /v1/pilot/requests/{requestId}/cancel | requests:write | Application cancellation before executable disclosure; otherwise 409 and reconciliation guidance |
| GET /v1/pilot/requests/{requestId}/receipt | receipts:read | Versioned selected-trade record, including pending or failed status when applicable |

Creating a request does not authorize execution. A sandbox request permits only the agreed test assets and manual wallet flow. Shadow mode never releases an executable envelope, asks for a trade approval or broadcasts a transaction. Neither mode authorizes real-asset trading.

## Request fields and immutable terms

Required fields: clientRequestId, workspaceId, clientOrganizationId, mode, chainId, sellToken, buyToken, sellAmount, minimumNetBuyAmount, clientWallet, permittedMakerIds and returnTargetId. Addresses and integer base-unit amounts are strings; chainId is a safe integer. Mode is sandbox or shadow. Native ETH, split fills, delegated execution and futures are outside this profile.

The server checks token addresses/decimals, range, pair, limits, wallet mapping and maker permissions against capabilities. It derives authoritative opensAt, closesAt and minimumQuoteExpiry, with opensAt < closesAt < minimumQuoteExpiry. Quote validity and human execution headroom come from the signed environment. Changing exact terms creates a new request after the old workflow has been safely resolved; an HTTP retry cannot amend an auction or extend expiry.

This first pilot contract permits one maker ID per request. An independent multi-maker phase needs a separately approved scope and compatible contract revision. Creation commits the request durably before returning 201; quote collection runs against that committed resource. A receipt returns 404 until the canonical status reports receiptAvailable=true.

The client minimum stays within the authorized workflow and is not silently added to the maker RFQ payload. Costs and ranking follow the agreed [lifecycle and reporting profile](06-lifecycle-and-recovery.md). Unknown costs must remain unknown; do not report gross output as verified net proceeds.

## Client portal exchange

The handoff response contains handoffId, expiresAt, actionUrl, method=POST and fields.ticket. It is sensitive and must use Cache-Control: no-store. The browser submits only to the allowlisted portal origin. The one-use ticket is not an API bearer token or wallet authorization.

The portal validates and consumes the ticket, binds the pending request to a secure session and redirects within its own origin. Client sign-in, organization access and wallet policy are enforced before quote disclosure. Quote selection creates an exclusive executable-disclosure lease. The client reviews the exact native order and transaction; OTConChain revalidates and simulates before allowance and full-fill authorization. No second selected quote may be disclosed until the previous lease has expired safely, filled or been effectively cancelled and reconciled.

The return target is a configured identifier, not a caller-supplied arbitrary URL. The client may reject every offer or leave the portal. Returning to the terminal changes no trade state by itself.

## Polling and recovery

Start with authenticated polling; webhooks, WebSockets and their signing schemes are outside this draft. Capabilities supplies the actual minimum polling interval. The proposal is a 2-second floor, to be agreed rather than assumed as capacity.

Status has a monotonically increasing per-request version. Events have eventId, per-request sequence, occurredAt, requestId, type, auctionState, executionState and requestVersion. Delivery may repeat events: deduplicate by eventId and process by sequence. A stale version never overwrites newer state. Persist the cursor; if retained events have expired, 410 requires a canonical GET and fresh cursor. A disconnected client never infers failure from silence.

Receipt versions can change after replacements or reorgs. The partner refreshes the canonical record and labels earlier versions superseded. See [receipt and state semantics](06-lifecycle-and-recovery.md).

## Errors

| HTTP | Meaning | Required handling |
| --- | --- | --- |
| 400 | Invalid or unsupported terms | Correct input; do not substitute assets or amount |
| 401 / 403 | Credential or scope failure | Stop; contact the integration owner |
| 404 | Missing or inaccessible resource | Reveal no cross-organization data |
| 409 | Changed replay, unsafe cancellation or incompatible state | Retrieve canonical state; resolve the active workflow |
| 410 | Expired handoff or event cursor | Renew handoff for the same request, or resync status respectively |
| 429 | Agreed limit exceeded | Honor Retry-After and the existing auction deadline |
| 503 | Service unavailable | Bounded backoff, then resolve by original correlation ID |

Errors include code, message, retryable and correlationId; never expose secrets, signed losing offers or internal stack traces. HTTP request acceptance, client selection and chain confirmation are separate facts.

## Conformance and versioning

The downloadable JSON examples validate against the OpenAPI schemas. Their mock addresses and historical timestamps are fixtures, not real maker prices, an available deployment or active tickets. The reference client defaults to dry-run and performs no HTTP calls. Its opt-in send mode requires the jointly configured sandbox and server credential; it never signs or sends a chain transaction.

The packet also includes the unchanged maker specification, signed teaching fixtures and links to the runnable maker kit. The partner packet supplies contracts and a client scaffold, not a server implementation. Breaking changes require a new pilot contract version and joint test evidence before rollout.
