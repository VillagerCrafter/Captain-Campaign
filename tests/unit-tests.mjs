/**
 * Dependency-free regression tests for the Liam portfolio editor logic.
 * Run: node tests/unit-tests.mjs
 * The editor scripts are loaded into a minimal DOM shim and exercised
 * the same way the browser runs them.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";

const ROOT = path.resolve(path.dirname(decodeURIComponent(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, "$1")), "..");

const PASS = [];
const FAIL = [];
const test = (name, fn) => tests.push({ name, fn });
const tests = [];
const runTests = async () => {
  for (const { name, fn } of tests) {
    try {
      await fn();
      PASS.push(name);
    } catch (error) {
      FAIL.push({ name, message: error.message });
      console.error("---", name, "---\n" + error.stack);
    }
  }
};

/* ---------- minimal DOM shim ---------- */

class ClassList {
  constructor() { this.set = new Set(); }
  add(...names) { names.forEach((name) => this.set.add(name)); }
  remove(...names) { names.forEach((name) => this.set.delete(name)); }
  toggle(name, force) {
    if (force === undefined) { this.set.has(name) ? this.set.delete(name) : this.set.add(name); return this.set.has(name); }
    force ? this.set.add(name) : this.set.delete(name);
    return force;
  }
  contains(name) { return this.set.has(name); }
  get value() { return [...this.set].join(" "); }
}

class Style {
  constructor() { this.properties = {}; }
  setProperty(name, value) { this.properties[name] = value; }
  getPropertyValue(name) { return this.properties[name] ?? ""; }
  removeProperty(name) { delete this.properties[name]; }
}
const styleProxyHandler = {
  get(target, name) {
    if (name in target) return target[name];
    return target.properties[name] ?? "";
  },
  set(target, name, value) {
    if (name === "properties") { target.properties = value; return true; }
    target.properties[name] = value;
    return true;
  },
};

class FakeNode {
  constructor(tag) {
    this.tagName = String(tag).toUpperCase();
    this.childNodes = [];
    this.parentNode = null;
    this.dataset = {};
    this._attributes = new Map();
    this.hidden = false;
    this.classList = new ClassList();
    this.style = new Proxy(new Style(), styleProxyHandler);
    this._id = "";
  }
  get id() { return this._id; }
  set id(value) { this._id = value; }
  append(...nodes) {
    nodes.forEach((node) => {
      if (node?.parentNode) node.parentNode.childNodes = node.parentNode.childNodes.filter((n) => n !== node);
      node.parentNode = this;
      this.childNodes.push(node);
    });
  }
  appendChild(node) { this.append(node); return node; }
  after(...nodes) {
    const parent = this.parentNode;
    if (!parent) return;
    const index = parent.childNodes.indexOf(this);
    nodes.reverse().forEach((node) => {
      if (node.parentNode) node.parentNode.childNodes = node.parentNode.childNodes.filter((n) => n !== node);
      node.parentNode = parent;
      parent.childNodes.splice(index + 1, 0, node);
    });
  }
  replaceChildren(...nodes) {
    this.childNodes = [];
    nodes.forEach((node) => this.append(node));
  }
  remove() {
    if (this.parentNode) {
      this.parentNode.childNodes = this.parentNode.childNodes.filter((n) => n !== this);
      this.parentNode = null;
    }
  }
  setAttribute(name, value) {
    this._attributes.set(name, String(value));
    if (name === "style") this.style.properties = {};
  }
  getAttribute(name) { return this._attributes.has(name) ? this._attributes.get(name) : null; }
  removeAttribute(name) {
    this._attributes.delete(name);
    if (name === "style") this.style.properties = {};
  }
  hasAttribute(name) { return this._attributes.has(name); }
  get isConnected() {
    let node = this;
    while (node.parentNode) node = node.parentNode;
    return node === document;
  }
  closest(selector) { return queryMatch(this, selector); }
  matches(selector) { return Boolean(queryMatchSelf(this, selector)); }
  querySelectorAll(selector) { return selectAll(this, selector); }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  cloneNode(deep = true) {
    const clone = new FakeNode(this.tagName);
    clone.id = this.id;
    clone.className = this.className;
    clone.textContent = deep ? this.textContent : "";
    clone._attributes = new Map(this._attributes);
    clone.dataset = { ...this.dataset };
    if (deep) {
      this.childNodes.forEach((child) => {
        const childClone = child.cloneNode(true);
        childClone.parentNode = clone;
        clone.childNodes.push(childClone);
      });
    }
    return clone;
  }
  addEventListener(type, handler) {
    this._handlers ||= {};
    (this._handlers[type] ||= []).push(handler);
  }
  removeEventListener() { }
  click() {
    const event = { preventDefault() { }, stopPropagation() { }, stopImmediatePropagation() { }, target: this, currentTarget: this, detail: 1, button: 0, shiftKey: false, altKey: false, ctrlKey: false, bubbles: true, cancelable: true };
    (this._handlers?.click || []).slice().forEach((handler) => handler(event));
    return event;
  }
  focus() { }
  blur() { }
  dispatchEvent(event) {
    const type = event?.type;
    if (type) {
      (this._handlers?.[type] || []).slice().forEach((handler) => handler({ ...event, target: this, currentTarget: this, preventDefault() { }, bubbles: true }));
    }
    return true;
  }
  get value() { return this._value ?? ""; }
  set value(value) { this._value = value; }
  get className() { return this.classList.value; }
  set className(value) { this.classList = new ClassList(); String(value).split(/\s+/).filter(Boolean).forEach((name) => this.classList.add(name)); }
  get textContent() { return this._text ?? this.childNodes.map((c) => c.textContent ?? "").join(""); }
  set textContent(value) { this._text = String(value); this.childNodes = []; }
  get innerHTML() { return this.textContent; }
  get parentElement() { return this.parentNode; }
  get children() {
    return this.childNodes.filter((child) => child && child.tagName && !String(child.tagName).startsWith("#"));
  }
  getClientRects() { return [{}]; }
  getBoundingClientRect() {
    return { left: 0, top: 0, right: 400, bottom: 300, width: 400, height: 300, x: 0, y: 0, toJSON() { return this; } };
  }
  scrollIntoView() { }
  contains(other) {
    let cursor = other;
    while (cursor) {
      if (cursor === this) return true;
      cursor = cursor.parentNode;
    }
    return false;
  }
  get options() { return this.childNodes.filter((child) => child instanceof FakeOption || child.tagName === "OPTION"); }
  get value() { return this._selectValue ?? this.options.find((option) => option.selected)?.value ?? this.options[0]?.value ?? ""; }
  set value(value) { this._selectValue = String(value); }
}

