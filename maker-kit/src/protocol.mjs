import {
  Interface,
  Signature,
  TypedDataEncoder,
  getAddress,
  verifyTypedData,
  ZeroAddress,
  ZeroHash,
  keccak256,
  toUtf8Bytes,
} from "ethers";

// 0x native RFQ fields and EIP-712 domain, matching the pinned upstream source.
export const RFQ_TYPES = {
  RfqOrder: [
    { name: "makerToken", type: "address" },
    { name: "takerToken", type: "address" },
    { name: "makerAmount", type: "uint128" },
    { name: "takerAmount", type: "uint128" },
    { name: "maker", type: "address" },
    { name: "taker", type: "address" },
    { name: "txOrigin", type: "address" },
    { name: "pool", type: "bytes32" },
    { name: "expiry", type: "uint64" },
    { name: "salt", type: "uint256" },
  ],
};
export const RFQ_ABI = [
  "function fillOrKillRfqOrder((address makerToken,address takerToken,uint128 makerAmount,uint128 takerAmount,address maker,address taker,address txOrigin,bytes32 pool,uint64 expiry,uint256 salt) order,(uint8 signatureType,uint8 v,bytes32 r,bytes32 s) signature,uint128 takerTokenFillAmount) returns (uint128 makerTokenFilledAmount)",
  "function getRfqOrderHash((address makerToken,address takerToken,uint128 makerAmount,uint128 takerAmount,address maker,address taker,address txOrigin,bytes32 pool,uint64 expiry,uint256 salt) order) view returns (bytes32)",
  "function cancelRfqOrder((address makerToken,address takerToken,uint128 makerAmount,uint128 takerAmount,address maker,address taker,address txOrigin,bytes32 pool,uint64 expiry,uint256 salt) order)",
  "function registerAllowedOrderSigner(address signer,bool allowed)",
  "event RfqOrderFilled(bytes32 orderHash,address maker,address taker,address makerToken,address takerToken,uint128 takerTokenFilledAmount,uint128 makerTokenFilledAmount,bytes32 pool)",
];
export const rfqInterface = new Interface(RFQ_ABI);
export const ERC20_ABI = [
  "function approve(address spender,uint256 amount) returns (bool)",
  "function allowance(address owner,address spender) view returns (uint256)",
  "function balanceOf(address owner) view returns (uint256)",
  "event Transfer(address indexed from,address indexed to,uint256 value)",
];
export const tokenInterface = new Interface(ERC20_ABI);
const fail = (message) => {
  throw new Error(message);
};
const same = (a, b) => getAddress(a) === getAddress(b);
export function domain(chainId, verifyingContract) {
  return {
    name: "ZeroEx",
    version: "1.0.0",
    chainId,
    verifyingContract: getAddress(verifyingContract),
  };
}
export function orderHash(quote) {
  return TypedDataEncoder.hash(quote.domain, RFQ_TYPES, quote.order);
}
export async function signQuote(order, signer, chainId, verifyingContract) {
  const d = domain(chainId, verifyingContract);
  const raw = await signer.signTypedData(d, RFQ_TYPES, order);
  const s = Signature.from(raw);
  return {
    mode: "sandbox",
    domain: d,
    order,
    signature: { signatureType: 2, v: s.v, r: s.r, s: s.s },
  };
}
export function validateQuote(q, p) {
  if (!q || q.mode !== "sandbox") fail("Only sandbox quotes are accepted");
  if (q.domain.name !== "ZeroEx" || q.domain.version !== "1.0.0")
    fail("Wrong domain");
  if (Number(q.domain.chainId) !== Number(p.chainId)) fail("Wrong chain");
  if (!same(q.domain.verifyingContract, p.proxy))
    fail("Wrong settlement contract");
  const o = q.order;
  if (!same(o.maker, p.maker) || same(o.maker, ZeroAddress))
    fail("Wrong maker");
  if (!same(o.taker, p.taker) || same(o.taker, ZeroAddress))
    fail("Wrong taker");
  if (!same(o.txOrigin, p.executor) || same(o.txOrigin, ZeroAddress))
    fail("Wrong executor");
  if (!same(o.makerToken, p.buyToken) || !same(o.takerToken, p.sellToken))
    fail("Wrong token pair");
  if (same(o.makerToken, o.takerToken)) fail("Identical tokens");
  for (const [field, bits] of [
    ["makerAmount", 128],
    ["takerAmount", 128],
    ["expiry", 64],
    ["salt", 256],
  ]) {
    const n = String(o[field]);
    if (!/^(0|[1-9][0-9]*)$/.test(n)) fail("Noncanonical integer: " + field);
    if (BigInt(n) < 0n || BigInt(n) >= 1n << BigInt(bits))
      fail("Integer out of range: " + field);
  }
  if (BigInt(o.makerAmount) <= 0n || BigInt(o.takerAmount) <= 0n)
    fail("Zero amounts");
  if (BigInt(o.takerAmount) !== BigInt(p.sellAmount)) fail("Wrong sell amount");
  if (BigInt(o.makerAmount) < BigInt(p.minBuyAmount))
    fail("Below minimum output");
  if (BigInt(o.expiry) <= BigInt(p.now + p.minHeadroomSeconds))
    fail("Quote expires too soon");
  if (BigInt(o.expiry) > BigInt(p.now + p.maxValiditySeconds))
    fail("Quote validity too long");
  if (o.pool !== ZeroHash) fail("Unexpected pool");
  if (q.signature.signatureType !== 2 || ![27, 28].includes(q.signature.v))
    fail("Unsupported signature");
  const raw = Signature.from(q.signature).serialized;
  const recovered = verifyTypedData(q.domain, RFQ_TYPES, o, raw);
  const authorized = p.authorizedSigner ?? p.maker;
  if (!same(recovered, authorized)) fail("Invalid maker signature");
  return { orderHash: orderHash(q), signer: recovered };
}
export function prepareFill(q, p) {
  const v = validateQuote(q, p);
  return {
    chainId: p.chainId,
    from: getAddress(p.taker),
    to: getAddress(p.proxy),
    value: "0",
    data: rfqInterface.encodeFunctionData("fillOrKillRfqOrder", [
      q.order,
      q.signature,
      q.order.takerAmount,
    ]),
    orderHash: v.orderHash,
    mode: "sandbox",
    broadcastEnabled: false,
  };
}
export function prepareApproval(token, owner, proxy, amount) {
  return {
    from: getAddress(owner),
    to: getAddress(token),
    value: "0",
    data: tokenInterface.encodeFunctionData("approve", [proxy, amount]),
    mode: "sandbox",
    broadcastEnabled: false,
  };
}
export function canonical(value) {
  if (typeof value === "bigint") return JSON.stringify(value.toString());
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (value && typeof value === "object")
    return (
      "{" +
      Object.keys(value)
        .sort()
        .map((k) => JSON.stringify(k) + ":" + canonical(value[k]))
        .join(",") +
      "}"
    );
  return JSON.stringify(value);
}
export function reconcile(q, receipt, proxy, executionMode) {
  if (!["local-evm", "fixture"].includes(executionMode))
    fail("Unverified execution mode");
  if (Number(receipt.status) !== 1) fail("Transaction failed");
  const expected = orderHash(q),
    o = q.order;
  const fills = receipt.logs
    .filter((l) => same(l.address, proxy))
    .flatMap((l) => {
      try {
        const e = rfqInterface.parseLog(l);
        return e?.name === "RfqOrderFilled" ? [e.args] : [];
      } catch {
        return [];
      }
    });
  if (fills.length !== 1) fail("Expected exactly one RFQ fill");
  const f = fills[0];
  if (
    f.orderHash !== expected ||
    !same(f.maker, o.maker) ||
    !same(f.taker, o.taker) ||
    !same(f.makerToken, o.makerToken) ||
    !same(f.takerToken, o.takerToken) ||
    f.takerTokenFilledAmount !== BigInt(o.takerAmount) ||
    f.makerTokenFilledAmount !== BigInt(o.makerAmount)
  )
    fail("Fill does not match quote");
  const transfers = receipt.logs.flatMap((l) => {
    if (!same(l.address, o.makerToken) && !same(l.address, o.takerToken))
      return [];
    try {
      const e = tokenInterface.parseLog(l);
      return e?.name === "Transfer"
        ? [
            {
              token: l.address,
              from: e.args.from,
              to: e.args.to,
              value: e.args.value.toString(),
            },
          ]
        : [];
    } catch {
      return [];
    }
  });
  for (const t of [
    { token: o.takerToken, from: o.taker, to: o.maker, value: o.takerAmount },
    { token: o.makerToken, from: o.maker, to: o.taker, value: o.makerAmount },
  ]) {
    if (
      !transfers.some(
        (x) =>
          same(x.token, t.token) &&
          same(x.from, t.from) &&
          same(x.to, t.to) &&
          x.value === String(t.value),
      )
    )
      fail("Missing expected token transfer");
  }
  const record = {
    schemaVersion: 1,
    mode: executionMode,
    chainId: Number(q.domain.chainId),
    settlementContract: proxy,
    orderHash: expected,
    quote: q,
    transactionHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    blockHash: receipt.blockHash,
    outcome:
      executionMode === "local-evm" ? "LOCAL_EVM_SETTLED" : "SYNTHETIC_RECEIPT",
    transfers,
    finality:
      "Local sandbox only. Production confirmations and reorg handling remain unimplemented.",
  };
  return { ...record, evidenceHash: keccak256(toUtf8Bytes(canonical(record))) };
}
