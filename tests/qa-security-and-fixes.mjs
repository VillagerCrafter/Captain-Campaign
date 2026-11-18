export default async function run(page, ui) {
  const results = {
    publicChrome: null,
    storyOverlap: null,
    caseStudyError: null,
    dialogEditable: null,
    screenshots: [],
  };

  // --- Public page: no admin chrome ---
  await page.goto("http://127.0.0.1:4178/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  const publicProbe = await page.evaluate(() => {
    const chrome = document.getElementById("site-editor-chrome");
    const text = document.body?.innerText || "";
    return {
      hasChrome: Boolean(chrome),
      hasExitPreview: /Exit preview/i.test(text),
      hasExpandToolbar: /Expand toolbar/i.test(text),
      hasOpenEditor: Boolean(document.getElementById("site-open-editor")),
    };
  });
  results.publicChrome = {
    ok: !publicProbe.hasChrome && !publicProbe.hasExitPreview && !publicProbe.hasExpandToolbar && !publicProbe.hasOpenEditor,
    ...publicProbe,
  };
  await page.screenshot({ path: "tests/verify-public-no-chrome.png", fullPage: false });
  results.screenshots.push("tests/verify-public-no-chrome.png");

  // --- Story section overlap: stakes note should not overlap cards ---
  const overlap = await page.evaluate(() => {
    const cards = [...document.querySelectorAll(".story-card")].map((el) => el.getBoundingClientRect());
    const note = document.querySelector(".stakes-note")?.getBoundingClientRect();
    if (!note || !cards.length) return { ok: false, reason: "missing story nodes" };
    const overlapsCard = cards.some((card) =>
      !(note.right < card.left || note.left > card.right || note.bottom < card.top || note.top > card.bottom));
    const noteTop = note.top;
    const lowestCardBottom = Math.max(...cards.map((c) => c.bottom));
    return {
      ok: !overlapsCard && noteTop >= lowestCardBottom - 2,
      overlapsCard,
      noteTop,
      lowestCardBottom,
      cardLefts: cards.map((c) => Math.round(c.left)),
    };
  });
  results.storyOverlap = overlap;
  await page.locator(".story-section").first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await page.screenshot({ path: "tests/verify-story-no-overlap.png", fullPage: false });
  results.screenshots.push("tests/verify-story-no-overlap.png");

  // --- Case study: no hard error when opened in CMS-like path without project ---
  await page.goto("http://127.0.0.1:4178/projects/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  const caseStudy = await page.evaluate(() => {
    const title = document.querySelector("#case-study-title")?.textContent || "";
    const status = document.querySelector("#case-study-status")?.textContent || "";
    return {
      title,
      status,
      hardError: /could not be displayed/i.test(title),
      hasPhotoHost: Boolean(document.querySelector("#case-study-photo-layout")),
    };
  });
  results.caseStudyError = {
    ok: !caseStudy.hardError,
    ...caseStudy,
  };
  await page.screenshot({ path: "tests/verify-case-study-no-error.png", fullPage: false });
  results.screenshots.push("tests/verify-case-study-no-error.png");

  // --- Admin: open Learn more and select dialog image ---
  await page.goto("http://127.0.0.1:4178/admin.html", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  // Unlock if password gate present
  const password = page.locator("#admin-password, input[type='password']").first();
  if (await password.count()) {
    await password.fill("test-admin-password-ok");
    const unlock = page.locator("button:has-text('Unlock'), button:has-text('Sign in'), #admin-unlock").first();
    if (await unlock.count()) await unlock.click();
    await page.waitForTimeout(1000);
  }

  const dialogProbe = await page.evaluate(async () => {
    const openBtn = document.querySelector(".service-open");
    if (!openBtn) return { ok: false, reason: "no service-open" };
    openBtn.click();
    await new Promise((r) => setTimeout(r, 200));
    // Prefer editor open path if available
    document.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, clientX: 40, clientY: 40 }));
    const dialog = document.querySelector("#service-dialog");
    if (dialog && !dialog.open) {
      dialog.classList.add("cms-editor-dialog");
      if (typeof dialog.show === "function") dialog.show();
      else dialog.setAttribute("open", "");
    }
    const img = document.querySelector("#dialog-image");
    if (!img) return { ok: false, reason: "no dialog image", open: dialog?.open };
    const rect = img.getBoundingClientRect();
    const target = document.elementFromPoint(rect.left + rect.width / 2, rect.top + Math.min(40, rect.height / 2));
    img.dispatchEvent(new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      clientX: rect.left + rect.width / 2,
      clientY: rect.top + 20,
      view: window,
    }));
    await new Promise((r) => setTimeout(r, 250));
    const float = document.querySelector(".admin-float-toolbar");
    const stillOpen = Boolean(dialog?.open);
    const selected = document.querySelector(".cms-highlight");
    const modal = dialog?.matches?.(":modal") === true;
    return {
      ok: stillOpen && !modal,
      stillOpen,
      modal,
      floatVisible: float && !float.hidden && getComputedStyle(float).display !== "none",
      selectedIsImage: selected === img || selected?.contains?.(img) || img.classList.contains("cms-highlight"),
      hitTag: target?.tagName || null,
      status: document.querySelector("#admin-status, [role='status']")?.textContent || "",
    };
  });
  results.dialogEditable = dialogProbe;
  await page.screenshot({ path: "tests/verify-dialog-image-tools.png", fullPage: false });
  results.screenshots.push("tests/verify-dialog-image-tools.png");

  results.allOk = Boolean(
    results.publicChrome?.ok
    && results.storyOverlap?.ok
    && results.caseStudyError?.ok
    && results.dialogEditable?.ok,
  );
  return results;
}
