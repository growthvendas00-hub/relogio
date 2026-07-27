import assert from "node:assert/strict";
import test from "node:test";
import { clientAddress, isAllowedMutationOrigin, readJsonBody, RequestBodyError } from "../lib/request-security.ts";

test("JSON request reader enforces content type and byte limits", async () => {
  const valid = new Request("https://almare.example/api/orders", {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify({ name: "Cliente" }),
  });
  assert.deepEqual(await readJsonBody(valid, 1_024), { name: "Cliente" });

  const wrongType = new Request("https://almare.example/api/orders", { method: "POST", body: "{}" });
  await assert.rejects(() => readJsonBody(wrongType, 1_024), (error) => error instanceof RequestBodyError && error.status === 415);

  const oversized = new Request("https://almare.example/api/orders", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ value: "x".repeat(2_000) }),
  });
  await assert.rejects(() => readJsonBody(oversized, 100), (error) => error instanceof RequestBodyError && error.status === 413);

  const malformed = new Request("https://almare.example/api/orders", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{broken",
  });
  await assert.rejects(() => readJsonBody(malformed, 1_024), (error) => error instanceof RequestBodyError && error.status === 400);
});

test("mutation origin and Vercel client address cannot be replaced by a secondary proxy header", () => {
  const request = new Request("https://almare.example/api/orders", {
    method: "POST",
    headers: {
      origin: "https://almare.example",
      "sec-fetch-site": "same-origin",
      "x-vercel-forwarded-for": "203.0.113.10",
      "x-forwarded-for": "198.51.100.20",
    },
  });
  assert.equal(isAllowedMutationOrigin(request), true);
  assert.equal(clientAddress(request), "203.0.113.10");
  assert.equal(isAllowedMutationOrigin(new Request("https://almare.example/api/orders", {
    method: "POST",
    headers: { origin: "https://attacker.example", "sec-fetch-site": "cross-site" },
  })), false);
});