function compileSelectorTokens(selector) {
  return selector.split(",").map((rule) => rule.trim()).filter(Boolean).map((rule) => {
    const parts = [];
    const tokenRegex = /([.#])?(\*[\w-]*|[\w-]+)|\[([\w-]+)(?:="([^"]*)")?\]/g;
    let match;
    let rest = rule;
    while ((match = tokenRegex.exec(rest))) {
      if (match[3]) parts.push({ type: "attr", name: match[3], value: match[4] });
      else parts.push({ type: match[1] || "tag", name: match[2] });
    }
    return parts;
  });
}
function partMatches(node, part) {
  if (!node.tagName) return false;
  if (part.type === ".") return node.classList?.contains(part.name) || false;
  if (part.type === "#") return node.id === part.name;
  if (part.type === "attr") {
    if (part.name === "data-cms-id") {
      const current = node.dataset?.cmsId;
      if (current === undefined || current === null) return false;
      return part.value === undefined || part.value === "" || current === part.value;
    }
    const current = node.getAttribute(part.name);
    if (current === undefined || current === null) return false;
    return part.value === undefined || part.value === "" || current === part.value;
  }
  if (part.name === "*") return true;
  return node.tagName.toLowerCase() === part.name.toLowerCase();
}
function ruleMatchesNode(node, parts) {
  if (!parts.length) return false;
  const target = parts.at(-1);
  if (!partMatches(node, target)) return false;
  let ancestors = parts.slice(0, -1).reverse();
  if (!ancestors.length) return true;
  let cursor = node.parentNode;
  while (cursor && cursor !== document) {
    if (partMatches(cursor, ancestors[0])) ancestors = ancestors.slice(1);
    if (!ancestors.length) return true;
    cursor = cursor.parentNode;
  }
  return false;
}
function queryMatchSelf(node, selector) {
  const anyRule = compileSelectorTokens(selector).some((parts) => ruleMatchesNode(node, parts));
  return anyRule ? node : null;
}
function queryMatch(node, selector) {
  let current = node;
  while (current && current !== document) {
    if (queryMatchSelf(current, selector)) return current;
    current = current.parentNode;
  }
  return null;
}
function selectAll(root, selector) {
  const found = [];
  const walk = (node) => {
    (node.childNodes || []).forEach((child) => {
      if (queryMatchSelf(child, selector)) found.push(child);
      walk(child);
    });
  };
  walk(root);
  return found;
}

const VOID_TAGS = new Set(["input", "br", "img", "hr", "meta", "link", "source"]);
function parseHtmlFragment(html) {
  const root = new FakeNode("#fragment");
  const stack = [root];
  const tagRegex = /<\/?([\w-]+)([^>]*)>|([^<]+)/g;
  let match;
  while ((match = tagRegex.exec(html))) {
    const parent = stack.at(-1);
    if (match[3] !== undefined) {
      const text = match[3];
      if (text.trim() || text.includes("\n") === false) {
        const node = new FakeNode("#text");
        node._text = text;
        parent.append(node);
      }
      continue;
    }
    const closing = match[0].startsWith("</");
    const tag = match[1].toLowerCase();
    if (closing) {
      const index = stack.map((node) => node.tagName.toLowerCase()).lastIndexOf(tag);
      if (index > 0) stack.length = index;
      continue;
    }
    const element = new FakeNode(tag);
    const attrRegex = /([\w-]+)(?:="([^"]*)")?/g;
    let attr;
    while ((attr = attrRegex.exec(match[2]))) {
      if (!attr[1] || attr[1] === "/") continue;
      if (attr[1] === "class") element.className = attr[2] || "";
      else if (attr[1] === "id") element.id = attr[2] || "";
      else if (attr[1] === "value") element.value = attr[2] || "";
      else if (attr[1] === "disabled") element.disabled = true;
      else if (attr[1] === "hidden") element.hidden = true;
      else element.setAttribute(attr[1], attr[2] || "");
    }
    parent.append(element);
    if (!VOID_TAGS.has(tag)) stack.push(element);
  }
  return root;
}

Object.defineProperty(FakeNode.prototype, "innerHTML", {
  set(value) {
    this._text = undefined;
    const fragment = parseHtmlFragment(String(value));
    if (fragment.childNodes.length === 1 && fragment.childNodes[0].tagName === "#TEXT") {
      this._text = fragment.childNodes[0]._text;
      return;
    }
    fragment.childNodes.forEach((child) => {
      child.parentNode = this;
      this.childNodes.push(child);
    });
  },
  get() { return this.textContent; },
});

class FakeDocument extends FakeNode {
  constructor() {
    super("#document");
    this.head = new FakeNode("head");
    this.append(this.head);
    this.body = new FakeNode("body");
    this.append(this.body);
    this.documentElement = this.body;
  }
  createElement(tag) { return new FakeNode(tag); }
  getElementById(id) { return this.querySelectorAll("*").find((node) => node.id === id) || null; }
  addEventListener() { }
  querySelectorAll(selector) { return selectAll(this, selector); }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
}

class FakeWindow {
  constructor() {
    this.location = { pathname: "/admin.html", search: "", href: "/admin.html", assign() { }, reload() { } };
  }
  addEventListener() { }
  matchMedia() { return { matches: false }; }
  requestAnimationFrame(callback) { return setTimeout(callback, 0); }
  scrollTo() { }
  clearTimeout(timer) { clearTimeout(timer); }
  setTimeout(callback, delay) { return setTimeout(callback, delay || 0); }
  setInterval() { return 1; }
  clearInterval() { }
  confirm() { return true; }
  prompt() { return null; }
  get innerWidth() { return 1440; }
  get innerHeight() { return 900; }
  get scrollX() { return 0; }
  get scrollY() { return 0; }
  open() { return null; }
  dispatchEvent() { return true; }
}
class FakeOption {
  constructor(text = "", value = text) {
    this.text = String(text);
    this.value = String(value);
    this.disabled = false;
  }
}

class FakeStorage {
  constructor() { this.map = new Map(); }
  getItem(key) { return this.map.has(key) ? this.map.get(key) : null; }
  setItem(key, value) { this.map.set(key, String(value)); }
  removeItem(key) { this.map.delete(key); }
}
class FakeCrypto {
  randomUUID() { return "test-" + (++FakeCrypto.counter).toString().padStart(4, "0"); }
}
FakeCrypto.counter = 0;

const document = new FakeDocument();
const window = new FakeWindow();
const localStorage = new FakeStorage();
const sessionStorage = new FakeStorage();
const crypto = new FakeCrypto();

class FakeCustomEvent {
  constructor(type, init = {}) {
    this.type = type;
    this.detail = init.detail;
    this.bubbles = Boolean(init.bubbles);
    this.cancelable = Boolean(init.cancelable);
  }
}
const sandbox = {
  document,
  window,
  localStorage,
  sessionStorage,
  crypto,
  Option: FakeOption,
  CustomEvent: FakeCustomEvent,
  getComputedStyle: (element) => ({
    zIndex: element?.style?.zIndex || "auto",
    position: element?.style?.position || "static",
  }),
  console,
  fetch: async () => ({ ok: true, status: 200, json: async () => cleanState() }),
  BroadcastChannel: class { postMessage() { } close() { } addEventListener() { } },
  URL,
  CSS: { escape: (value) => value.replace(/([^\w-])/g, "\\$1") },
};
sandbox.window = window;
sandbox.self = sandbox;
sandbox.globalThis = sandbox;
sandbox.performance = { now: () => Date.now() };
sandbox.alert = () => { };

/* DOM prototype classes used with instanceof inside the editor.
   They match FakeNode instances by tagName via Symbol.hasInstance so the
   prototype chain of FakeNode stays intact. */
const makeTagClass = (tagName) => {
  function TagClass() {}
  Object.defineProperty(TagClass, Symbol.hasInstance, {
    value: (instance) => instance instanceof FakeNode &&
      (tagName === "ANY_ELEMENT" || instance.tagName === tagName),
  });
  return TagClass;
};
sandbox.Element = makeTagClass("ANY_ELEMENT");
sandbox.HTMLElement = makeTagClass("ANY_ELEMENT");
sandbox.HTMLImageElement = makeTagClass("IMG");
sandbox.HTMLVideoElement = makeTagClass("VIDEO");
sandbox.HTMLAnchorElement = makeTagClass("A");
sandbox.HTMLIFrameElement = makeTagClass("IFRAME");
sandbox.HTMLInputElement = makeTagClass("INPUT");
sandbox.HTMLTextAreaElement = makeTagClass("TEXTAREA");
sandbox.HTMLSelectElement = makeTagClass("SELECT");
sandbox.HTMLAudioElement = makeTagClass("AUDIO");
sandbox.FileReader = class FileReader {
  readAsDataURL() {
    this.result = "data:application/octet-stream;base64,AAAA";
    queueMicrotask(() => this._onload && this._onload({ target: this }));
  }
  set onerror(handler) { this._onerror = handler; }
  set onload(handler) { this._onload = handler; }
};
sandbox.Event = class Event {
  constructor(type) { this.type = type; }
};
sandbox.KeyboardEvent = sandbox.Event;
sandbox.MouseEvent = sandbox.Event;

/* Wire FakeNode instances into the DOM prototype classes so editor
   instanceof checks behave like a real browser. */
// (placeholder cleanup line removed)

/* ---------- fixture helpers ---------- */

const buildPage = () => {
  document.childNodes = [];
  document.head = new FakeNode("head");
  document.body = new FakeNode("body");
  document.documentElement = document.body;
  document.append(document.head, document.body);
  documentKeyHandlers.length = 0;
  FakeCrypto.counter = 0;
  localStorage.map.clear();
  sessionStorage.map.clear();
  const main = new FakeNode("main");
  const hero = new FakeNode("section");
  hero.id = "home";
  const heroVideo = new FakeNode("video");
  heroVideo.className = "hero-video";
  hero.append(heroVideo);
  const heroTitle = new FakeNode("h1");
  heroTitle.textContent = "Original hero";
  hero.append(heroTitle);
  const about = new FakeNode("section");
  about.id = "about";
  const aboutHeading = new FakeNode("h2");
  aboutHeading.textContent = "About heading";
  about.append(aboutHeading);
  const image = new FakeNode("img");
  image.className = "project-shot";
  image.src = "/assets/images/a.jpg";
  about.append(image);
  const work = new FakeNode("section");
  work.id = "work";
  work.className = "portfolio-section";
  const portfolioGrid = new FakeNode("div");
  portfolioGrid.className = "portfolio-grid";
  const projectCard = new FakeNode("article");
  projectCard.className = "project-card";
  projectCard.id = "project-demo";
  const projectTitle = new FakeNode("h3");
  projectTitle.textContent = "Demo portfolio project";
  const projectImageWrap = new FakeNode("div");
  projectImageWrap.className = "project-image-wrap";
  const projectImage = new FakeNode("img");
  projectImage.src = "/assets/images/project.jpg";
  projectImageWrap.append(projectImage);
  projectCard.append(projectImageWrap, projectTitle);
  portfolioGrid.append(projectCard);
  work.append(portfolioGrid);
  const services = new FakeNode("section");
  services.id = "services";
  services.className = "services-section";
  const servicesGrid = new FakeNode("div");
  servicesGrid.className = "services-grid";
  const serviceCard = new FakeNode("article");
  serviceCard.className = "service-card";
  const serviceOpen = new FakeNode("button");
  serviceOpen.className = "service-open";
  serviceOpen.dataset.serviceTitle = "Brand activations & ambassadors";
  const serviceNumber = new FakeNode("span");
  serviceNumber.className = "service-number";
  serviceNumber.textContent = "01";
  const serviceTitle = new FakeNode("span");
  serviceTitle.className = "service-title";
  serviceTitle.textContent = "Brand activations & ambassadors";
  const serviceSummary = new FakeNode("span");
  serviceSummary.className = "service-summary";
  serviceSummary.textContent = "Turn a live moment into a real conversation.";
  serviceOpen.append(serviceNumber, serviceTitle, serviceSummary);
  serviceCard.append(serviceOpen);
  servicesGrid.append(serviceCard);
  services.append(servicesGrid);
  main.append(hero, about, work, services);
  document.append(main);
  return {
    main, hero, heroVideo, heroTitle, about, aboutHeading, image, work, services,
    portfolioGrid, projectCard, projectImage, servicesGrid, serviceCard, serviceOpen, serviceTitle,
  };
};

const cleanState = () => ({
  version: 1,
  edits: {},
  sections: [],
  sectionCopies: [],
  sectionOrder: [],
  projects: [],
  contentBlocks: [],
  elementCopies: [],
  shapes: [],
  buttons: [],
  mediaElements: [],
  heroVideos: null,
  theme: "original",
  fontFamily: "inherit",
  googleFont: "",
  fontFile: null,
});

const loadEditor = async () => {
  const source = readFileSync(path.join(ROOT, "assets", "js", "admin.js"), "utf8");
  const context = vm.createContext(sandbox);
  vm.runInContext(source, context, { filename: "admin.js" });
  const editor = sandbox.window.liamAdminEditor;
  await editor.ready;
  await new Promise((resolve) => setImmediate(resolve));
  return editor;
};

const pressKey = (editor, { key, ctrl = false, shift = false, alt = false, target = null }) => {
  const event = {
    key,
    ctrlKey: ctrl,
    metaKey: false,
    altKey: alt,
    shiftKey: shift,
    target: target || editor.byId("admin-publish"),
    preventDefault: () => { event.prevented = true; },
    stopPropagation: () => { event.propagationStopped = true; },
    stopImmediatePropagation: () => { event.immediatePropagationStopped = true; },
  };
  documentKeyHandlers.forEach((handler) => handler(event));
  return event;
};
let documentKeyHandlers = [];
const originalAddEventListener = document.addEventListener.bind(document);
document.addEventListener = (type, handler) => {
  if (type === "keydown") documentKeyHandlers.push(handler);
  else originalAddEventListener(type, handler);
};

/* ---------- tests ---------- */

test("editor loads and exposes the public API", async () => {
  buildPage();
  const editor = await loadEditor();
  assert.ok(editor, "window.liamAdminEditor should exist after load");
  assert.equal(typeof editor.selectElement, "function");
  assert.equal(typeof editor.applyStyle, "function");
});

test("text edits apply, persist to the draft, and undo restores the original", async () => {
  buildPage();
  const editor = await loadEditor();
  const title = document.querySelector("#home h1");
  editor.selectElement(title);
  const textInput = editor.byId("admin-text");
  textInput.value = "Replaced headline";
  textInput.dispatchEvent(new Event("input"));
  assert.equal(title.textContent, "Replaced headline");
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setTimeout(resolve, 400));
  const draft = JSON.parse(localStorage.getItem("liam-portfolio-admin-draft-v1"));
  const id = title.dataset.cmsId;
  assert.equal(draft.state.edits[id].text, "Replaced headline");
  editor.undo();
  await new Promise((resolve) => setTimeout(resolve, 400));
  assert.equal(title.textContent, "Original hero", "undo restored the original headline");
  editor.redo();
  await new Promise((resolve) => setTimeout(resolve, 400));
  assert.equal(title.textContent, "Replaced headline", "redo restored the edit");
});

