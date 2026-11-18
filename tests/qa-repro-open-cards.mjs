/** Reproduce: in CMS edit mode, clicking service/portfolio should open Learn more / project detail,
 * but currently only selects + opens edit toolbar. Capture evidence BEFORE any fix. */
export default async function run(page) {
  const base = "http://127.0.0.1:4178";
  const password = "test-admin-password-ok";
  const context = page.context();
  const pageErrors = [];
  const consoleMsgs = [];
  const failed = [];
  page.on("pageerror", (err) => pageErrors.push(String(err?.stack || err)));
  page.on("console", (msg) => consoleMsgs.push(`${msg.type()}: ${msg.text()}`));
  page.on("requestfailed", (req) => failed.push(`${req.failure()?.errorText || "fail"} ${req.url()}`));

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
  await page.evaluate(() => {
    document.querySelectorAll(".admin-float-toolbar").forEach((n) => { n.hidden = true; n.style.display = "none"; });
  });

  // --- Service card / Learn more ---
  await page.evaluate(() => document.querySelector("#services")?.scrollIntoView({ block: "center" }));
  await page.waitForTimeout(400);
  const beforeService = await page.evaluate(() => ({
    href: location.href,
    dialogOpen: Boolean(document.querySelector("#service-dialog[open]")),
    dialogModal: Boolean(document.querySelector("#service-dialog:modal")),
    floatVisible: (() => {
      const f = document.querySelector(".admin-float-toolbar");
      return Boolean(f && !f.hidden && getComputedStyle(f).display !== "none");
    })(),
    editMode: !document.body.classList.contains("cms-preview-mode"),
    admin: document.body.classList.contains("cms-administrator"),
  }));

  // Click the Learn more / service-open control (card button)
  const serviceBtn = page.locator(".service-card .service-open, .service-card button.service-open").first();
  const serviceTitle = page.locator(".service-card .service-title").first();
  await serviceTitle.click({ force: true });
  await page.waitForTimeout(700);
  const afterServiceTitleClick = await page.evaluate(() => ({
    dialogOpen: Boolean(document.querySelector("#service-dialog[open]")),
    dialogModal: Boolean(document.querySelector("#service-dialog:modal")),
    floatVisible: (() => {
      const f = document.querySelector(".admin-float-toolbar");
      return Boolean(f && !f.hidden && getComputedStyle(f).display !== "none");
    })(),
    selected: document.querySelector(".cms-highlight")?.className || "",
    selectedText: document.querySelector(".cms-highlight")?.textContent?.trim()?.slice(0, 80) || "",
  }));
  await page.screenshot({ path: "tests/repro-service-title-click.png", fullPage: false });

  // Click the card / Learn more affordance more directly
  await page.evaluate(() => {
    document.querySelectorAll(".admin-float-toolbar").forEach((n) => { n.hidden = true; n.style.display = "none"; });
  });
  const openBtn = page.locator(".service-card").first().locator(".service-open, .service-image-action, button").first();
  await openBtn.click({ force: true });
  await page.waitForTimeout(800);
  const afterServiceOpenClick = await page.evaluate(() => ({
    dialogOpen: Boolean(document.querySelector("#service-dialog[open]")),
    dialogModal: Boolean(document.querySelector("#service-dialog:modal")),
    dialogTitle: document.querySelector("#dialog-title")?.textContent?.trim() || "",
    floatVisible: (() => {
      const f = document.querySelector(".admin-float-toolbar");
      return Boolean(f && !f.hidden && getComputedStyle(f).display !== "none");
    })(),
    selected: document.querySelector(".cms-highlight")?.tagName || "",
  }));
  await page.screenshot({ path: "tests/repro-service-open-click.png", fullPage: false });

  // --- Portfolio project card ---
  await page.evaluate(() => document.querySelector("#work, .portfolio-section")?.scrollIntoView({ block: "center" }));
  await page.waitForTimeout(400);
  const beforePortfolio = await page.evaluate(() => ({
    href: location.href,
    firstCardHref: document.querySelector(".project-card[role='link'], .project-card a, .project-card")?.getAttribute?.("href")
      || document.querySelector(".project-card")?.dataset?.href
      || document.querySelector(".project-card")?.getAttribute("data-project-url")
      || "",
    firstCardRole: document.querySelector(".project-card")?.getAttribute("role") || "",
    firstCardOnclick: Boolean(document.querySelector(".project-card")?.onclick),
  }));

  const portfolioCard = page.locator(".portfolio-grid .project-card").first();
  await portfolioCard.click({ force: true });
  await page.waitForTimeout(1000);
  const afterPortfolioClick = await page.evaluate(() => ({
    href: location.href,
    pathname: location.pathname,
    floatVisible: (() => {
      const f = document.querySelector(".admin-float-toolbar");
      return Boolean(f && !f.hidden && getComputedStyle(f).display !== "none");
    })(),
    selected: document.querySelector(".cms-highlight")?.className || "",
    caseStudyVisible: Boolean(document.querySelector("#case-study-title, .case-study-page, #case-study")),
  }));
  await page.screenshot({ path: "tests/repro-portfolio-click.png", fullPage: false });

  // Public baseline: same clicks should open dialog / navigate
  await page.goto(`${base}/`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  await page.evaluate(() => document.querySelector("#services")?.scrollIntoView({ block: "center" }));
  await page.waitForTimeout(300);
  await page.locator(".service-open").first().click();
  await page.waitForTimeout(600);
  const publicService = await page.evaluate(() => ({
    dialogOpen: Boolean(document.querySelector("#service-dialog[open]")),
    dialogModal: Boolean(document.querySelector("#service-dialog:modal")),
    title: document.querySelector("#dialog-title")?.textContent?.trim() || "",
  }));
  await page.screenshot({ path: "tests/repro-public-service-open.png", fullPage: false });

  await page.keyboard.press("Escape");
  await page.evaluate(() => document.querySelector("#work, .portfolio-section")?.scrollIntoView({ block: "center" }));
  await page.waitForTimeout(300);
  const publicPortfolioBefore = await page.evaluate(() => location.href);
  await page.locator(".portfolio-grid .project-card").first().click();
  await page.waitForTimeout(1200);
  const publicPortfolio = await page.evaluate(() => ({
    href: location.href,
    pathname: location.pathname,
    title: document.title,
  }));

  const bugConfirmed = !afterServiceOpenClick.dialogOpen
    && !afterServiceTitleClick.dialogOpen
    && (afterPortfolioClick.pathname === "/admin" || afterPortfolioClick.pathname === "/admin.html" || afterPortfolioClick.href.includes("/admin"))
    && publicService.dialogOpen;

  return {
    beforeService,
    afterServiceTitleClick,
    afterServiceOpenClick,
    beforePortfolio,
    afterPortfolioClick,
    publicService,
    publicPortfolioBefore,
    publicPortfolio,
    pageErrors: pageErrors.slice(0, 20),
    consoleMsgs: consoleMsgs.filter((m) => /error|Error|cms|service|dialog/i.test(m)).slice(0, 30),
    failed: failed.slice(0, 15),
    bugConfirmed,
    summary: bugConfirmed
      ? "REPRODUCED: admin clicks select/toolbar only; public Learn more opens; portfolio does not leave admin"
      : "Could not confirm expected failure pattern — inspect payloads",
  };
}
