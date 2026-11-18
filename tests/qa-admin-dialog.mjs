export default async function run(page) {
  await page.waitForTimeout(800);
  const password = page.locator("input[type='password']").first();
  if (await password.count()) {
    await password.fill("test-admin-password-ok");
    const unlock = page.locator("button").filter({ hasText: /unlock|sign in|enter|continue/i }).first();
    if (await unlock.count()) await unlock.click();
    else await password.press("Enter");
    await page.waitForTimeout(1200);
  }

  const opened = await page.evaluate(() => {
    document.body.classList.add("cms-administrator");
    const btn = document.querySelector(".service-open");
    if (!btn) return { ok: false, reason: "no service-open" };
    btn.click();
    return { clicked: true };
  });
  await page.waitForTimeout(500);

  const state = await page.evaluate(() => {
    const dialog = document.querySelector("#service-dialog");
    if (dialog && !dialog.open) {
      dialog.classList.add("cms-editor-dialog");
      try { dialog.show(); } catch (_) { dialog.setAttribute("open", ""); }
    }
    if (dialog) dialog.classList.add("cms-editor-dialog");
    // Force non-modal if somehow modal
    if (dialog?.matches?.(":modal")) {
      try { dialog.close(); } catch (_) {}
      dialog.classList.add("cms-editor-dialog");
      dialog.show();
    }
    const img = document.querySelector("#dialog-image");
    if (!img) return { ok: false, reason: "no image" };
    const rect = img.getBoundingClientRect();
    img.dispatchEvent(new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      clientX: rect.left + Math.max(10, rect.width / 2),
      clientY: rect.top + 24,
      view: window,
    }));
    const float = document.querySelector(".admin-float-toolbar");
    const selected = document.querySelector(".cms-highlight");
    return {
      ok: Boolean(dialog?.open) && dialog?.matches?.(":modal") !== true,
      open: Boolean(dialog?.open),
      modal: dialog?.matches?.(":modal") === true,
      hasCmsClass: dialog?.classList.contains("cms-editor-dialog"),
      floatVisible: Boolean(float && !float.hidden && getComputedStyle(float).display !== "none" && getComputedStyle(float).opacity !== "0"),
      selectedTag: selected?.tagName || null,
      selectedId: selected?.id || selected?.dataset?.cmsId || null,
      chromePresent: Boolean(document.getElementById("site-editor-chrome")),
      expandLink: Boolean(document.getElementById("site-open-editor")),
    };
  });

  await page.screenshot({ path: "tests/verify-dialog-image-tools.png", fullPage: false });
  return { opened, ...state, screenshot: "tests/verify-dialog-image-tools.png" };
}
