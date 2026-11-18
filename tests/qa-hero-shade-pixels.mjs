export default async function run(page) {
  await page.goto("http://127.0.0.1:4178/admin", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(400);
  const password = page.locator("input[type='password']").first();
  if (await password.count()) {
    await password.fill("test-admin-password-ok");
    await password.press("Enter");
    await page.waitForTimeout(1600);
  }
  await page.waitForSelector(".hero-shade", { timeout: 15000 });
  await page.waitForTimeout(500);

  const hero = page.locator(".hero").first();
  await hero.screenshot({ path: "tests/verify-hero-shade-final.png" });

  // Compare average luminance in left-edge strip vs mid strip vs right strip
  const stats = await page.evaluate(async () => {
    const heroEl = document.querySelector(".hero");
    const rect = heroEl.getBoundingClientRect();
    // Use Offscreen-less: draw hero via html isn't available; sample shade coverage + geometry
    const shade = document.querySelector(".hero-shade");
    const media = document.querySelector(".hero-media");
    const sr = shade.getBoundingClientRect();
    const mr = media.getBoundingClientRect();
    const hr = rect;
    const leftGap = Math.abs(sr.left - hr.left);
    const rightGap = Math.abs(sr.right - hr.right);
    const mediaGap = Math.abs(mr.left - hr.left);
    const shadeStyle = getComputedStyle(shade);
    return {
      leftGap,
      rightGap,
      mediaGap,
      sameWidth: Math.abs(sr.width - hr.width) < 1,
      flatWash: shadeStyle.backgroundImage === "none" || !/90deg/.test(shadeStyle.backgroundImage),
      backgroundColor: shadeStyle.backgroundColor,
      ok: leftGap < 0.75 && rightGap < 0.75 && mediaGap < 0.75 && Math.abs(sr.width - hr.width) < 1,
    };
  });

  return { stats, screenshot: "tests/verify-hero-shade-final.png" };
}
