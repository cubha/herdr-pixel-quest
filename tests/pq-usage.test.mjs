// tools/pq-usage.js: old numbers from idle sessions never win. Run: node --test tests/
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const { merge } = createRequire(import.meta.url)("../tools/pq-usage.js");
const now = 1000;
const w = (p, r) => ({ used_percentage: p, resets_at: r });

test("same window: the higher percent stays", () => {
  assert.deepEqual(merge(w(81, 2000), w(92, 2000), now), w(92, 2000));
  assert.deepEqual(merge(w(95, 2000), w(92, 2000), now), w(95, 2000));
});
test("a newer window replaces an older one, an older one is ignored", () => {
  assert.deepEqual(merge(w(3, 3000), w(92, 2000), now), w(3, 3000));
  assert.deepEqual(merge(w(81, 1500), w(11, 3000), now), w(11, 3000));
});
test("a window that already reset is dropped", () => {
  assert.equal(merge(w(50, 900), undefined, now), undefined);
  assert.deepEqual(merge(w(50, 900), w(10, 3000), now), w(10, 3000));
  assert.deepEqual(merge(undefined, w(10, 3000), now), w(10, 3000));
});
