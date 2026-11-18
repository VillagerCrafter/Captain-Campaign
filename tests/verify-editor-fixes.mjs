/**
 * Browser verification for delete / Add service / images / float toolbar / C-key.
 * Run against a live local_preview server.
 */
export default async function verify(page, ui) {
  const base = process.env.VERIFY_BASE || "http://localhost:8765";
  const results = {};

  // --- Public homepage images ---
  await page.goto(`${base}/`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  const publicImages = await page.evaluate(() => {
    const imgs = [...document.querySelectorAll(".portfolio-grid img, .services-grid img, .about-image-wrap img")];
    return imgs.map((img) => ({
      src: img.currentSrc || img.getAttribute("src"),
      naturalWidth: img.naturalWidth,
      complete: img.complete,
      missingClass: img.classList.contains("cms-image-missing"),
      hidden: img.hidden || getComputedStyle(img).display === "none" || getComputedStyle(img).opacity === "0",
      box: (() => {
        const r = img.getBoundingClientRect();
        return { w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top) };
      })(),
    }));
  });
  const loaded = publicImages.filter((i) => i.naturalWidth > 0 && !i.hidden);
  results.publicImages = {
    total: publicImages.length,
    loaded: loaded.length,
    sample: publicImages.slice(0, 6),
    fail: publicImages.filter((i) => i.naturalWidth === 0 || i.hidden).slice(0, 8),
  };

  // --- Admin login ---
  await page.goto(`${base}/admin`, { waitUntil: "networkidle" });
  const password = process.env.LIAM_ADMIN_PASSWORD || "local-preview-test-password";
  const pwd = page.locator('input[type="password"], input[name="password"]');
  if (await pwd.count()) {
    await pwd.first().fill(password);
    const submit = page.locator('button[type="submit"], input[type="submit"]');
    if (await submit.count()) await submit.first().click();
    else await pwd.first().press("Enter");
    await page.waitForTimeout(1500);
  }
  // Admin may redirect to / with editor scripts
  if (!page.url().includes("admin") && !(await page.locator(".admin-toolbar").count())) {
    await page.goto(`${base}/`, { waitUntil: "networkidle" });
  }
  await page.waitForSelector(".admin-toolbar, body.cms-administrator", { timeout: 20000 }).catch(() => null);
  await page.waitForTimeout(1200);

  results.adminLoaded = await page.evaluate(() => ({
    hasToolbar: Boolean(document.querySelector(".admin-toolbar")),
    hasEditor: Boolean(window.liamAdminEditor),
    hasFloat: Boolean(document.querySelector(".admin-float-toolbar")),
    addServiceBtn: Boolean(document.getElementById("admin-add-service")),
    quickAddService: Boolean(document.getElementById("admin-quick-add-service")),
    onPageAddService: Boolean(document.querySelector(".admin-add-service-button")),
    deleteBtn: Boolean(document.getElementById("admin-delete")),
  }));

  // Open Elements rail for Add service visibility
  await page.evaluate(() => {
    document.querySelector('.admin-rail-btn[data-rail="elements"]')?.click();
  });
  await page.waitForTimeout(300);
  results.elementsRail = await page.evaluate(() => ({
    quickAddServiceVisible: (() => {
      const el = document.getElementById("admin-quick-add-service");
      if (!el) return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    })(),
    text: document.getElementById("admin-quick-add-service")?.textContent || null,
  }));

  // --- Double-click image → float toolbar ---
  results.floatToolbar = await page.evaluate(async () => {
    const img = document.querySelector(".portfolio-grid img, .services-grid img, .about-image-wrap img");
    if (!img) return { ok: false, reason: "no img" };
    img.scrollIntoView({ block: "center" });
    const rect = img.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    img.dispatchEvent(new MouseEvent("dblclick", { bubbles: true, cancelable: true, clientX: x, clientY: y, view: window }));
    document.dispatchEvent(new CustomEvent("cms-open-float-toolbar", {
      detail: { clientX: x, clientY: y, element: img },
    }));
    await new Promise((r) => setTimeout(r, 200));
    const float = document.querySelector(".admin-float-toolbar");
    const style = float ? getComputedStyle(float) : null;
    return {
      ok: Boolean(float && !float.hidden && style?.display !== "none"),
      hidden: float?.hidden,
      display: style?.display,
      visibility: style?.visibility,
      hasMediaRow: Boolean(float?.querySelector('[data-for="media"]')),
    };
  });

  // --- Delete selected image ---
  results.delete = await page.evaluate(() => {
    const img = document.querySelector(".portfolio-grid img:not([hidden])");
    if (!img || !window.liamAdminEditor) return { ok: false, reason: "no img/editor" };
    window.liamAdminEditor.selectElement(img);
    const before = img.hidden;
    const btn = document.getElementById("admin-delete");
    const disabledBefore = btn?.disabled;
    window.liamAdminEditor.deleteElements([img]);
    return {
      ok: img.hidden === true || !img.isConnected,
      disabledBefore,
      beforeHidden: before,
      afterHidden: img.hidden,
      connected: img.isConnected,
    };
  });

  // --- C key does not change scroll ---
  results.cKey = await page.evaluate(() => {
    const y0 = window.scrollY;
    const evDown = new KeyboardEvent("keydown", { key: "c", bubbles: true, cancelable: true });
    document.dispatchEvent(evDown);
    const y1 = window.scrollY;
    const hold = document.body.classList.contains("cms-snap-hold-off");
    const evUp = new KeyboardEvent("keyup", { key: "c", bubbles: true, cancelable: true });
    document.dispatchEvent(evUp);
    const y2 = window.scrollY;
    return { y0, y1, y2, hold, jumped: y1 !== y0 || y2 !== y0 };
  });

  await page.screenshot({ path: "tests/verify-admin-shot.png", fullPage: false });
  return results;
}
