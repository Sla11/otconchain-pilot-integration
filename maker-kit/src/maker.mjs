import { createServer } from "node:http";
import { pathToFileURL } from "node:url";
import { Wallet, ZeroHash } from "ethers";
import { signQuote, canonical } from "./protocol.mjs";
export const defaults = {
  proxy: "0x1111111111111111111111111111111111111111",
  sellToken: "0x2222222222222222222222222222222222222222",
  buyToken: "0x3333333333333333333333333333333333333333",
  chainId: 1337,
};
export function createMaker({
  token,
  buyAmount = "30000000000",
  signer = Wallet.createRandom(),
}) {
  if (!token) throw new Error("A local test token is required");
  const seen = new Map();
  const server = createServer(async (req, res) => {
    const reply = (status, data) => {
      res.writeHead(status, {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      });
      res.end(JSON.stringify(data));
    };
    if (req.method !== "POST" || req.url !== "/rfqs/v1/quote")
      return reply(404, { error: "Unknown endpoint" });
    if (req.headers.authorization !== `Bearer ${token}`)
      return reply(401, { error: "Unauthorized" });
    const now = Math.floor(Date.now() / 1000),
      stamp = Number(req.headers["x-request-timestamp"]);
    if (!Number.isSafeInteger(stamp) || Math.abs(now - stamp) > 60)
      return reply(400, { error: "Request timestamp outside replay window" });
    let body = "";
    try {
      for await (const chunk of req) {
        body += chunk;
        if (Buffer.byteLength(body) > 16000)
          return reply(413, { error: "Too large" });
      }
      const q = JSON.parse(body),
        fingerprint = canonical(q);
      if (
        typeof q.requestId !== "string" ||
        q.requestId.length < 1 ||
        q.requestId.length > 128 ||
        req.headers["idempotency-key"] !== q.requestId
      )
        return reply(400, { error: "Invalid idempotency key" });
      if (seen.has(q.requestId)) {
        const previous = seen.get(q.requestId);
        return previous.fingerprint === fingerprint
          ? reply(200, previous.response)
          : reply(409, { error: "Changed terms under the same request ID" });
      }
      const a = q.auction;
      if (
        !a ||
        a.rulesVersion !== "1.0.0-draft" ||
        ![a.opensAt, a.closesAt, a.minimumQuoteExpiry].every(
          Number.isSafeInteger,
        ) ||
        !(
          a.opensAt <= now &&
          now < a.closesAt &&
          a.closesAt < a.minimumQuoteExpiry
        )
      )
        return reply(400, { error: "Invalid or closed auction window" });
      if (
        q.chainId !== defaults.chainId ||
        q.sellToken !== defaults.sellToken ||
        q.buyToken !== defaults.buyToken ||
        !/^[1-9][0-9]*$/.test(q.sellAmount) ||
        BigInt(q.sellAmount) >= 2n ** 128n
      )
        return reply(400, { error: "Unsupported sandbox terms" });
      if (
        !/^0x[0-9a-fA-F]{40}$/.test(q.taker) ||
        q.taker.toLowerCase() !== q.executor?.toLowerCase() ||
        /^0x0{40}$/.test(q.taker)
      )
        return reply(400, { error: "Direct client EOA required" });
      if (
        !Number.isSafeInteger(q.requestedValiditySeconds) ||
        q.requestedValiditySeconds < 30 ||
        q.requestedValiditySeconds > 600
      )
        return reply(400, { error: "Invalid validity window" });
      const expiry = now + q.requestedValiditySeconds;
      if (expiry <= a.minimumQuoteExpiry)
        return reply(400, { error: "Insufficient quote validity" });
      const order = {
        makerToken: q.buyToken,
        takerToken: q.sellToken,
        makerAmount: buyAmount,
        takerAmount: q.sellAmount,
        maker: signer.address,
        taker: q.taker,
        txOrigin: q.executor,
        pool: ZeroHash,
        expiry: String(expiry),
        salt: BigInt(Wallet.createRandom().address).toString(),
      };
      const signed = await signQuote(order, signer, q.chainId, defaults.proxy);
      const response = {
        requestId: q.requestId,
        quoteId: `local-${q.requestId}`,
        status: "firm",
        domain: signed.domain,
        order,
        signature: signed.signature,
      };
      seen.set(q.requestId, { fingerprint, response });
      return reply(200, response);
    } catch {
      reply(400, { error: "Invalid request" });
    }
  });
  return { server, signer: signer.address };
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const { server } = createMaker({ token: process.env.LOCAL_MAKER_TOKEN });
  server.listen(4190, "127.0.0.1", () =>
    console.log(
      "Local mock maker: http://127.0.0.1:4190/rfqs/v1/quote. No wallet broadcast or real inventory.",
    ),
  );
}
