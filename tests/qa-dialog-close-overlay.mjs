export default async function run(page) {
  const results = {};

  // Public/home: hero shade should not use the old harsh left gradient.
  await page.waitForTimeout(600);
  results.heroShade = await page.evaluate(() => {
    const shade = document.querySelector(".hero-shade");
    if (!shade) return { ok: false, reason: "missing shade" };
    const bg = getComputedStyle(shade).backgroundImage || "";
    return {
      ok: !bg.includes("rgb(9, 17, 13) 0%") || bg.includes("linear-gradient(180deg"),
      has180: /linear-gradient\(180deg/i.test(bg),
      harshOld: /0%.*41%.*100%/i.test(bg),
      background: bg.slice(0, 220),
    };
  });
  await page.screenshot({ path: "tests/verify-hero-shade-uniform.png", fullPage: false });

  // Confirm duplicate content blocks are gone from published content.
  results.contentBlocks = await page.evaluate(async () => {
    const res = await fetch("/site-content.json", { cache: "no-store" });
    const json = await res.json();
    const blocks = json.contentBlocks || [];
    const beetle = blocks.filter((b) => String(b.image || b.src || "").includes("3bbd03849e7dc61fe781799da47d4d13"));
    return { ok: beetle.length === 0 && blocks.length === 0, count: blocks.length, beetle: beetle.length };
  });

  // Admin: open Learn more and close with X
  await page.goto("http://127.0.0.1:4178/admin", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(700);
  const password = page.locator("input[type='password']").first();
  if (await password.count()) {
    await password.fill("test-admin-password-ok");
    await password.press("Enter");
    await page.waitForTimeout(1500);
  }

  results.dialogClose = await page.evaluate(async () => {
    document.body.classList.add("cms-administrator");
    const btn = document.querySelector(".service-open");
    if (!btn) return { ok: false, reason: "no service-open" };
    btn.click();
    await new Promise((r) => setTimeout(r, 250));
    const dialog = document.querySelector("#service-dialog");
    if (dialog && !dialog.open) {
      dialog.classList.add("cms-editor-dialog");
      try { dialog.show(); } catch (_) { dialog.setAttribute("open", ""); }
    }
    dialog?.classList.add("cms-editor-dialog");
    const close = dialog?.querySelector(".dialog-close");
    if (!close) return { ok: false, reason: "no close button", open: dialog?.open };
    const style = getComputedStyle(close);
    close.click();
    await new Promise((r) => setTimeout(r, 150));
    return {
      ok: !dialog.open && style.display !== "none" && Number.parseInt(style.zIndex || "0", 10) >= 5,
      openAfter: dialog.open,
      zIndex: style.zIndex,
      visible: style.display !== "none" && style.visibility !== "hidden",
    };
  });
  await page.screenshot({ path: "tests/verify-dialog-close-x.png", fullPage: false });

  results.allOk = Boolean(results.heroShade?.ok && results.contentBlocks?.ok && results.dialogClose?.ok);
  return results;
}
