export default async function run(page) {
  const base = new URL(page.url()).origin || "http://127.0.0.1:4178";
  const password = "test-admin-password-ok";
  const context = page.context();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(String(error?.stack || error)));

  const login = await context.request.post(`${base}/login`, {
    form: { password },
    maxRedirects: 0,
    failOnStatusCode: false,
  });
  const setCookie = String(login.headers()["set-cookie"] || login.headers()["Set-Cookie"] || "");
  const token = /liam_admin=([^;]+)/.exec(setCookie)?.[1];
  if (token) {
    await context.addCookies([{
      name: "liam_admin",
      value: token,
      url: `${base}/`,
      httpOnly: true,
      sameSite: "Strict",
    }]);
  }

  await page.goto(`${base}/admin.html`, { waitUntil: "domcontentloaded", timeout: 30000 });
  const needsLogin = await page.locator("#password").count()
    || /not found/i.test(await page.locator("body").innerText());
  if (needsLogin) {
    await page.goto(`${base}/admin`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.locator("#password").fill(password);
    await Promise.all([
      page.waitForURL(/admin\.html/, { timeout: 20000 }),
      page.locator("form[action='/login'] button[type='submit']").click(),
    ]);
  }
  await page.waitForSelector(".admin-toolbar", { timeout: 20000 });
  const setupHandle = await page.waitForFunction(() => {
    const editor = window.liamAdminEditor;
    const section = document.querySelector("#services");
    if (!editor?.selectElement || !editor?.syncSectionResizeHandle || !section) return false;
    section.scrollIntoView({ block: "center" });
    editor.selectElement(section);
    editor.syncSectionResizeHandle(section);
    const dock = section.querySelector(".cms-section-resize-dock");
    const box = dock?.getBoundingClientRect();
    if (!dock || !box || box.width < 40 || box.height < 16) return false;
    return {
      editor: true,
      href: location.href,
      status: document.querySelector("#admin-status")?.textContent || "",
      selectedTag: document.querySelector(".cms-highlight")?.tagName || "",
      selectedId: document.querySelector(".cms-highlight")?.id || "",
      position: getComputedStyle(dock).position,
      overflow: getComputedStyle(section).overflow,
      dockBox: {
        top: Math.round(box.top),
        left: Math.round(box.left),
        width: Math.round(box.width),
        height: Math.round(box.height),
        inViewport: box.top >= -1 && box.bottom <= window.innerHeight + 1 && box.left < window.innerWidth && box.right > 0,
      },
    };
  }, { timeout: 20000 });
  const setup = await setupHandle.jsonValue();
  const boot = {
    editor: Boolean(setup?.editor),
    href: setup?.href || page.url(),
    status: setup?.status || "",
    pageErrors,
    loginStatus: login.status(),
    cookieSet: Boolean(token),
  };

  const codeCheck = await page.evaluate(async () => {
    const alt = await fetch("/admin.js", { cache: "no-store" }).then((response) => response.text());
    return {
      hasDock: alt.includes("cms-section-resize-dock"),
      hasTypedMargin: alt.includes("cms-section-margin-input"),
      len: alt.length,
    };
  });
  await page.waitForTimeout(200);

  const before = await page.evaluate(() => {
    const section = document.querySelector("#services");
    const dock = section?.querySelector(".cms-section-resize-dock");
    const box = dock?.getBoundingClientRect();
    const style = dock ? getComputedStyle(dock) : null;
    return {
      selectedTag: document.querySelector(".cms-highlight")?.tagName || "",
      selectedId: document.querySelector(".cms-highlight")?.id || "",
      hasDock: Boolean(dock),
      hasHandle: Boolean(section?.querySelector(".cms-section-resize-handle")),
      hasHeight: Boolean(section?.querySelector(".cms-section-height-input")),
      hasMargin: Boolean(section?.querySelector(".cms-section-margin-input")),
      height: Number(section?.querySelector(".cms-section-height-input")?.value || 0),
      margin: Number(section?.querySelector(".cms-section-margin-input")?.value || 0),
      position: style?.position || "",
      overflow: section ? getComputedStyle(section).overflow : "",
      dockBox: box ? {
        top: Math.round(box.top),
        left: Math.round(box.left),
        width: Math.round(box.width),
        height: Math.round(box.height),
        inViewport: box.width > 40
          && box.height > 16
          && box.top >= -1
          && box.bottom <= window.innerHeight + 1
          && box.right > 0
          && box.left < window.innerWidth,
      } : null,
    };
  });

  const typed = await page.evaluate(() => {
    const section = document.querySelector("#services");
    const heightInput = section?.querySelector(".cms-section-height-input");
    const marginInput = section?.querySelector(".cms-section-margin-input");
    if (!heightInput || !marginInput) return { ok: false, reason: "missing inputs" };
    heightInput.value = "980";
    heightInput.dispatchEvent(new Event("input", { bubbles: true }));
    heightInput.dispatchEvent(new Event("change", { bubbles: true }));
    marginInput.value = "32";
    marginInput.dispatchEvent(new Event("input", { bubbles: true }));
    marginInput.dispatchEvent(new Event("change", { bubbles: true }));
    return {
      ok: true,
      minHeight: section.style.minHeight,
      paddingInline: section.style.paddingInline,
      heightValue: heightInput.value,
      marginValue: marginInput.value,
    };
  });
  await page.waitForTimeout(300);

  const handle = page.locator("#services .cms-section-resize-handle");
  let draggedTo = null;
  if (await handle.count()) {
    const handleBox = await handle.boundingBox();
    if (handleBox) {
      await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2 + 120, { steps: 8 });
      await page.mouse.up();
      await page.waitForTimeout(400);
      draggedTo = await page.evaluate(() => document.querySelector("#services")?.style.minHeight || "");
    }
  }

  const after = await page.evaluate(() => {
    const section = document.querySelector("#services");
    return {
      minHeight: section?.style.minHeight || "",
      heightValue: Number(section?.querySelector(".cms-section-height-input")?.value || 0),
      marginValue: Number(section?.querySelector(".cms-section-margin-input")?.value || 0),
      paddingInline: section?.style.paddingInline || "",
      dockActiveVisible: Boolean(section?.querySelector(".cms-section-resize-dock")),
    };
  });

  await page.screenshot({ path: "tests/verify-section-resize.png", fullPage: false });

  return {
    codeCheck,
    boot,
    before,
    typed,
    draggedTo,
    after,
    ok: codeCheck.hasDock
      && boot.editor
      && before.hasDock
      && before.hasHandle
      && before.hasHeight
      && before.hasMargin
      && before.dockBox?.inViewport === true
      && before.position === "fixed"
      && typed.ok
      && after.dockActiveVisible
      && after.heightValue > 980
      && after.marginValue === 32
      && /px/.test(after.minHeight)
      && /32px/.test(after.paddingInline || typed.paddingInline || ""),
  };
}
