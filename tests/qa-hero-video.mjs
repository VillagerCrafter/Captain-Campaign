export default async function run(page) {
  const results = {};

  await page.goto("http://127.0.0.1:4178/?v=hero-loop", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForFunction(() => {
    const video = document.querySelector(".hero-video");
    return Boolean(video && video.readyState >= 2 && !video.paused && video.currentTime > 0.05);
  }, { timeout: 12000 }).catch(() => {});
  await page.waitForTimeout(800);

  results.public = await page.evaluate(() => {
    const video = document.querySelector(".hero-video");
    if (!video) return { missing: true };
    return {
      paused: video.paused,
      ended: video.ended,
      muted: video.muted,
      loop: video.loop,
      currentTime: video.currentTime,
      readyState: video.readyState,
      networkState: video.networkState,
      error: video.error ? { code: video.error.code, message: video.error.message } : null,
      srcAttr: video.getAttribute("src"),
      currentSrc: video.currentSrc || "",
      sourceSrc: video.querySelector("source")?.getAttribute("src") || "",
      reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    };
  });
  await page.screenshot({ path: "tests/verify-hero-video-public.png", fullPage: false });

  // Wait and confirm time advances (actually playing).
  await page.waitForTimeout(1800);
  results.publicLater = await page.evaluate(() => {
    const video = document.querySelector(".hero-video");
    return { paused: video?.paused, currentTime: video?.currentTime || 0 };
  });

  // Admin page too
  const context = page.context();
  const login = await context.request.post("http://127.0.0.1:4178/login", {
    form: { password: "test-admin-password-ok" },
    maxRedirects: 0,
    failOnStatusCode: false,
  });
  const setCookie = String(login.headers()["set-cookie"] || "");
  const token = /liam_admin=([^;]+)/.exec(setCookie)?.[1];
  if (token) {
    await context.addCookies([{
      name: "liam_admin",
      value: token,
      url: "http://127.0.0.1:4178",
      httpOnly: true,
      sameSite: "Strict",
    }]);
  }
  await page.goto("http://127.0.0.1:4178/admin", { waitUntil: "domcontentloaded", timeout: 30000 });
  if (await page.locator("#password").count()) {
    await page.locator("#password").fill("test-admin-password-ok");
    await page.locator("form[action='/login'] button[type='submit']").click();
    await page.waitForTimeout(2000);
  }
  await page.waitForFunction(() => {
    const video = document.querySelector(".hero-video");
    return Boolean(video && video.readyState >= 2 && !video.paused && video.currentTime > 0.05);
  }, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(800);
  results.admin = await page.evaluate(() => {
    const video = document.querySelector(".hero-video");
    if (!video) return { missing: true };
    return {
      paused: video.paused,
      currentTime: video.currentTime,
      readyState: video.readyState,
      error: video.error ? { code: video.error.code, message: video.error.message } : null,
      currentSrc: video.currentSrc || "",
      sourceSrc: video.querySelector("source")?.getAttribute("src") || "",
    };
  });
  await page.waitForTimeout(1800);
  results.adminLater = await page.evaluate(() => {
    const video = document.querySelector(".hero-video");
    return { paused: video?.paused, currentTime: video?.currentTime || 0 };
  });
  await page.screenshot({ path: "tests/verify-hero-video-admin.png", fullPage: false });

  const publicPlaying = !results.public.paused
    && !results.publicLater.paused
    && results.publicLater.currentTime > results.public.currentTime + 0.3;
  const adminPlaying = !results.admin.paused
    && !results.adminLater.paused
    && results.adminLater.currentTime > results.admin.currentTime + 0.3;

  return {
    results,
    publicPlaying,
    adminPlaying,
    ok: publicPlaying && adminPlaying,
  };
}
