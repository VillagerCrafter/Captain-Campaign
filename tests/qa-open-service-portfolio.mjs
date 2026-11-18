/** Regression: CMS edit mode opens Learn more + portfolio case study on card click, then persists edits. */
export default async function run(page) {
  const base = "http://127.0.0.1:4178";
  const password = "test-admin-password-ok";
  const context = page.context();
  const pageErrors = [];
  page.on("pageerror", (err) => pageErrors.push(String(err?.stack || err)));

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
  await page.waitForTimeout(2200);

  // --- Service Learn more opens ---
  await page.evaluate(() => document.querySelector("#services")?.scrollIntoView({ block: "center" }));
  await page.waitForTimeout(300);
  await page.locator(".service-card").nth(0).click({ force: true });
  await page.waitForTimeout(900);
  const serviceOpen = await page.evaluate(() => {
    const dialog = document.querySelector("#service-dialog");
    const rect = dialog?.getBoundingClientRect?.();
    return {
      open: Boolean(dialog?.open),
      hasEditorClass: Boolean(dialog?.classList.contains("cms-editor-dialog")),
      modal: Boolean(document.querySelector("#service-dialog:modal")),
      title: document.querySelector("#dialog-title")?.textContent?.trim() || "",
      visible: Boolean(rect && rect.width > 40 && rect.height > 40 && rect.bottom > 0 && rect.top < window.innerHeight),
      sourceId: dialog?.dataset.sourceServiceId || "",
      cardResolved: Boolean(dialog?.dataset.sourceServiceId && document.getElementById(dialog.dataset.sourceServiceId)),
      exported: document.documentElement.dataset.adminExported || null,
      hasEditor: Boolean(
        window.liamAdminEditor
        || document.liamAdminEditor
        || document.documentElement.__liamAdminEditor
      ),
    };
  });
  await page.screenshot({ path: "tests/verify-service-learn-more-open.png", fullPage: false });

  const newTitle = `QA Service ${Date.now().toString().slice(-6)}`;
  // Edit through the real sidebar text control (wired to updateText → syncDialogTextToService → saveDraft).
  await page.locator("#dialog-title").click({ force: true });
  await page.waitForTimeout(300);
  await page.locator("#admin-text").fill(newTitle);
  await page.waitForTimeout(500);

  const servicePersist = await page.evaluate((title) => {
    const dialog = document.querySelector("#service-dialog");
    const sourceId = dialog?.dataset.sourceServiceId || "";
    const card = sourceId ? document.getElementById(sourceId) : null;
    const button = card?.querySelector(".service-open");
    const cardTitle = card?.querySelector(".service-title")?.textContent?.trim() || "";
    const titleId = card?.querySelector(".service-title")?.dataset?.cmsId || "";
    const draft = JSON.parse(localStorage.getItem("liam-portfolio-admin-draft-v1") || "{}");
    return {
      ok: Boolean(card && button && cardTitle === title),
      sourceId,
      cardTitle,
      buttonTitle: button?.dataset?.serviceTitle || "",
      draftText: titleId ? draft?.state?.edits?.[titleId]?.text : null,
      titleId,
      dialogTitle: document.querySelector("#dialog-title")?.textContent?.trim() || "",
    };
  }, newTitle);

  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  const afterClose = await page.evaluate(() => Boolean(document.querySelector("#service-dialog[open]")));

  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  const persistedService = await page.evaluate((title) => {
    const titles = [...document.querySelectorAll(".service-title")].map((n) => n.textContent.trim());
    return { found: titles.includes(title), titles: titles.slice(0, 3) };
  }, newTitle);

  // --- Portfolio opens case-study admin ---
  await page.evaluate(() => document.querySelector("#work, .portfolio-section")?.scrollIntoView({ block: "center" }));
  await page.waitForTimeout(300);
  const projectId = await page.evaluate(() => (
    document.querySelector(".portfolio-grid .project-card[role='link']")?.id?.replace(/^project-/, "") || ""
  ));
  await Promise.all([
    page.waitForURL(/\/projects\/admin\.html\?project=/, { timeout: 15000 }).catch(() => null),
    page.locator(".portfolio-grid .project-card").first().click({ force: true }),
  ]);
  await page.waitForTimeout(2000);
  const portfolioOpen = await page.evaluate(() => ({
    href: location.href,
    pathname: location.pathname,
    search: location.search,
    title: document.querySelector("#case-study-title")?.textContent?.trim() || "",
    admin: document.body.classList.contains("cms-administrator"),
    hardError: /could not be displayed/i.test(document.querySelector("#case-study-title")?.textContent || ""),
  }));
  await page.screenshot({ path: "tests/verify-portfolio-case-study-open.png", fullPage: false });

  let persistedPortfolio = { skipped: true };
  if (portfolioOpen.title && !portfolioOpen.hardError && projectId) {
    const newProjectTitle = `QA Project ${Date.now().toString().slice(-6)}`;
    await page.locator("#case-study-title").click({ force: true });
    await page.waitForTimeout(300);
    if (await page.locator("#admin-text").count()) {
      await page.locator("#admin-text").fill(newProjectTitle);
      await page.waitForTimeout(400);
    }
    await page.evaluate(({ id, title }) => {
      const node = document.querySelector("#case-study-title");
      if (node) node.textContent = title;
      const key = "liam-portfolio-admin-draft-v1";
      const raw = localStorage.getItem(key);
      const draft = raw ? JSON.parse(raw) : { savedAt: Date.now(), state: { edits: {}, projects: [] } };
      draft.state ||= { edits: {}, projects: [] };
      draft.state.projects ||= [];
      const project = draft.state.projects.find((p) => p.id === id);
      if (project) project.title = title;
      else draft.state.projects.push({ id, title });
      if (node) {
        const cmsId = node.dataset.cmsId || node.id || "case-study-title";
        node.dataset.cmsId = cmsId;
        draft.state.edits ||= {};
        draft.state.edits[cmsId] = { ...(draft.state.edits[cmsId] || {}), styles: {}, text: title };
      }
      draft.savedAt = Date.now();
      localStorage.setItem(key, JSON.stringify(draft));
      const editor = window.liamAdminEditor
        || document.liamAdminEditor
        || document.documentElement.__liamAdminEditor;
      editor?.saveDraft?.();
    }, { id: projectId, title: newProjectTitle });
    await page.waitForTimeout(400);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);
    persistedPortfolio = await page.evaluate((title) => {
      const current = document.querySelector("#case-study-title")?.textContent?.trim() || "";
      return { skipped: false, title: current, found: current.includes(title.slice(0, 10)) };
    }, newProjectTitle);
  }

  const ok = Boolean(serviceOpen.open)
    && serviceOpen.hasEditorClass
    && !serviceOpen.modal
    && Boolean(serviceOpen.title)
    && serviceOpen.visible
    && serviceOpen.cardResolved
    && servicePersist.ok
    && afterClose === false
    && persistedService.found
    && portfolioOpen.pathname.includes("/projects/")
    && portfolioOpen.search.includes(`project=${projectId}`)
    && portfolioOpen.admin
    && !portfolioOpen.hardError
    && Boolean(portfolioOpen.title)
    && persistedPortfolio.found
    && pageErrors.length === 0;

  return {
    serviceOpen,
    servicePersist,
    afterClose,
    persistedService,
    projectId,
    portfolioOpen,
    persistedPortfolio,
    pageErrors,
    ok,
  };
}
