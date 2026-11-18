export default async function run(page) {
  const base = "http://127.0.0.1:4178";
  const password = "test-admin-password-ok";
  const ctx = page.context();
  const pageErrors = [];
  page.on("pageerror", (err) => pageErrors.push(String(err?.stack || err?.message || err)));
  page.on("console", (msg) => {
    if (msg.type() === "error") pageErrors.push(`console:${msg.text()}`);
  });

  const login = await ctx.request.post(`${base}/login`, {
    form: { password },
    maxRedirects: 0,
    failOnStatusCode: false,
  });
  const setCookie = String(login.headers()["set-cookie"] || "");
  const token = /liam_admin=([^;]+)/.exec(setCookie)?.[1];
  if (token) {
    await ctx.addCookies([{
      name: "liam_admin",
      value: token,
      url: base,
      httpOnly: true,
      sameSite: "Strict",
    }]);
  }

  await page.goto(`${base}/admin`, { waitUntil: "domcontentloaded" });
  if (await page.locator("#password").count()) {
    await page.locator("#password").fill(password);
    await page.locator("form[action='/login'] button[type='submit']").click();
    await page.waitForTimeout(2500);
  }
  await page.waitForTimeout(3500);

  const probe = await page.evaluate(async () => {
    let adminJsMeta = null;
    try {
      const res = await fetch("/admin.js", { cache: "no-store", credentials: "same-origin" });
      const text = await res.text();
      adminJsMeta = {
        status: res.status,
        len: text.length,
        hasEditorApi: text.includes("const editorApi"),
        hasDatasetExport: text.includes("dataset.adminExported"),
        hasForceClose: text.includes("forceCloseServiceDialog"),
      };
    } catch (error) {
      adminJsMeta = { error: String(error) };
    }
    return {
      has: "liamAdminEditor" in window,
      valueType: typeof window.liamAdminEditor,
      datasetExported: document.documentElement.dataset.adminExported || null,
      datasetExportOk: document.documentElement.dataset.adminExportOk || null,
      documentEditor: typeof document.liamAdminEditor,
      status: document.querySelector("#admin-status")?.textContent || "",
      toolbar: Boolean(document.querySelector(".admin-toolbar")),
      dialogOpen: Boolean(document.querySelector("#service-dialog[open]")),
      dialogModal: Boolean(document.querySelector("#service-dialog:modal")),
      // Prove main-world JS ran: call a DOM side-effect only admin click handlers do.
      highlightCount: document.querySelectorAll(".cms-highlight").length,
      adminJsMeta,
      ownKeys: Object.keys(window).filter((k) => /liam|admin|cms/i.test(k)),
      descriptorNow: Object.getOwnPropertyDescriptor(window, "liamAdminEditor")
        ? "present"
        : "absent",
    };
  });

  return { probe, pageErrors };
}
