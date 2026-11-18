export default async function (page) {
  const password = process.env.LIAM_ADMIN_PASSWORD || "test-admin-password-ok";
  const base = new URL(page.url()).origin;
  const context = page.context();

  const login = await context.request.post(`${base}/login`, {
    form: { password },
    maxRedirects: 0,
    failOnStatusCode: false,
  });
  const setCookie = login.headers()["set-cookie"] || "";
  const tokenMatch = String(setCookie).match(/liam_admin=([^;]+)/);
  if (tokenMatch) {
    await context.addCookies([{
      name: "liam_admin",
      value: tokenMatch[1],
      url: base,
      httpOnly: true,
      sameSite: "Strict",
    }]);
  }

  // Bust cached admin.js from previous preview copy
  await page.goto(`${base}/admin.html?v=${Date.now()}`, { waitUntil: "domcontentloaded", timeout: 45000 });

  const handle = await page.waitForFunction(() => {
    const editor = window.liamAdminEditor;
    if (!editor || typeof editor.byId !== "function" || typeof editor.syncRelevantControls !== "function") return false;

    const byId = editor.byId;
    const hidden = (id) => {
      const el = byId(id);
      if (!el) return { missing: true, hidden: true };
      const gate = el.closest("[data-relevant]") || el;
      return {
        missing: false,
        hidden: gate.classList.contains("admin-relevant-hidden"),
        relevant: gate.getAttribute?.("data-relevant") || "",
        disabled: Boolean(el.disabled),
      };
    };

    const probe = (label, element) => {
      try {
        editor.selectElement(element);
        editor.syncRelevantControls(element);
      } catch (error) {
        return { case: label, error: String(error?.message || error) };
      }
      return {
        case: label,
        kind: editor.selectionKind(element),
        selectedTag: editor.selected?.tagName || null,
        replace: hidden("admin-replace-media"),
        text: hidden("admin-text"),
        bold: hidden("admin-bold"),
        width: hidden("admin-width"),
        href: hidden("admin-href"),
        font: hidden("admin-font-size"),
        height: hidden("admin-height"),
        cropPanel: hidden("editor-crop-fit"),
        hintHidden: byId("admin-section-height-hint")?.hidden !== false,
      };
    };

    const results = [];
    const img = document.querySelector("main img");
    const heading = document.querySelector("main h1, main h2");
    const section = document.querySelector("main > section");
    const link = document.querySelector("main a.button, main a.nav-cta");
    if (img) results.push(probe("media", img));
    if (heading) results.push(probe("text", heading));
    if (link) results.push(probe("link", link));
    if (section) results.push(probe("section", section));
    return { results, marker: "probe-v3", url: location.href };
  }, { timeout: 45000 });

  return handle.jsonValue();
}
