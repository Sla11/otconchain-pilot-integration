# Prepare once. Connect with a clear packet.

The first joint milestone is one genuine maker sandbox quote that passes policy checks, executes in the agreed test environment and produces matching evidence. A local emulator cannot establish an external desk’s prices, signing authority or operational consent.

## Check your preparation

**Maker desk**

- [ ] Approved pair, chain, limits and quoting hours.
- [ ] Real quote endpoint and separate scoped service credential.
- [ ] Verified public inventory/signer addresses and authority.
- [ ] Test balance, allowance, validity and exposure/cancellation policy.

**Institution and terminal**

- [ ] Enrolled organization, permitted workspace and direct EOA.
- [ ] Exact token addresses/decimals, size and minimum-net policy.
- [ ] Explicit approval owner, handoff/return targets and recovery display.
- [ ] Agreed consent, affiliation, retention and incident owners.

Use the [delivery roadmap](08-delivery-roadmap.md) and [connection checklist](09-connection-and-acceptance.md) with the [fillable environment](../config/pilot-environment.example.json).

## What OTConChain must prepare

| Deliverable | Connection criterion |
| --- | --- |
| Versioned adapter and emulator | Firm, indicative, decline, timeout, expiry and replay cases |
| Client portal | Exact maker, tokens, amounts, deadline and spender before authorization |
| Validation and simulation | Reject changed terms; simulate the exact allowlisted call |
| Access and persistence | Client/role isolation, idempotency, retained history and approval context |
| Reconciliation | Matching fill/transfers, block hash, confirmation policy and reorg recovery |
| Operational packet | Config schema, deployment evidence, test report, runbook and incident owner |

The website provides documentation, a local kit and application intake. The authenticated hosted auction coordinator, real maker adapters, live wallet execution, production trade storage and monitoring remain an operational activation milestone.

For a combined desk/terminal collaboration, use the [Desk & Terminal Pilot packet](01-pilot-scope.md). Its partner contract, environment sheet and acceptance matrix extend these checks; they do not supply the hosted service or establish partner sign-off.

## Connection-day runbook

1. Compare release/configuration: chain, tokens/decimals, proxy, maker, signer, taker, executor and rule version.
2. Test authorized transport, unauthorized rejection, decline and indicative cases.
3. Request a fresh firm quote and verify its native signature and expiry headroom.
4. Check current signer authority, inventory, allowance and outstanding exposure.
5. Simulate the full requested call, including zero native transaction value.
6. Let the authorized test wallet execute in the agreed environment.
7. Match order hash, fill and both token movements; apply the confirmation policy.
8. Exercise invalid/expired/replayed/altered/cancelled cases, review defects and decide whether to repeat.

## Minimum joint tests

Firm success; indicative response; decline; timeout; duplicate request; changed payload; late bid; expiry; wrong domain/chain/maker/taker/executor; cancellation; insufficient balances/allowances; duplicate fill; signer revocation; no eligible bids; reorg/replacement handling.

Run the relevant tests against the actual maker service and chosen chain configuration. Recorded local tests alone do not verify live deployment identity or applicable audit coverage.

## Stage progression

Local mock fixtures → joint sandbox with test assets → shadow RFQs without asset movement → separately approved limited real-asset stage. Define participant eligibility, exact limits, security requirements, operational ownership and a stop procedure before that last stage. No public-chain trade is authorized by an application submission.

## Glossary

| Term | Meaning |
| --- | --- |
| RFQ | Request for a price for exact trade terms |
| Maker / taker | Native offer signer/inventory owner / accepting client |
| EOA | Wallet controlled by a conventional signing key |
| EIP-712 | Typed structured-data signing standard |
| txOrigin | External EOA submitting the transaction in this native order path |
| Allowance | Permission for a specific spender to use a token amount |
| Atomic | Token effects in a successful call occur together or revert |
| Idempotency | Retrying the same request does not create a new independent operation |
| Reorg | Change in the accepted chain history requiring reconciliation |
| Shadow RFQ | Realistic quote workflow without asset execution |

## Questions and changes

Use [founder@otconchain.exchange](mailto:founder@otconchain.exchange) for integration questions. This reference is 1.0.0-draft, reviewed 22 October 2026. Its first generalized revision adds the auction envelope and transport profile while preserving native signed fields. Final interfaces are agreed before external connection.
