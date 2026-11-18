export default async function run(page, ui) {
  const viewports = [320, 360, 375, 390, 430, 768, 1280];
  const results = [];
  for (const width of viewports) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(200);
    const data = await page.evaluate(() => {
      const doc = document.documentElement;
      const overflow = doc.scrollWidth > doc.clientWidth + 2;
      const h1 = document.querySelector(".hero h1");
      const serviceCols = getComputedStyle(document.querySelector(".services-grid")).gridTemplateColumns;
      const portfolioCols = getComputedStyle(document.querySelector(".portfolio-grid")).gridTemplateColumns;
      const aboutCols = getComputedStyle(document.querySelector(".about-layout")).gridTemplateColumns;
      return {
        overflow,
        scrollWidth: doc.scrollWidth,
        clientWidth: doc.clientWidth,
        h1FontSize: h1 ? getComputedStyle(h1).fontSize : null,
        serviceCols,
        portfolioCols,
        aboutCols,
        gutter: getComputedStyle(doc).getPropertyValue("--page-gutter").trim(),
      };
    });
    results.push({ width, ...data });
    await page.screenshot({
      path: `C:/Users/liamb/.cursor/projects/C-Users-liamb-Liam/assets/qa-mobile-${width}.png`,
      fullPage: false,
    });
  }
  return results;
}
