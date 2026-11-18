export default async function run(page) {
  const base = "http://127.0.0.1:4178";
  const password = "test-admin-password-ok";
  const context = page.context();

  const login = await context.request.post(`${base}/login`, {
    form: { password },
    maxRedirects: 0,
  });
  const setCookie = String(login.headers()["set-cookie"] || "");
  const token = /liam_admin=([^;]+)/.exec(setCookie)?.[1];
  if (token) {
    await context.addCookies([{
      name: "liam_admin",
      value: token,
      domain: "127.0.0.1",
      path: "/",
      httpOnly: true,
      sameSite: "Strict",
    }]);
  }

  await page.goto(`${base}/admin`, { waitUntil: "domcontentloaded", timeout: 30000 });
  const passwordField = page.locator("#password, input[type='password']").first();
  if (await passwordField.count()) {
    await passwordField.fill(password);
    const submit = page.locator("form[action='/login'] button[type='submit'], button:has-text('Open the editor')").first();
    if (await submit.count()) await submit.click();
    else await passwordField.press("Enter");
    await page.waitForTimeout(1500);
  }

  await page.waitForFunction(
    () => Boolean(window.liamAdminEditor) || document.body.classList.contains("cms-administrator"),
    { timeout: 25000 },
  ).catch(() => {});
  try { await page.evaluate(() => window.liamAdminEditor?.ready); } catch (_) {}
  await page.waitForTimeout(800);

  const boot = await page.evaluate(() => ({
    title: document.title,
    hasEditor: Boolean(window.liamAdminEditor),
    adminBody: document.body.classList.contains("cms-administrator"),
    dialogExists: Boolean(document.querySelector("#service-dialog")),
    cardCount: document.querySelectorAll(".service-card").length,
  }));
  if (!boot.hasEditor && !boot.adminBody) {
    return { ok: false, boot, error: "admin editor did not load" };
  }

  // Simulate the crash leftover: a modal Learn more with dark backdrop.
  await page.evaluate(() => {
    const dialog = document.querySelector("#service-dialog");
    const button = document.querySelector(".service-open");
    if (!dialog || !button) return;
    const title = document.querySelector("#dialog-title");
    const desc = document.querySelector("#dialog-description");
    if (title) title.textContent = button.dataset.serviceTitle || "Test";
    if (desc) desc.textContent = button.dataset.serviceDescription || "Test";
    dialog.classList.remove("cms-editor-dialog");
    if (typeof dialog.showModal === "function") dialog.showModal();
  });
  await page.waitForTimeout(300);

  const stuck = await page.evaluate(() => ({
    open: Boolean(document.querySelector("#service-dialog[open]")),
    modal: Boolean(document.querySelector("#service-dialog:modal")),
  }));

  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);

  const afterEsc = await page.evaluate(() => ({
    open: Boolean(document.querySelector("#service-dialog[open]")),
    modal: Boolean(document.querySelector("#service-dialog:modal")),
    hasEditor: Boolean(window.liamAdminEditor),
  }));

  await page.evaluate(() => document.querySelector("#services")?.scrollIntoView({ block: "center" }));
  await page.waitForTimeout(200);
  await page.locator(".service-card").nth(4).locator(".service-title").click({ force: true });
  await page.waitForTimeout(600);

  const afterClick = await page.evaluate(() => {
    const dialog = document.querySelector("#service-dialog");
    const selected = document.querySelector(".cms-highlight");
    const cards = [...document.querySelectorAll(".service-card")].map((card, i) => ({
      i: i + 1,
      title: card.querySelector(".service-title")?.textContent?.trim() || "",
      summary: card.querySelector(".service-summary")?.textContent?.trim() || "",
    }));
    return {
      dialogOpen: Boolean(dialog?.open),
      dialogModal: Boolean(document.querySelector("#service-dialog:modal")),
      selectedText: selected?.textContent?.trim()?.slice(0, 80) || "",
      selectedOk: Boolean(selected),
      emptyCards: cards.filter((c) => !c.title || !c.summary),
      cards,
      bodyOverflow: getComputedStyle(document.body).overflow,
    };
  });

  await page.screenshot({ path: "tests/verify-services-no-overlay.png", fullPage: false });

  // Re-open a modal — CMS must clear the inert :modal lock (Esc or recovery timer).
  await page.evaluate(() => {
    const dialog = document.querySelector("#service-dialog");
    dialog?.classList.remove("cms-editor-dialog");
    dialog?.showModal?.();
  });
  await page.waitForTimeout(200);
  const reopened = await page.evaluate(() => Boolean(document.querySelector("#service-dialog:modal")));
  await page.keyboard.press("Escape");
  await page.waitForTimeout(700);
  const afterReclear = await page.evaluate(() => ({
    open: Boolean(document.querySelector("#service-dialog[open]")),
    modal: Boolean(document.querySelector("#service-dialog:modal")),
    exportOk: document.documentElement.dataset.adminExportOk || null,
    exportCleared: document.documentElement.dataset.adminExportCleared || null,
  }));

  // Editing still works after clearing the overlay.
  await page.locator(".service-card").nth(3).locator(".service-title").click({ force: true });
  await page.waitForTimeout(400);
  const editable = await page.evaluate(() => ({
    selected: document.querySelector(".cms-highlight")?.textContent?.trim()?.slice(0, 80) || "",
    dialogOpen: Boolean(document.querySelector("#service-dialog[open]")),
  }));

  const ok = !afterEsc.open
    && !afterEsc.modal
    && !afterClick.dialogOpen
    && !afterClick.dialogModal
    && afterClick.selectedOk
    && afterClick.emptyCards.length === 0
    && reopened
    && !afterReclear.open
    && !afterReclear.modal
    && Boolean(editable.selected)
    && !editable.dialogOpen;

  return { boot, stuck, afterEsc, afterClick, reopened, afterReclear, editable, ok };
}
