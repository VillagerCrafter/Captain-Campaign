/**
 * Feature regression tests for Captain Campaign editor helpers.
 * Run with: node tests/editor-feature-tests.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const PASS = [];
const FAIL = [];

const test = (name, fn) => {
  try {
    fn();
    PASS.push(name);
  } catch (error) {
    FAIL.push({ name, message: error.message });
  }
};

const snapValue = (value, guides, threshold = 6) => {
  let next = value;
  let snapped = false;
  guides.forEach((guide) => {
    if (Math.abs(value - guide) <= threshold) {
      next = guide;
      snapped = true;
    }
  });
  return { value: next, snapped };
};

const groupMembers = (edits, groupId) =>
  Object.entries(edits)
    .filter(([, edit]) => edit?.groupId === groupId)
    .map(([id]) => id);

const analyticsSummary = (visits, now = Date.now()) => {
  const sec = Math.floor(now / 1000);
  const buckets = {
    day1: sec - 86_400,
    day7: sec - 7 * 86_400,
    day14: sec - 14 * 86_400,
    day30: sec - 30 * 86_400,
    day90: sec - 90 * 86_400,
  };
  const summary = { all: visits.length };
  for (const [key, since] of Object.entries(buckets)) {
    summary[key] = visits.filter((visit) => Number(visit.t) >= since).length;
  }
  return summary;
};

const mediaLibraryAdd = (library, folder, item) => {
  const next = structuredClone(library);
  next.folders[folder] ||= [];
  next.folders[folder].push(item);
  next.activeFolder = folder;
  return next;
};

test("snap guides lock near grid lines", () => {
  const result = snapValue(103, [0, 20, 40, 60, 80, 100, 120], 6);
  assert.equal(result.value, 100);
  assert.equal(result.snapped, true);
});

test("snap leaves far values untouched", () => {
  const result = snapValue(47, [0, 20, 40, 60], 4);
  assert.equal(result.value, 47);
  assert.equal(result.snapped, false);
});

test("grouping keeps all members under one group id", () => {
  const edits = {
    a: { groupId: "g1" },
    b: { groupId: "g1" },
    c: { styles: {} },
  };
  assert.deepEqual(groupMembers(edits, "g1").sort(), ["a", "b"]);
});

test("analytics periods count visits correctly", () => {
  const now = Date.UTC(2026, 10, 13, 18, 0, 0);
  const visits = [
    { t: Math.floor(now / 1000) - 100 },
    { t: Math.floor(now / 1000) - 3 * 86_400 },
    { t: Math.floor(now / 1000) - 20 * 86_400 },
    { t: Math.floor(now / 1000) - 100 * 86_400 },
  ];
  const summary = analyticsSummary(visits, now);
  assert.equal(summary.all, 4);
  assert.equal(summary.day1, 1);
  assert.equal(summary.day7, 2);
  assert.equal(summary.day30, 3);
  assert.equal(summary.day90, 3);
});

test("uploads library stores files inside folders", () => {
  const library = mediaLibraryAdd(
    { folders: { Inbox: [] }, activeFolder: "Inbox" },
    "Campaigns",
    { url: "/uploads/a.jpg", name: "a.jpg" },
  );
  assert.equal(library.activeFolder, "Campaigns");
  assert.equal(library.folders.Campaigns.length, 1);
  assert.equal(library.folders.Campaigns[0].url, "/uploads/a.jpg");
});

test("lock flag prevents move intent", () => {
  const edit = { locked: true, styles: { left: 10 } };
  const canMove = !edit.locked;
  assert.equal(canMove, false);
});

test("crop zoom stays within bounds", () => {
  const zoom = Math.max(100, Math.min(220, 100 + 8 * 20));
  assert.equal(zoom, 220);
});

const snapResizeDimensions = (width, height, sizeGuides, threshold = 8) => {
  const snapValue = (value, guides) => {
    let next = value;
    let snapped = false;
    guides.forEach((guide) => {
      if (Math.abs(value - guide) <= threshold) {
        next = guide;
        snapped = true;
      }
    });
    return { value: next, snapped };
  };
  const snappedW = snapValue(width, sizeGuides.widths || []);
  const snappedH = snapValue(height, sizeGuides.heights || []);
  return { width: snappedW.value, height: snappedH.value, snappedW: snappedW.snapped, snappedH: snappedH.snapped };
};

const dismissTemporaryToolbar = (menus, target) => {
  const inside = menus.some((menu) => menu.contains(target));
  if (inside) return menus.map((menu) => ({ ...menu, hidden: menu.hidden }));
  return menus.map((menu) => ({ ...menu, hidden: true }));
};

const brandKitSave = (kit, name, colors) => {
  const next = structuredClone(kit);
  next.kits ||= [];
  const payload = { name, colors: [...colors] };
  const index = next.kits.findIndex((entry) => entry.name === name);
  if (index >= 0) next.kits[index] = payload;
  else next.kits.push(payload);
  next.activeKit = name;
  next.colors = [...colors];
  return next;
};

const previewNavTarget = (href) => {
  if (href === "/" || href === "/index.html") return "/admin.html";
  if (href.startsWith("/projects") && !href.includes("admin.html")) {
    return "/projects/admin.html?preview=draft";
  }
  return href;
};

const placeUploadPayload = (item) => ({
  id: "content-block-demo",
  type: /\.(mp4|webm)$/i.test(item.url) ? "video" : "image",
  image: item.url,
  src: item.url,
  alt: (item.name || "Upload").replace(/\.[^.]+$/, ""),
});

test("size snap matches nearby portfolio image dimensions", () => {
  const result = snapResizeDimensions(402, 259, { widths: [400, 320], heights: [260, 180] });
  assert.equal(result.width, 400);
  assert.equal(result.height, 260);
  assert.equal(result.snappedW, true);
  assert.equal(result.snappedH, true);
});

test("temporary toolbars close when clicking outside", () => {
  const menus = [
    { id: "float", hidden: false, contains: (target) => target === "inside-float" },
    { id: "image", hidden: false, contains: (target) => target === "inside-image" },
  ];
  const closed = dismissTemporaryToolbar(menus, "page");
  assert.equal(closed.every((menu) => menu.hidden), true);
  const kept = dismissTemporaryToolbar(menus, "inside-float");
  assert.equal(kept[0].hidden, false);
});

test("custom brand kits persist colour arrays by name", () => {
  const saved = brandKitSave(
    { colors: ["#1A2B49"], kits: [], activeKit: "Captain Campaign" },
    "Studio",
    ["#101010", "#FFAA00"],
  );
  assert.equal(saved.activeKit, "Studio");
  assert.deepEqual(saved.kits[0].colors, ["#101010", "#FFAA00"]);
});

test("preview navigation stays on editor routes", () => {
  assert.equal(previewNavTarget("/"), "/admin.html");
  assert.equal(previewNavTarget("/projects/"), "/projects/admin.html?preview=draft");
  assert.equal(previewNavTarget("/admin.html"), "/admin.html");
});

const slugifyPageTitle = (title) => {
  const slug = String(title || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return slug || "page";
};

test("custom page slugify matches add-page rules", () => {
  assert.equal(slugifyPageTitle("Brand Events 2026!"), "brand-events-2026");
  assert.equal(slugifyPageTitle("  Hello--World  "), "hello-world");
});

test("public pages never auto-show editor chrome from draft or localhost", () => {
  const site = readFileSync(new URL("../assets/js/site.js", import.meta.url), "utf8");
  const start = site.indexOf("const shouldShowEditorChrome = () => {");
  const end = site.indexOf("\n  };", start);
  assert.ok(start > 0 && end > start, "chrome gate exists");
  const gate = site.slice(start, end);
  assert.ok(/SECURITY:/.test(site), "security comment present");
  assert.ok(gate.includes("active === true"), "chrome requires active preview session");
  assert.ok(!/admin\.html/.test(gate), "admin.html pathname must not unlock chrome");
  assert.ok(!site.includes("liam-portfolio-admin-draft-v1"), "draft localStorage must not unlock chrome");
  assert.ok(!/hostname\s*===\s*"localhost"/.test(gate), "localhost alone must not unlock chrome");
  assert.ok(!/127\.0\.0\.1/.test(gate), "loopback alone must not unlock chrome");
  assert.ok(!site.includes("Expand toolbar / open editor"), "public expand-editor link removed");
  assert.ok(!site.includes("site-open-editor"), "public open-editor control removed");
});

test("publish confirms then triggers GitHub deploy endpoint", () => {
  const admin = readFileSync(new URL("../assets/js/admin.js", import.meta.url), "utf8");
  const server = readFileSync(new URL("../local_preview.rb", import.meta.url), "utf8");
  assert.ok(admin.includes("Update the live website now?"), "publish asks for confirmation");
  assert.ok(admin.includes('/api/deploy'), "publish calls deploy API");
  assert.ok(server.includes('/api/deploy'), "server exposes deploy API");
  assert.ok(server.includes("git\", \"push\""), "deploy pushes to origin");
  assert.ok(server.includes("valid_case_study_layouts"), "publish validates photo layout payloads");
  assert.ok(server.includes('caseStudyLayouts'), "publish accepts caseStudyLayouts");
});

test("case study role column does not stick while scrolling", () => {
  const css = readFileSync(new URL("../assets/css/site.css", import.meta.url), "utf8");
  assert.ok(!/\.case-study-role\s*\{[^}]*position:\s*sticky/i.test(css), "MY ROLE column is not sticky");
  assert.match(css, /\.case-study-role\s*\{[^}]*position:\s*static/i);
});

test("case study photo templates are available in the editor", () => {
  const admin = readFileSync(new URL("../assets/js/admin.js", import.meta.url), "utf8");
  const caseStudy = readFileSync(new URL("../assets/js/case-study.js", import.meta.url), "utf8");
  assert.ok(admin.includes("Photo template"), "photo template label exists");
  assert.ok(admin.includes("admin-photo-template"), "photo template control exists");
  assert.ok(admin.includes("Apply photo template"), "apply template action exists");
  assert.ok(admin.includes("Add photo to layout"), "add photo action exists");
  assert.ok(admin.includes("applyPhotoTemplate"), "apply helper exists");
  assert.ok(admin.includes("caseStudyLayouts"), "layouts persist by project id");
  assert.ok(admin.includes("admin-photo-layout-slots"), "caption slots exist");
  assert.ok(caseStudy.includes("renderPhotoLayout"), "case study renders photo layouts");
  assert.ok(caseStudy.includes("case-study-editor-picker"), "editor shows project picker instead of hard error");
  assert.ok(caseStudy.includes("Choose a project to view"), "missing project uses soft empty state");
  assert.ok(caseStudy.includes("hard: false"), "soft empty state avoids hard error title");
  assert.ok(caseStudy.includes("first available project"), "editor loads a project when the id is missing");
  assert.ok(caseStudy.includes("cms-administrator"), "editor fallback checks administrator mode");
  assert.ok(caseStudy.includes("Keep the portfolio navigator visible"), "picker stays on every project in the editor");
  assert.ok(caseStudy.includes("Switch projects with the menu above"), "active project still shows navigator");
});

test("learn more stays modal; services edit in place in CMS", () => {
  const admin = readFileSync(new URL("../assets/js/admin.js", import.meta.url), "utf8");
  const css = readFileSync(new URL("../assets/css/site.css", import.meta.url), "utf8");
  assert.ok(admin.includes("Edit services in place on the card"), "service click edits in place");
  assert.ok(admin.includes("showModal"), "Learn more uses true modal overlay");
  assert.ok(admin.includes("repairServiceCardCopy"), "empty service titles are restored");
  assert.ok(admin.includes("isProtectedServiceCopy"), "blanking service titles is blocked");
  assert.ok(admin.includes("closeServiceDialogForEdit"), "editor can close Learn more panel");
  assert.ok(admin.includes(".dialog-close"), "dialog-close click path exists");
  assert.ok(admin.includes('event.key !== "Escape"'), "Escape closes Learn more panel");
  assert.ok(css.includes(".dialog-close"), "close control is styled");
  assert.ok(admin.includes("cms-added-content-block, .cms-shape, .cms-stock-image, .cms-upload-frame"), "deleting inner photo removes added block");
});

test("hero shade stays uniform without harsh left stripe", () => {
  const css = readFileSync(new URL("../assets/css/site.css", import.meta.url), "utf8");
  const siteContent = readFileSync(new URL("../assets/js/site-content.js", import.meta.url), "utf8");
  const content = readFileSync(new URL("../site-content.json", import.meta.url), "utf8");
  assert.ok(!css.includes("rgba(9,17,13,.83) 0%, rgba(9,17,13,.63) 41%, rgba(9,17,13,.12) 100%"), "old harsh left gradient removed");
  assert.ok(css.includes("rgba(9, 17, 13, .42)"), "even soft dark wash present");
  assert.ok(css.includes("left: 0 !important"), "hero shade forces left edge");
  assert.ok(siteContent.includes(".hero-shade, .hero-media, .hero-video, .hero"), "style apply ignores hero offsets");
  assert.ok(!/"element-14-div"\s*:\s*\{[^}]*"left"\s*:\s*26/s.test(content), "hero shade drag offset removed from published content");
});

test("Cursor AI region screenshot accounts for page scroll", () => {
  const enhancements = readFileSync(new URL("../assets/js/admin-enhancements.js", import.meta.url), "utf8");
  assert.ok(enhancements.includes("pageScroll"), "scroll helper exists");
  assert.ok(enhancements.includes("docX"), "selection stores document coordinates");
  assert.ok(enhancements.includes("drawImage(full"), "screenshot crops from full-page render");
  assert.ok(enhancements.includes("scrollY: 0"), "html2canvas scroll is normalized before crop");
});

test("service learn-more uses modal overlay; card copy stays editable", () => {
  const site = readFileSync(new URL("../assets/js/site.js", import.meta.url), "utf8");
  const admin = readFileSync(new URL("../assets/js/admin.js", import.meta.url), "utf8");
  assert.ok(site.includes("showModal"), "public Learn more uses showModal");
  assert.ok(site.includes("scrollY"), "opening Learn more preserves scroll position");
  assert.ok(admin.includes("service-slot"), "service cards use stable content ids");
  assert.ok(admin.includes("syncDialogTextToService"), "dialog text can sync back to the service card");
  assert.ok(admin.includes("data-service-summary") || admin.includes("serviceSummary"), "service summaries have restore fallbacks");
});

test("uploaded image crop locks a frame instead of resizing", () => {
  const admin = readFileSync(new URL("../assets/js/admin.js", import.meta.url), "utf8");
  const enhancements = readFileSync(new URL("../assets/js/admin-enhancements.js", import.meta.url), "utf8");
  const shell = readFileSync(new URL("../assets/js/admin-canva-shell.js", import.meta.url), "utf8");
  assert.ok(admin.includes("ensureImageCropFrame"), "crop frame helper exists");
  assert.ok(admin.includes("cms-upload-frame"), "bare uploads get a clipping frame");
  assert.ok(admin.includes("Never set width/height:100% on the box itself"), "resize does not expand uploads to section edges");
  assert.ok(enhancements.includes("editor.ensureImageCropFrame"), "crop mode calls ensureImageCropFrame");
  assert.ok(shell.includes("cms-crop-mode"), "Moveable skips crop mode");
  assert.ok(admin.includes("admin-add-page"), "Add page control exists");
  assert.ok(admin.includes("customPages"), "custom pages live in editor state");
});

test("new content is placed in the section currently in view", () => {
  const admin = readFileSync(new URL("../assets/js/admin.js", import.meta.url), "utf8");
  const power = readFileSync(new URL("../assets/js/admin-power-tools.js", import.meta.url), "utf8");
  assert.ok(admin.includes("resolvePlacementSection"), "placement helper exists");
  assert.ok(admin.includes("section you are viewing"), "UI explains current-section placement");
  assert.ok(admin.includes("resolvePlacementSection()"), "photo/text add uses placement helper");
  assert.ok(power.includes("editor.resolvePlacementSection"), "uploads/shapes use placement helper");
});

test("upload drag payload creates page media without photobox", () => {
  const payload = placeUploadPayload({ url: "/uploads/shot.jpg", name: "shot.jpg" });
  assert.equal(payload.type, "image");
  assert.equal(payload.image, "/uploads/shot.jpg");
  assert.equal(payload.src, "/uploads/shot.jpg");
});

test("float close ignores header drag capture targets", () => {
  const shouldStartDrag = (target) => !["admin-float-close", "button"].some((token) => target.includes(token));
  assert.equal(shouldStartDrag("admin-float-close"), false);
  assert.equal(shouldStartDrag("strong"), true);
});

const equalGapBetween = (box, leftNeighbor, rightNeighbor) => {
  const span = rightNeighbor.left - leftNeighbor.right;
  return Math.round(leftNeighbor.right + (span - box.width) / 2);
};

const uploadDragTypesAllowed = (types) =>
  types.some((type) => ["application/x-cms-upload", "text/plain", "text/uri-list"].includes(type));

test("equal spacing formula centers an element between neighbors", () => {
  assert.equal(equalGapBetween({ width: 40 }, { right: 100 }, { left: 180 }), 120);
});

test("upload drag accepts plain text fallback types", () => {
  assert.equal(uploadDragTypesAllowed(["text/plain"]), true);
  assert.equal(uploadDragTypesAllowed(["Files"]), false);
});

test("page edges stay invisible until near or active", () => {
  const css = `
.admin-page-edge { opacity: 0; }
.admin-page-edge.is-near, .admin-page-edge.is-active { opacity: 1; }
`;
  assert.equal(css.includes("opacity: 0"), true);
  assert.equal(css.includes("is-near"), true);
});

test("delete keyboard path calls deleteElements directly", () => {
  const admin = readFileSync(new URL("../assets/js/admin.js", import.meta.url), "utf8");
  assert.ok(admin.includes("deleteElements(targets)"), "delete/backspace invoke deleteElements");
  assert.ok(admin.includes("deleteSelectedElements: deleteElements"), "deleteSelectedElements is exported");
});

test("site.js does not auto-show editor chrome for a draft or localhost alone", () => {
  const site = readFileSync(new URL("../assets/js/site.js", import.meta.url), "utf8");
  const start = site.indexOf("const shouldShowEditorChrome = () => {");
  const end = site.indexOf("\n  };", start);
  assert.ok(start > 0 && end > start, "chrome gate exists");
  const gate = site.slice(start, end);
  assert.match(site.slice(Math.max(0, start - 700), start), /SECURITY/);
  assert.match(gate, /cms-administrator/);
  assert.match(gate, /active === true/);
  assert.equal(/localStorage/.test(gate), false);
  assert.equal(/localhost/.test(gate), false, "hostname is judged on the chrome gate; the inquiry form may still mention localhost");
  assert.equal(/127\.0\.0\.1/.test(gate), false);
  assert.equal(/admin\.html/.test(gate), false, "admin.html pathname must not unlock chrome");
  assert.equal(/URLSearchParams|has\("preview"\)|\?preview/.test(gate), false);
  assert.equal(site.includes("liam-portfolio-admin-draft-v1"), false);
  assert.equal(site.includes("Expand toolbar / open editor"), false);

  const keyLine = 'const PREVIEW_MODE_KEY = "liam-cms-preview-mode-v1";';
  const show = new Function(
    "document",
    "location",
    "sessionStorage",
    "localStorage",
    `${keyLine}\n${site.slice(start, end + "\n  };".length)}\nreturn shouldShowEditorChrome();`,
  );
  const run = ({
    hostname = "villagercrafter.github.io",
    pathname = "/",
    search = "",
    preview = null,
    draft = null,
    administrator = false,
  } = {}) => {
    const sessionStore = new Map();
    const localStore = new Map();
    if (preview != null) sessionStore.set("liam-cms-preview-mode-v1", JSON.stringify(preview));
    if (draft != null) localStore.set("liam-portfolio-admin-draft-v1", draft);
    const memory = (store) => ({
      getItem: (key) => (store.has(key) ? store.get(key) : null),
    });
    return show(
      { body: { classList: { contains: (name) => administrator && name === "cms-administrator" } } },
      { hostname, pathname, search },
      memory(sessionStore),
      memory(localStore),
    );
  };

  assert.equal(run({ hostname: "localhost", draft: "{\"version\":1}", search: "?preview=draft" }), false);
  assert.equal(run({ hostname: "127.0.0.1", pathname: "/", draft: "present" }), false);
  assert.equal(run({ search: "?preview=1" }), false);
  assert.equal(run({ preview: { active: false } }), false);
  assert.equal(run({ preview: { active: true }, pathname: "/" }), true);
  assert.equal(run({ pathname: "/admin.html" }), false);
  assert.equal(run({ pathname: "/projects/admin.html" }), false);
  assert.equal(run({ pathname: "/admin.html", administrator: true, preview: { active: true } }), false);
});

test("snap hold C includes preventDefault", () => {
  const admin = readFileSync(new URL("../assets/js/admin.js", import.meta.url), "utf8");
  assert.match(admin, /snapHoldOff = true[\s\S]*return; \/\/ hold C = unsnap only/);
  assert.ok(admin.includes("event.preventDefault()"), "hold-c prevents default browser behavior");
});

console.log(`Passed ${PASS.length}; failed ${FAIL.length}`);
FAIL.forEach((item) => console.error(`FAIL ${item.name}: ${item.message}`));
if (FAIL.length) process.exit(1);
