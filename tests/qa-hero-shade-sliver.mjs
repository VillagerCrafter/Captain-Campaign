export default async function run(page) {
  // Login to admin so we see the same sidebar + hero layout as the user
  await page.goto("http://127.0.0.1:4178/admin", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(500);
  const password = page.locator("input[type='password']").first();
  if (await password.count()) {
    await password.fill("test-admin-password-ok");
    await password.press("Enter");
    await page.waitForTimeout(1800);
  }

  await page.waitForSelector(".hero-shade, .hero-video", { timeout: 15000 });
  await page.waitForTimeout(800);

  const probe = await page.evaluate(() => {
    const hero = document.querySelector(".hero");
    const shade = document.querySelector(".hero-shade");
    const media = document.querySelector(".hero-media");
    const video = document.querySelector(".hero-video");
    if (!hero || !shade || !media) return { ok: false, reason: "missing nodes" };

    const hr = hero.getBoundingClientRect();
    const sr = shade.getBoundingClientRect();
    const mr = media.getBoundingClientRect();
    const sampleY = Math.round(hr.top + Math.min(120, hr.height * 0.35));
    const xs = [0, 1, 2, 4, 8, 16, 32, 64].map((dx) => Math.round(hr.left + dx));

    const samples = xs.map((x) => {
      const data = document.createElement("canvas");
      // Use elementFromPoint + computed overlays; also read pixels via draw if possible
      const el = document.elementFromPoint(x, sampleY);
      return { x, el: el?.className || el?.tagName || null };
    });

    return {
      hero: { left: hr.left, width: hr.width, top: hr.top, height: hr.height },
      shade: { left: sr.left, width: sr.width, top: sr.top, height: sr.height },
      media: { left: mr.left, width: mr.width },
      videoOpacity: video ? getComputedStyle(video).opacity : null,
      shadeBg: getComputedStyle(shade).backgroundColor,
      shadeZ: getComputedStyle(shade).zIndex,
      mediaZ: getComputedStyle(media).zIndex,
      shadeLeftGap: Math.round(sr.left - hr.left),
      shadeRightGap: Math.round((hr.left + hr.width) - (sr.left + sr.width)),
      mediaLeftGap: Math.round(mr.left - hr.left),
      uniformMargin: document.body.classList.contains("cms-uniform-section-margin"),
      sectionPad: getComputedStyle(hero).paddingLeft,
      samples,
      ok: Math.abs(sr.left - hr.left) < 1 && Math.abs(sr.width - hr.width) < 2,
    };
  });

  // Pixel-compare left edge vs interior via screenshot crop
  await page.locator(".hero").first().screenshot({ path: "tests/verify-hero-sliver-check.png" });

  // Sample brightness along a horizontal line near top of hero video area
  const brightness = await page.evaluate(async () => {
    const hero = document.querySelector(".hero");
    const rect = hero.getBoundingClientRect();
    const canvas = document.createElement("canvas");
    const w = Math.floor(rect.width);
    const h = Math.floor(Math.min(180, rect.height));
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");

    // Draw current viewport region of hero by using html2canvas-less approach:
    // capture with foreignObject is unreliable; instead compare shade coverage geometry
    // and computed overlay presence.
    const shade = document.querySelector(".hero-shade");
    const sr = shade.getBoundingClientRect();
    const y = rect.top + 80;
    const points = [];
    for (let i = 0; i < 12; i += 1) {
      const x = rect.left + 1 + i * 6;
      const stack = [];
      let el = document.elementFromPoint(x, y);
      let depth = 0;
      while (el && depth < 6) {
        stack.push(el.className || el.tagName);
        el = el.parentElement;
        depth += 1;
      }
      const shadeCovers = x >= sr.left - 0.5 && x <= sr.right + 0.5;
      points.push({ x: Math.round(x - rect.left), shadeCovers, top: stack[0] });
    }
    return {
      points,
      uncovered: points.filter((p) => !p.shadeCovers),
      shadeInsetLeft: Math.round(sr.left - rect.left),
      shadeInsetRight: Math.round(rect.right - sr.right),
    };
  });

  return { probe, brightness, screenshot: "tests/verify-hero-sliver-check.png" };
}
