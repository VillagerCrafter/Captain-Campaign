export default async function run(page) {
  await page.goto("http://127.0.0.1:4178/projects/admin.html", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);

  const first = await page.evaluate(() => {
    const picker = document.querySelector("#case-study-editor-picker");
    const buttons = [...(picker?.querySelectorAll("button") || [])].map((b) => b.textContent);
    return {
      hasPicker: Boolean(picker),
      buttonCount: buttons.length,
      title: document.querySelector("#case-study-title")?.textContent || "",
      active: picker?.querySelector("button.is-active, button[aria-pressed='true']")?.textContent || "",
      buttons,
    };
  });

  // Click a non-first project if available
  let second = null;
  if (first.buttonCount > 1) {
    const clicked = await page.evaluate(() => {
      const buttons = [...document.querySelectorAll("#case-study-editor-picker button")];
      const target = buttons.find((b) => b.getAttribute("aria-pressed") !== "true") || buttons[1];
      if (!target) return null;
      const name = target.textContent;
      target.click();
      return name;
    });
    await page.waitForTimeout(1500);
    second = await page.evaluate(() => {
      const picker = document.querySelector("#case-study-editor-picker");
      return {
        hasPicker: Boolean(picker),
        buttonCount: picker?.querySelectorAll("button").length || 0,
        title: document.querySelector("#case-study-title")?.textContent || "",
        active: picker?.querySelector("button.is-active, button[aria-pressed='true']")?.textContent || "",
        url: location.href,
      };
    });
    second.clicked = clicked;
  }

  const shapes = await page.evaluate(async () => {
    const res = await fetch("/site-content.json", { cache: "no-store" });
    const json = await res.json();
    const list = json.shapes || [];
    return {
      count: list.length,
      circles: list.filter((s) => s.kind === "circle").length,
      notes: list.filter((s) => s.kind === "note").length,
    };
  });

  await page.screenshot({ path: "tests/verify-portfolio-picker.png", fullPage: false });
  return {
    first,
    second,
    shapes,
    ok: Boolean(first.hasPicker && first.buttonCount > 0 && (!second || second.hasPicker) && shapes.circles === 0 && shapes.notes === 0),
  };
}
