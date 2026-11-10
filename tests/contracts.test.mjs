import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { TypedDataEncoder } from "ethers";
import { RFQ_TYPES } from "../maker-kit/src/protocol.mjs";
const files = {"partner.openapi.json":"contracts/partner.openapi.json", "examples.json":"examples/partner.json", "environment.json":"config/pilot-environment.example.json", "acceptance.json":"acceptance/matrix.json"};
const read = async (file) =>
  JSON.parse(await fs.readFile(files[file], "utf8"));
const spec = await read("partner.openapi.json"),
  examples = await read("examples.json");
function resolve(reference) {
  let out = spec;
  for (const part of reference.slice(2).split("/")) out = out?.[part];
  assert.ok(out, `Unresolved ${reference}`);
  return out;
}
function validate(schema, value) {
  if (schema.$ref) return validate(resolve(schema.$ref), value);
  if (schema.oneOf) {
    assert.equal(
      schema.oneOf.filter((branch) => {
        try {
          validate(branch, value);
          return true;
        } catch {
          return false;
        }
      }).length,
      1,
    );
    return;
  }
  if (value === null) {
    assert.ok(schema.nullable, "Unexpected null");
    if (schema.enum) assert.ok(schema.enum.includes(null));
    return;
  }
  if (schema.enum) assert.ok(schema.enum.includes(value));
  if (schema.type === "object") {
    assert.ok(value && typeof value === "object" && !Array.isArray(value));
    for (const key of schema.required ?? [])
      assert.ok(key in value, `Missing ${key}`);
    for (const [key, item] of Object.entries(value)) {
      if (schema.additionalProperties === false)
        assert.ok(key in schema.properties, `Unexpected ${key}`);
      if (schema.properties?.[key]) validate(schema.properties[key], item);
    }
  }
  if (schema.type === "array") {
    assert.ok(Array.isArray(value));
    if (schema.minItems != null) assert.ok(value.length >= schema.minItems);
    if (schema.maxItems != null) assert.ok(value.length <= schema.maxItems);
    if (schema.uniqueItems)
      assert.equal(
        new Set(value.map((x) => JSON.stringify(x))).size,
        value.length,
      );
    for (const item of value) validate(schema.items, item);
  }
  if (schema.type === "string") {
    assert.equal(typeof value, "string");
    if (schema.pattern) assert.match(value, new RegExp(schema.pattern));
    if (schema.minLength != null) assert.ok(value.length >= schema.minLength);
    if (schema.maxLength != null) assert.ok(value.length <= schema.maxLength);
    if (schema.format === "uri") assert.ok(new URL(value));
  }
  if (schema.type === "integer") {
    assert.ok(Number.isSafeInteger(value));
    if (schema.minimum != null) assert.ok(value >= schema.minimum);
    if (schema.maximum != null) assert.ok(value <= schema.maximum);
  }
  if (schema.type === "boolean") assert.equal(typeof value, "boolean");
}
test("Pilot packet examples conform to the proposed partner contract, including nullable evidence", () => {
  for (const [schema, key] of [
    ["CreateRequest", "createRequest"],
    ["RequestStatus", "opened"],
    ["RequestStatus", "selected"],
    ["HandoffRequest", "handoffRequest"],
    ["Handoff", "handoff"],
    ["EventPage", "events"],
    ["Receipt", "receipt"],
    ["Receipt", "unknownCostReceipt"],
    ["CancelRequest", "cancelRequest"],
    ["Error", "error"],
  ])
    validate(spec.components.schemas[schema], examples[key]);
  assert.throws(() =>
    validate(spec.components.schemas.CreateRequest, {
      ...examples.createRequest,
      sellAmount: 10,
    }),
  );
  assert.throws(() =>
    validate(spec.components.schemas.CreateRequest, {
      ...examples.createRequest,
      permittedMakerIds: ["a", "b"],
    }),
  );
  assert.throws(() =>
    validate(spec.components.schemas.Handoff, {
      ...examples.handoff,
      method: "GET",
    }),
  );
});
test("Pilot contract references resolve and terminal operations grant no wallet authority", () => {
  const walk = (value) => {
    if (!value || typeof value !== "object") return;
    if (value.$ref) resolve(value.$ref);
    for (const child of Object.values(value)) walk(child);
  };
  walk(spec);
  assert.ok(new URL(spec.servers[0].url).hostname.endsWith(".invalid"));
  const operations = Object.values(spec.paths).flatMap((item) =>
    Object.entries(item)
      .filter(([verb]) => ["get", "post"].includes(verb))
      .map(([verb, op]) => ({ verb, op })),
  );
  for (const { verb, op } of operations) {
    assert.deepEqual(op.security, [{ partnerBearer: [] }]);
    assert.ok(op["x-required-scope"]);
    if (verb === "post") assert.equal(op.parameters.length, 2);
    assert.doesNotMatch(
      op.operationId,
      /sign|broadcast|selectQuote|prepareExecution/i,
    );
  }
});
test("Partner fixtures retain correlation, native hash, unknown costs and non-settlement semantics", async () => {
  const native = JSON.parse(
    await fs.readFile("examples/maker.json", "utf8"),
  );
  const { createRequest, opened, selected, receipt, events } = examples;
  assert.equal(opened.clientRequestId, createRequest.clientRequestId);
  assert.equal(receipt.requestId, opened.requestId);
  assert.equal(selected.selectedQuoteId, receipt.selectedQuote.quoteId);
  assert.equal(
    receipt.selectedQuote.orderHash,
    TypedDataEncoder.hash(native.firm.domain, RFQ_TYPES, native.firm.order),
  );
  assert.equal(receipt.selectedQuote.sellAmount, createRequest.sellAmount);
  assert.equal(createRequest.clientWallet, native.order.taker);
  assert.ok(
    opened.opensAt < opened.closesAt &&
      opened.closesAt < opened.minimumQuoteExpiry,
  );
  assert.equal(receipt.executionState, "not_started");
  assert.equal(receipt.executionEvidence, null);
  assert.equal(
    BigInt(receipt.costComparison.estimatedNetBuyAmount),
    BigInt(native.order.makerAmount) -
      BigInt(receipt.costComparison.gasEstimateBuyUnits),
  );
  assert.ok(
    BigInt(receipt.costComparison.estimatedNetBuyAmount) >=
      BigInt(createRequest.minimumNetBuyAmount),
  );
  assert.equal(
    examples.unknownCostReceipt.costComparison.estimatedNetBuyAmount,
    null,
  );
  assert.equal(
    examples.unknownCostReceipt.costComparison.economicComparison,
    "unavailable",
  );
  assert.equal(opened.competitionMode, "single_maker");
  assert.deepEqual(
    events.events.map((e) => e.sequence),
    [1, 2, 3],
  );
  assert.equal(events.nextSequence, selected.latestEventSequence);
  assert.equal(
    new Set(events.events.map((e) => e.eventId)).size,
    events.events.length,
  );
  assert.equal(JSON.stringify(receipt).includes("signature"), false);
});
test("Pilot approval and environment templates remain unagreed and contain no active credentials", async () => {
  const env = await read("environment.json"),
    acceptance = await read("acceptance.json");
  assert.equal(env.status, "UNAGREED");
  assert.equal(env.services.partnerApiBaseUrl, "");
  assert.equal(env.approval.realAssetsAllowed, false);
  assert.equal(acceptance.approval.realAssetsAllowed, false);
  assert.equal(new Set(acceptance.cases.map((c) => c.id)).size, 26);
  assert.ok(
    acceptance.cases.every(
      (c) => c.status === "unrun" && c.evidenceReference === "",
    ),
  );
  assert.ok(acceptance.cases.some((c) => c.id === "SHADOW-01"));
});

test("Client defaults to zero network calls and the linked fixture", () => {
 const out=JSON.parse(execFileSync(process.execPath,["clients/partner-client.mjs","--dry-run"],{encoding:"utf8"}));
 assert.equal(out.networkCalls,0); assert.deepEqual(out.body,examples.createRequest);
});
