export default async function run(page) {
  const base = "http://127.0.0.1:4178";
  const password = "test-admin-password-ok";
  const context = page.context();
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
  if (await page.locator("#password").count()) {
    await page.locator("#password").fill(password);
    await page.locator("form[action='/login'] button[type='submit']").click();
    await page.waitForTimeout(2000);
  }
  await page.waitForTimeout(2000);

  // Clear any leftover modal from a crashed session.
  await page.keyboard.press("Escape");
  await page.evaluate(() => {
    const dialog = document.querySelector("#service-dialog");
    try { dialog?.close?.(); } catch (_) {}
    dialog?.removeAttribute("open");
    dialog?.classList.remove("cms-editor-dialog");
  });
  await page.waitForTimeout(300);

  await page.evaluate(() => document.querySelector("#services")?.scrollIntoView({ block: "center" }));
  await page.waitForTimeout(300);
  await page.locator(".service-card").nth(4).locator(".service-title").click({ force: true });
  await page.waitForTimeout(500);

  const probe = await page.evaluate(() => {
    const dialog = document.querySelector("#service-dialog");
    const selected = document.querySelector(".cms-highlight");
    const cards = [...document.querySelectorAll(".service-card")].map((card) => ({
      title: card.querySelector(".service-title")?.textContent?.trim() || "",
      summary: card.querySelector(".service-summary")?.textContent?.trim() || "",
    }));
    return {
      dialogOpen: Boolean(dialog?.open),
      dialogModal: Boolean(document.querySelector("#service-dialog:modal")),
      selectedText: selected?.textContent?.trim()?.slice(0, 60) || "",
      emptyCards: cards.filter((c) => !c.title || !c.summary).length,
      exportOk: document.documentElement.dataset.adminExportOk || null,
      bodyHasDialogOpen: document.body.matches(":has(dialog[open])"),
    };
  });

  await page.screenshot({ path: "tests/verify-services-no-overlay.png", fullPage: false });

  // Double-click title to start text edit — proves the canvas is not inert.
  await page.locator(".service-card").nth(4).locator(".service-title").dblclick({ force: true });
  await page.waitForTimeout(400);
  const editing = await page.evaluate(() => ({
    contentEditable: document.querySelector(".service-card .service-title")?.isContentEditable
      || document.activeElement?.isContentEditable
      || false,
    activeTag: document.activeElement?.className || document.activeElement?.tagName || "",
    dialogModal: Boolean(document.querySelector("#service-dialog:modal")),
  }));

  return {
    probe,
    editing,
    ok: !probe.dialogOpen
      && !probe.dialogModal
      && probe.emptyCards === 0
      && Boolean(probe.selectedText)
      && !editing.dialogModal,
  };
}
