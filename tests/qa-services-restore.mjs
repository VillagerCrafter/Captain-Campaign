import { execSync } from "node:child_process";

export default async function run(page) {
  const base = "http://127.0.0.1:4178";
  const password = "test-admin-password-ok";
  const headers = execSync(
    `curl.exe -s -D - -o NUL -X POST ${base}/login --data-urlencode "password=${password}" --max-redirs 0`,
    { encoding: "utf8" },
  );
  const token = /liam_admin=([^;\r\n]+)/.exec(headers)?.[1];
  if (!token) return { ok: false, error: "login failed", headers };
  await page.context().addCookies([{
    name: "liam_admin",
    value: token,
    domain: "127.0.0.1",
    path: "/",
    httpOnly: true,
    sameSite: "Lax",
  }]);
  await page.goto(`${base}/admin.html`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".admin-toolbar", { timeout: 20000 });
  await page.waitForTimeout(800);

  // Simulate the wiped local draft that blanked services 04 + 05.
  await page.evaluate(() => {
    const key = "liam-portfolio-admin-draft-v1";
    const raw = localStorage.getItem(key);
    const draft = raw ? JSON.parse(raw) : { savedAt: Date.now(), state: { edits: {} }, undoHistory: [], redoHistory: [] };
    draft.state ||= { edits: {} };
    draft.state.edits ||= {};
    draft.state.edits["service-slot-4-title"] = { styles: {}, text: "" };
    draft.state.edits["service-slot-4-summary"] = { styles: {}, text: "" };
    draft.state.edits["service-slot-5-title"] = { styles: {}, text: "" };
    draft.state.edits["service-slot-5-summary"] = { styles: {}, text: "" };
    draft.state.edits["element-328-button"] = { styles: {}, text: "" };
    localStorage.setItem(key, JSON.stringify(draft));
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2200);

  const title = page.locator(".service-card").nth(4).locator(".service-title");
  await title.scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  const scrollBefore = await page.evaluate(() => window.scrollY);

  const cards = await page.evaluate(() => [...document.querySelectorAll(".service-card")].map((card, i) => ({
    i: i + 1,
    title: card.querySelector(".service-title")?.textContent?.trim() || "",
    summary: card.querySelector(".service-summary")?.textContent?.trim() || "",
    dialogOpen: Boolean(document.querySelector("#service-dialog[open]")),
  })));

  // Click service 05 — must select in place, not jump to footer / open half panel.
  await title.click({ position: { x: 12, y: 10 }, force: true });
  await page.waitForTimeout(700);
  const afterClick = await page.evaluate(() => ({
    scrollY: window.scrollY,
    dialogOpen: Boolean(document.querySelector("#service-dialog[open]")),
    dialogModal: Boolean(document.querySelector("#service-dialog:modal")),
    editorClass: document.querySelector("#service-dialog")?.classList.contains("cms-editor-dialog") || false,
    selected: document.querySelector(".cms-highlight")?.className || "",
    selectedId: document.querySelector(".cms-highlight")?.id || "",
    selectedText: document.querySelector(".cms-highlight")?.textContent?.trim()?.slice(0, 80) || "",
    footerInView: (() => {
      const footer = document.querySelector("footer");
      if (!footer) return false;
      const r = footer.getBoundingClientRect();
      return r.top < window.innerHeight && r.bottom > 0;
    })(),
  }));

  await page.screenshot({ path: "tests/verify-services-grid.png", fullPage: false });

  // Public Learn more still uses a real modal.
  await page.goto("http://127.0.0.1:4178/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  await page.evaluate(() => document.querySelector("#services")?.scrollIntoView());
  await page.waitForTimeout(300);
  await page.locator(".service-open").nth(4).click();
  await page.waitForTimeout(500);
  const publicDialog = await page.evaluate(() => ({
    open: Boolean(document.querySelector("#service-dialog[open]")),
    modal: Boolean(document.querySelector("#service-dialog:modal")),
    title: document.querySelector("#dialog-title")?.textContent?.trim() || "",
    editorClass: document.querySelector("#service-dialog")?.classList.contains("cms-editor-dialog") || false,
  }));
  await page.screenshot({ path: "tests/verify-service-dialog-modal.png", fullPage: false });

  return {
    scrollBefore,
    cards,
    empty: cards.filter((c) => !c.title || !c.summary),
    afterClick,
    publicDialog,
    ok: cards.every((c) => c.title && c.summary)
      && !afterClick.dialogOpen
      && !afterClick.dialogModal
      && !afterClick.editorClass
      && !afterClick.footerInView
      && afterClick.selectedId !== "dialog-image"
      && /service-title/.test(afterClick.selected)
      && /Creator/i.test(afterClick.selectedText)
      && publicDialog.modal
      && !publicDialog.editorClass
      && /Creator/i.test(publicDialog.title),
  };
}