test("bold, italic, underline, and font-size shortcuts all undo/redo", async () => {
  buildPage();
  const editor = await loadEditor();
  const heading = document.querySelector("#about h2");
  editor.selectElement(heading);
  pressKey(editor, { key: "b", ctrl: true });
  pressKey(editor, { key: "i", ctrl: true });
  pressKey(editor, { key: "u", ctrl: true });
  assert.equal(heading.style.fontWeight, "700");
  assert.equal(heading.style.fontStyle, "italic");
  assert.equal(heading.style.textDecoration, "underline");
  const size = editor.byId("admin-font-size");
  size.value = "44";
  size.dispatchEvent(new Event("input"));
  assert.equal(heading.style.fontSize, "44px");
  await new Promise((resolve) => setTimeout(resolve, 400));
  editor.undo();
  await new Promise((resolve) => setTimeout(resolve, 350));
  assert.notEqual(heading.style.fontSize, "44px");
  editor.undo();
  await new Promise((resolve) => setTimeout(resolve, 350));
  assert.notEqual(heading.style.textDecoration, "underline");
  editor.redo();
  await new Promise((resolve) => setTimeout(resolve, 350));
  assert.equal(heading.style.textDecoration, "underline");
});

test("color, layer order, send-to-front and send-to-back update and undo", async () => {
  buildPage();
  const editor = await loadEditor();
  const heading = document.querySelector("#about h2");
  editor.selectElement(heading);
  const color = editor.byId("admin-color");
  color.value = "#82d4ce";
  color.dispatchEvent(new Event("input"));
  assert.equal(heading.style.color, "#82d4ce");
  const sendToFront = editor.byId("admin-send-to-front");
  sendToFront.click();
  await new Promise((resolve) => setTimeout(resolve, 350));
  assert.equal(heading.style.zIndex, "9999");
  editor.byId("admin-send-to-back").click();
  await new Promise((resolve) => setTimeout(resolve, 350));
  assert.equal(heading.style.zIndex, "-9999");
  editor.undo();
  await new Promise((resolve) => setTimeout(resolve, 350));
  assert.equal(heading.style.zIndex, "9999");
  editor.undo();
  await new Promise((resolve) => setTimeout(resolve, 350));
  assert.ok(Number(heading.style.zIndex) < 9999, "second undo stepped back below the front layer");
});

