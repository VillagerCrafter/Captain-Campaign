/**
 * Browser QA for context-aware editor tooling.
 * Run: $env:LIAM_ADMIN_PASSWORD="…"; node tests/qa-editor-context.mjs
 */
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BROWSER = path.join(process.env.USERPROFILE || "", ".claude", "skills", "browser-automation", "browser.mjs");
const PASSWORD = process.env.LIAM_ADMIN_PASSWORD || "test-admin-password-ok";
const PORT = process.env.LIAM_PREVIEW_PORT || "4178";
const BASE = `http://127.0.0.1:${PORT}`;
const SCRIPT = path.join(ROOT, "tests", "qa-editor-context-probe.mjs");
const OWN_SERVER = process.env.LIAM_QA_EXTERNAL_SERVER !== "1";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const waitForHttp = async (url, attempts = 60) => {
  for (let i = 0; i < attempts; i += 1) {
    const ok = await new Promise((resolve) => {
      const req = http.get(url, (res) => { res.resume(); resolve(res.statusCode >= 200 && res.statusCode < 500); });
      req.on("error", () => resolve(false));
      req.setTimeout(1500, () => { req.destroy(); resolve(false); });
    });
    if (ok) return;
    await sleep(250);
  }
  throw new Error(`Server did not respond at ${url}`);
};

let server = null;
if (OWN_SERVER) {
  server = spawn("ruby", ["local_preview.rb"], {
    cwd: ROOT,
    env: { ...process.env, LIAM_ADMIN_PASSWORD: PASSWORD, LIAM_PREVIEW_PORT: PORT },
    stdio: ["ignore", "ignore", "ignore"],
  });
}

try {
  await waitForHttp(`${BASE}/admin`);
  const result = spawnSync(process.execPath, [
    BROWSER, `${BASE}/admin`, "--script", SCRIPT, "--timeout", "90000",
    "--screenshot", path.join(ROOT, "tests", "verify-editor-context.png"),
  ], { encoding: "utf8", maxBuffer: 8_000_000, env: { ...process.env, LIAM_ADMIN_PASSWORD: PASSWORD } });

  if (result.status !== 0) {
    console.error(result.stdout, result.stderr);
    throw new Error(`Browser QA failed (exit ${result.status}).`);
  }

  const match = result.stdout.match(/\{[\s\S]*"marker"\s*:\s*"probe-v3"[\s\S]*\}/);
  const probe = match ? JSON.parse(match[0]) : null;
  if (!probe?.results) {
    console.error(result.stdout);
    throw new Error("No probe-v3 results.");
  }

  const byCase = Object.fromEntries(probe.results.map((row) => [row.case, row]));
  assert.ok(!byCase.media?.error, byCase.media?.error);
  assert.equal(byCase.media.kind, "media");
  assert.equal(byCase.media.replace.hidden, false, "media: replace visible");
  assert.equal(byCase.media.text.hidden, true, "media: text hidden");
  assert.equal(byCase.media.bold.hidden, true, "media: bold hidden");
  assert.equal(byCase.media.width.hidden, false, "media: width visible");
  assert.equal(byCase.media.href.hidden, true, "media: href hidden");

  assert.ok(!byCase.text?.error, byCase.text?.error);
  assert.equal(byCase.text.kind, "text");
  assert.equal(byCase.text.replace.hidden, true, "text: replace hidden");
  assert.equal(byCase.text.text.hidden, false, "text: text visible");
  assert.equal(byCase.text.href.hidden, true, "text: href hidden");
  assert.equal(byCase.text.width.hidden, true, "text: width hidden");
  assert.equal(byCase.text.font.hidden, false, "text: font visible");

  assert.ok(!byCase.section?.error, byCase.section?.error);
  assert.equal(byCase.section.kind, "section");
  assert.equal(byCase.section.height.hidden, false, "section: height visible");
  assert.equal(byCase.section.text.hidden, true, "section: text hidden");
  assert.equal(byCase.section.replace.hidden, true, "section: replace hidden");
  assert.equal(byCase.section.hintHidden, false, "section: hint shown");

  if (byCase.link && !byCase.link.error) {
    assert.equal(byCase.link.kind, "link");
    assert.equal(byCase.link.href.hidden, false, "link: href visible");
    assert.equal(byCase.link.text.hidden, false, "link: text visible");
    assert.equal(byCase.link.replace.hidden, true, "link: replace hidden");
  }

  console.log("QA editor context: passed");
  console.log(JSON.stringify(probe.results, null, 2));
} finally {
  if (server) try { server.kill("SIGTERM"); } catch { /* ignore */ }
}
