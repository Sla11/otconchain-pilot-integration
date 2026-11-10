import test from "node:test";
import assert from "node:assert/strict";
import { Wallet } from "ethers";
import { createMaker, defaults } from "../src/maker.mjs";
import { validateQuote, prepareFill } from "../src/protocol.mjs";
import { rankQuotes } from "../src/auction.mjs";
const token = "local-conformance-only",
  client = Wallet.createRandom().address;
const now = () => Math.floor(Date.now() / 1000);
const makeRequest = (id = "test-001") => ({
  requestId: id,
  chainId: 1337,
  sellToken: defaults.sellToken,
  buyToken: defaults.buyToken,
  sellAmount: "10000000000000000000",
  taker: client,
  executor: client,
  requestedValiditySeconds: 300,
  auction: {
    auctionId: "local-test",
    opensAt: now() - 1,
    closesAt: now() + 30,
    minimumQuoteExpiry: now() + 60,
    rulesVersion: "1.0.0-draft",
  },
});
const policy = {
  opensAt: 100,
  closesAt: 150,
  now: 151,
  headroom: 30,
  sellAmount: "10",
  minimumBuyAmount: "100",
};
const bid = (id, extra = {}) => ({
  makerId: id,
  quoteId: id,
  status: "firm",
  validated: true,
  sellAmount: "10",
  buyAmount: "120",
  feeAmount: "0",
  receivedAt: 130,
  expiry: 220,
  ...extra,
});
test("Authenticated quote service, signature and transport conformance", async (t) => {
  const maker = createMaker({ token });
  await new Promise((r) => maker.server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${maker.server.address().port}/rfqs/v1/quote`;
  const send = (q, extra = {}) =>
    fetch(base, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-Request-Timestamp": String(now()),
        "Idempotency-Key": q.requestId,
        ...extra,
      },
      body: JSON.stringify(q),
    });
  try {
    const q = makeRequest();
    let firm;
    await t.test("firm native signature verifies", async () => {
      const r = await send(q);
      assert.equal(r.status, 200);
      firm = await r.json();
      assert.equal(firm.status, "firm");
      const result = validateQuote(
        { ...firm, mode: "sandbox" },
        {
          ...defaults,
          maker: maker.signer,
          taker: client,
          executor: client,
          sellAmount: q.sellAmount,
          minBuyAmount: "29900000000",
          now: now(),
          minHeadroomSeconds: 30,
          maxValiditySeconds: 600,
        },
      );
      assert.ok(result.orderHash);
    });
    await t.test("identical retry returns identical quote", async () =>
      assert.deepEqual(await (await send(q)).json(), firm),
    );
    await t.test("changed duplicate returns 409", async () =>
      assert.equal((await send({ ...q, sellAmount: "11" })).status, 409),
    );
    await t.test("wrong authentication returns 401", async () =>
      assert.equal(
        (await send(makeRequest("bad-auth"), { Authorization: "Bearer wrong" }))
          .status,
        401,
      ),
    );
    await t.test("expired request timestamp returns 400", async () =>
      assert.equal(
        (await send(makeRequest("bad-time"), { "X-Request-Timestamp": "1" }))
          .status,
        400,
      ),
    );
    await t.test("closed auction is rejected", async () => {
      const r = makeRequest("closed");
      r.auction.closesAt = now() - 1;
      assert.equal((await send(r)).status, 400);
    });
    await t.test("wrong chain is rejected", async () =>
      assert.equal(
        (await send({ ...makeRequest("chain"), chainId: 1 })).status,
        400,
      ),
    );
    await t.test("zero sell amount is rejected", async () =>
      assert.equal(
        (await send({ ...makeRequest("zero"), sellAmount: "0" })).status,
        400,
      ),
    );
    await t.test("insufficient quote validity is rejected", async () =>
      assert.equal(
        (await send({ ...makeRequest("short"), requestedValiditySeconds: 30 }))
          .status,
        400,
      ),
    );
    await t.test(
      "calldata requests exact amount, zero value and no broadcast",
      () => {
        const p = {
          ...defaults,
          maker: maker.signer,
          taker: client,
          executor: client,
          sellAmount: q.sellAmount,
          minBuyAmount: "29900000000",
          now: now(),
          minHeadroomSeconds: 30,
          maxValiditySeconds: 600,
        };
        const tx = prepareFill({ ...firm, mode: "sandbox" }, p);
        assert.ok(tx.data.startsWith("0x438cdfc5"));
        assert.equal(tx.value, "0");
        assert.equal(tx.broadcastEnabled, false);
      },
    );
    await t.test("altered quote fails verification", () => {
      assert.throws(() =>
        validateQuote(
          {
            ...firm,
            mode: "sandbox",
            order: { ...firm.order, makerAmount: "31000000000" },
          },
          {
            ...defaults,
            maker: maker.signer,
            taker: client,
            executor: client,
            sellAmount: q.sellAmount,
            minBuyAmount: "29900000000",
            now: now(),
            minHeadroomSeconds: 30,
            maxValiditySeconds: 600,
          },
        ),
      );
    });
  } finally {
    await new Promise((r) => maker.server.close(r));
  }
});
test("Auction net ranking uses BigInt and deterministic ties", () => {
  const r = rankQuotes(
    [bid("b"), bid("a"), bid("c", { buyAmount: "125", feeAmount: "10" })],
    policy,
  );
  assert.deepEqual(
    r.ranked.map((x) => x.quoteId),
    ["a", "b", "c"],
  );
  assert.equal(r.competitive, true);
});
test("Late, expired, indicative, invalid and too-small quotes cannot win", () => {
  const r = rankQuotes(
    [
      bid("late", { receivedAt: 151 }),
      bid("expired", { expiry: 181 }),
      bid("indicative", { status: "indicative" }),
      bid("invalid", { validated: false }),
      bid("small", { buyAmount: "99" }),
    ],
    policy,
  );
  assert.equal(r.ranked.length, 0);
  assert.equal(r.rejected.length, 5);
});
test("Replacing a response preserves superseded quote evidence", () => {
  const r = rankQuotes(
    [
      bid("desk", { quoteId: "old" }),
      bid("desk", { quoteId: "new", receivedAt: 140, buyAmount: "121" }),
    ],
    policy,
  );
  assert.equal(r.ranked[0].quoteId, "new");
  assert.equal(r.rejected[0].reason, "Superseded response");
});
test("One eligible maker is labeled noncompetitive", () =>
  assert.equal(rankQuotes([bid("a")], policy).competitive, false));

test("Comparison is unavailable before the auction cut-off", () =>
  assert.throws(
    () => rankQuotes([bid("a")], { ...policy, now: 149 }),
    /cut-off/,
  ));