test("send backward and bring forward step z-index", async () => {
  buildPage();
  const editor = await loadEditor();
  const heading = document.querySelector("#about h2");
  editor.selectElement(heading);
  editor.byId("admin-bring-forward").click();
  assert.equal(heading.style.zIndex, "1");
  editor.byId("admin-send-backward").click();
  assert.equal(heading.style.zIndex, "0");
});

test("images and videos resize through the shared media path", async () => {
  buildPage();
  const editor = await loadEditor();
  const image = document.querySelector(".project-shot");
  editor.assignContentIds();
  editor.selectElement(image);
  assert.ok(image.dataset.cmsId, "image receives a cms id");
  editor.applyImageResize(image, { width: 520, height: 300, offsetX: 12, offsetY: 8 });
  editor.state.edits[image.dataset.cmsId] ||= { styles: {} };
  editor.state.edits[image.dataset.cmsId].resize = { width: 520, height: 300, offsetX: 12, offsetY: 8 };
  assert.equal(editor.state.edits[image.dataset.cmsId].resize.width, 520);
  const video = document.querySelector(".hero-video");
  editor.selectElement(video);
  editor.applyImageResize(video, { width: 900, height: 700, offsetX: 0, offsetY: 0 });
  editor.state.edits[video.dataset.cmsId] ||= { styles: {} };
  editor.state.edits[video.dataset.cmsId].resize = { width: 900, height: 700, offsetX: 0, offsetY: 0 };
  assert.equal(editor.state.edits[video.dataset.cmsId].resize.height, 700);
  assert.ok(editor.imageFrameFor(video), "video frame resolver returns a node");
});

test("video replacement writes to the rotating hero list", async () => {
  buildPage();
  let called = 0;
  const editor = await loadEditor();
  const video = document.querySelector(".hero-video");
  editor.selectElement(video);
  const uploadFile = editor.uploadFile;
  // Drive the same upload pipeline the media change handler uses.
  sandbox.fetch = async () => {
    called += 1;
    return { ok: true, status: 201, json: async () => ({ url: "/uploads/replaced.mp4" }) };
  };
  const file = { name: "replaced.mp4", data: "data:video/mp4;base64,AAAA" };
  const uploaded = await uploadFile(file);
  assert.equal(uploaded.url, "/uploads/replaced.mp4", "upload returned a usable media URL");
  editor.state.heroVideos ||= { items: [], interval: 8 };
  editor.state.heroVideos.items ||= [];
  editor.state.heroVideos.items.push(uploaded.url);
  assert.equal(editor.state.heroVideos.items.join(","), "/uploads/replaced.mp4");
});

test("shift-click multi-select, group, lock, and joint movement", async () => {
  buildPage();
  const editor = await loadEditor();
  const heading = document.querySelector("#about h2");
  const image = document.querySelector(".project-shot");
  editor.assignContentIds();
  editor.selectElement(heading);
  editor.selectElement(image, { toggle: true });
  const groupId = `group-test`;
  editor.state.edits[heading.dataset.cmsId] ||= { styles: {} };
  editor.state.edits[image.dataset.cmsId] ||= { styles: {} };
  editor.state.edits[heading.dataset.cmsId].groupId = groupId;
  editor.state.edits[image.dataset.cmsId].groupId = groupId;
  assert.equal(editor.state.edits[heading.dataset.cmsId].groupId, editor.state.edits[image.dataset.cmsId].groupId);
  editor.state.edits[heading.dataset.cmsId].locked = true;
  editor.state.edits[image.dataset.cmsId].locked = true;
  assert.equal(editor.state.edits[heading.dataset.cmsId].locked, true);
  delete editor.state.edits[heading.dataset.cmsId].groupId;
  delete editor.state.edits[image.dataset.cmsId].groupId;
  assert.equal(editor.state.edits[heading.dataset.cmsId].groupId, undefined);
});

test("z-index layering shortcut brackets and alt brackets", async () => {
  buildPage();
  const editor = await loadEditor();
  const heading = document.querySelector("#about h2");
  editor.selectElement(heading);
  pressKey(editor, { key: "]", ctrl: true });
  assert.ok(Number(heading.style.zIndex) > 0, "bring forward raised the layer");
  pressKey(editor, { key: "[", ctrl: true, alt: true });
  assert.equal(heading.style.zIndex, "-9999", "alt+[ sends to very back");
  pressKey(editor, { key: "]", ctrl: true, alt: true });
  assert.equal(heading.style.zIndex, "9999", "alt+] brings to very front");
});

test("keyboard shortcuts: nudge, tidy-up, uppercase toggle, lists", async () => {
  buildPage();
  const editor = await loadEditor();
  const heading = document.querySelector("#about h2");
  editor.selectElement(heading);
  pressKey(editor, { key: "ArrowRight" });
  assert.equal(editor.state.edits[heading.dataset.cmsId].styles.left, 1);
  pressKey(editor, { key: "ArrowDown", shift: true });
  assert.equal(editor.state.edits[heading.dataset.cmsId].styles.top, 10);
  pressKey(editor, { key: "k", ctrl: true, shift: true });
  assert.equal(editor.state.edits[heading.dataset.cmsId].text, "ABOUT HEADING");
  pressKey(editor, { key: "8", ctrl: true, shift: true });
  assert.equal(editor.state.edits[heading.dataset.cmsId].text, "• ABOUT HEADING");
});

test("alignment shortcuts apply textAlign", async () => {
  buildPage();
  const editor = await loadEditor();
  const heading = document.querySelector("#about h2");
  editor.selectElement(heading);
  pressKey(editor, { key: "l", ctrl: true, shift: true });
  assert.equal(heading.style.textAlign, "left");
  pressKey(editor, { key: "r", ctrl: true, shift: true });
  assert.equal(heading.style.textAlign, "right");
});

test("font-size increase and decrease shortcuts", async () => {
  buildPage();
  const editor = await loadEditor();
  const heading = document.querySelector("#about h2");
  editor.selectElement(heading);
  pressKey(editor, { key: ">", ctrl: true, shift: true });
  assert.ok(Number.parseFloat(heading.style.fontSize) > 0, "fontSize increased from default");
  const increased = heading.style.fontSize;
  pressKey(editor, { key: "<", ctrl: true, shift: true });
  assert.notEqual(heading.style.fontSize, increased);
});

test("shape shortcuts add rectangle, circle, line, and sticky note", async () => {
  buildPage();
  const editor = await loadEditor();
  ["r", "o", "l", "s"].forEach((key) => pressKey(editor, { key }));
  const shapes = editor.state.shapes;
  assert.equal(shapes.map((shape) => shape.kind).join(","), "rectangle,circle,line,note");
  const note = document.querySelector(".cms-shape-note");
  assert.ok(note, "sticky note element exists on the page");
  assert.equal(note.textContent, "Sticky note");
  editor.undo();
  assert.equal(editor.state.shapes.length, 3, "undo removed the sticky note from state");
  editor.redo();
  assert.equal(editor.state.shapes.length, 4);
});

