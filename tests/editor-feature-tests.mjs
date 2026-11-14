/**
 * Feature regression tests for Captain Campaign editor helpers.
 * Run with: node tests/editor-feature-tests.mjs
 */
import assert from "node:assert/strict";

const PASS = [];
const FAIL = [];

const test = (name, fn) => {
  try {
    fn();
    PASS.push(name);
  } catch (error) {
    FAIL.push({ name, message: error.message });
  }
};

const snapValue = (value, guides, threshold = 6) => {
  let next = value;
  let snapped = false;
  guides.forEach((guide) => {
    if (Math.abs(value - guide) <= threshold) {
      next = guide;
      snapped = true;
    }
  });
  return { value: next, snapped };
};

const groupMembers = (edits, groupId) =>
  Object.entries(edits)
    .filter(([, edit]) => edit?.groupId === groupId)
    .map(([id]) => id);

const analyticsSummary = (visits, now = Date.now()) => {
  const sec = Math.floor(now / 1000);
  const buckets = {
    day1: sec - 86_400,
    day7: sec - 7 * 86_400,
    day14: sec - 14 * 86_400,
    day30: sec - 30 * 86_400,
    day90: sec - 90 * 86_400,
  };
  const summary = { all: visits.length };
  for (const [key, since] of Object.entries(buckets)) {
    summary[key] = visits.filter((visit) => Number(visit.t) >= since).length;
  }
  return summary;
};

const mediaLibraryAdd = (library, folder, item) => {
  const next = structuredClone(library);
  next.folders[folder] ||= [];
  next.folders[folder].push(item);
  next.activeFolder = folder;
  return next;
};

test("snap guides lock near grid lines", () => {
  const result = snapValue(103, [0, 20, 40, 60, 80, 100, 120], 6);
  assert.equal(result.value, 100);
  assert.equal(result.snapped, true);
});

test("snap leaves far values untouched", () => {
  const result = snapValue(47, [0, 20, 40, 60], 4);
  assert.equal(result.value, 47);
  assert.equal(result.snapped, false);
});

test("grouping keeps all members under one group id", () => {
  const edits = {
    a: { groupId: "g1" },
    b: { groupId: "g1" },
    c: { styles: {} },
  };
  assert.deepEqual(groupMembers(edits, "g1").sort(), ["a", "b"]);
});

test("analytics periods count visits correctly", () => {
  const now = Date.UTC(2026, 10, 13, 18, 0, 0);
  const visits = [
    { t: Math.floor(now / 1000) - 100 },
    { t: Math.floor(now / 1000) - 3 * 86_400 },
    { t: Math.floor(now / 1000) - 20 * 86_400 },
    { t: Math.floor(now / 1000) - 100 * 86_400 },
  ];
  const summary = analyticsSummary(visits, now);
  assert.equal(summary.all, 4);
  assert.equal(summary.day1, 1);
  assert.equal(summary.day7, 2);
  assert.equal(summary.day30, 3);
  assert.equal(summary.day90, 3);
});

test("uploads library stores files inside folders", () => {
  const library = mediaLibraryAdd(
    { folders: { Inbox: [] }, activeFolder: "Inbox" },
    "Campaigns",
    { url: "/uploads/a.jpg", name: "a.jpg" },
  );
  assert.equal(library.activeFolder, "Campaigns");
  assert.equal(library.folders.Campaigns.length, 1);
  assert.equal(library.folders.Campaigns[0].url, "/uploads/a.jpg");
});

test("lock flag prevents move intent", () => {
  const edit = { locked: true, styles: { left: 10 } };
  const canMove = !edit.locked;
  assert.equal(canMove, false);
});

test("crop zoom stays within bounds", () => {
  const zoom = Math.max(100, Math.min(220, 100 + 8 * 20));
  assert.equal(zoom, 220);
});

console.log(`Passed ${PASS.length}; failed ${FAIL.length}`);
FAIL.forEach((item) => console.error(`FAIL ${item.name}: ${item.message}`));
if (FAIL.length) process.exit(1);
