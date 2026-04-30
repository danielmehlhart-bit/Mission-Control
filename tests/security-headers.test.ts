import test from "node:test";
import assert from "node:assert/strict";

import { SECURITY_HEADERS, getSecurityHeaderValue } from "../lib/security-headers.mjs";

test("security headers allow same-origin microphone access", () => {
  assert.ok(SECURITY_HEADERS.length > 0);
  assert.equal(getSecurityHeaderValue("Permissions-Policy"), "camera=(), microphone=(self), geolocation=()");
});
