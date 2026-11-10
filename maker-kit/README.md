# OTConChain local integration kit — 1.0.0-draft

A runnable quote-service and auction conformance fixture. No real inventory, wallet connection, public-chain RPC or broadcast. The native fields match the pinned 0x source; this local code has no inherited audit.

## Run

Node 22+ is required. Inside this extracted folder:

```sh
npm install
npm test
LOCAL_MAKER_TOKEN=choose-a-local-test-token npm start
```

The emulator binds only to 127.0.0.1:4190. Send HTTPS in an actual external sandbox; this loopback-only HTTP service is a teaching fixture. No private trading key is accepted. Each process creates an unfunded disposable signer.

## Materials

- docs/maker-adapter.openapi.json: proposed adapter with offchain auction envelope.
- docs/examples.json: real native signature over mock-address teaching terms; historical expiry.
- docs/environment.json: fillable public configuration, never a place for credentials.
- src/maker.mjs: authenticated, timestamp-bounded and idempotent local reference endpoint.
- src/protocol.mjs: native signing, signature/term checks, full-fill calldata and local reconciliation primitives.
- src/auction.mjs: net ranking, exact-size/cut-off/headroom checks and supersession evidence.
- test/conformance.test.mjs: HTTP, signature, calldata and multi-maker selection cases.

Only firm and independently validated responses enter ranking. The validated flag is an input from signature/chain validation, not a cryptographic check by the ranking function. The kit generates calldata but never sends it. Local conformance is not an actual maker connection or deployment verification.

A production coordinator needs persistent idempotency/exposure, tenant access control, chain-state simulation, wallet authority, cancellation, finality/reorg handling and monitoring. This emulator intentionally does not supply that service. Native quotes do not escrow inventory or enforce auction cut-off/ranking.

Pinned reference: 0xProject/protocol commit 2c8e51e36ccbafa39f7c9003f4087710665acb02. Preserve UPSTREAM-LICENSE (Apache-2.0); ethers 6.15.0 is MIT. OTConChain workflow glue is separate from upstream audit scope. External connection requires a jointly approved environment, authentication and test packet.
