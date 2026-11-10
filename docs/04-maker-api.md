# A small interface. Exact terms.

The maker adapter is a proposed server-to-server contract, version 1.0.0-draft. It is not a deployed platform endpoint. OTConChain calls an agreed maker-owned quote service; client workflow endpoints and the onboarding application are separate interfaces.

Terminal software calling OTConChain uses the separate [partner handoff API](03-partner-api.md), version 0.1.0-draft. It creates scoped pilot requests and retrieves status/receipts; it cannot sign, select or broadcast a client trade.

## Download the contract

See the [maker contract](../contracts/maker-adapter.openapi.json), [signed examples](../examples/maker.json), [environment template](../config/maker-environment.example.json) and [runnable kit](../maker-kit/README.md).

The schema and examples in this site are generated together. The example native quote uses a disposable local signer, chain 1337 and mock addresses; its fixed historical deadline is not executable now. The downloadable kit generates fresh local fixtures.

## POST /rfqs/v1/quote

HTTPS, scoped server-side bearer authentication. Send Idempotency-Key equal to requestId and X-Request-Timestamp as Unix seconds. The proposed replay window is 60 seconds; repeated identical requests return the same result within the agreed retention window. Reusing an ID with changed terms returns 409. A late retry cannot extend auction close.

| Request field | Type | Validation |
| --- | --- | --- |
| requestId | string | Unique, bounded identifier; unchanged on retry |
| chainId | safe integer | Exact configured sandbox chain |
| sellToken / buyToken | address | Distinct approved 20-byte addresses |
| sellAmount | decimal string | Positive base-unit uint128 |
| taker / executor | address | Client wallet / actual external EOA |
| requestedValiditySeconds | safe integer | Requested window; actual signed expiry governs |
| auction | object | auctionId, opensAt, closesAt, minimumQuoteExpiry, rulesVersion |

Auction timestamps are safe integer Unix seconds. A maker must return before closesAt and sign an expiry exceeding the configured acceptance headroom. Native expiry remains a uint64 decimal string in this JSON profile. Application IDs and timing metadata are not added to the EIP-712 order.

## Response examples

Concrete request, firm-response and decline payloads are in [maker examples](../examples/maker.json), alongside the [OpenAPI schemas](../contracts/maker-adapter.openapi.json).

Firm response: requestId, quoteId, status=firm, domain, order and signature. Non-executable response: requestId, status=indicative or declined, reason and optional indicativeBuyAmount. Zero/overflowing amounts, mismatched terms and unsupported signature types are invalid.

## Native signed fields

| Field | Solidity type | Meaning |
| --- | --- | --- |
| makerToken | address | Token delivered by the maker |
| takerToken | address | Token sold by the client |
| makerAmount | uint128 | Exact offered output |
| takerAmount | uint128 | Exact client sell amount |
| maker | address | Inventory owner |
| taker | address | Permitted native caller |
| txOrigin | address | External executor restriction |
| pool | bytes32 | Zero bytes32 in the initial profile |
| expiry | uint64 | Unix-second deadline |
| salt | uint256 | Distinct order issuance value |

Preserve this order and these Solidity types in the EIP-712 type definition. makerAmount, takerAmount, expiry and salt are canonical unsigned decimal strings in our JSON profile. Do not use floating-point numbers for token amounts.

Domain: name=ZeroEx, version=1.0.0, configured chainId and verifyingContract=verified ExchangeProxy. Signature tuple: signatureType=2, v=27 or 28, r and s as bytes32. Recover the EOA and check its maker authorization. Zero txOrigin is not a wildcard in the pinned implementation.

## Errors and idempotency

400 invalid terms; 401/403 invalid credentials/authorization; 409 changed request under the same ID; 429 rate limit; 503 unavailable. Specify the server timeout, retry backoff, retention window, limits and credential rotation in the environment agreement. Never return indicative data under a firm status or turn an upstream failure into a fictional quote.

## Versioning

The earlier maker draft was 0.1.0. This generalized 1.0.0-draft adds an explicit auction envelope and transport profile while preserving native order semantics. It requires agreement before connecting an external desk. Breaking application changes require a new contract version; native signing changes require independent protocol review.
