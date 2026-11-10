# Connect a terminal to the private RFQ workflow.

Pilot contract 0.1.0-draft · Proposed integration, not a hosted service. A terminal partner originates a request and follows its outcome. The maker desk prices and signs it. These are separate roles even when the same company operates both.

For the combined liquidity-desk and trading-terminal scope, start with the [pilot brief](01-pilot-scope.md). The existing [maker API](04-maker-api.md) remains the OTConChain-to-maker interface. This guide defines the opposite side: a partner application calling OTConChain.

## First integration: authenticated handoff

```mermaid
sequenceDiagram
    autonumber
    actor Client as Institution
    participant Terminal as Terminal backend
    participant API as OTConChain coordinator
    participant Desk as Maker service
    participant Portal as Client portal
    participant Chain as Test-chain proxy
    Client->>Terminal: Approved pair, exact amount, minimum
    Terminal->>API: POST request (scoped identity + idempotency)
    API->>Desk: Exact RFQ and auction deadline
    Desk-->>API: Firm signed order / indicative / decline
    Terminal->>API: POST handoff for the same request
    API-->>Terminal: Short-lived one-use POST ticket
    Terminal->>Portal: Top-level form POST
    Client->>Portal: Sign in; verify organization and EOA
    Portal->>API: Select eligible offer; acquire disclosure lease
    API-->>Portal: Validated and simulated full-fill transaction
    Client->>Chain: Approve exact spender; authorize fill
    API->>Chain: Observe fill, transfers and confirmations
    Terminal->>API: Poll canonical status and receipt
    API-->>Terminal: Versioned selected-trade evidence
```

1. An enrolled institution selects an approved pair and amount in the partner terminal.
2. The partner backend creates an exact-size pilot request using its scoped credential and pre-agreed organization/workspace mapping.
3. OTConChain freezes the terms and asks the approved maker service for a quote.
4. The partner opens the OTConChain portal through a short-lived handoff. The client signs in to its own authorized organization.
5. The client reviews offers, selects one and approves the exact transaction from its EOA. The partner API cannot authorize a trade.
6. OTConChain observes and reconciles the result. The partner polls status and, when authorized, retrieves the selected-trade receipt.

The terminal can display progress without receiving executable orders or losing-maker signatures. Fully embedded selection, wallet execution, agents, hedging and algo routing require a later version and separate acceptance.

## Roles and authority

| Role | Responsibility | Authority retained |
| --- | --- | --- |
| Institution | Mandate, eligible makers, minimum proceeds and explicit selection | Organization access, wallet, allowance and final transaction approval |
| Partner terminal | Correct request entry, authorized handoff and permitted status display | Its interface and project membership; no implied wallet authority |
| Maker desk | Firm/indicative/declined response, signer authority, inventory and exposure | Pricing, inventory keys, allowance and native cancellation |
| OTConChain | Authorization, transport, validation, selection control, preparation and evidence | Its private workflow and records; no client or maker trading keys |
| Agreed test deployment | Native signature/condition checks and atomic token effects | Protocol rules and external administration |

A partner API credential is not a maker-signing credential, client approval or on-chain permission. Terminal administrator/editor roles do not automatically become OTConChain approvers. Freeze the identity mapping and approval owners at kickoff.

## Account and asset mapping

Register partnerId, workspaceId and authorized clientOrganizationId before requests are enabled. The server derives the permitted mappings from the credential; it must not trust an arbitrary organization ID in a payload. Verify the client user belongs to that organization and controls or is authorized for the exact client wallet before displaying or authorizing the request.

Use chainId, token addresses, decimals and integer base-unit amounts. Display names are labels: ETH is not automatically WETH, and an exchange account balance is not a balance in the client's EVM wallet. Futures positions, margin collateral and deposits inside an exchange or derivatives venue are outside the initial settlement account.

The initial mode is direct EOA: taker and executor equal the client's EOA, the receiving wallet is the same EOA, and transaction value is zero. Both parties separately approve the verified proxy. A session or wallet-ownership proof is authentication, not a new OTConChain settlement-intent signature. See [settlement controls](05-settlement.md) for exact native semantics.

## Partner and maker isolation

Provision separate terminal and desk credentials, service identities and audit trails. A terminal request may name only previously approved maker IDs. A maker credential sees its own RFQ and response; it cannot list institutional requests or competitors' offers.

For the first Desk & Terminal Pilot phase, label the offer single-maker and disclose the terminal/desk affiliation to the client. A single provider does not establish competitive best execution. Adding independent makers requires client consent, an agreed disclosure policy and tested access isolation. Do not expose competing bids through shared desk credentials, logs, analytics or support access. The handoff profile keeps losing bids and signatures inside OTConChain; it does not claim cryptographic secrecy from authorized operators.

## Handoff security and return

The proposed [partner API](03-partner-api.md) creates a one-use ticket bound to request, partner, workspace, organization and a fixed return-target identifier. Default proposal: 60-second ticket lifetime, independent of quote expiry; agree the actual value in configuration.

Send the ticket in a top-level form POST to the configured OTConChain portal origin. Do not put tickets, API keys, private RFQ terms or signatures in query strings, browser storage, analytics or application logs. The receiving service verifies ticket and allowed Origin, consumes the ticket atomically, establishes a pending handoff session and redirects to its own portal. No confidential terms appear until the client completes OTConChain sign-in and organization/wallet checks. An expired or reused ticket returns 410; request a new handoff, not a new trade.

Only configured return targets are allowed. The return navigation is informational; it does not prove a fill. The partner backend reads the canonical status and receipt through authenticated polling. A resource ID alone never grants access. Define CSRF protection, secure HttpOnly session cookies, retention and redacted logging in the implemented portal before acceptance.

## Information exchanged

The partner request carries trade terms, organization/workspace identifiers, client wallet and approved maker IDs. It does not carry exchange secrets, private keys, internal mandate documents or a delegated trading key. Status contains lifecycle information and counts; the receipt contains the selected trade only. The selected maker's raw signature and all losing signatures are excluded from the partner status and receipt contract.

Agree client onboarding, eligibility decisions, incident ownership, consent, retention, referral attribution and any software invoice before the pilot. No public partnership announcement, exclusivity, fee rate or revenue share is established by these documents.

## Confirm with the terminal team

Confirm the terminal team can add a handoff entry point, make authenticated backend calls, associate the right organization/account and poll an external lifecycle. Verify its wallet and connector capabilities directly. The first pilot does not depend on a particular scripting runtime, external HTTP access from bots or automated execution.