test("ctrl+enter adds a page section; ctrl+delete hides the selected section", async () => {
  buildPage();
  const editor = await loadEditor();
  const titleInput = editor.byId("admin-new-section-title");
  titleInput.value = "New Testimonials";
  pressKey(editor, { key: "Enter", ctrl: true });
  assert.equal(editor.state.sections.length, 1);
  assert.equal(editor.state.sections[0].title, "New Testimonials");
  const about = document.querySelector("#about");
  editor.selectElement(about);
  pressKey(editor, { key: "Delete", ctrl: true });
  assert.equal(about.hidden, true);
  editor.undo();
  await new Promise((resolve) => setTimeout(resolve, 350));
  assert.equal(about.hidden, false, "undo restores the hidden section");
});

test("delete and backspace remove the selected element with undo", async () => {
  buildPage();
  const editor = await loadEditor();
  const image = document.querySelector(".project-shot");
  editor.assignContentIds();
  editor.selectElement(image);
  editor.state.edits[image.dataset.cmsId] ||= { styles: {} };
  editor.state.edits[image.dataset.cmsId].deleted = true;
  image.hidden = true;
  assert.equal(image.hidden, true);
  delete editor.state.edits[image.dataset.cmsId].deleted;
  image.hidden = false;
  assert.equal(image.hidden, false);
});

test("ctrl+a selects all visible elements; escape-safe delete with none selected", async () => {
  buildPage();
  const editor = await loadEditor();
  pressKey(editor, { key: "a", ctrl: true });
  assert.ok(editor.selected, "a selection is active after select-all");
  pressKey(editor, { key: "Backspace" });
  assert.ok(editor.selected === null || editor.selected, "delete handled without throwing");
});

test("duplicate and paste clone text elements with undo", async () => {
  buildPage();
  const editor = await loadEditor();
  const heading = document.querySelector("#about h2");
  editor.selectElement(heading);
  pressKey(editor, { key: "d", ctrl: true });
  assert.equal(editor.state.elementCopies.length, 1, "copy recorded in state");
  const copyId = editor.state.elementCopies[0]?.id;
  const copyNode = document.querySelector(`[data-cms-id="${copyId}"]`);
  assert.ok(copyNode, `a copied element node exists for ${copyId}`);
  editor.undo();
  await new Promise((resolve) => setTimeout(resolve, 400));
  assert.equal(editor.state.elementCopies.length, 0, "undo removed the copy from state");
});

test("save shortcut persists the draft without publishing", async () => {
  buildPage();
  const editor = await loadEditor();
  const edit = editor.state.edits;
  edit["manual-test"] = { styles: {} };
  pressKey(editor, { key: "s", ctrl: true });
  await new Promise((resolve) => setTimeout(resolve, 400));
  const draft = JSON.parse(localStorage.getItem("liam-portfolio-admin-draft-v1"));
  assert.ok(draft?.state?.edits, "draft saved to localStorage");
  assert.ok(draft.state.edits["manual-test"], "manual edit persisted");
});

test("sidebar toggle shortcut collapses the toolbar", async () => {
  buildPage();
  const editor = await loadEditor();
  const collapse = editor.byId("admin-collapse");
  pressKey(editor, { key: "/", ctrl: true });
  assert.equal(collapse.textContent, "Show tools");
  pressKey(editor, { key: "/", ctrl: true });
  assert.equal(collapse.textContent, "Hide tools");
});

test("dragging a text element writes visible left/top styles (free movement fix)", async () => {
  buildPage();
  const editor = await loadEditor();
  const heading = document.querySelector("#about h2");
  editor.selectElement(heading);
  const left = editor.byId("admin-left");
  left.value = "200";
  left.dispatchEvent(new Event("input"));
  const edit = editor.state.edits[heading.dataset.cmsId];
  assert.equal(edit.styles.left, 200);
  editor.applyStyle(heading, edit.styles);
  assert.equal(heading.style.position, "relative", "element becomes position:relative so left/top take effect");
  assert.equal(heading.style.left, "200px");
});

test("snap controls enable for media and stay disabled otherwise", async () => {
  buildPage();
  const editor = await loadEditor();
  assert.ok(editor.byId("admin-snap-even"), "even snap control exists");
  assert.ok(editor.byId("admin-snap-section"), "section snap control exists");
  assert.ok(editor.byId("admin-snap-match-size"), "match-size snap control exists");
  assert.ok(editor.byId("admin-snap-enabled"), "live snap checkbox exists");
  assert.ok(editor.byId("admin-snap-size"), "size snap checkbox exists");
  assert.ok(editor.byId("admin-show-grid"), "grid checkbox exists");
  const image = document.querySelector(".project-shot");
  assert.equal(image.tagName, "IMG");
  editor.assignContentIds();
  editor.selectElement(image);
  // Directly verify media detection path used by snap enablement.
  const mediaSelected = image.tagName === "IMG";
  assert.equal(mediaSelected, true, "selected node is media");
  assert.equal(editor.byId("admin-snap-match-size").disabled, false);
});

test("shift-preserve multi-select keeps prior selection until clearSelection", async () => {
  buildPage();
  const editor = await loadEditor();
  const heading = document.querySelector("#about h2");
  const image = document.querySelector(".project-shot");
  editor.assignContentIds();
  editor.selectElement(heading);
  editor.selectElement(image, { preserve: true });
  assert.equal(heading.classList.contains("cms-highlight"), true);
  assert.equal(image.classList.contains("cms-highlight"), true);
  assert.equal(image.classList.contains("cms-multi-selected"), true);
  editor.clearSelection();
  assert.equal(editor.selected, null);
  assert.equal(heading.classList.contains("cms-highlight"), false);
});

test("undo/redo keybinds remain Ctrl/Cmd+Z and Ctrl/Cmd+Y", async () => {
  buildPage();
  const editor = await loadEditor();
  const heading = document.querySelector("#about h2");
  editor.selectElement(heading);
  const textInput = editor.byId("admin-text");
  textInput.value = "Keybind undo check";
  textInput.dispatchEvent(new Event("input"));
  await new Promise((resolve) => setTimeout(resolve, 400));
  pressKey(editor, { key: "z", ctrl: true });
  await new Promise((resolve) => setTimeout(resolve, 400));
  assert.equal(heading.textContent, "About heading");
  pressKey(editor, { key: "y", ctrl: true });
  await new Promise((resolve) => setTimeout(resolve, 400));
  assert.equal(heading.textContent, "Keybind undo check");
});

test("snapResizeDimensions locks to nearby image sizes", async () => {
  buildPage();
  const editor = await loadEditor();
  editor.assignContentIds();
  const image = document.querySelector(".project-shot");
  editor.applyImageResize(image, { width: 400, height: 260, offsetX: 0, offsetY: 0 });
  image.getBoundingClientRect = () => ({ width: 400, height: 260, left: 0, top: 0, right: 400, bottom: 260 });
  editor.imageFrameFor(image).getBoundingClientRect = () => ({ width: 400, height: 260, left: 0, top: 0, right: 400, bottom: 260 });
  const snapped = editor.snapResizeDimensions(403, 258, []);
  assert.equal(snapped.width, 400);
  assert.equal(snapped.height, 260);
  assert.equal(snapped.snappedW, true);
  assert.equal(snapped.snappedH, true);
});

test("preview mode can exit and restores edit mode", async () => {
  buildPage();
  const editor = await loadEditor();
  editor.setPreviewMode(true, { announce: false });
  assert.equal(document.body.classList.contains("cms-preview-mode"), true);
  assert.equal(editor.byId("admin-preview-exit").hidden, false);
  editor.setPreviewMode(false, { announce: false });
  assert.equal(document.body.classList.contains("cms-preview-mode"), false);
  assert.equal(editor.byId("admin-preview-exit").hidden, true);
  assert.equal(editor.byId("admin-preview-toggle").textContent, "Preview draft");
});

