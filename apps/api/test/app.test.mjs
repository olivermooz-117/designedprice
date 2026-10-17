import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { app } from "../dist/app.js";

let server;
let baseUrl;

before(async () => {
  server = createServer(app);

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address();
  assert.ok(address && typeof address === "object");
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  if (server?.listening) {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
});

test("GET /health returns a healthy response", async () => {
  const response = await fetch(`${baseUrl}/health`);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
});

test("GET /api/v1/scans/history rejects a missing token", async () => {
  const response = await fetch(`${baseUrl}/api/v1/scans/history`);

  assert.equal(response.status, 401);
  const body = await response.json();
  assert.equal(body.error?.code, "UNAUTHORIZED");
});

test("POST /api/v1/scans/analyze rejects a missing token", async () => {
  const response = await fetch(`${baseUrl}/api/v1/scans/analyze`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({}),
  });

  assert.equal(response.status, 401);
  const body = await response.json();
  assert.equal(body.error?.code, "UNAUTHORIZED");
});

test("POST /api/v1/scans/analyze rejects an invalid token", async () => {
  const response = await fetch(`${baseUrl}/api/v1/scans/analyze`, {
    method: "POST",
    headers: {
      authorization: "Bearer definitely-not-a-valid-token",
      "content-type": "application/json",
    },
    body: JSON.stringify({}),
  });

  assert.equal(response.status, 401);
  const body = await response.json();
  assert.equal(body.error?.code, "UNAUTHORIZED");
});
