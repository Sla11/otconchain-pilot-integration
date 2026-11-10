// Application-level ranking only. Signature/chain verification precedes this step.
export function rankQuotes(quotes, policy) {
  if (
    ![policy.opensAt, policy.closesAt, policy.now, policy.headroom].every(
      Number.isSafeInteger,
    ) ||
    policy.opensAt >= policy.closesAt ||
    policy.headroom < 0 ||
    policy.now < policy.closesAt
  )
    throw new Error(
      "Comparison is available only after a valid auction cut-off.",
    );
  const rejected = [],
    active = new Map();
  const uint = (v) => typeof v === "string" && /^(0|[1-9][0-9]*)$/.test(v);
  for (const q of quotes) {
    let reason = "";
    if (q.status !== "firm")
      reason = q.status === "declined" ? "Maker declined" : "Not a firm quote";
    else if (q.validated !== true) reason = "Signature and terms not validated";
    else if (![q.sellAmount, q.buyAmount, q.feeAmount ?? "0"].every(uint))
      reason = "Invalid base-unit amount";
    else if (BigInt(q.sellAmount) !== BigInt(policy.sellAmount))
      reason = "Different sell amount";
    else if (
      !Number.isSafeInteger(q.receivedAt) ||
      q.receivedAt > policy.closesAt ||
      q.receivedAt < policy.opensAt
    )
      reason = "Outside bidding window";
    else if (
      !Number.isSafeInteger(q.expiry) ||
      q.expiry <= Math.max(policy.now, policy.closesAt) + policy.headroom
    )
      reason = "Insufficient expiry headroom";
    else if (
      BigInt(q.buyAmount) - BigInt(q.feeAmount ?? "0") <
      BigInt(policy.minimumBuyAmount)
    )
      reason = "Below minimum net proceeds";
    if (reason) {
      rejected.push({ ...q, reason });
      continue;
    }
    const previous = active.get(q.makerId);
    if (previous && previous.receivedAt >= q.receivedAt) {
      rejected.push({ ...q, reason: "Superseded response" });
      continue;
    }
    if (previous) rejected.push({ ...previous, reason: "Superseded response" });
    active.set(q.makerId, {
      ...q,
      netAmount: (BigInt(q.buyAmount) - BigInt(q.feeAmount ?? "0")).toString(),
    });
  }
  const ranked = [...active.values()].sort((a, b) => {
    const delta = BigInt(b.netAmount) - BigInt(a.netAmount);
    return delta === 0n
      ? a.receivedAt - b.receivedAt ||
          (a.quoteId < b.quoteId ? -1 : a.quoteId > b.quoteId ? 1 : 0)
      : delta > 0n
        ? 1
        : -1;
  });
  return { ranked, rejected, competitive: ranked.length > 1 };
}