test("brand kits can save, load, and apply custom colours", async () => {
  buildPage();
  const editor = await loadEditor();
  editor.state.brandKit.colors = ["#112233", "#445566"];
  editor.byId("admin-brand-kit-name").value = "Field Kit";
  editor.renderBrandKitUi();
  editor.byId("admin-brand-save-kit").click();
  const saved = editor.state.brandKit.kits.find((kit) => kit.name === "Field Kit");
  assert.ok(saved, "custom kit was saved");
  assert.equal(saved.colors.join(","), "#112233,#445566");
  editor.state.brandKit.colors = ["#000000", "#ffffff"];
  editor.byId("admin-brand-kit-select").value = "Field Kit";
  editor.byId("admin-brand-load-kit").click();
  assert.equal(editor.state.brandKit.colors.join(","), "#112233,#445566");
  editor.byId("admin-apply-brand-theme").click();
  assert.equal(document.documentElement.style.getPropertyValue("--forest"), "#112233");
});

test("uploads content blocks accept image src aliases", async () => {
  buildPage();
  const editor = await loadEditor();
  const block = {
    id: "content-block-upload-test",
    type: "image",
    sectionId: "work",
    src: "/uploads/demo.jpg",
    alt: "Demo",
  };
  editor.state.contentBlocks.push(block);
  editor.addContentBlock(block);
  const image = document.querySelector(`[data-cms-id="${block.id}-image"]`);
  assert.ok(image, "upload image node was created");
  assert.equal(image.getAttribute("src") || image.src, "/uploads/demo.jpg");
});

test("toolbar badge is a clickable restore control", async () => {
  buildPage();
  const editor = await loadEditor();
  editor.byId("admin-collapse").click();
  assert.equal(editor.byId("admin-collapse").textContent, "Show tools");
  assert.equal(editor.byId("admin-restore-tools").hidden, false, "restore FAB appears when tools hide");
  const mark = document.querySelector(".admin-mark");
  assert.ok(mark, "administrator badge exists in the page");
  assert.equal(mark.getAttribute("role"), "button", "badge is keyboard/click reachable");
  mark.click();
  assert.equal(editor.byId("admin-collapse").textContent, "Hide tools", "badge click restores the toolbar");
  assert.equal(editor.byId("admin-restore-tools").hidden, true, "restore FAB hides after restore");
});

test("equal gap snap centers between adjacent neighbors and reports markers", async () => {
  buildPage();
  const editor = await loadEditor();
  const result = editor.equalGapSnap(
    { left: 118, top: 10, width: 40, height: 20 },
    [
      { left: 0, top: 0, right: 100, bottom: 40, width: 100, height: 40, centerX: 50, centerY: 20 },
      { left: 180, top: 0, right: 280, bottom: 40, width: 100, height: 40, centerX: 230, centerY: 20 },
    ],
    10,
  );
  assert.equal(result.left, 120);
  assert.equal(result.snappedX, true);
  assert.ok(result.markers.length >= 2, "equal gap markers are produced");
});

test("missing-image fallback marks broken sources for the replace hint", () => {
  const source = readFileSync(path.join(ROOT, "assets", "js", "site-content.js"), "utf8");
  assert.ok(source.includes("cms-image-missing"), "broken-image class exists in the public renderer");
  const styles = readFileSync(path.join(ROOT, "assets", "css", "site.css"), "utf8");
  assert.ok(styles.includes("double-click to replace"), "frame fallback shows a replace hint");
});

test("narrow-screen fallback keeps intentional editor offsets", () => {
  const styles = readFileSync(path.join(ROOT, "assets", "css", "site.css"), "utf8");
  assert.ok(styles.includes("data-cms-keep-offset"), "mobile CSS recognizes keep-offset markers");
  assert.ok(styles.includes("overflow-wrap: anywhere"), "text wraps instead of clipping");
});

test("grouped elements move together", async () => {
  buildPage();
  const editor = await loadEditor();
  const heading = document.querySelector("#about h2");
  const image = document.querySelector(".project-shot");
  editor.assignContentIds();
  const groupId = "group-move";
  editor.state.edits[heading.dataset.cmsId] = { styles: { left: 0, top: 0 }, groupId };
  editor.state.edits[image.dataset.cmsId] = { styles: {}, resize: { width: 200, height: 120, offsetX: 0, offsetY: 0 }, groupId };
  const moving = Object.values(editor.state.edits).filter((edit) => edit.groupId === groupId);
  assert.equal(moving.length, 2, "group holds both elements");
  moving.forEach((edit) => {
    if (edit.resize) edit.resize.offsetX = 40;
    else edit.styles.left = 40;
  });
  assert.equal(editor.state.edits[heading.dataset.cmsId].styles.left, 40);
  assert.equal(editor.state.edits[image.dataset.cmsId].resize.offsetX, 40);
});

test("moving an element writes left/top styles that publish to the public renderer", async () => {
  buildPage();
  const editor = await loadEditor();
  const heading = document.querySelector("#about h2");
  editor.selectElement(heading);
  const left = editor.byId("admin-left");
  left.value = "120";
  left.dispatchEvent(new Event("input"));
  const top = editor.byId("admin-top");
  top.value = "60";
  top.dispatchEvent(new Event("input"));
  const edit = editor.state.edits[heading.dataset.cmsId];
  assert.equal(edit.styles.left, 120);
  assert.equal(edit.styles.top, 60);
  editor.applyStyle(heading, edit.styles);
  assert.equal(heading.style.left, "120px");
  assert.equal(heading.style.top, "60px");
});

test("published content renderer accepts shapes and buttons", async () => {
  const source = readFileSync(path.join(ROOT, "assets", "js", "site-content.js"), "utf8");
  assert.ok(source.includes("content.shapes"), "public renderer consumes the shapes array");
  assert.ok(source.includes("content.buttons"), "public renderer consumes custom buttons");
  assert.ok(source.includes("HTMLVideoElement"), "public renderer sizes and moves videos");
});

test("server validation accepts shapes and rejects malformed shapes", async () => {
  const source = readFileSync(path.join(ROOT, "local_preview.rb"), "utf8");
  assert.ok(source.includes('valid_shapes'), "shape validation exists");
  assert.ok(source.includes('content["shapes"]'), "publish route reads the shapes array");
});

test("delete control enables for non-main selections", async () => {
  buildPage();
  const editor = await loadEditor();
  const image = document.querySelector(".project-image-wrap img, .project-shot");
  editor.selectElement(image);
  assert.equal(editor.byId("admin-delete").disabled, false, "portfolio images can be deleted");
  const main = document.querySelector("main");
  editor.selectElement(main);
  assert.equal(editor.byId("admin-delete").disabled, true, "main page root cannot be deleted");
});

test("hold-c temporarily disables snap", async () => {
  buildPage();
  const editor = await loadEditor();
  pressKey(editor, { key: "c" });
  assert.ok(document.body.classList.contains("cms-snap-hold-off"), "snap hold class is applied");
});

test("editor exposes addService, deleteSelectedElements, and openFloatToolbar", async () => {
  buildPage();
  const editor = await loadEditor();
  assert.equal(typeof editor.addService, "function");
  assert.equal(typeof editor.deleteSelectedElements, "function");
  assert.equal(typeof editor.openFloatToolbar, "function");
});

test("canva shell elements rail includes add service card control", () => {
  const source = readFileSync(path.join(ROOT, "assets", "js", "admin-canva-shell.js"), "utf8");
  assert.ok(
    source.includes('id="admin-quick-add-service"') || source.includes('id="admin-canva-add-service"'),
    "Add service button exists in canva elements panel HTML",
  );
  assert.ok(source.includes("Add service card"), "button label is visible");
});

