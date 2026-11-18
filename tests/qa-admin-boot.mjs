export default async function run(page) {
  const base = "http://127.0.0.1:4178";
  const password = "test-admin-password-ok";
  const context = page.context();
  const pageErrors = [];
  const failed = [];
  page.on("pageerror", (err) => pageErrors.push(String(err?.stack || err?.message || err)));
  page.on("console", (msg) => {
    if (["error", "warning"].includes(msg.type())) pageErrors.push(`${msg.type()}:${msg.text()}`);
  });
  page.on("requestfailed", (req) => failed.push(`${req.failure()?.errorText || "fail"} ${req.url()}`));
  page.on("response", async (res) => {
    if (res.url().includes("admin.js") && res.status() >= 400) {
      failed.push(`admin.js status ${res.status()}`);
    }
  });

  const login = await context.request.post(`${base}/login`, {
    form: { password },
    maxRedirects: 0,
    failOnStatusCode: false,
  });
  const setCookie = String(login.headers()["set-cookie"] || "");
  const token = /liam_admin=([^;]+)/.exec(setCookie)?.[1];
  if (token) {
    await context.addCookies([{
      name: "liam_admin",
      value: token,
      url: base,
      httpOnly: true,
      sameSite: "Strict",
    }]);
  }

  await page.goto(`${base}/admin`, { waitUntil: "domcontentloaded", timeout: 30000 });
  const passwordField = page.locator("#password");
  if (await passwordField.count()) {
    await passwordField.fill(password);
    await page.locator("form[action='/login'] button[type='submit']").click();
    await page.waitForTimeout(2000);
  }

  // Wait longer for deferred admin scripts.
  for (let i = 0; i < 40; i += 1) {
    const ready = await page.evaluate(() => Boolean(window.liamAdminEditor));
    if (ready) break;
    await page.waitForTimeout(250);
  }

  const adminJs = await page.evaluate(async () => {
    try {
      const res = await fetch("/admin.js", { cache: "no-store", credentials: "same-origin" });
      const text = await res.text();
      return {
        status: res.status,
        len: text.length,
        hasForceClose: text.includes("forceCloseServiceDialog"),
        hasExport: text.includes("window.liamAdminEditor"),
        endsOk: /window\.liamAdminEditor\s*=/.test(text) && text.includes("syncSectionResizeHandle"),
        head: text.slice(0, 80),
        tail: text.slice(-120),
      };
    } catch (error) {
      return { error: String(error) };
    }
  });

  const boot = await page.evaluate(() => ({
    title: document.title,
    href: location.href,
    adminBody: document.body.classList.contains("cms-administrator"),
    hasEditor: Boolean(window.liamAdminEditor),
    editorKeys: window.liamAdminEditor ? Object.keys(window.liamAdminEditor).slice(0, 20) : [],
    bootError: window.__adminBootError || document.documentElement.dataset.adminBootError || null,
    status: document.querySelector("#admin-status")?.textContent || "",
    toolbar: Boolean(document.querySelector(".admin-toolbar")),
    dialogOpen: Boolean(document.querySelector("#service-dialog[open]")),
    dialogModal: Boolean(document.querySelector("#service-dialog:modal")),
  }));

  return { boot, adminJs, pageErrors, failed: failed.slice(0, 20), hasCookie: Boolean(token) };
}