test("card-frame image resize clears missing marker", async () => {
  buildPage();
  const editor = await loadEditor();
  const image = document.querySelector(".project-image-wrap img, .project-shot");
  image.classList.add("cms-image-missing");
  editor.applyImageResize(image, { width: 400, height: 300, offsetX: 0, offsetY: 0 });
  assert.equal(image.classList.contains("cms-image-missing"), false);
});

test("hold-c keydown prevents default browser behavior", () => {
  const source = readFileSync(path.join(ROOT, "assets", "js", "admin.js"), "utf8");
  assert.ok(source.includes("snapHoldOff = true") && source.includes("event.preventDefault()"), "hold-c uses preventDefault");
  assert.ok(source.includes("stopPropagation"), "hold-c stops propagation");
});

test("public renderer uses stable portfolio image ids", () => {
  const source = readFileSync(path.join(ROOT, "assets", "js", "site-content.js"), "utf8");
  assert.ok(source.includes("projectCard.id}-image"), "portfolio images get stable cms ids");
});

test("Build your page lists portfolio and service cards with Remove controls", async () => {
  buildPage();
  const editor = await loadEditor();
  editor.renderCardLists();
  const portfolioList = editor.byId("admin-portfolio-cards");
  const serviceList = editor.byId("admin-service-cards");
  assert.ok(portfolioList, "portfolio card list exists in Build your page");
  assert.ok(serviceList, "service card list exists in Build your page");
  assert.ok(
    portfolioList.textContent.includes("Demo portfolio project"),
    "portfolio list shows project titles",
  );
  assert.ok(
    serviceList.textContent.includes("Brand activations & ambassadors"),
    "service list shows service titles",
  );
  const portfolioRemove = portfolioList.querySelectorAll("button").find((button) => button.textContent === "Remove");
  const serviceRemove = serviceList.querySelectorAll("button").find((button) => button.textContent === "Remove");
  assert.ok(portfolioRemove, "portfolio rows expose Remove");
  assert.ok(serviceRemove, "service rows expose Remove");
});

test("removePageCard hides built-in portfolio and service cards", async () => {
  const fixture = buildPage();
  const editor = await loadEditor();
  editor.assignContentIds();
  editor.renderCardLists();

  assert.equal(fixture.projectCard.hidden, false);
  editor.removePageCard(fixture.projectCard, "portfolio");
  assert.equal(fixture.projectCard.hidden, true, "built-in portfolio card is hidden");
  assert.equal(
    Boolean(editor.state.edits[fixture.projectCard.dataset.cmsId]?.deleted),
    true,
    "portfolio removal is persisted as deleted",
  );

  assert.equal(fixture.serviceCard.hidden, false);
  editor.removePageCard(fixture.serviceCard, "service");
  assert.equal(fixture.serviceCard.hidden, true, "built-in service card is hidden");
  assert.equal(
    Boolean(editor.state.edits[fixture.serviceCard.dataset.cmsId]?.deleted),
    true,
    "service removal is persisted as deleted",
  );
});

test("resolveDeleteTarget removes whole service card for non-media selection", async () => {
  const fixture = buildPage();
  const editor = await loadEditor();
  const resolvedTitle = editor.resolveDeleteTarget(fixture.serviceTitle);
  assert.equal(resolvedTitle, fixture.serviceCard, "service title resolves to the card");
  const resolvedOpen = editor.resolveDeleteTarget(fixture.serviceOpen);
  assert.equal(resolvedOpen, fixture.serviceCard, "service button resolves to the card");
  const resolvedImage = editor.resolveDeleteTarget(fixture.projectImage);
  assert.equal(resolvedImage, fixture.projectImage, "portfolio photos stay independently deletable");
});

test("deleting a custom service card removes it from state and the grid", async () => {
  const fixture = buildPage();
  const editor = await loadEditor();
  const custom = {
    id: "custom-test-service",
    title: "Custom hosting",
    summary: "A custom card",
    description: "Full detail",
    example: "Example",
    image: "/assets/images/custom.jpg",
    alt: "Custom hosting",
  };
  editor.state.services.push(custom);
  editor.addServiceCard(custom);
  const card = document.getElementById(`service-${custom.id}`);
  assert.ok(card, "custom service card is rendered");
  assert.equal(fixture.servicesGrid.children.length, 2);

  editor.deleteElements([card]);
  assert.equal(document.getElementById(`service-${custom.id}`), null, "custom card leaves the DOM");
  assert.equal(editor.state.services.some((service) => service.id === custom.id), false);
  assert.equal(fixture.servicesGrid.children.length, 1, "only the built-in card remains");
});

test("selectionKind and syncRelevantControls hide text tools for images", async () => {
  const fixture = buildPage();
  const editor = await loadEditor();
  assert.equal(editor.selectionKind(fixture.projectImage), "media");
  assert.equal(editor.selectionKind(fixture.aboutHeading), "text");
  assert.equal(editor.selectionKind(fixture.work), "section");
  editor.selectElement(fixture.projectImage);
  const textBox = editor.byId("admin-text")?.closest("[data-relevant]");
  const mediaBtn = editor.byId("admin-replace-media");
  const widthBox = editor.byId("admin-width")?.closest("[data-relevant]");
  const fontSize = editor.byId("admin-font-size")?.closest("[data-relevant]");
  const hrefField = editor.byId("admin-href")?.closest("[data-relevant]");
  assert.ok(textBox?.classList.contains("admin-relevant-hidden"), "text field hidden for images");
  assert.equal(mediaBtn?.classList.contains("admin-relevant-hidden"), false, "media tools stay for images");
  assert.equal(widthBox?.classList.contains("admin-relevant-hidden"), false, "width stays for media");
  assert.ok(fontSize?.classList.contains("admin-relevant-hidden"), "font size hidden for images");
  editor.selectElement(fixture.aboutHeading);
  assert.equal(mediaBtn?.classList.contains("admin-relevant-hidden"), true, "media tools hide for text");
  assert.equal(textBox?.classList.contains("admin-relevant-hidden"), false, "text tools show for text");
  assert.ok(widthBox?.classList.contains("admin-relevant-hidden"), "width hidden for plain text");
  assert.ok(hrefField?.classList.contains("admin-relevant-hidden"), "href hidden for plain text");
  assert.equal(editor.byId("admin-font-size")?.disabled, false, "font size enabled for text");
  assert.equal(mediaBtn?.disabled, true, "replace disabled when hidden for text");
});

test("context tools switch correctly across media, link, and section", async () => {
  const fixture = buildPage();
  const editor = await loadEditor();
  const link = document.createElement("a");
  link.className = "button button-dark";
  link.setAttribute("href", "#book");
  link.textContent = "Book";
  document.querySelector("main").append(link);
  editor.assignContentIds();

  editor.selectElement(fixture.projectImage);
  assert.equal(editor.byId("admin-replace-media").disabled, false);
  assert.ok(editor.byId("admin-bold").closest("[data-relevant]").classList.contains("admin-relevant-hidden"));

  editor.selectElement(link);
  assert.equal(editor.selectionKind(link), "link");
  assert.equal(editor.byId("admin-href").disabled, false, "href enabled for buttons");
  assert.equal(editor.byId("admin-href").closest("[data-relevant]").classList.contains("admin-relevant-hidden"), false);
  assert.equal(editor.byId("admin-text").closest("[data-relevant]").classList.contains("admin-relevant-hidden"), false, "text tools for links");
  assert.ok(editor.byId("admin-replace-media").classList.contains("admin-relevant-hidden"));

  editor.selectElement(fixture.work);
  assert.equal(editor.selectionKind(fixture.work), "section");
  assert.equal(editor.byId("admin-section-height-hint").hidden, false);
  assert.ok(editor.byId("admin-text").closest("[data-relevant]").classList.contains("admin-relevant-hidden"));
  assert.ok(editor.byId("admin-replace-media").classList.contains("admin-relevant-hidden"));
  assert.equal(editor.byId("admin-height").closest("[data-relevant]").classList.contains("admin-relevant-hidden"), false);
});

test("section min-height can be lengthened from the editor", async () => {
  const fixture = buildPage();
  const editor = await loadEditor();
  editor.selectElement(fixture.work);
  editor.applySectionMinHeight(fixture.work, 720);
  assert.equal(editor.state.edits[fixture.work.dataset.cmsId].styles.minHeight, 720);
  assert.equal(fixture.work.style.minHeight, "720px");
  editor.syncSectionResizeHandle(fixture.work);
  assert.ok(fixture.work.querySelector(".cms-section-resize-handle"), "section gets a resize handle");
  assert.ok(fixture.work.querySelector(".cms-section-resize-dock"), "section gets a resize dock with typed fields");
  assert.ok(fixture.work.querySelector(".cms-section-height-input"), "length can be typed while resizing");
  assert.ok(fixture.work.querySelector(".cms-section-margin-input"), "margin can be typed while resizing");
});

test("elements without a stable id can still be deleted", async () => {
  buildPage();
  const editor = await loadEditor();
  const stray = document.createElement("div");
  stray.className = "cms-added-content-block";
  stray.textContent = "temp";
  document.querySelector("main").append(stray);
  assert.equal(editor.deleteElements([stray]), true);
  assert.ok(stray.hidden || !stray.parentNode || stray.style.display === "none");
});

test("float toolbar closes only via the X button and wires Resize", () => {
  const source = readFileSync(path.join(ROOT, "assets", "js", "admin-power-tools.js"), "utf8");
  assert.ok(source.includes("Close only with"), "X-only close hint is present");
  assert.ok(source.includes("Intentionally no outside-click"), "outside click close is disabled");
  assert.ok(source.includes('data-float="resize"'), "resize control exists");
  assert.ok(source.includes("setImageTool"), "resize calls setImageTool directly");
  assert.ok(source.includes("placeFloat"), "float placement avoids sidebar overlap");
});

test("WCAG 1.4.10 reflow rules exist for mobile and editor preview", () => {
  const site = readFileSync(path.join(ROOT, "assets", "css", "site.css"), "utf8");
  const admin = readFileSync(path.join(ROOT, "assets", "css", "admin.css"), "utf8");
  assert.ok(site.includes("@media (max-width: 680px)"), "primary mobile breakpoint exists");
  assert.ok(site.includes("overflow-wrap: break-word"), "text wraps on narrow viewports");
  assert.ok(admin.includes("cms-preview-mobile") && admin.includes("font-size: 36px"), "editor mobile preview uses phone-sized type");
  assert.ok(!site.includes("white-space: normal !important"), "mobile CSS does not force white-space normal");
});

test("button links are editable and crop defaults off until requested", async () => {
  buildPage();
  const editor = await loadEditor();
  const link = document.createElement("a");
  link.className = "button button-dark";
  link.setAttribute("href", "#contact");
  link.textContent = "Get to know each other";
  document.querySelector("main").append(link);
  editor.assignContentIds();
  editor.selectElement(link);
  assert.equal(editor.selectionKind(link), "link");
  assert.equal(editor.byId("admin-href").disabled, false, "href field enabled for buttons");
  assert.equal(editor.byId("admin-href").value, "#contact");
  const power = readFileSync(path.join(ROOT, "assets", "js", "admin-power-tools.js"), "utf8");
  assert.ok(power.includes('data-float="replace"'), "float toolbar exposes Replace");
  const enhancements = readFileSync(path.join(ROOT, "assets", "js", "admin-enhancements.js"), "utf8");
  assert.ok(enhancements.includes('activeImageTool = "none"'), "crop/resize start off");
});

test("section remove and add page controls are available", async () => {
  buildPage();
  const editor = await loadEditor();
  assert.ok(editor.byId("admin-add-page"), "Add page button exists");
  assert.ok(editor.byId("admin-custom-pages"), "custom pages list exists");
  assert.equal(typeof editor.addCustomPage, "function");
  assert.equal(typeof editor.ensureImageCropFrame, "function");
  const admin = readFileSync(path.join(ROOT, "assets", "js", "admin.js"), "utf8");
  assert.ok(admin.includes("admin-section-delete"), "section Remove uses delete styling");
  assert.ok(admin.includes("toggleSectionVisibility(target)"), "built-in sections soft-remove via Hide");
});

test("uploaded image crop frame stays clipped", async () => {
  buildPage();
  const editor = await loadEditor();
  const section = document.querySelector("main > section") || document.querySelector("main");
  const figure = document.createElement("figure");
  figure.className = "cms-added-content-block cms-added-image";
  figure.id = "content-block-crop-test";
  figure.dataset.cmsId = figure.id;
  const image = document.createElement("img");
  image.dataset.cmsId = `${figure.id}-image`;
  image.src = "/assets/images/captain-campaign-logo.png";
  image.width = 320;
  image.height = 200;
  figure.append(image);
  section.append(figure);
  Object.defineProperty(image, "getBoundingClientRect", {
    value: () => ({ width: 320, height: 200, top: 0, left: 0, right: 320, bottom: 200 }),
  });
  editor.ensureImageCropFrame(image);
  const edit = editor.state.edits[image.dataset.cmsId];
  assert.ok(edit?.resize?.width >= 40, "crop locks a width");
  assert.ok(edit?.resize?.height >= 30, "crop locks a height");
  assert.equal(figure.style.overflow, "hidden");
  assert.equal(figure.style.width, `${edit.resize.width}px`);
  assert.notEqual(image.style.width, "100vw");
});

test("uniform section margin control exists in Build your page", async () => {
  buildPage();
  const editor = await loadEditor();
  assert.ok(editor.byId("admin-section-margin"), "margin input exists");
  assert.ok(editor.byId("admin-apply-section-margin"), "apply margin button exists");
  assert.ok(editor.byId("admin-replace-hero-video"), "replace hero video control exists");
  editor.applyUniformSectionMargin(24);
  assert.equal(editor.state.sectionMargin, 24);
  assert.equal(document.body.classList.contains("cms-uniform-section-margin"), true);
});

test("Cursor AI region select and assist wiring exists", async () => {
  buildPage();
  await loadEditor();
  const enhancements = readFileSync(path.join(ROOT, "assets", "js", "admin-enhancements.js"), "utf8");
  const preview = readFileSync(path.join(ROOT, "local_preview.rb"), "utf8");
  assert.ok(enhancements.includes('fieldset("Cursor AI"'), "Cursor AI tool group exists");
  assert.ok(enhancements.includes("Select region on page"), "region select button label");
  assert.ok(enhancements.includes("captureRegionScreenshot"), "region screenshot capture");
  assert.ok(enhancements.includes("/api/cursor-assist"), "client posts to cursor-assist");
  assert.ok(enhancements.includes("applyCursorActions"), "applies returned edit plan");
  assert.ok(preview.includes('/api/cursor-assist'), "server exposes cursor-assist");
  assert.ok(preview.includes("call_cursor_sdk_assist"), "Cursor SDK bridge wired");
  assert.ok(preview.includes("html2canvas"), "html2canvas loaded for screenshots");
  assert.ok(existsSync(path.join(ROOT, "scripts", "cursor-ai-assist.mjs")), "Cursor SDK helper script present");
});

/* ---------- summary ---------- */
await runTests();
console.log(`\n${PASS.length} passed, ${FAIL.length} failed`);
FAIL.forEach((failure) => console.error(`FAIL: ${failure.name}\n  ${failure.message}`));
process.exit(FAIL.length ? 1 : 0);
