(() => {
  const isImageElement = (element) => element?.tagName === "IMG";
  const isVideoElement = (element) => element?.tagName === "VIDEO";
  const isMediaElement = (element) => isImageElement(element) || isVideoElement(element);
  const TEXT_SELECTOR = [
    "h1", "h2", "h3", "h4", "p", ".brand-name", ".brand-band-heading",
    ".hero-note", ".section-number", ".story-kicker", ".step-number",
    ".step-arrow", ".service-number", ".service-title", ".service-summary",
    ".service-image-action", ".project-meta > span", ".project-index",
    ".project-role", ".project-description", ".about-image-caption",
    ".featured-client", ".featured-project-title", ".footer-bottom > span",
    ".footer-bottom > a", ".primary-navigation > a", ".hero-actions > a",
    ".intro-actions > a", "a", "button:not(.service-open)",
  ].join(",");
  const CANDIDATE_SELECTOR = `${TEXT_SELECTOR},img,video,section,article,div,form,nav,footer,header,iframe,.service-open,button`;
  const STORAGE_KEY = "liam-portfolio-admin-draft-v1";
  const VERSION_STORAGE_KEY = "liam-portfolio-admin-versions-v1";
  const CASE_STUDY_PREVIEW_KEY = "liam-portfolio-case-study-preview-v1";
  const contentUrl = document.querySelector('script[data-content-url]')?.dataset.contentUrl || "/site-content.json";
  const siteBaseUrl = document.querySelector('script[data-content-url]')?.dataset.siteBaseurl || "";
  const textBox = (label, id) => `<label class="admin-full" for="${id}">${label}<textarea id="${id}"></textarea></label>`;
  const numberBox = (label, id, step = "1") => `<label>${label}<input id="${id}" type="number" step="${step}"></label>`;

  const toolbar = document.createElement("aside");
  toolbar.className = "admin-toolbar";
  toolbar.setAttribute("aria-label", "Website editing tools");
  toolbar.innerHTML = `
    <header class="admin-toolbar-header">
      <div><span class="admin-toolbar-kicker">Captain Campaign</span><h1>Website editor</h1></div>
      <div class="admin-header-actions"><button id="admin-collapse" type="button" aria-expanded="true">Hide tools</button><a href="/logout" aria-label="Lock administrator session" title="Lock">Lock</a></div>
    </header>
    <div id="admin-status" class="admin-status" role="status" aria-live="polite">Loading saved changes…</div>
    <button class="admin-publish" id="admin-publish" type="button">Update website</button>
    <div class="admin-button-row">
      <button id="admin-edit-mode" class="admin-primary" type="button" aria-pressed="true">Edit page</button>
      <button id="admin-preview-toggle" type="button" aria-pressed="false">Preview draft</button>
    </div>
    <div class="admin-preview-modes" role="group" aria-label="Preview website width">
      <button type="button" data-preview-mode="desktop" aria-pressed="true">Desktop</button>
      <button type="button" data-preview-mode="tablet" aria-pressed="false">Tablet</button>
      <button type="button" data-preview-mode="mobile" aria-pressed="false">Mobile</button>
    </div>
    <p class="admin-hint">Double-click text to edit it. Double-click a photo or video to open edit tools. Select other items to adjust, move, or remove them.</p>
    <details class="admin-tool-group" open>
      <summary>Build your page</summary>
      <fieldset><legend>Add to the page</legend>
      <label class="admin-full" for="admin-section-template">Section layout
        <select id="admin-section-template">
          <option value="editorial">Editorial introduction</option>
          <option value="case-study">Project story: challenge, approach, result</option>
        </select>
      </label>
      <label class="admin-full" for="admin-new-section-title">New section name
        <input id="admin-new-section-title" maxlength="160" placeholder="e.g. Recent campaign">
      </label>
      <button class="admin-full admin-primary" id="admin-add-section" type="button">＋ Add page section</button>
      <button class="admin-full admin-primary" id="admin-add-page" type="button">＋ Add page</button>
      <button class="admin-full admin-primary" id="admin-add-project" type="button">＋ Add portfolio project</button>
      <button class="admin-full admin-primary" id="admin-add-service" type="button">＋ Add service card</button>
      <small class="admin-full">Add a full page (like a new portfolio destination), or duplicate a section to reuse its layout.</small>
      <p class="admin-full admin-card-list-heading">Custom pages</p>
      <div class="admin-full" id="admin-custom-pages"></div>
    </fieldset>
      <fieldset><legend>Remove portfolio &amp; service cards</legend>
        <small class="admin-full">Select a card on the page, or remove it from the lists below.</small>
        <p class="admin-full admin-card-list-heading">Portfolio projects</p>
        <div class="admin-full" id="admin-portfolio-cards"></div>
        <p class="admin-full admin-card-list-heading">Service cards</p>
        <div class="admin-full" id="admin-service-cards"></div>
      </fieldset>
      <fieldset><legend>Page spacing</legend>
        <label class="admin-full" for="admin-section-margin">Uniform section margin (px)
          <input id="admin-section-margin" type="number" min="0" max="160" step="4" placeholder="e.g. 24">
        </label>
        <small class="admin-full">Applies the same horizontal inset to every page section. Leave blank to use the original layout gutters.</small>
        <button class="admin-full" id="admin-apply-section-margin" type="button">Apply uniform margin</button>
        <button class="admin-full" id="admin-clear-section-margin" type="button">Clear uniform margin</button>
      </fieldset>
      <fieldset><legend>Opening hero video</legend>
        <button class="admin-full admin-primary" id="admin-replace-hero-video" type="button">Replace opening video</button>
        <small class="admin-full">Updates the Section 1 background video. You can also select the video on the page and use Replace image or video.</small>
      </fieldset>
      <fieldset><legend>Add content to a section</legend>
        <label class="admin-full" for="admin-block-target">Place in section
          <select id="admin-block-target"></select>
        </label>
        <div class="admin-button-row admin-full">
          <button id="admin-add-heading-block" type="button">＋ Heading</button>
          <button id="admin-add-text-block" type="button">＋ Text</button>
        </div>
        <button class="admin-full" id="admin-add-image-block" type="button">＋ Photo</button>
        <small class="admin-full">New photos and text land in the section you are viewing (or the one with your current selection). Change the dropdown only if you want a different section.</small>
        <div class="admin-button-row admin-full">
          <button id="admin-block-up" type="button">Move up</button>
          <button id="admin-block-down" type="button">Move down</button>
        </div>
      </fieldset>
      <input id="admin-block-image-file" type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" hidden>
    </details>
    <details class="admin-tool-group" id="admin-case-study-tools">
      <summary>Case study photos</summary>
      <fieldset>
        <legend>Photo template</legend>
        <label class="admin-full" for="admin-photo-template">Photo template
          <select id="admin-photo-template">
            <option value="single">Single feature photo</option>
            <option value="two-column">Two-column gallery</option>
            <option value="three-up">Three-up strip</option>
            <option value="feature-row">Feature row + captions</option>
          </select>
        </label>
        <button class="admin-full admin-primary" id="admin-photo-template-apply" type="button">Apply photo template</button>
        <button class="admin-full" id="admin-photo-template-add" type="button">＋ Add photo to layout</button>
        <div class="admin-full" id="admin-photo-layout-slots"></div>
        <small class="admin-full">Drop a photo onto a slot or use Add photo to layout. Captions publish with the case study.</small>
        <input id="admin-photo-layout-file" type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" hidden>
      </fieldset>
    </details>
    <details class="admin-tool-group">
      <summary>Page appearance</summary>
    <fieldset><legend>Color and fonts</legend>
      <label class="admin-full" for="admin-theme">Color scheme
        <select id="admin-theme"><option value="original">Original</option><option value="coastal">Coastal / teal</option><option value="sunset">Warm / sunset</option><option value="violet">Violet</option></select>
      </label>
      <label class="admin-full" for="admin-font">Site font
        <select id="admin-font"><option value="inherit">Original clean sans-serif</option><option value="Georgia, serif">Georgia</option><option value="Arial, sans-serif">Arial</option><option value="custom">Imported font</option></select>
      </label>
      <button class="admin-full" id="admin-import-font" type="button">Import a font file</button>
      <small class="admin-full">Supported: WOFF, WOFF2, TTF, and OTF.</small>
    </fieldset>
    </details>
    <details class="admin-tool-group" open>
      <summary id="admin-selection-label">Selected element</summary>
    <fieldset>
      <div class="admin-full" id="admin-selection-name"><small>Choose something in the page to edit it.</small></div>
      <div class="admin-button-row admin-full">
        <button id="admin-duplicate" type="button" disabled>Copy</button>
        <button id="admin-group" type="button" disabled>Group</button>
        <button id="admin-lock" type="button" disabled>Lock</button>
      </div>
      <label class="admin-full"><input id="admin-lock-checkbox" type="checkbox"> Element locked</label>
      <label class="admin-full"><input id="admin-lock-parent-checkbox" type="checkbox"> Parent element locked</label>
      <small class="admin-full">Also available in the floating right-click toolbar.</small>
      <div class="admin-button-row admin-full">
        <button id="admin-send-backward" type="button" disabled>Send backward</button>
        <button id="admin-bring-forward" type="button" disabled>Bring forward</button>
      </div>
      <div data-relevant="text">${textBox("Text", "admin-text")}</div>
      <button class="admin-full" id="admin-replace-media" type="button" disabled data-relevant="media">Replace image or video</button>
      <label class="admin-full" for="admin-alt" data-relevant="media">Image description<input id="admin-alt" type="text"></label>
      <label class="admin-full" for="admin-href" data-relevant="link">Button / link destination<input id="admin-href" type="url" placeholder="#book, /projects/, https://…"></label>
      <small class="admin-full" data-relevant="link">Change where this button or link goes (page anchor, path, email, or URL).</small>
      <label class="admin-full" for="admin-filter" data-relevant="media">Media filter
        <select id="admin-filter"><option value="">Original</option><option value="grayscale(1)">Black and white</option><option value="sepia(1)">Sepia</option><option value="brightness(1.15)">Brighter</option><option value="contrast(1.15)">More contrast</option></select>
      </label>
      <label class="admin-full" for="admin-service-description" data-relevant="service">Expanded service description<textarea id="admin-service-description"></textarea></label>
      <label class="admin-full" for="admin-service-example" data-relevant="service">Service example<textarea id="admin-service-example"></textarea></label>
      <fieldset class="admin-full" id="admin-project-fields" hidden>
        <legend>Portfolio case study</legend>
        <label class="admin-full" for="admin-project-title">Project title<input id="admin-project-title" maxlength="160"></label>
        <label class="admin-full" for="admin-project-client">Brand or client<input id="admin-project-client" maxlength="180"></label>
        <label class="admin-full" for="admin-project-location">Event or location<input id="admin-project-location" maxlength="180"></label>
        <label class="admin-full" for="admin-project-category">Category
          <select id="admin-project-category">
            <option value="activation">Activation</option><option value="tour">Tour</option>
            <option value="content">Content</option><option value="hosting">Hosting</option>
          </select>
        </label>
        <label class="admin-full" for="admin-project-description">Project summary<textarea id="admin-project-description"></textarea></label>
        <label class="admin-full" for="admin-project-role">My role<textarea id="admin-project-role"></textarea></label>
        <label class="admin-full" for="admin-project-alt">Case-study image description<input id="admin-project-alt" maxlength="180"></label>
        <button class="admin-full" id="admin-project-preview" type="button">Preview case study page</button>
        <small class="admin-full">Use <strong>Case study photos</strong> in the toolbar to apply photo templates, drag photos into slots, and add captions on the individual portfolio page.</small>
      </fieldset>
      <button class="admin-full" id="admin-parent" type="button" disabled>Select parent element</button>
      <small class="admin-full" id="admin-media-hint">Images, videos, and uploaded fonts are saved with this project.</small>
    </fieldset>
    </details>
    <details class="admin-tool-group" data-admin-panel="position" open>
      <summary>Size and position</summary>
    <fieldset>
      <div data-relevant="media,shape,block">${numberBox("Width (px)", "admin-width")}</div>
      <div data-relevant="media,section,shape,block">${numberBox("Height (px)", "admin-height")}</div>
      <label class="admin-full" data-relevant="media"><input id="admin-aspect-lock" type="checkbox" checked> Lock aspect ratio</label>
      <small class="admin-full" data-relevant="section" id="admin-section-height-hint" hidden>Drag the gold bar at the bottom of the section, or type Length / Margin in the fields next to it.</small>
      <div data-relevant="text">${numberBox("Font size (px)", "admin-font-size")}</div>
      <div data-relevant="media,shape,block">${numberBox("X position (px)", "admin-left")}</div>
      <div data-relevant="media,shape,block">${numberBox("Y position (px)", "admin-top")}</div>
      <div data-relevant="media,shape,block,text,link,section">${numberBox("Rotation (°)", "admin-rotate", "1")}</div>
      <div data-relevant="media,shape,block,text,link,section">${numberBox("Opacity (%)", "admin-opacity", "1")}</div>
      <label data-relevant="media,shape,block,text,link,section,card,service">Layer order (front +)<input id="admin-z-index" type="number" step="1"></label>
      <div class="admin-button-row admin-full" data-relevant="media,shape,block,section">
        <button id="admin-align-left" type="button" title="Align left">⟸</button>
        <button id="admin-align-center" type="button" title="Align centre">⇔</button>
        <button id="admin-align-right" type="button" title="Align right">⟹</button>
      </div>
      <div class="admin-button-row admin-full" data-relevant="media,shape,block,section">
        <button id="admin-align-top" type="button" title="Align top">⟰</button>
        <button id="admin-align-middle" type="button" title="Align middle">☰</button>
        <button id="admin-align-bottom" type="button" title="Align bottom">⟱</button>
      </div>
      <button class="admin-full" id="admin-distribute-h" type="button" data-relevant="media,shape,block">Distribute horizontally</button>
      <button class="admin-full" id="admin-distribute-v" type="button" data-relevant="media,shape,block">Distribute vertically</button>
      <button class="admin-full" id="admin-send-to-front" type="button" data-relevant="media,shape,block,text,link,section,card,service">Bring to front</button>
      <button class="admin-full" id="admin-send-to-back" type="button" data-relevant="media,shape,block,text,link,section,card,service">Send to back</button>
      <button class="admin-full" id="admin-snap-even" type="button" disabled data-relevant="media">Snap to even spacing</button>
      <button class="admin-full" id="admin-snap-section" type="button" disabled data-relevant="media">Snap to section grid</button>
      <button class="admin-full" id="admin-snap-match-size" type="button" disabled data-relevant="media">Match other image size (pick)</button>
      <small class="admin-full" data-relevant="media">Hold <kbd>C</kbd> while resizing to temporarily disable snap. Right-drag to multi-select.</small>
      <label class="admin-full" data-relevant="any"><input id="admin-snap-enabled" type="checkbox" checked> Snap while dragging</label>
      <label class="admin-full" data-relevant="media"><input id="admin-snap-size" type="checkbox" checked> Snap size to nearby images</label>
      <label class="admin-full" data-relevant="any"><input id="admin-show-grid" type="checkbox"> Show grid &amp; guides</label>
      <button class="admin-full" id="admin-drag" type="button" aria-pressed="false" data-relevant="any">Drag selected element</button>
    </fieldset>
    </details>
    <details class="admin-tool-group" data-admin-panel="colors">
      <summary>Colors and effects</summary>
    <fieldset>
      <label data-relevant="text">Text color<input id="admin-color" type="color" value="#172019"></label>
      <label data-relevant="text,link,section,shape,card,service">Background<input id="admin-background" type="color" value="#f4f2e9"></label>
      <label data-relevant="media,shape,block,link">Border color<input id="admin-border-color" type="color" value="#1A2B49"></label>
      <div data-relevant="media,shape,block,link">${numberBox("Corner radius", "admin-radius")}</div>
      <div data-relevant="media,shape,block,link">${numberBox("Border width", "admin-border-width")}</div>
      <div class="admin-button-row admin-full" data-relevant="text">
        <button id="admin-bold" type="button" aria-pressed="false">Bold</button>
        <button id="admin-italic" type="button" aria-pressed="false">Italic</button>
        <button id="admin-underline" type="button" aria-pressed="false">Underline</button>
        <button id="admin-shadow" type="button" aria-pressed="false">Text shadow</button>
      </div>
      <div class="admin-button-row admin-full" data-relevant="text">
        <button id="admin-align-text-left" type="button">Left</button>
        <button id="admin-align-text-center" type="button">Centre</button>
        <button id="admin-align-text-right" type="button">Right</button>
      </div>
      <div data-relevant="text">${numberBox("Line height", "admin-line-height", "0.05")}</div>
      <div data-relevant="text">${numberBox("Letter spacing", "admin-letter-spacing", "0.1")}</div>
    </fieldset>
    </details>
    <details class="admin-tool-group" data-admin-panel="seo">
      <summary>SEO</summary>
      <fieldset>
        <label class="admin-full" for="admin-seo-title">Page title<input id="admin-seo-title" maxlength="70" placeholder="Captain Campaign"></label>
        <label class="admin-full" for="admin-seo-description">Meta description<textarea id="admin-seo-description" maxlength="160" placeholder="Brand activations and memorable experiences"></textarea></label>
        <label class="admin-full" for="admin-seo-og-image">Social share image URL<input id="admin-seo-og-image" type="url" placeholder="/assets/images/captain-campaign-logo.png"></label>
        <label class="admin-full" for="admin-seo-canonical">Canonical path<input id="admin-seo-canonical" placeholder="/"></label>
        <small class="admin-full">These fields update the published site head when you click Update website.</small>
      </fieldset>
    </details>
    <details class="admin-tool-group" data-admin-panel="analytics">
      <summary>Analytics</summary>
      <fieldset>
        <label class="admin-full" for="admin-ga4-id">GA4 measurement ID<input id="admin-ga4-id" placeholder="G-XXXXXXXXXX"></label>
        <small class="admin-full">Create a free Google Analytics 4 property for <code>VillagerCrafter.github.io/Captain-Campaign</code>, paste the ID here, then publish and also set <code>ga4_measurement_id</code> in <code>_config.yml</code> for the live build.</small>
        <a class="admin-full admin-external-link" id="admin-analytics-open" href="https://analytics.google.com/" target="_blank" rel="noopener noreferrer">Open Google Analytics ↗</a>
      </fieldset>
    </details>
    <details class="admin-tool-group" data-admin-panel="brand">
      <summary>Brand kit</summary>
      <fieldset>
        <div class="admin-brand-swatches admin-full" id="admin-brand-swatches"></div>
        <small class="admin-full">Click a swatch to colour the selection. Edit colours below to build your own kit.</small>
        <label class="admin-full" for="admin-brand-kit-name">Kit name<input id="admin-brand-kit-name" maxlength="40" placeholder="My brand kit"></label>
        <div class="admin-brand-color-editors admin-full" id="admin-brand-color-editors"></div>
        <div class="admin-button-row admin-full">
          <button type="button" id="admin-brand-add-color">＋ Colour</button>
          <button type="button" id="admin-brand-save-kit">Save kit</button>
        </div>
        <label class="admin-full" for="admin-brand-kit-select">Saved kits<select id="admin-brand-kit-select"></select></label>
        <div class="admin-button-row admin-full">
          <button type="button" id="admin-brand-load-kit">Load kit</button>
          <button type="button" id="admin-brand-delete-kit">Delete kit</button>
        </div>
        <button class="admin-full" id="admin-apply-brand-theme" type="button">Apply brand colours to theme</button>
        <img class="admin-full admin-brand-logo-preview" src="/assets/images/captain-campaign-logo.png" alt="Captain Campaign logo">
      </fieldset>
    </details>
    <details class="admin-tool-group" data-admin-panel="layers">
      <summary>Layers</summary>
      <fieldset>
        <div class="admin-full" id="admin-layers-list"></div>
        <small class="admin-full">Drag to reorder. Click a layer to select it on the page.</small>
      </fieldset>
    </details>
    <details class="admin-tool-group">
      <summary>Page sections</summary>
    <fieldset>
      <div class="admin-full" id="admin-sections"></div>
    </fieldset>
    </details>
    <details class="admin-tool-group">
      <summary>Version history</summary>
      <fieldset>
        <label class="admin-full" for="admin-version-list">Published versions saved before updates</label>
        <select id="admin-version-list"></select>
        <button class="admin-full" id="admin-version-restore" type="button">Restore selected version to draft</button>
        <small class="admin-full">Restoring loads a recoverable draft; it does not change the public preview until you publish.</small>
      </fieldset>
    </details>
    <button class="admin-danger" id="admin-delete" type="button" disabled>Delete selected element</button>
    <button id="admin-restore" type="button">Restore hidden elements</button>
    <button id="admin-reset-draft" type="button">Discard local draft</button>
    <small>Drafts stay in this browser. Update website publishes the paired preview, then commits site content and pushes it to GitHub.</small>
    <input id="admin-media-file" type="file" accept="image/*,video/mp4,video/webm" hidden>
    <input id="admin-font-file" type="file" accept=".woff,.woff2,.ttf,.otf,font/woff,font/woff2,font/ttf,font/otf" hidden>
  `;
  const toolbarResize = document.createElement("div");
  toolbarResize.className = "admin-toolbar-resize";
  toolbarResize.id = "admin-toolbar-resize";
  toolbarResize.setAttribute("role", "separator");
  toolbarResize.setAttribute("aria-label", "Resize editor sidebar");
  toolbarResize.setAttribute("aria-orientation", "vertical");
  toolbarResize.setAttribute("tabindex", "0");
  document.body.append(toolbar, toolbarResize);
  const sidebarWidthKey = "liam-portfolio-admin-sidebar-width-v1";
  const setSidebarWidth = (width, persist = false) => {
    const minWidth = document.body.classList.contains("cms-canva-shell") ? 320 : 278;
    const bounded = Math.max(minWidth, Math.min(640, Math.round(width)));
    document.body.style.setProperty("--admin-sidebar-width", `${bounded}px`);
    toolbarResize.style.left = `${bounded - 6}px`;
    toolbarResize.setAttribute("aria-valuenow", String(bounded));
    if (persist) {
      try {
        localStorage.setItem(sidebarWidthKey, String(bounded));
      } catch (error) {
        const statusNode = document.getElementById("admin-status");
        if (statusNode) {
          statusNode.textContent = `Sidebar resized, but its width could not be remembered: ${error.message}`;
          statusNode.dataset.state = "error";
        }
      }
    }
  };
  try {
    const savedWidth = Number(localStorage.getItem(sidebarWidthKey));
    if (savedWidth >= 278 && savedWidth <= 640) setSidebarWidth(savedWidth);
    else setSidebarWidth(278);
  } catch (error) {
    setSidebarWidth(278);
  }
  let resizePointerId = null;
  toolbarResize.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || window.matchMedia("(max-width: 760px)").matches) return;
    resizePointerId = event.pointerId;
    toolbarResize.classList.add("is-resizing");
    toolbarResize.setPointerCapture(event.pointerId);
    event.preventDefault();
  });
  toolbarResize.addEventListener("pointermove", (event) => {
    if (resizePointerId !== event.pointerId) return;
    setSidebarWidth(event.clientX);
  });
  const endSidebarResize = (event) => {
    if (resizePointerId !== event.pointerId) return;
    resizePointerId = null;
    toolbarResize.classList.remove("is-resizing");
    setSidebarWidth(event.clientX, true);
  };
  toolbarResize.addEventListener("pointerup", endSidebarResize);
  toolbarResize.addEventListener("pointercancel", endSidebarResize);
  toolbarResize.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
    event.preventDefault();
    const current = Number(toolbarResize.getAttribute("aria-valuenow")) || 278;
    setSidebarWidth(current + (event.key === "ArrowRight" ? 20 : -20), true);
  });
  document.body.classList.add("cms-administrator");

  const byId = (id) => document.getElementById(id);
  const status = byId("admin-status");
  const textInput = byId("admin-text");
  const mediaInput = byId("admin-media-file");
  const fontInput = byId("admin-font-file");
  const selectionName = byId("admin-selection-name");
  const main = document.querySelector("main");
  const DEFAULT_BRAND_COLORS = ["#1A2B49", "#FFB81C", "#122038", "#f4f2e9"];
  const PREVIEW_MODE_KEY = "liam-cms-preview-mode-v1";
  let state = { version: 1, edits: {}, sections: [], sectionCopies: [], sectionOrder: [], projects: [], services: [], contentBlocks: [], elementCopies: [], buttons: [], mediaElements: [], groups: [], customPages: [], caseStudyLayouts: {}, heroVideos: null, theme: "original", fontFamily: "inherit", googleFont: "", fontFile: null, seo: {}, analytics: {}, brandKit: { colors: [...DEFAULT_BRAND_COLORS], kits: [], activeKit: "Captain Campaign" } };
  if (document.body.classList.contains("case-study-page")) byId("admin-case-study-tools")?.setAttribute("open", "");
  let snapHoldOff = false;
  let selected = null;
  const selectedElements = new Set();
  let elementClipboard = null;
  let selectionGroupId = null;
  let editMode = true;
  let dragMode = false;
  let draftTimer;
  let undoHistory = [];
  let redoHistory = [];
  let lastHistorySnapshot = null;
  let historyReady = false;
  let extensionRenderer = () => {};
  const originalSections = [...main.querySelectorAll(":scope > section")];
  const originalElements = new Map();
  const PAGE_DOC_KEYS = [
    "edits", "sections", "sectionOrder", "sectionCopies", "contentBlocks",
    "elementCopies", "projects", "services", "buttons", "mediaElements", "shapes", "groups",
  ];
  const emptyPageDocument = () => Object.fromEntries(PAGE_DOC_KEYS.map((key) => [key, key === "edits" ? {} : []]));
  const slugifyPageTitle = (title) => {
    const slug = String(title || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48);
    return slug || `page-${crypto.randomUUID().slice(0, 8)}`;
  };
  const customPageSlug = (() => {
    const match = String(window.location?.search || "").match(/[?&]page=([^&]+)/i);
    const fromQuery = match ? decodeURIComponent(match[1].replace(/\+/g, " ")).trim() : "";
    if (fromQuery) return fromQuery.slice(0, 64);
    return (document.body.dataset.pageSlug || "").trim().slice(0, 64);
  })();
  const isCustomPageEditor = /\/pages\//.test(window.location?.pathname || "") && Boolean(customPageSlug);
  let homeDocumentSnapshot = null;
  let activeCustomPageId = null;

  const setStatus = (message, kind = "") => {
    status.textContent = message;
    status.dataset.state = kind;
  };

  const cloneData = (value) => JSON.parse(JSON.stringify(value));

  const clonePageDocument = (source = {}) => {
    const doc = emptyPageDocument();
    PAGE_DOC_KEYS.forEach((key) => {
      if (key === "edits") doc.edits = cloneData(source.edits || {});
      else doc[key] = cloneData(Array.isArray(source[key]) ? source[key] : []);
    });
    return doc;
  };

  const readActiveCustomPage = () => {
    if (!activeCustomPageId) return null;
    return (state.customPages || []).find((page) => page.id === activeCustomPageId) || null;
  };

  const syncActiveCustomPageFromWorkspace = () => {
    const page = readActiveCustomPage();
    if (!page) return;
    PAGE_DOC_KEYS.forEach((key) => {
      page[key] = key === "edits"
        ? cloneData(state.edits || {})
        : cloneData(Array.isArray(state[key]) ? state[key] : []);
    });
  };

  const buildPersistableState = () => {
    if (!homeDocumentSnapshot || !activeCustomPageId) {
      const payload = cloneData(state);
      payload.customPages = cloneData(state.customPages || []);
      return payload;
    }
    syncActiveCustomPageFromWorkspace();
    const payload = cloneData(state);
    PAGE_DOC_KEYS.forEach((key) => {
      payload[key] = cloneData(homeDocumentSnapshot[key]);
    });
    payload.customPages = cloneData(state.customPages || []);
    return payload;
  };

  const enterCustomPageWorkspace = (page) => {
    if (!page) return false;
    if (!homeDocumentSnapshot) homeDocumentSnapshot = clonePageDocument(state);
    activeCustomPageId = page.id;
    const doc = clonePageDocument(page);
    PAGE_DOC_KEYS.forEach((key) => { state[key] = doc[key]; });
    document.body.dataset.cmsCustomPage = page.slug;
    document.title = `${page.title || "Custom page"} | Captain Campaign editor`;
    return true;
  };

  const currentEdit = () => {
    if (!selected?.dataset.cmsId) return null;
    state.edits[selected.dataset.cmsId] ||= { styles: {} };
    state.edits[selected.dataset.cmsId].styles ||= {};
    return state.edits[selected.dataset.cmsId];
  };

  const applyStyle = (element, styles = {}) => {
    const lockFlowLayout = Boolean(
      element.matches?.(".hero-shade, .hero-media, .hero-video, .hero")
      || element.closest?.(".story-section, .stakes-note, .story-grid, .story-card, .hero-shade, .hero-media"),
    );
    const nextStyles = lockFlowLayout
      ? Object.fromEntries(Object.entries(styles).filter(([name]) => name !== "left" && name !== "top"))
      : styles;
    const numeric = { width: 2400, height: 1800, fontSize: 300, left: 4000, top: 4000, zIndex: 9999, minHeight: 4000 };
    for (const [name, maximum] of Object.entries(numeric)) {
      if (nextStyles[name] !== undefined) element.style[name] = name === "zIndex"
        ? String(Math.max(-9999, Math.min(maximum, Number(nextStyles[name]))))
        : `${Math.max(name === "left" || name === "top" ? -4000 : 8, Math.min(maximum, Number(nextStyles[name])))}px`;
    }
    if (nextStyles.minHeight !== undefined && element.matches?.("main > section, section")) {
      element.style.minHeight = `${Math.max(120, Math.min(4000, Number(nextStyles.minHeight) || 120))}px`;
      element.style.height = "";
    }
    if ((nextStyles.left !== undefined || nextStyles.top !== undefined) &&
        getComputedStyle(element).position === "static") element.style.position = "relative";
    if (nextStyles.left !== undefined || nextStyles.top !== undefined) element.dataset.cmsKeepOffset = "true";
    if (lockFlowLayout) {
      element.style.removeProperty("left");
      element.style.removeProperty("top");
      delete element.dataset.cmsKeepOffset;
    }
    styles = nextStyles;
    if (/^#[0-9a-f]{3,8}$/i.test(styles.color || "")) element.style.color = styles.color;
    if (/^#[0-9a-f]{3,8}$/i.test(styles.backgroundColor || "")) element.style.backgroundColor = styles.backgroundColor;
    if (/^#[0-9a-f]{3,8}$/i.test(styles.borderColor || "")) element.style.borderColor = styles.borderColor;
    if (styles.borderWidth !== undefined) {
      element.style.borderWidth = `${Math.max(0, Math.min(40, Number(styles.borderWidth)))}px`;
      element.style.borderStyle = Number(styles.borderWidth) > 0 ? "solid" : "";
    }
    if (styles.borderRadius !== undefined) {
      element.style.borderRadius = `${Math.max(0, Math.min(400, Number(styles.borderRadius)))}px`;
    }
    if (styles.opacity !== undefined) {
      element.style.opacity = String(Math.max(0, Math.min(1, Number(styles.opacity))));
    }
    if (styles.rotate !== undefined) {
      element.style.transform = `rotate(${Math.max(-180, Math.min(180, Number(styles.rotate)))}deg)`;
    }
    if (styles.lineHeight !== undefined) {
      element.style.lineHeight = String(Math.max(0.8, Math.min(3, Number(styles.lineHeight))));
    }
    if (styles.letterSpacing !== undefined) {
      element.style.letterSpacing = `${Math.max(-5, Math.min(40, Number(styles.letterSpacing)))}px`;
    }
    if (["400", "600", "700", "800"].includes(String(styles.fontWeight))) element.style.fontWeight = styles.fontWeight;
    if (styles.fontStyle === "italic") element.style.fontStyle = "italic";
    if (styles.textDecoration === "underline") element.style.textDecoration = "underline";
    if (["left", "center", "right", "justify"].includes(styles.textAlign)) element.style.textAlign = styles.textAlign;
    if (styles.textShadow === "1") element.style.textShadow = "0 2px 12px rgba(0,0,0,.38)";
    if (styles.textShadow === "echo") {
      element.style.textShadow = "0 0 1px currentColor, 2px 2px 0 rgba(26,43,73,.35), 4px 4px 0 rgba(255,184,28,.35)";
    }
    if (["grayscale(1)", "sepia(1)", "brightness(1.15)", "contrast(1.15)", "contrast(1.08) saturate(1.2)", "none"].includes(styles.filter)) {
      element.style.filter = styles.filter;
    }
    if (styles.zIndex !== undefined && getComputedStyle(element).position === "static") element.style.position = "relative";
    if (styles.maxWidth === "none") element.style.maxWidth = "none";
    if (["inherit", "Georgia, serif", "Arial, sans-serif", "custom"].includes(styles.fontFamily)) {
      element.style.fontFamily = styles.fontFamily === "custom" ? "LiamImportedFont, sans-serif" : styles.fontFamily;
    }
  };

  const allCandidates = () => [...document.querySelectorAll(CANDIDATE_SELECTOR)]
    .filter((element) => {
      if (element.closest(".admin-toolbar, .admin-mark")) return false;
      const dialog = element.closest(".service-dialog");
      if (!dialog) return true;
      // Allow editing the open service dialog (image + book button).
      return dialog.open || dialog.hasAttribute("open");
    });

  const stableContentId = (element) => {
    if (element.id && /^(project-|service-|shape-|content-block-|element-copy-|custom-cta-|stock-image-)/.test(element.id)) {
      return element.id;
    }
    const projectCard = element.closest?.(".project-card[id^='project-']");
    if (projectCard) {
      if (element === projectCard) return projectCard.id;
      if (element.matches?.("img") && element.closest?.(".project-image-wrap")) return `${projectCard.id}-image`;
      if (element.matches?.(".project-image-wrap")) return `${projectCard.id}-image-wrap`;
      if (element.matches?.(".project-index")) return `${projectCard.id}-index`;
      if (element.matches?.("h3")) return `${projectCard.id}-title`;
      if (element.matches?.(".project-description")) return `${projectCard.id}-description`;
      if (element.matches?.(".project-role")) return `${projectCard.id}-role`;
      if (element.matches?.(".project-meta")) return `${projectCard.id}-meta`;
    }
    const serviceCard = element.closest?.(".service-card, .cms-added-service");
    if (serviceCard) {
      const base = serviceCard.id || (() => {
        const grid = serviceCard.parentElement;
        const idx = grid ? [...grid.children].indexOf(serviceCard) : -1;
        return idx >= 0 ? `service-slot-${idx + 1}` : null;
      })();
      if (!base) return null;
      if (element === serviceCard) return base;
      if (element.matches?.("img") && serviceCard.contains(element)) return `${base}-image`;
      if (element.matches?.(".service-image-wrap")) return `${base}-image-wrap`;
      if (element.matches?.(".service-open") && serviceCard.contains(element)) return `${base}-button`;
      if (element.matches?.(".service-number")) return `${base}-number`;
      if (element.matches?.(".service-title")) return `${base}-title`;
      if (element.matches?.(".service-summary")) return `${base}-summary`;
    }
    if (element.id && /^[\w-]+$/.test(element.id)) return element.id;
    return null;
  };

  const ensureCmsId = (element) => {
    if (!element?.dataset) return null;
    if (!element.dataset.cmsId) {
      assignContentIds();
      if (!element.dataset.cmsId) {
        const stable = stableContentId(element);
        element.dataset.cmsId = stable || `element-${crypto.randomUUID()}`;
      }
    }
    return element.dataset.cmsId;
  };

  // Static Liquid service cards ship without article ids. Dialog sync used to store the
  // button cmsId (service-slot-N-button) as sourceServiceId, then getElementById failed
  // and title/image edits never wrote back to the card.
  const ensureServiceCardDomId = (card) => {
    if (!(card instanceof HTMLElement) || !card.matches?.(".service-card, .cms-added-service")) return "";
    if (card.id) return card.id;
    const grid = card.parentElement;
    const idx = grid ? [...grid.children].indexOf(card) : -1;
    const base = idx >= 0 ? `service-slot-${idx + 1}` : `service-card-${crypto.randomUUID()}`;
    const taken = document.getElementById(base);
    card.id = !taken || taken === card ? base : `${base}-${crypto.randomUUID().slice(0, 8)}`;
    if (!card.dataset.cmsId) card.dataset.cmsId = card.id;
    return card.id;
  };

  const resolveServiceCardFromSourceId = (sourceId) => {
    if (!sourceId) return null;
    const direct = document.getElementById(sourceId);
    if (direct?.matches?.(".service-card, .cms-added-service")) return direct;
    if (direct?.matches?.(".service-open")) return direct.closest(".service-card, .cms-added-service");
    const byButtonCms = document.querySelector(`.service-open[data-cms-id="${CSS.escape(sourceId)}"]`);
    if (byButtonCms) return byButtonCms.closest(".service-card, .cms-added-service");
    if (sourceId.endsWith("-button")) {
      const card = document.getElementById(sourceId.slice(0, -"-button".length));
      if (card?.matches?.(".service-card, .cms-added-service")) return card;
    }
    return null;
  };

  const resolveServiceButtonFromSourceId = (sourceId) => {
    const card = resolveServiceCardFromSourceId(sourceId);
    const nested = card?.querySelector?.(".service-open");
    if (nested) return nested;
    if (!sourceId) return null;
    return document.querySelector(`.service-open[data-cms-id="${CSS.escape(sourceId)}"]`);
  };

  const isEditableLink = (element) => Boolean(
    element instanceof HTMLAnchorElement
    || element instanceof HTMLIFrameElement
    || element?.matches?.("a.button, a.text-link, a.nav-cta, [data-dialog-book]"),
  );

  const selectionKind = (element) => {
    if (!element) return "none";
    if (element.matches?.("main > section, section.portfolio-section, section.services-section, section.about-section, section.hero, .added-page-section, .cms-new-section, .cms-section-copy")
      && element.tagName === "SECTION") return "section";
    if (isMediaElement(element)) return "media";
    // Buttons/CTAs before generic text so link destination stays available.
    if (isEditableLink(element)) return "link";
    if (element.matches?.(TEXT_SELECTOR)) return "text";
    if (element.matches?.(".service-open, .service-card, .cms-added-service")) return "service";
    if (element.matches?.(".project-card")) return "card";
    if (element.matches?.(".cms-shape")) return "shape";
    if (element.matches?.(".cms-added-content-block, .cms-stock-image")) return "block";
    return "any";
  };

  const syncRelevantControls = (element) => {
    const kind = selectionKind(element);
    // "any" is only matched when a control lists it — type-specific lists must not include "any"
    // or every selection would see those tools (active always contained "any" historically).
    const active = new Set(kind === "none" ? [] : [kind]);
    if (kind === "link") active.add("text");
    if (kind === "media" && isImageElement(element)) active.add("image");
    if (kind !== "none") active.add("any");
    document.querySelectorAll("[data-relevant]").forEach((node) => {
      const allowed = String(node.getAttribute("data-relevant") || "")
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean);
      const show = kind !== "none" && allowed.some((token) => active.has(token));
      node.classList.toggle("admin-relevant-hidden", !show);
      const controls = [
        ...(node.matches?.("input, textarea, select, button") ? [node] : []),
        ...[...(node.querySelectorAll?.("input, textarea, select, button") || [])],
      ];
      controls.forEach((control) => {
        // Visibility owns a baseline enabled state; selectElement re-applies type-specific disables after.
        control.disabled = !show;
      });
    });
    const sectionHint = byId("admin-section-height-hint");
    if (sectionHint) sectionHint.hidden = kind !== "section";
    const heightInput = byId("admin-height");
    if (heightInput) {
      const wrap = heightInput.closest("label") || heightInput.parentElement;
      if (wrap) {
        const text = [...(wrap.childNodes || [])].find((node) => node.nodeType === 3 && String(node.textContent || "").trim());
        if (text) text.textContent = kind === "section" ? "Section length (px)" : "Height (px)";
      }
    }
    document.dispatchEvent(new CustomEvent("cms-selection-changed", {
      detail: { element, kind, active: [...active] },
    }));
  };

  const applySelectionFieldEnables = (element) => {
    if (!element) return;
    if (textInput) textInput.disabled = [...selectedElements].some((item) => !item.matches(TEXT_SELECTOR));
    const setDisabled = (id, disabled) => {
      const control = byId(id);
      if (control) control.disabled = disabled;
    };
    setDisabled("admin-replace-media", !isMediaElement(element));
    setDisabled("admin-alt", !isImageElement(element));
    setDisabled("admin-href", !isEditableLink(element));
    const serviceContext = element.matches(".service-open")
      || Boolean(element.closest?.(".service-dialog[open]"))
      || ["dialog-title", "dialog-description", "dialog-example", "dialog-image"].includes(element.id);
    setDisabled("admin-service-description", !serviceContext);
    setDisabled("admin-service-example", !serviceContext);
    const parentLockBox = byId("admin-lock-parent-checkbox");
    if (parentLockBox) {
      const parent = element.parentElement?.closest?.("[data-cms-id]");
      parentLockBox.disabled = !parent;
    }
    setDisabled("admin-parent", !element.parentElement?.matches(CANDIDATE_SELECTOR));
    const mediaCount = (typeof selectionTargets === "function" ? selectionTargets() : [...selectedElements])
      .filter(isMediaElement).length;
    setDisabled("admin-snap-even", mediaCount < 2);
    setDisabled("admin-snap-section", mediaCount < 1);
    setDisabled("admin-snap-match-size", mediaCount < 1);
  };

  const isPageRoot = (element) => {
    if (!element || !(element instanceof Element)) return true;
    const tag = element.tagName;
    return tag === "HTML" || tag === "BODY" || tag === "MAIN" || element === document.documentElement;
  };
  const isDeletable = (element) => Boolean(element && !isPageRoot(element) && !element.matches?.(".admin-toolbar, .admin-rail, .admin-properties, .admin-float-toolbar, [data-cms-control]"));

  /** Map a click target to something we can hide/remove — never refuse except the page root. */
  const resolveDeleteTarget = (element) => {
    if (!element || isPageRoot(element)) return null;
    if (element.matches?.(".project-card, .service-card, .cms-added-service, .cms-added-content-block, .cms-shape, .cms-stock-image")) {
      return element;
    }
    // Added photo/text blocks: deleting the inner img must remove the whole block entry,
    // otherwise contentBlocks re-injects the photo on the next draft/publish reload.
    const addedBlock = element.closest?.(".cms-added-content-block, .cms-shape, .cms-stock-image, .cms-upload-frame");
    if (addedBlock && !isPageRoot(addedBlock)) return addedBlock;
    // Text/chrome inside a portfolio or service card → remove the whole card (photos stay deletable alone).
    if (!isMediaElement(element)) {
      const card = element.closest?.(".project-card, .service-card, .cms-added-service");
      if (card) return card;
    }
    // Non-candidate chrome inside a card (index badge, etc.) → nearest real part.
    if (!element.matches?.(CANDIDATE_SELECTOR) && !element.matches?.(TEXT_SELECTOR) && !isMediaElement(element)) {
      const media = element.closest?.(".project-image-wrap, .service-image-wrap, .about-image-wrap, .featured-image")?.querySelector("img, video");
      if (media) return media;
      const part = element.closest?.(CANDIDATE_SELECTOR);
      if (part && !isPageRoot(part)) return part;
    }
    return element;
  };

  const updateDeleteControl = () => {
    const targets = selectionTargets();
    if (!targets.length && selected) targets.push(selected);
    byId("admin-delete").disabled = !targets.some((el) => isDeletable(resolveDeleteTarget(el) || el));
  };

  let sectionResizeSession = null;
  const clearSectionResizeHandles = () => {
    document.querySelectorAll(".cms-section-resize-dock, .cms-section-resize-handle").forEach((handle) => handle.remove());
    document.querySelectorAll("main > section.cms-section-resizable").forEach((section) => {
      section.classList.remove("cms-section-resizable");
    });
  };

  const resolveResizeSection = (element) => {
    if (!element) return null;
    if (element.tagName === "SECTION" && element.closest?.("main") === element.parentElement) return element;
    if (element.matches?.("main > section")) return element;
    return element.closest?.("main > section") || null;
  };

  const applySectionMinHeight = (section, minHeight, { silent = false } = {}) => {
    if (!section) return;
    const cmsId = ensureCmsId(section);
    if (!cmsId) return;
    const edit = state.edits[cmsId] ||= { styles: {} };
    edit.styles ||= {};
    const value = Math.max(120, Math.min(4000, Math.round(Number(minHeight) || 120)));
    edit.styles.minHeight = value;
    delete edit.styles.height;
    applyStyle(section, edit.styles);
    const heightField = byId("admin-height");
    if (heightField) heightField.value = String(value);
    const dockHeight = section.querySelector(".cms-section-height-input");
    if (dockHeight && document.activeElement !== dockHeight) dockHeight.value = String(value);
    const floatHeight = byId("admin-float-section-height");
    if (floatHeight && document.activeElement !== floatHeight) floatHeight.value = String(value);
    const dock = section.querySelector(":scope > .cms-section-resize-dock");
    if (dock) placeSectionResizeDock(section, dock);
    if (!silent) saveDraft();
  };

  const applySectionSideMargin = (section, marginPx) => {
    if (!section) return;
    const cmsId = ensureCmsId(section);
    if (!cmsId) return;
    const edit = state.edits[cmsId] ||= { styles: {} };
    edit.styles ||= {};
    const px = Math.max(0, Math.min(160, Math.round(Number(marginPx) || 0)));
    if (px) {
      edit.sectionMargin = px;
      section.style.setProperty("padding-inline", `${px}px`, "important");
    } else {
      delete edit.sectionMargin;
      section.style.removeProperty("padding-inline");
    }
    const dockMargin = section.querySelector(".cms-section-margin-input");
    if (dockMargin && document.activeElement !== dockMargin) dockMargin.value = String(px || "");
    if (byId("admin-section-margin") && document.activeElement !== byId("admin-section-margin")) {
      byId("admin-section-margin").value = String(px || "");
    }
    const dock = section.querySelector(":scope > .cms-section-resize-dock");
    if (dock) placeSectionResizeDock(section, dock);
    saveDraft();
  };

  const currentSectionHeight = (section) => {
    const stored = Number(state.edits[section.dataset.cmsId]?.styles?.minHeight);
    if (Number.isFinite(stored) && stored > 0) return Math.round(stored);
    return Math.round(section.getBoundingClientRect().height || 0);
  };

  const currentSectionMargin = (section) => {
    const fromEdit = Number(state.edits[section.dataset.cmsId]?.sectionMargin);
    if (Number.isFinite(fromEdit) && fromEdit >= 0) return Math.round(fromEdit);
    if (Number.isFinite(Number(state.sectionMargin))) return Math.round(Number(state.sectionMargin));
    const computed = Number.parseFloat(getComputedStyle(section).paddingInlineStart || "0");
    return Number.isFinite(computed) ? Math.round(computed) : 0;
  };

  // Pin the dock to the on-screen bottom of the section. Absolute bottom sits below
  // the fold on tall sections, and hero/brand overflow:hidden clips an in-flow bar.
  const placeSectionResizeDock = (section, dock) => {
    if (!section || !dock?.isConnected) return;
    const rect = section.getBoundingClientRect();
    const dockWidth = dock.offsetWidth || 340;
    const dockHeight = dock.offsetHeight || 58;
    const hasBox = rect.width > 8 && rect.height > 8;
    const onScreen = !hasBox || (rect.bottom > 24 && rect.top < window.innerHeight - 24);
    dock.style.visibility = onScreen ? "visible" : "hidden";
    if (!onScreen) return;
    const cssPx = (name) => {
      const inline = document.body?.style?.getPropertyValue?.(name) || "";
      const computed = getComputedStyle(document.body);
      const raw = inline || (typeof computed?.getPropertyValue === "function" ? computed.getPropertyValue(name) : "");
      const parsed = Number.parseFloat(raw);
      return Number.isFinite(parsed) ? parsed : 0;
    };
    const sidebar = cssPx("--admin-sidebar-width");
    const props = cssPx("--admin-props-width");
    const minCenter = sidebar + dockWidth / 2 + 12;
    const maxCenter = Math.max(minCenter, window.innerWidth - props - dockWidth / 2 - 12);
    const center = hasBox
      ? Math.min(maxCenter, Math.max(minCenter, rect.left + rect.width / 2))
      : (minCenter + maxCenter) / 2;
    const visibleBottom = hasBox ? Math.min(rect.bottom, window.innerHeight) : window.innerHeight;
    const visibleTop = hasBox ? Math.max(rect.top, 8) : 8;
    let top = visibleBottom - dockHeight - 10;
    if (top < visibleTop + 8) top = visibleTop + 8;
    const maxTop = Math.max(8, window.innerHeight - dockHeight - 8);
    if (top > maxTop) top = maxTop;
    dock.style.position = "fixed";
    dock.style.left = `${Math.round(center)}px`;
    dock.style.top = `${Math.round(Math.max(8, top))}px`;
    dock.style.bottom = "auto";
    dock.style.right = "auto";
    dock.style.transform = "translateX(-50%)";
    dock.style.zIndex = "10064";
  };

  const repositionSectionResizeDock = () => {
    const dock = document.querySelector("main > section.cms-section-resizable > .cms-section-resize-dock");
    if (!dock) return;
    placeSectionResizeDock(dock.parentElement, dock);
  };
  document.addEventListener("scroll", repositionSectionResizeDock, { capture: true, passive: true });
  window.addEventListener("resize", repositionSectionResizeDock);

  const syncSectionResizeHandle = (element) => {
    const section = resolveResizeSection(element);
    if (!section || !editMode || document.body.classList.contains("cms-preview-mode")) {
      clearSectionResizeHandles();
      return;
    }
    // Keep an existing dock on the same section so typing Length/Margin is not wiped mid-edit.
    const existingDock = section.querySelector(":scope > .cms-section-resize-dock");
    if (existingDock) {
      section.classList.add("cms-section-resizable");
      document.querySelectorAll("main > section.cms-section-resizable").forEach((node) => {
        if (node !== section) {
          node.classList.remove("cms-section-resizable");
          node.querySelectorAll(":scope > .cms-section-resize-dock").forEach((dock) => dock.remove());
        }
      });
      const heightInput = existingDock.querySelector(".cms-section-height-input");
      const marginInput = existingDock.querySelector(".cms-section-margin-input");
      if (heightInput && document.activeElement !== heightInput) {
        heightInput.value = String(currentSectionHeight(section));
      }
      if (marginInput && document.activeElement !== marginInput) {
        marginInput.value = String(currentSectionMargin(section));
      }
      if (byId("admin-height") && document.activeElement !== byId("admin-height")) {
        byId("admin-height").value = String(currentSectionHeight(section));
      }
      placeSectionResizeDock(section, existingDock);
      return;
    }

    clearSectionResizeHandles();
    section.classList.add("cms-section-resizable");
    const dock = document.createElement("div");
    dock.className = "cms-section-resize-dock";
    dock.dataset.cmsControl = "true";
    dock.innerHTML = `
      <button type="button" class="cms-section-resize-handle" aria-label="Drag to make this page section longer or shorter" title="Drag to resize section height"></button>
      <div class="cms-section-resize-fields">
        <label>Length (px)<input class="cms-section-height-input" type="number" min="120" max="4000" step="10" inputmode="numeric"></label>
        <label>Margin (px)<input class="cms-section-margin-input" type="number" min="0" max="160" step="4" inputmode="numeric"></label>
      </div>
    `;
    section.append(dock);
    const handle = dock.querySelector(".cms-section-resize-handle");
    const heightInput = dock.querySelector(".cms-section-height-input");
    const marginInput = dock.querySelector(".cms-section-margin-input");
    heightInput.value = String(currentSectionHeight(section));
    marginInput.value = String(currentSectionMargin(section));
    if (byId("admin-height")) byId("admin-height").value = heightInput.value;

    handle.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      event.stopPropagation();
      sectionResizeSession = {
        section,
        startY: event.clientY,
        startHeight: currentSectionHeight(section),
      };
      handle.setPointerCapture(event.pointerId);
      dock.classList.add("is-active");
      setStatus("Drag to resize, or type Length / Margin in the fields beside the handle.");
    });
    handle.addEventListener("pointermove", (event) => {
      if (!sectionResizeSession || sectionResizeSession.section !== section) return;
      const next = sectionResizeSession.startHeight + (event.clientY - sectionResizeSession.startY);
      applySectionMinHeight(section, next, { silent: true });
    });
    const endResize = () => {
      if (!sectionResizeSession || sectionResizeSession.section !== section) return;
      sectionResizeSession = null;
      dock.classList.remove("is-active");
      saveDraft();
      setStatus("Section size updated. Publish to keep it on the live site.");
    };
    handle.addEventListener("pointerup", endResize);
    handle.addEventListener("pointercancel", endResize);

    const stopDockBubble = (event) => event.stopPropagation();
    dock.addEventListener("pointerdown", stopDockBubble);
    dock.addEventListener("mousedown", stopDockBubble);
    dock.addEventListener("click", stopDockBubble);
    heightInput.addEventListener("input", () => {
      applySectionMinHeight(section, Number(heightInput.value));
    });
    heightInput.addEventListener("change", () => {
      applySectionMinHeight(section, Number(heightInput.value));
      setStatus(`Section length set to ${currentSectionHeight(section)}px.`);
    });
    marginInput.addEventListener("input", () => {
      applySectionSideMargin(section, Number(marginInput.value));
    });
    marginInput.addEventListener("change", () => {
      applySectionSideMargin(section, Number(marginInput.value));
      setStatus(`Section margin set to ${currentSectionMargin(section)}px.`);
    });
    placeSectionResizeDock(section, dock);
    window.requestAnimationFrame(() => placeSectionResizeDock(section, dock));
  };

  const assignContentIds = () => {
    document.querySelectorAll(".services-grid .service-card, .services-grid .cms-added-service").forEach((card) => {
      ensureServiceCardDomId(card);
    });
    allCandidates().forEach((element, index) => {
      if (!element.dataset.cmsId) {
        element.dataset.cmsId = stableContentId(element) || `element-${index}-${element.tagName.toLowerCase()}`;
      }
      if (isImageElement(element) && element.getAttribute("src") && !element.dataset.cmsFallback) {
        element.dataset.cmsFallback = element.getAttribute("src");
      }
    });
  };

  const persistDraft = () => {
    try {
      const persistable = buildPersistableState();
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        savedAt: Date.now(),
        state: persistable,
        undoHistory,
        redoHistory,
        editorContext: activeCustomPageId ? { customPageId: activeCustomPageId, slug: customPageSlug } : { customPageId: null },
      }));
      return true;
    } catch (error) {
      setStatus(`Could not save your local draft: ${error.message}`, "error");
      return false;
    }
  };

  const saveDraft = () => {
    if (activeCustomPageId) syncActiveCustomPageFromWorkspace();
    const snapshot = JSON.stringify(buildPersistableState());
    if (historyReady && lastHistorySnapshot && snapshot !== lastHistorySnapshot) {
      undoHistory.push(lastHistorySnapshot);
      if (undoHistory.length > 50) undoHistory.shift();
      redoHistory = [];
    }
    lastHistorySnapshot = snapshot;
    window.clearTimeout(draftTimer);
    if (persistDraft()) {
      draftTimer = window.setTimeout(() => {
        setStatus("Draft saved in this browser.", "saved");
      }, 250);
    }
  };

  const saveField = (edit, name, value) => {
    if (isImageElement(selected) && (name === "width" || name === "height")) {
      const frame = imageFrameFor(selected);
      const bounds = frame.getBoundingClientRect();
      const dimensions = { ...(edit.resize || { width: bounds.width, height: bounds.height }), [name]: value };
      if (byId("admin-aspect-lock")?.checked) {
        const ratio = (Number(dimensions.width) || bounds.width) / Math.max(1, Number(dimensions.height) || bounds.height || 1);
        if (name === "width") dimensions.height = Math.round(value / ratio);
        if (name === "height") dimensions.width = Math.round(value * ratio);
      }
      edit.resize = dimensions;
      applyImageResize(selected, dimensions);
      byId("admin-width").value = dimensions.width;
      byId("admin-height").value = dimensions.height;
      saveDraft();
      document.dispatchEvent(new CustomEvent("cms-selection-changed", { detail: { selected } }));
      return;
    }
    edit.styles[name] = value;
    if (selected) applyStyle(selected, edit.styles);
    saveDraft();
    document.dispatchEvent(new CustomEvent("cms-selection-changed", { detail: { selected } }));
  };

  const scrollToSection = (section) => section?.scrollIntoView({ behavior: "smooth", block: "start" });

  const sectionTitle = (section) =>
    (section.querySelector("h1,h2,h3")?.textContent || section.id || "Page section").trim();

  /** Prefer the section on screen / under selection so new items are not dumped at the page bottom. */
  const resolvePlacementSection = ({ preferSelectValue = false } = {}) => {
    const sections = [...document.querySelectorAll("main > section")].filter((section) => !section.hidden);
    if (!sections.length) return null;

    const fromSelection = selected?.closest?.("main > section");
    if (fromSelection && sections.includes(fromSelection)) {
      syncBlockTarget(fromSelection);
      return fromSelection;
    }

    if (preferSelectValue) {
      const chosen = document.getElementById(byId("admin-block-target")?.value || "");
      if (chosen && sections.includes(chosen)) return chosen;
    }

    const viewportMid = window.innerHeight * 0.42;
    let best = sections[0];
    let bestScore = -Infinity;
    sections.forEach((section) => {
      const rect = section.getBoundingClientRect();
      if (rect.bottom <= 80 || rect.top >= window.innerHeight) return;
      const visible = Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0);
      const midBonus = rect.top <= viewportMid && rect.bottom >= viewportMid ? 400 : 0;
      const score = visible + midBonus - Math.abs((rect.top + rect.bottom) / 2 - viewportMid) * 0.15;
      if (score > bestScore) {
        bestScore = score;
        best = section;
      }
    });
    syncBlockTarget(best);
    return best;
  };

  const syncBlockTarget = (section) => {
    const target = byId("admin-block-target");
    if (!target || !section?.id) return;
    if (![...target.options].some((option) => option.value === section.id)) {
      target.append(new Option(sectionTitle(section), section.id));
    }
    target.value = section.id;
  };

  const sectionCopyEditId = (copyId, index) => `${copyId}-element-${index + 1}`;

  const renderSectionList = () => {
    const list = byId("admin-sections");
    list.replaceChildren();
    [...document.querySelectorAll("main > section")].forEach((section) => {
      const row = document.createElement("div");
      row.className = "admin-section-row";
      row.dataset.sectionId = section.dataset.cmsId;
      if (section.hidden) row.classList.add("is-hidden");
      const label = document.createElement("span");
      label.className = "admin-section-title";
      label.textContent = sectionTitle(section);
      const actions = document.createElement("div");
      actions.className = "admin-section-actions";
      const addAction = (name, labelText, action, className = "") => {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = labelText;
        button.setAttribute("aria-label", `${name} section ${sectionTitle(section)}`);
        if (className) button.className = className;
        button.addEventListener("click", (event) => {
          event.stopPropagation();
          action(section, row);
        });
        actions.append(button);
      };
      addAction("Select", "Select", (target) => {
        selectElement(target);
        scrollToSection(target);
      });
      addAction("Move up", "↑", (target) => moveSection(target, -1));
      addAction("Move down", "↓", (target) => moveSection(target, 1));
      addAction("Duplicate", "Duplicate", duplicateSection);
      addAction("Rename", "Rename", renameSection);
      addAction(section.hidden ? "Show" : "Hide", section.hidden ? "Show" : "Hide", toggleSectionVisibility);
      // Same Remove pattern as portfolio/service cards: soft-hide built-ins, permanently drop editor-added sections.
      if (section.classList.contains("cms-new-section") || section.classList.contains("cms-section-copy")) {
        addAction("Remove", "Remove", deleteAddedSection, "admin-section-delete");
      } else {
        addAction("Remove", "Remove", (target) => {
          if (target.hidden) {
            toggleSectionVisibility(target);
            return;
          }
          if (!window.confirm(`Remove "${sectionTitle(target)}" from the page? You can restore it with Show or Restore hidden elements.`)) return;
          toggleSectionVisibility(target);
        }, "admin-section-delete");
      }
      row.append(label, actions);
      list.append(row);
    });
    renderCardLists();
  };

  const cardLabel = (card) => {
    if (card.matches?.(".project-card")) {
      return (card.querySelector("h3")?.textContent || card.getAttribute("aria-label") || card.id || "Portfolio project").trim();
    }
    return (
      card.querySelector(".service-title")?.textContent
      || card.querySelector(".service-open")?.dataset?.serviceTitle
      || card.id
      || "Service card"
    ).trim();
  };

  const removePageCard = (card, kind) => {
    if (!card) return;
    const label = cardLabel(card);
    if (!window.confirm(`Remove "${label}" from the page? You can restore hidden built-in cards later.`)) return;
    const removed = deleteElements([card]);
    if (removed) {
      renumberServiceCards();
      renderCardLists();
      setStatus(`${kind === "service" ? "Service card" : "Portfolio project"} removed.`);
    }
  };

  const renumberServiceCards = () => {
    [...document.querySelectorAll(".services-grid .service-card, .services-grid .cms-added-service")]
      .filter((card) => !card.hidden)
      .forEach((card, index) => {
        const number = card.querySelector(".service-number");
        if (number) number.textContent = String(index + 1).padStart(2, "0");
      });
  };

  const renderCardList = (containerId, selector, kind) => {
    const list = byId(containerId);
    if (!list) return;
    list.replaceChildren();
    const cards = [...document.querySelectorAll(selector)];
    if (!cards.length) {
      const empty = document.createElement("small");
      empty.className = "admin-full";
      empty.textContent = kind === "service" ? "No service cards on the page." : "No portfolio projects on the page.";
      list.append(empty);
      return;
    }
    cards.forEach((card) => {
      const row = document.createElement("div");
      row.className = "admin-section-row admin-card-row";
      row.dataset.cardId = card.dataset.cmsId || card.id || "";
      if (card.hidden) row.classList.add("is-hidden");
      const label = document.createElement("span");
      label.className = "admin-section-title";
      label.textContent = cardLabel(card);
      const actions = document.createElement("div");
      actions.className = "admin-section-actions";
      const selectBtn = document.createElement("button");
      selectBtn.type = "button";
      selectBtn.textContent = "Select";
      selectBtn.setAttribute("aria-label", `Select ${cardLabel(card)}`);
      selectBtn.addEventListener("click", (event) => {
        event.stopPropagation();
        selectElement(card);
        scrollToSection(card.closest("main > section") || card);
      });
      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.textContent = "Remove";
      removeBtn.className = "admin-section-delete";
      removeBtn.setAttribute("aria-label", `Remove ${cardLabel(card)}`);
      removeBtn.addEventListener("click", (event) => {
        event.stopPropagation();
        removePageCard(card, kind);
      });
      actions.append(selectBtn, removeBtn);
      row.append(label, actions);
      list.append(row);
    });
  };

  const renderCardLists = () => {
    renderCardList("admin-portfolio-cards", ".portfolio-grid .project-card", "portfolio");
    renderCardList("admin-service-cards", ".services-grid .service-card, .services-grid .cms-added-service", "service");
  };

  const imageFrameFor = (media) => {
    if (isVideoElement(media)) return media.closest(".hero") || media;
    return media?.closest(
      ".service-image-wrap, .project-image-wrap, .about-image-wrap, .featured-image, .dialog-image, .cms-added-image, .cms-stock-image",
    ) || media;
  };
  const isBuiltInImageFrame = (frame) => frame?.matches?.(
    ".project-image-wrap, .service-image-wrap, .about-image-wrap, .featured-image, .dialog-image",
  );
  const isUploadedImageFrame = (frame) => frame?.matches?.(".cms-added-image, .cms-stock-image");
  /** Lock current on-screen size before crop so object-fit:cover / scale do not expand free-form uploads. */
  const ensureImageCropFrame = (media) => {
    if (!(media instanceof HTMLImageElement) || !media.dataset.cmsId) return;
    const edit = state.edits[media.dataset.cmsId] ||= { styles: {} };
    edit.styles ||= {};
    let frame = imageFrameFor(media);
    if (isBuiltInImageFrame(frame)) {
      if (!edit.crop) edit.crop = { fit: "cover", x: 50, y: 50, zoom: 100 };
      media.style.objectFit = edit.crop.fit || "cover";
      media.style.objectPosition = `${edit.crop.x ?? 50}% ${edit.crop.y ?? 50}%`;
      return;
    }
    // Bare uploaded/copied <img> needs a clipping figure so crop cannot blow out to the viewport.
    if (!isUploadedImageFrame(frame) && media.parentElement) {
      const wrap = document.createElement("figure");
      wrap.className = "cms-added-image cms-upload-frame";
      media.parentElement.insertBefore(wrap, media);
      wrap.append(media);
      frame = wrap;
    } else {
      frame = imageFrameFor(media);
    }
    const rect = (isUploadedImageFrame(frame) ? frame : media).getBoundingClientRect();
    const width = Math.max(40, Math.round(edit.resize?.width || rect.width || media.naturalWidth || 400));
    const height = Math.max(30, Math.round(edit.resize?.height || rect.height || media.naturalHeight || 300));
    edit.resize = {
      width,
      height,
      offsetX: Number(edit.resize?.offsetX) || 0,
      offsetY: Number(edit.resize?.offsetY) || 0,
    };
    applyImageResize(media, edit.resize);
    if (!edit.crop) edit.crop = { fit: "cover", x: 50, y: 50, zoom: 100 };
    media.style.objectFit = edit.crop.fit || "cover";
    media.style.objectPosition = `${edit.crop.x ?? 50}% ${edit.crop.y ?? 50}%`;
    const zoom = Math.max(100, Math.min(220, Number(edit.crop.zoom) || 100));
    if (zoom !== 100) media.style.transform = `scale(${zoom / 100})`;
  };
  const applyImageResize = (media, dimensions) => {
    if (!(isMediaElement(media)) || !dimensions) return;
    const width = Math.max(40, Math.min(2400, Number(dimensions.width) || 0));
    const height = Math.max(30, Math.min(1800, Number(dimensions.height) || 0));
    if (!width || !height) return;
    const frame = imageFrameFor(media);
    const cardFrame = isBuiltInImageFrame(frame);
    if (cardFrame) {
      // Built-in wraps keep CSS layout; only nudge the media fill.
      media.style.width = "100%";
      media.style.height = "100%";
      media.style.maxWidth = "none";
      media.style.objectFit = media.style.objectFit || "cover";
      media.classList.remove("cms-image-missing");
      return;
    }
    // Uploaded / free-form images: size the frame (figure) and fill inside it.
    if (isUploadedImageFrame(frame) || frame === media) {
      const box = isUploadedImageFrame(frame) ? frame : media;
      box.style.width = `${width}px`;
      box.style.height = `${height}px`;
      box.style.aspectRatio = "";
      box.style.maxWidth = "100%";
      box.style.overflow = "hidden";
      box.style.position = box.style.position || "relative";
      if (Number.isFinite(Number(dimensions.offsetX)) || Number.isFinite(Number(dimensions.offsetY))) {
        const offsetX = Number.isFinite(Number(dimensions.offsetX))
          ? Math.max(-20_000, Math.min(20_000, Number(dimensions.offsetX)))
          : 0;
        const offsetY = Number.isFinite(Number(dimensions.offsetY))
          ? Math.max(-20_000, Math.min(20_000, Number(dimensions.offsetY)))
          : 0;
        box.style.left = `${offsetX}px`;
        box.style.top = `${offsetY}px`;
        if (offsetX || offsetY) {
          box.style.position = "relative";
          box.dataset.cmsKeepOffset = "true";
          media.dataset.cmsKeepOffset = "true";
        }
      }
      // Never set width/height:100% on the box itself — that expands uploads to the section edges.
      if (media !== box) {
        media.style.width = "100%";
        media.style.height = "100%";
        media.style.maxWidth = "none";
      }
      media.style.objectFit = media.style.objectFit || "cover";
      media.classList?.remove?.("cms-image-missing");
      return;
    }
    frame.style.width = `${width}px`;
    frame.style.height = "auto";
    frame.style.aspectRatio = `${width} / ${height}`;
    frame.style.maxWidth = "none";
    frame.style.left = "";
    frame.style.top = "";
    frame.style.position = "";
    if (Number.isFinite(Number(dimensions.offsetX)) || Number.isFinite(Number(dimensions.offsetY))) {
      const offsetX = Number.isFinite(Number(dimensions.offsetX))
        ? Math.max(-20_000, Math.min(20_000, Number(dimensions.offsetX)))
        : 0;
      const offsetY = Number.isFinite(Number(dimensions.offsetY))
        ? Math.max(-20_000, Math.min(20_000, Number(dimensions.offsetY)))
        : 0;
      frame.style.left = `${offsetX}px`;
      frame.style.top = `${offsetY}px`;
      if (offsetX || offsetY) {
        frame.style.position = "relative";
        frame.dataset.cmsKeepOffset = "true";
        media.dataset.cmsKeepOffset = "true";
      }
    }
    if (frame !== media) {
      media.style.width = "100%";
      media.style.height = "100%";
      media.style.maxWidth = "none";
    } else {
      media.style.width = `${width}px`;
      media.style.height = `${height}px`;
      media.style.aspectRatio = "";
      media.style.maxWidth = "none";
      media.style.objectFit = media.style.objectFit || "cover";
    }
    media.classList?.remove?.("cms-image-missing");
  };
  const renderElementCopies = () => {
    (state.elementCopies || []).forEach((copy) => {
      if (!copy || !/^element-copy-[\w-]+$/.test(copy.id || "") || document.getElementById(copy.id)) return;
      const parent = document.querySelector(`[data-cms-id="${CSS.escape(copy.parentId || "")}"]`);
      if (!parent || !["p", "h2", "h3", "h4", "span", "a", "button", "img"].includes(copy.tag)) return;
      const element = document.createElement(copy.tag);
      element.id = copy.id;
      element.dataset.cmsId = copy.id;
      if (copy.tag === "img") {
        if (!/^(?:\/uploads\/[\w.-]+|\/assets\/[\w./-]+)$/.test(copy.src || "") || copy.src.includes("..")) return;
        element.src = copy.src;
        element.alt = copy.alt || "";
      } else {
        element.textContent = copy.text || "";
        if (copy.tag === "a" && /^(https?:|mailto:|\/(?!\/)|#)/i.test(copy.href || "")) element.href = copy.href;
      }
      if (copy.afterId) document.querySelector(`[data-cms-id="${CSS.escape(copy.afterId)}"]`)?.after(element);
      else parent.append(element);
    });
  };
  const addContentBlock = (block) => {
    const section = document.getElementById(block.sectionId) || document.querySelector("main > section");
    if (!section || document.getElementById(block.id)) return;
    if (block.type === "video") {
      const element = document.createElement("div");
      element.className = "cms-added-content-block cms-added-video";
      element.id = block.id;
      element.dataset.cmsId = block.id;
      const video = document.createElement("video");
      video.dataset.cmsId = `${block.id}-image`;
      video.src = block.image || block.src || "";
      video.controls = true;
      video.playsInline = true;
      element.append(video);
      section.append(element);
      return;
    }
    const element = block.type === "image" ? document.createElement("figure") :
      document.createElement(block.type === "heading" ? "h3" : "p");
    element.className = `cms-added-content-block cms-added-${block.type}`;
    element.id = block.id;
    element.dataset.cmsId = block.id;
    if (block.type === "image") {
      const image = document.createElement("img");
      image.dataset.cmsId = `${block.id}-image`;
      image.src = block.image || block.src || "";
      image.alt = block.alt || "";
      image.loading = "lazy";
      element.append(image);
    } else {
      element.textContent = block.text || (block.type === "heading" ? "New heading" : "Write your text here.");
    }
    section.append(element);
  };

  const duplicateSelected = (source = selected) => {
    if (!source || selectedElements.size > 1) {
      setStatus("Copy one element at a time. You can group selected elements and move them together.", "error");
      return null;
    }
    if (!source.dataset.cmsId) assignContentIds();
    const tag = source.tagName.toLowerCase();
    if (tag === "img" && !/^(?:\/uploads\/[\w.-]+|\/assets\/[\w./-]+)$/.test(source.getAttribute("src") || "")) {
      setStatus("This image cannot be copied because its media path is not a local site asset.", "error");
      return null;
    }
    if (tag !== "img" && !source.matches(TEXT_SELECTOR)) {
      setStatus("Copy supports text and local images. Select a text or image element.", "error");
      return null;
    }
    const parent = source.parentElement;
    if (!parent) return null;
    if (!parent.dataset.cmsId) assignContentIds();
    const id = `element-copy-${crypto.randomUUID()}`;
    const copy = {
      id,
      parentId: parent.dataset.cmsId,
      afterId: source.dataset.cmsId,
      tag,
      text: tag === "img" ? "" : source.textContent,
      src: tag === "img" ? source.getAttribute("src") : "",
      alt: tag === "img" ? source.alt : "",
      href: source instanceof HTMLAnchorElement ? source.getAttribute("href") : "",
    };
    state.elementCopies.push(copy);
    renderElementCopies();
    const clone = document.querySelector(`[data-cms-id="${CSS.escape(id)}"]`);
    const sourceEdit = JSON.parse(JSON.stringify(state.edits[source.dataset.cmsId] || { styles: {} }));
    sourceEdit.locked = false;
    delete sourceEdit.groupId;
    state.edits[id] = sourceEdit;
    if (clone) {
      if (typeof sourceEdit.text === "string" && clone.matches(TEXT_SELECTOR)) clone.textContent = sourceEdit.text;
      applyStyle(clone, sourceEdit.styles);
      selectElement(clone);
    }
    saveDraft();
    setStatus("Element copied. The copy is saved in your draft.");
    return clone;
  };

  const captureOriginalPage = () => {
    originalElements.clear();
    allCandidates().forEach((element) => {
      originalElements.set(element, {
        html: element.matches(TEXT_SELECTOR) ? element.innerHTML : null,
        src: element.getAttribute("src"),
        alt: element.getAttribute("alt"),
        href: element.getAttribute("href"),
        style: element.getAttribute("style"),
        hidden: element.hasAttribute("hidden"),
        serviceImage: element.dataset.serviceImage,
        serviceDescription: element.dataset.serviceDescription,
        serviceExample: element.dataset.serviceExample,
      });
    });
  };
  const restoreOriginalPage = () => {
    const originals = new Set(originalSections);
    [...main.querySelectorAll(":scope > section")].forEach((section) => {
      if (!originals.has(section)) section.remove();
    });
    main.querySelectorAll(
      ".cms-added-content-block, .cms-stock-image, .cms-upload-frame, .cms-added-service, .cms-shape, .custom-cta, .cms-section-copy, .project-card[id^='project-custom-']",
    ).forEach((element) => element.remove());
    originalElements.forEach((original, element) => {
      if (!element.isConnected) return;
      if (original.html !== null) element.innerHTML = original.html;
      for (const [attribute, value] of [["src", original.src], ["alt", original.alt], ["href", original.href], ["style", original.style]]) {
        if (value === null) element.removeAttribute(attribute);
        else element.setAttribute(attribute, value);
      }
      if (original.hidden) element.setAttribute("hidden", "");
      else {
        element.removeAttribute("hidden");
        element.hidden = false;
      }
      for (const [name, value] of [["serviceImage", original.serviceImage], ["serviceDescription", original.serviceDescription], ["serviceExample", original.serviceExample]]) {
        if (value === undefined) delete element.dataset[name];
        else element.dataset[name] = value;
      }
    });
    originalSections.forEach((section) => main.append(section));
    document.querySelectorAll(".cms-stock-credit").forEach((caption) => caption.remove());
  };
  const populateBlockTargets = () => {
    const target = byId("admin-block-target");
    if (!target) return;
    const previous = target.value;
    target.replaceChildren(new Option("Examples from the field", "work"));
    document.querySelectorAll("main > section[id]").forEach((section) => {
      if (section.id === "work") return;
      target.append(new Option((section.querySelector("h1,h2,h3")?.textContent || section.id).trim(), section.id));
    });
    if ([...target.options].some((option) => option.value === previous)) target.value = previous;
  };

  const appendSectionCopies = () => {
    state.sectionCopies.forEach((copy) => {
      const source = [...main.querySelectorAll(":scope > section")]
        .find((section) => section.dataset.cmsId === copy.sourceId);
      if (!source) return;
      const clone = source.cloneNode(true);
      clone.classList.add("cms-section-copy");
      clone.id = copy.id;
      clone.dataset.cmsId = copy.id;
      clone.hidden = false;
      const sourceIds = [source, ...source.querySelectorAll("[id]")];
      const cloneIds = [clone, ...clone.querySelectorAll("[id]")];
      const idMap = new Map();
      sourceIds.forEach((sourceNode, index) => {
        if (sourceNode.id) idMap.set(sourceNode.id, index === 0 ? copy.id : `${copy.id}-item-${index}`);
      });
      cloneIds.forEach((cloneNode, index) => {
        const sourceNode = sourceIds[index];
        if (sourceNode?.id) cloneNode.id = idMap.get(sourceNode.id);
      });
      clone.querySelectorAll("*").forEach((element) => {
        for (const attribute of ["for", "aria-labelledby", "aria-describedby", "aria-controls", "aria-owns", "headers"]) {
          const value = element.getAttribute(attribute);
          if (value) element.setAttribute(attribute, value.split(/\s+/).map((id) => idMap.get(id) || id).join(" "));
        }
        const href = element.getAttribute("href");
        if (href?.startsWith("#") && idMap.has(href.slice(1))) element.setAttribute("href", `#${idMap.get(href.slice(1))}`);
      });
      const sourceNodes = [source, ...source.querySelectorAll("[data-cms-id]")];
      const cloneNodes = [clone, ...clone.querySelectorAll("[data-cms-id]")];
      sourceNodes.forEach((sourceNode, index) => {
        const cloneNode = cloneNodes[index];
        if (!cloneNode) return;
        cloneNode.dataset.cmsId = index === 0 ? copy.id : sectionCopyEditId(copy.id, index - 1);
      });
      clone.querySelectorAll("form,iframe,video").forEach((element) => element.remove());
      main.append(clone);
    });
  };

  const moveSection = (section, direction) => {
    const sections = [...main.querySelectorAll(":scope > section")];
    const index = sections.indexOf(section);
    const destination = sections[index + direction];
    if (!destination) return;
    if (direction < 0) main.insertBefore(section, destination);
    else main.insertBefore(destination, section);
    state.sectionOrder = [...main.querySelectorAll(":scope > section")]
      .map((item) => item.dataset.cmsId).filter(Boolean);
    saveDraft();
    renderSectionList();
  };

  const renameSection = (section, row) => {
    const heading = section.querySelector("h1,h2,h3");
    if (!heading) {
      setStatus("This section has no heading to rename.", "error");
      return;
    }
    const label = row.querySelector(".admin-section-title");
    const input = document.createElement("input");
    input.type = "text";
    input.maxLength = 160;
    input.value = sectionTitle(section);
    input.setAttribute("aria-label", `New title for ${sectionTitle(section)}`);
    label.replaceWith(input);
    const actions = row.querySelector(".admin-section-actions");
    actions.replaceChildren();
    const save = document.createElement("button");
    save.type = "button";
    save.textContent = "Save";
    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.textContent = "Cancel";
    save.addEventListener("click", () => {
      const value = input.value.trim();
      if (!value) {
        setStatus("Enter a section title before saving.", "error");
        input.focus();
        return;
      }
      selectElement(heading);
      currentEdit().text = value;
      heading.textContent = value;
      heading.style.whiteSpace = "pre-line";
      const addedSection = state.sections.find((item) => item.id === section.id);
      if (addedSection) addedSection.title = value;
      const copiedSection = state.sectionCopies.find((item) => item.id === section.id);
      if (copiedSection) copiedSection.title = value;
      saveDraft();
      renderSectionList();
      setStatus("Section title updated.");
    });
    cancel.addEventListener("click", renderSectionList);
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") save.click();
      if (event.key === "Escape") renderSectionList();
    });
    actions.append(save, cancel);
    input.focus();
    input.select();
  };

  const toggleSectionVisibility = (section) => {
    const edit = state.edits[section.dataset.cmsId] ||= { styles: {} };
    edit.styles ||= {};
    if (section.hidden) {
      section.hidden = false;
      delete edit.deleted;
    } else {
      section.hidden = true;
      edit.deleted = true;
    }
    saveDraft();
    renderSectionList();
    setStatus(section.hidden ? "Section hidden. Use Show or Restore hidden elements to bring it back." : "Section restored.");
  };

  const duplicateSection = (section) => {
    if (section.querySelector("form,iframe,video")) {
      setStatus("This section contains an interactive form, embed, or video and cannot be duplicated safely.", "error");
      return;
    }
    const id = `section-copy-${crypto.randomUUID()}`;
    const title = `${sectionTitle(section)} (Copy)`.slice(0, 160);
    const sourceNodes = [section, ...section.querySelectorAll("[data-cms-id]")];
    sourceNodes.forEach((sourceNode, index) => {
      const edit = state.edits[sourceNode.dataset.cmsId];
      if (edit) {
        const copyId = index === 0 ? id : sectionCopyEditId(id, index - 1);
        state.edits[copyId] = JSON.parse(JSON.stringify(edit));
      }
    });
    if (state.edits[id]) delete state.edits[id].deleted;
    const sourceHeading = section.querySelector("h1,h2,h3");
    if (sourceHeading?.dataset.cmsId) {
      const headingIndex = sourceNodes.indexOf(sourceHeading);
      const headingEdit = state.edits[sectionCopyEditId(id, headingIndex - 1)] ||= { styles: {} };
      headingEdit.text = title;
    }
    state.sectionCopies.push({
      id,
      sourceId: section.dataset.cmsId,
      title,
    });
    renderEditorState();
    const duplicate = main.querySelector(`:scope > section[data-cms-id="${CSS.escape(id)}"]`);
    if (duplicate) {
      const order = [...main.querySelectorAll(":scope > section")]
        .map((item) => item.dataset.cmsId).filter(Boolean);
      const copyIndex = order.indexOf(id);
      const sourceIndex = order.indexOf(section.dataset.cmsId);
      if (copyIndex !== -1 && sourceIndex !== -1) {
        order.splice(copyIndex, 1);
        order.splice(order.indexOf(section.dataset.cmsId) + 1, 0, id);
      }
      state.sectionOrder = order;
      state.sectionOrder.forEach((sectionId) => {
        const orderedSection = main.querySelector(`:scope > section[data-cms-id="${CSS.escape(sectionId)}"]`);
        if (orderedSection) main.append(orderedSection);
      });
      selectElement(duplicate);
      scrollToSection(duplicate);
    }
    saveDraft();
    renderSectionList();
    setStatus("Section duplicated with its existing layout and content. Edit the copy independently.");
  };

  const deleteAddedSection = (section) => {
    if (!window.confirm(`Permanently remove "${sectionTitle(section)}" and any copies based on it? You can undo this change.`)) return;
    const removed = new Set([section.dataset.cmsId]);
    let expanded = true;
    while (expanded) {
      expanded = false;
      state.sectionCopies.forEach((copy) => {
        if (removed.has(copy.sourceId) && !removed.has(copy.id)) {
          removed.add(copy.id);
          expanded = true;
        }
      });
    }
    state.sections = state.sections.filter((item) => !removed.has(item.id));
    state.sectionCopies = state.sectionCopies.filter((item) => !removed.has(item.id));
    state.contentBlocks = state.contentBlocks.filter((item) => !removed.has(item.sectionId));
    state.buttons = state.buttons.filter((item) => !removed.has(item.sectionId));
    state.mediaElements = state.mediaElements.filter((item) => !removed.has(item.sectionId));
    Object.keys(state.edits).forEach((id) => {
      if ([...removed].some((removedId) => id === removedId || id.startsWith(`${removedId}-`))) delete state.edits[id];
    });
    state.sectionOrder = state.sectionOrder.filter((id) => !removed.has(id));
    if (selected && [...removed].includes(selected.closest("main > section")?.dataset.cmsId)) selected = null;
    renderEditorState();
    saveDraft();
    setStatus("Added section removed. Use Undo to restore it if needed.");
  };

  const renderEditorState = () => {
    restoreOriginalPage();
    assignContentIds();
    state.sections.forEach((section) => {
      if (document.getElementById(section.id)) return;
      const node = document.createElement("section");
      node.className = `added-page-section section-pad cms-new-section${section.layout === "case-study" ? " cms-section-layout-case-study" : ""}`;
      node.id = section.id;
      node.dataset.cmsId = section.id;
      const inner = document.createElement("div");
      inner.className = "page-width";
      const heading = document.createElement("h2");
      heading.textContent = section.title;
      heading.dataset.cmsId = `${section.id}-title`;
      const paragraph = document.createElement("p");
      paragraph.textContent = section.text;
      paragraph.dataset.cmsId = `${section.id}-text`;
      inner.append(heading, paragraph);
      node.append(inner);
      main.append(node);
    });
    state.projects.forEach(addProjectCard);
    (state.services || []).forEach(addServiceCard);
    state.contentBlocks.forEach(addContentBlock);
    (state.shapes || []).forEach(renderShape);
    renderElementCopies();
    assignContentIds();
    appendSectionCopies();
    assignContentIds();
    for (const [id, edit] of Object.entries(state.edits || {})) {
      const element = document.querySelector(`[data-cms-id="${CSS.escape(id)}"]`);
      if (!element) continue;
      edit.styles ||= {};
      if (edit.deleted) element.hidden = true;
      if (typeof edit.text === "string" && element.matches(TEXT_SELECTOR)) {
        // Never blank service card labels — empty drafts wiped titles 04/05.
        const isServiceCopy = element.matches?.(".service-title, .service-summary, .service-number");
        if (!(isServiceCopy && !edit.text.trim())) {
          element.textContent = edit.text;
          element.style.whiteSpace = "pre-line";
        } else {
          delete edit.text;
        }
      }
      if (typeof edit.alt === "string" && isImageElement(element)) element.alt = edit.alt;
      if (typeof edit.href === "string" && element instanceof HTMLAnchorElement && /^(https?:|mailto:|\/|#)/i.test(edit.href)) {
        element.setAttribute("href", edit.href);
      }
      if (typeof edit.src === "string" && element instanceof HTMLIFrameElement && /^(https:\/\/|\/(?!\/))/i.test(edit.src)) {
        element.src = edit.src;
      }
      if (element.matches(".service-open")) {
        if (typeof edit.text === "string") delete edit.text;
        if (typeof edit.serviceDescription === "string") element.dataset.serviceDescription = edit.serviceDescription;
        if (typeof edit.serviceExample === "string") element.dataset.serviceExample = edit.serviceExample;
        if (typeof edit.serviceSummary === "string" && edit.serviceSummary.trim()) {
          element.dataset.serviceSummary = edit.serviceSummary;
        }
      }
      if (typeof edit.media === "string" && /^\/uploads\/[\w.-]+$/.test(edit.media)) {
        if (isImageElement(element)) {
          element.src = edit.media;
          const serviceButton = element.closest(".service-open");
          if (serviceButton) serviceButton.dataset.serviceImage = edit.media;
        }
        if (isVideoElement(element)) element.src = edit.media;
      }
      if (isImageElement(element) && (edit.resize || (edit.styles?.width && edit.styles?.height))) {
        edit.resize ||= { width: edit.styles.width, height: edit.styles.height };
        edit.resize.offsetX ??= edit.styles.left;
        edit.resize.offsetY ??= edit.styles.top;
        delete edit.styles.width;
        delete edit.styles.height;
        delete edit.styles.maxWidth;
        delete edit.styles.left;
        delete edit.styles.top;
        applyImageResize(element, edit.resize);
      }
      applyStyle(element, edit.styles);
      if (element.tagName === "SECTION" && edit.sectionMargin !== undefined && edit.sectionMargin !== null) {
        const px = Math.max(0, Math.min(160, Math.round(Number(edit.sectionMargin) || 0)));
        if (px) element.style.setProperty("padding-inline", `${px}px`, "important");
        else element.style.removeProperty("padding-inline");
      }
      element.classList.toggle("cms-editor-locked", Boolean(edit.locked));
    }
    state.sectionOrder.forEach((id) => {
      const section = document.querySelector(`[data-cms-id="${CSS.escape(id)}"]`);
      if (section?.tagName === "SECTION") main.append(section);
    });
    applyTheme();
    setToolbarAppearance();
    repairServiceCardCopy();
    renderSectionList();
    renderCustomPageList();
    populateBlockTargets();
    extensionRenderer();
    selected?.classList.remove("cms-highlight");
    selectedElements.forEach((element) => element.classList.remove("cms-highlight", "cms-multi-selected"));
    selectedElements.clear();
    selected = null;
    selectionGroupId = null;
    selectionName.innerHTML = "<small>Choose something in the page to edit it.</small>";
    textInput.value = "";
    textInput.disabled = true;
    byId("admin-delete").disabled = true;
    ["admin-duplicate", "admin-group", "admin-lock", "admin-send-backward", "admin-bring-forward"].forEach((id) => { byId(id).disabled = true; });
    refreshCaseStudyPhotoEditor({ force: true });
  };

  const repairServiceCardCopy = () => {
    document.querySelectorAll(".service-open").forEach((button) => {
      const title = button.querySelector(".service-title");
      const summary = button.querySelector(".service-summary");
      const fallbackTitle = (button.dataset.serviceTitle || "").trim();
      const fallbackSummary = (button.dataset.serviceSummary || "").trim();
      if (title && !title.textContent.trim() && fallbackTitle) title.textContent = fallbackTitle;
      if (summary && !summary.textContent.trim() && fallbackSummary) summary.textContent = fallbackSummary;
      if (title?.textContent.trim()) button.dataset.serviceTitle = title.textContent.trim();
      if (summary?.textContent.trim()) button.dataset.serviceSummary = summary.textContent.trim();
      const titleId = title?.dataset.cmsId;
      const summaryId = summary?.dataset.cmsId;
      if (titleId && state.edits[titleId] && typeof state.edits[titleId].text === "string" && !state.edits[titleId].text.trim()) {
        delete state.edits[titleId].text;
      }
      if (summaryId && state.edits[summaryId] && typeof state.edits[summaryId].text === "string" && !state.edits[summaryId].text.trim()) {
        delete state.edits[summaryId].text;
      }
      const buttonId = button.dataset.cmsId;
      if (buttonId && state.edits[buttonId] && typeof state.edits[buttonId].text === "string") {
        delete state.edits[buttonId].text;
      }
    });
  };

  const renderCustomPageList = () => {
    const list = byId("admin-custom-pages");
    if (!list) return;
    list.replaceChildren();
    const pages = state.customPages || [];
    if (!pages.length) {
      const empty = document.createElement("small");
      empty.className = "admin-full";
      empty.textContent = "No custom pages yet. Use ＋ Add page to create one.";
      list.append(empty);
      return;
    }
    pages.forEach((page) => {
      const row = document.createElement("div");
      row.className = "admin-section-row";
      if (page.id === activeCustomPageId) row.classList.add("is-active");
      const label = document.createElement("span");
      label.className = "admin-section-title";
      label.textContent = `${page.title || "Untitled"} (/pages/?page=${page.slug})`;
      const actions = document.createElement("div");
      actions.className = "admin-section-actions";
      const openBtn = document.createElement("button");
      openBtn.type = "button";
      openBtn.textContent = page.id === activeCustomPageId ? "Editing" : "Open";
      openBtn.disabled = page.id === activeCustomPageId;
      openBtn.addEventListener("click", () => {
        saveDraft();
        window.location.assign(`/pages/admin.html?page=${encodeURIComponent(page.slug)}`);
      });
      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.textContent = "Remove";
      removeBtn.className = "admin-section-delete";
      removeBtn.addEventListener("click", () => deleteCustomPage(page));
      actions.append(openBtn, removeBtn);
      row.append(label, actions);
      list.append(row);
    });
  };

  const addCustomPage = () => {
    const title = window.prompt("New page name:")?.trim();
    if (!title) return;
    if (title.length > 160) {
      setStatus("Page names must be 160 characters or fewer.", "error");
      return;
    }
    state.customPages ||= [];
    let slug = slugifyPageTitle(title);
    const used = new Set(state.customPages.map((page) => page.slug));
    if (used.has(slug)) {
      let index = 2;
      while (used.has(`${slug}-${index}`)) index += 1;
      slug = `${slug}-${index}`;
    }
    const sectionId = `page-${crypto.randomUUID()}`;
    const page = {
      id: `custom-page-${crypto.randomUUID()}`,
      slug,
      title,
      navLabel: title,
      showInNav: true,
      ...emptyPageDocument(),
      sections: [{
        id: sectionId,
        title,
        text: "Add your page content here. Use ＋ Heading, ＋ Text, or ＋ Photo to build this page.",
        layout: "editorial",
      }],
      sectionOrder: [sectionId],
    };
    state.customPages.push(page);
    saveDraft();
    renderCustomPageList();
    setStatus(`Page “${title}” created. Opening it in the editor…`);
    window.location.assign(`/pages/admin.html?page=${encodeURIComponent(slug)}`);
  };

  const deleteCustomPage = (page) => {
    if (!page) return;
    if (!window.confirm(`Permanently remove the page “${page.title || page.slug}”? This cannot be undone from the page list.`)) return;
    state.customPages = (state.customPages || []).filter((item) => item.id !== page.id);
    if (activeCustomPageId === page.id) {
      activeCustomPageId = null;
      saveDraft();
      window.location.assign("/admin.html");
      return;
    }
    saveDraft();
    renderCustomPageList();
    setStatus("Custom page removed.");
  };

  const hydrateState = async () => {
    const response = await fetch(contentUrl, { cache: "no-store" });
    if (!response.ok) throw new Error(`Could not load website edits (${response.status}).`);
    const published = await response.json();
    Object.assign(state, { ...state, ...published, edits: published.edits || {}, sections: published.sections || [], projects: published.projects || [] });

    state.sectionCopies ||= [];
    state.customPages ||= [];
    const draftText = localStorage.getItem(STORAGE_KEY);
    if (draftText) {
      const draft = JSON.parse(draftText);
      if (draft.savedAt && draft.state) {
        Object.assign(state, { ...state, ...draft.state, edits: draft.state.edits || {}, sections: draft.state.sections || [], projects: draft.state.projects || [], services: draft.state.services || [] });
        state.sectionCopies = draft.state.sectionCopies || [];
        state.customPages = Array.isArray(draft.state.customPages) ? draft.state.customPages : (state.customPages || []);
        undoHistory = Array.isArray(draft.undoHistory) ? draft.undoHistory.slice(-50) : [];
        redoHistory = Array.isArray(draft.redoHistory) ? draft.redoHistory.slice(-50) : [];
        setStatus("Restored an unpublished draft from this browser.");
      }
    }

    state.edits ||= {};
    // Drop empty text payloads that blanked service titles/summaries in local drafts.
    Object.entries(state.edits).forEach(([id, edit]) => {
      if (!edit || typeof edit !== "object") return;
      if (typeof edit.text === "string" && !edit.text.trim()) delete edit.text;
      if (/(?:^|-)(title|summary|button)$/.test(id) && typeof edit.text === "string" && !edit.text.trim()) {
        delete edit.text;
      }
    });
    state.sections ||= [];
    state.sectionCopies ||= [];
    state.projects ||= [];
    state.caseStudyLayouts ||= {};
    state.services ||= [];
    state.contentBlocks ||= [];
    state.buttons ||= [];
    state.mediaElements ||= [];
    state.elementCopies ||= [];
    state.shapes ||= [];
    // Drop leftover editor doodles (circles / sticky notes) that clutter the canvas.
    state.shapes = state.shapes.filter((shape) => shape && !["circle", "note"].includes(shape.kind));
    state.customPages ||= [];
    state.seo ||= {};
    state.analytics ||= {};
    state.brandKit ||= { colors: [...DEFAULT_BRAND_COLORS], kits: [], activeKit: "Captain Campaign" };
    state.brandKit.colors ||= [...DEFAULT_BRAND_COLORS];
    state.brandKit.kits ||= [];
    state.customPages = state.customPages.filter((page) => page && typeof page.slug === "string" && page.slug.length).map((page) => ({
      ...emptyPageDocument(),
      ...page,
      id: page.id || `custom-page-${crypto.randomUUID()}`,
      slug: String(page.slug).slice(0, 64),
      title: String(page.title || page.slug).slice(0, 160),
      navLabel: String(page.navLabel || page.title || page.slug).slice(0, 80),
      showInNav: page.showInNav !== false,
    }));
    if (isCustomPageEditor) {
      const page = state.customPages.find((item) => item.slug === customPageSlug);
      if (!page) {
        setStatus(`Custom page “${customPageSlug}” was not found. Returning home…`, "error");
        window.setTimeout(() => { window.location.assign("/admin.html"); }, 900);
        return;
      }
      enterCustomPageWorkspace(page);
    }
    try { renderBrandKitUi?.(); } catch (_) { /* UI may not be bound yet during early hydrate */ }
    // Seed summary fallbacks before render can apply a blanking draft.
    document.querySelectorAll(".service-open").forEach((button) => {
      const title = button.querySelector(".service-title")?.textContent?.trim() || "";
      const summary = button.querySelector(".service-summary")?.textContent?.trim() || "";
      if (title) button.dataset.serviceTitle = button.dataset.serviceTitle || title;
      if (summary) button.dataset.serviceSummary = button.dataset.serviceSummary || summary;
    });
    captureOriginalPage();
    renderEditorState();
    if (state.sectionMargin) {
      if (byId("admin-section-margin")) byId("admin-section-margin").value = String(state.sectionMargin);
      applyUniformSectionMargin(state.sectionMargin);
    }
    Object.values(state.edits || {}).forEach((edit) => {
      /* serviceBookHref / serviceImage restored via service-open dataset below */
    });
    document.querySelectorAll(".service-open").forEach((button) => {
      const edit = state.edits[button.dataset.cmsId];
      if (!edit) return;
      if (typeof edit.serviceBookHref === "string") button.dataset.serviceBookHref = edit.serviceBookHref;
      if (typeof edit.serviceImage === "string") {
        button.dataset.serviceImage = edit.serviceImage;
        const img = button.querySelector("img");
        if (img) img.src = edit.serviceImage;
      }
      if (typeof edit.serviceSummary === "string" && edit.serviceSummary.trim()) {
        button.dataset.serviceSummary = edit.serviceSummary;
      }
    });
    repairServiceCardCopy();
    if (typeof syncSeoFields === "function") syncSeoFields();
    lastHistorySnapshot = JSON.stringify(buildPersistableState());
    historyReady = true;
    if (!draftText) setStatus(isCustomPageEditor ? `Editing page “${customPageSlug}”.` : "Editor ready. Changes save in this browser.");
  };

  const moveHistory = (from, to) => {
    window.clearTimeout(draftTimer);
    if (!from.length) {
      setStatus(from === undoHistory ? "Nothing to undo yet." : "Nothing to redo yet.");
      return;
    }
    const scrollPosition = { x: window.scrollX, y: window.scrollY };
    const selectedId = selected?.dataset.cmsId;
    to.push(JSON.stringify(buildPersistableState()));
    const restored = JSON.parse(from.pop());
    Object.keys(state).forEach((key) => delete state[key]);
    Object.assign(state, restored);
    state.edits ||= {};
    state.sections ||= [];
    state.sectionCopies ||= [];
    state.projects ||= [];
    state.caseStudyLayouts ||= {};
    state.services ||= [];
    state.contentBlocks ||= [];
    state.buttons ||= [];
    state.mediaElements ||= [];
    state.elementCopies ||= [];
    state.customPages ||= [];
    homeDocumentSnapshot = null;
    activeCustomPageId = null;
    if (isCustomPageEditor) {
      const page = state.customPages.find((item) => item.slug === customPageSlug);
      if (page) enterCustomPageWorkspace(page);
    }
    renderEditorState();
    lastHistorySnapshot = JSON.stringify(buildPersistableState());
    if (selectedId) {
      const restoredSelection = document.querySelector(`[data-cms-id="${CSS.escape(selectedId)}"]`);
      if (restoredSelection) selectElement(restoredSelection);
    }
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => window.scrollTo(scrollPosition.x, scrollPosition.y)));
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ savedAt: Date.now(), state, undoHistory, redoHistory }));
      setStatus(from === undoHistory ? "Undid the last change." : "Redid the last change.", "saved");
    } catch (error) {
      setStatus(`History restored, but the browser could not save it: ${error.message}`, "error");
    }
  };

  const applyTheme = () => {
    const themes = {
      original: { "--forest": "#1A2B49", "--forest-deep": "#122038", "--lime": "#FFB81C", "--lime-dark": "#E5A410", "--site-font": '"Avenir Next", Avenir, "Segoe UI", sans-serif' },
      coastal: { "--forest": "#1c3038", "--forest-deep": "#122128", "--lime": "#82d4ce", "--lime-dark": "#55a8a2", "--paper": "#f0f3ef" },
      sunset: { "--forest": "#3b2825", "--forest-deep": "#241a19", "--lime": "#f4b77a", "--lime-dark": "#d68d59", "--paper": "#f7eee7" },
      violet: { "--forest": "#302641", "--forest-deep": "#1d1728", "--lime": "#c7a6ed", "--lime-dark": "#9f7bc9", "--paper": "#f3eef8" },
    };
    for (const property of ["--forest", "--forest-deep", "--lime", "--lime-dark", "--paper", "--site-font"]) {
      document.documentElement.style.removeProperty(property);
    }
    Object.entries(themes[state.theme] || themes.original).forEach(([property, value]) => {
      document.documentElement.style.setProperty(property, value);
    });
    if (state.theme !== "original") {
      document.documentElement.style.setProperty("--site-font", '"Avenir Next", Avenir, "Segoe UI", sans-serif');
    }
    if (state.fontFile) {
      document.documentElement.style.setProperty("--site-font", "LiamImportedFont, sans-serif");
      const style = document.querySelector("#imported-site-font") || document.createElement("style");
      style.id = "imported-site-font";
      style.textContent = `@font-face{font-family:LiamImportedFont;src:url("${state.fontFile.url}") format("${state.fontFile.format}");font-display:swap}`;
      document.head.append(style);
    } else if (state.fontFamily && state.fontFamily !== "inherit") {
      document.documentElement.style.setProperty("--site-font", state.fontFamily);
    }
  };

  const setToolbarAppearance = () => {
    byId("admin-theme").value = state.theme || "original";
    byId("admin-font").value = state.fontFile ? "custom" : (state.fontFamily || "inherit");
  };

  const projectForElement = (element) => {
    const card = element?.closest(".project-card");
    return card ? state.projects.find((project) => card.id === `project-${project.id}`) : null;
  };

  const updateProjectField = (field, value) => {
    const project = projectForElement(selected);
    if (!project) return;
    project[field] = value;
    const card = selected.closest(".project-card");
    if (field === "title") {
      card.querySelector("h3").textContent = value;
      card.setAttribute("aria-label", `View case study: ${value}`);
    } else if (field === "client") {
      card.querySelector(".project-meta span:first-child").textContent = value;
    } else if (field === "location") {
      card.querySelector(".project-meta span:last-child").textContent = value;
    } else if (field === "category") {
      card.dataset.category = value;
    } else if (field === "description") {
      card.querySelector(".project-description").textContent = value;
    } else if (field === "role") {
      const role = card.querySelector(".project-role");
      role.replaceChildren(role.firstElementChild.cloneNode(true), document.createTextNode(value));
    } else if (field === "alt") {
      card.querySelector("img").alt = value;
    }
    saveDraft();
  };

  const previewCaseStudy = () => {
    const project = projectForElement(selected);
    if (!project) return;
    try {
      localStorage.setItem(CASE_STUDY_PREVIEW_KEY, JSON.stringify(buildPersistableState()));
      const previewUrl = `${siteBaseUrl}/projects/?project=${encodeURIComponent(project.id)}&preview=draft`;
      window.open(previewUrl, "_blank", "noopener,noreferrer");
      setStatus("Draft case study preview opened. This does not publish your changes.");
    } catch (error) {
      setStatus(`Could not prepare the case-study preview: ${error.message}`, "error");
    }
  };

  const selectElement = (element, { toggle = false, preserve = false } = {}) => {
    if (!element || toolbar.contains(element)) return;
    if (!preserve && !toggle) {
      selectedElements.forEach((item) => item.classList.remove("cms-highlight", "cms-multi-selected"));
      selectedElements.clear();
    }
    if (toggle && selectedElements.has(element)) {
      element.classList.remove("cms-highlight", "cms-multi-selected");
      selectedElements.delete(element);
      selected = [...selectedElements].at(-1) || null;
      if (!selected) {
        selectionName.textContent = "Choose something in the page to edit it.";
        byId("admin-delete").disabled = true;
        ["admin-duplicate", "admin-group", "admin-lock", "admin-send-backward", "admin-bring-forward"].forEach((id) => { byId(id).disabled = true; });
        return;
      }
    } else {
      selectedElements.add(element);
      selected = element;
    }
    if (!selected.dataset.cmsId) assignContentIds();
    selectedElements.add(selected);
    selectedElements.forEach((item) => {
      item.classList.add("cms-highlight");
      item.classList.toggle("cms-multi-selected", selectedElements.size > 1);
    });
    const edit = state.edits[selected.dataset.cmsId] || { styles: {} };
    selectionGroupId = edit.groupId || null;
    selectionName.textContent = `${selected.tagName.toLowerCase()}${selected.id ? ` #${selected.id}` : ""}${selectedElements.size > 1 ? ` · ${selectedElements.size} selected` : ""}`;
    byId("admin-selection-label").textContent = selectedElements.size > 1 ? "Multiple elements selected" : "Selected element";
    ["admin-duplicate", "admin-group", "admin-lock", "admin-send-backward", "admin-bring-forward"].forEach((id) => { byId(id).disabled = false; });
    byId("admin-group").textContent = selectionGroupId ? "Ungroup" : "Group";
    byId("admin-lock").textContent = edit.locked ? "Unlock" : "Lock";
    const lockBox = byId("admin-lock-checkbox");
    if (lockBox) lockBox.checked = Boolean(edit.locked);
    const parentLockBox = byId("admin-lock-parent-checkbox");
    if (parentLockBox) {
      const parent = selected.parentElement?.closest?.("[data-cms-id]");
      parentLockBox.checked = Boolean(parent && state.edits[parent.dataset.cmsId]?.locked);
      parentLockBox.disabled = !parent;
    }
    textInput.value = typeof edit.text === "string" ? edit.text : (selected.matches(TEXT_SELECTOR) ? selected.innerText : "");
    byId("admin-alt").value = typeof edit.alt === "string" ? edit.alt : (isImageElement(selected) ? selected.alt : "");
    byId("admin-href").value = selected instanceof HTMLIFrameElement
      ? (edit.src || selected.getAttribute("src") || "")
      : (typeof edit.href === "string" ? edit.href : (selected instanceof HTMLAnchorElement ? selected.getAttribute("href") : ""));
    // Leaving media clears crop/resize modes so they never stick on accidentally.
    if (!isMediaElement(selected)) {
      document.body.classList.remove("cms-crop-mode");
      window.liamAdminEditor?.clearImageTool?.();
    }
    const serviceButton = selected.matches(".service-open")
      ? selected
      : (selected.closest(".service-open")
        || (() => {
          const sourceId = selected.closest(".service-dialog")?.dataset.sourceServiceId;
          if (!sourceId) return null;
          return resolveServiceButtonFromSourceId(sourceId);
        })());
    byId("admin-service-description").value = edit.serviceDescription
      ?? (serviceButton?.dataset.serviceDescription || document.querySelector("#dialog-description")?.textContent || "");
    byId("admin-service-example").value = edit.serviceExample
      ?? (serviceButton?.dataset.serviceExample || document.querySelector("#dialog-example")?.textContent || "");
    const project = projectForElement(selected);
    const projectFields = byId("admin-project-fields");
    if (projectFields) projectFields.hidden = !project;
    if (project && projectFields) {
      byId("admin-project-title").value = project.title || "";
      byId("admin-project-client").value = project.client || "";
      byId("admin-project-location").value = project.location || "";
      byId("admin-project-category").value = project.category || "activation";
      byId("admin-project-description").value = project.description || "";
      byId("admin-project-role").value = project.role || "";
      byId("admin-project-alt").value = project.alt || "";
    }
    refreshCaseStudyPhotoEditor();
    updateDeleteControl();
    syncRelevantControls(selected);
    applySelectionFieldEnables(selected);
    // Do NOT open the section resize dock on every selection — only on section-edge clicks.
    if (!(selected.matches?.("main > section") && selected.parentElement === document.querySelector("main"))) {
      clearSectionResizeHandles();
    }
    const setField = (id, value) => {
      const field = byId(id);
      if (field) field.value = value;
    };
    for (const [id, name] of [["admin-width", "width"], ["admin-height", "height"], ["admin-font-size", "fontSize"], ["admin-left", "left"], ["admin-top", "top"], ["admin-z-index", "zIndex"]]) {
      setField(id, (name === "width" || name === "height" ? edit.resize?.[name] : undefined) ?? edit.styles?.[name] ?? "");
    }
    setField("admin-rotate", edit.styles?.rotate ?? "");
    setField("admin-opacity", edit.styles?.opacity !== undefined ? Math.round(Number(edit.styles.opacity) * 100) : 100);
    setField("admin-radius", edit.styles?.borderRadius ?? "");
    setField("admin-border-width", edit.styles?.borderWidth ?? "");
    setField("admin-border-color", edit.styles?.borderColor || "#1A2B49");
    setField("admin-line-height", edit.styles?.lineHeight ?? "");
    setField("admin-letter-spacing", edit.styles?.letterSpacing ?? "");
    setField("admin-color", edit.styles?.color || "#172019");
    setField("admin-background", edit.styles?.backgroundColor || "#f4f2e9");
    setField("admin-filter", edit.styles?.filter || "");
    for (const [id, name] of [["admin-bold", "fontWeight"], ["admin-italic", "fontStyle"], ["admin-underline", "textDecoration"], ["admin-shadow", "textShadow"]]) {
      byId(id)?.setAttribute("aria-pressed", String(Boolean(edit.styles?.[name] && edit.styles[name] !== "400")));
    }
    document.dispatchEvent(new CustomEvent("cms-selection-changed", { detail: { selected, selectedElements: [...selectedElements] } }));
  };
  const selectionTargets = () => [...selectedElements].filter((element) => element && (element.isConnected || element.parentNode));
  const updateSelectedStyles = (name, value) => {
    const targets = selectionTargets();
    targets.forEach((element) => {
      state.edits[element.dataset.cmsId] ||= { styles: {} };
      state.edits[element.dataset.cmsId].styles ||= {};
      if (value === undefined) delete state.edits[element.dataset.cmsId].styles[name];
      else state.edits[element.dataset.cmsId].styles[name] = value;
      applyStyle(element, state.edits[element.dataset.cmsId].styles);
    });
    if (targets.length) saveDraft();
  };

  const addProjectCard = (project) => {
    const grid = document.querySelector(".portfolio-grid");
    if (!grid || !project?.id || document.getElementById(`project-${project.id}`)) return;
    const card = document.createElement("article");
    card.className = "project-card";
    card.id = `project-${project.id}`;
    card.dataset.category = project.category || "activation";
    card.dataset.projectUrl = `${siteBaseUrl}/projects/?project=${encodeURIComponent(project.id)}`;
    card.setAttribute("role", "link");
    card.tabIndex = 0;
    card.setAttribute("aria-label", `View case study: ${project.title}`);
    const imageWrap = document.createElement("div");
    imageWrap.className = "project-image-wrap";
    const image = document.createElement("img");
    image.src = project.image;
    image.alt = project.alt || project.title;
    image.loading = "lazy";
    image.width = 1200;
    image.height = 800;
    const index = document.createElement("span");
    index.className = "project-index";
    index.textContent = String(grid.children.length + 1).padStart(2, "0");
    imageWrap.append(image, index);
    const meta = document.createElement("div");
    meta.className = "project-meta";
    const client = document.createElement("span");
    client.textContent = project.client;
    const location = document.createElement("span");
    location.textContent = project.location;
    meta.append(client, location);
    const title = document.createElement("h3");
    title.textContent = project.title;
    const description = document.createElement("p");
    description.className = "project-description";
    description.textContent = project.description;
    const role = document.createElement("p");
    role.className = "project-role";
    const roleLabel = document.createElement("span");
    roleLabel.textContent = "MY ROLE";
    role.append(roleLabel, document.createTextNode(project.role));
    card.append(imageWrap, meta, title, description, role);
    grid.append(card);
    card.dataset.cmsId = `project-${project.id}`;
  };

  const addTextBlock = (type) => {
    const section = resolvePlacementSection();
    if (!section?.id) {
      setStatus("Scroll to a page section first, then add content.", "error");
      return;
    }
    const block = {
      id: `content-block-${crypto.randomUUID()}`,
      sectionId: section.id,
      type,
      text: type === "heading" ? "New heading" : "Write your text here.",
    };
    state.contentBlocks.push(block);
    addContentBlock(block);
    saveDraft();
    const element = document.getElementById(block.id);
    if (element) {
      selectElement(element);
      scrollToSection(element);
    }
    setStatus(`Editable content added to “${sectionTitle(section)}”. Select Update website to publish it.`);
  };

  const addImageBlock = async (file) => {
    if (!file) return;
    try {
      const section = resolvePlacementSection();
      if (!section?.id) {
        setStatus("Scroll to a page section first, then add a photo.", "error");
        return;
      }
      const uploaded = await uploadFile(file);
      const block = {
        id: `content-block-${crypto.randomUUID()}`,
        sectionId: section.id,
        type: "image",
        image: uploaded.url,
        alt: file.name.replace(/\.[^.]+$/, ""),
      };
      state.contentBlocks.push(block);
      addContentBlock(block);
      assignContentIds();
      saveDraft();
      const image = document.querySelector(`[data-cms-id="${CSS.escape(block.id)}-image"]`);
      if (image) {
        selectElement(image);
        scrollToSection(image);
      }
      setStatus(`Photo added to “${sectionTitle(section)}”. Select Update website to publish it.`);
    } catch (error) {
      setStatus(`Could not add photo: ${error.message}`, "error");
    }
  };

  const moveContentBlock = (direction) => {
    const block = selected?.closest(".cms-added-content-block");
    if (!block) {
      setStatus("Select an added heading, text block, or photo to move it.", "error");
      return;
    }
    const siblings = [...block.parentElement.querySelectorAll(":scope > .cms-added-content-block")];
    const index = siblings.indexOf(block);
    const destination = siblings[index + direction];
    if (!destination) return;
    if (direction < 0) block.parentElement.insertBefore(block, destination);
    else block.parentElement.insertBefore(destination, block);
    const orderedIds = [...block.parentElement.querySelectorAll(":scope > .cms-added-content-block")].map((element) => element.id);
    const orderedBlocks = orderedIds.map((id) => state.contentBlocks.find((item) => item.id === id)).filter(Boolean);
    state.contentBlocks = [
      ...state.contentBlocks.filter((item) => item.sectionId !== block.closest("section")?.id),
      ...orderedBlocks,
    ];
    saveDraft();
  };

  const uploadFile = async (file) => {
    if (!file) return null;
    const data = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Could not read the selected file."));
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });
    const response = await fetch("/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: file.name, data }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || `Upload failed (${response.status}).`);
    return result;
  };

  const resizeSelectedMedia = (dimension, value) => {
    const targets = selectionTargets().filter((element) => isMediaElement(element));
    if (!targets.length) return;
    targets.forEach((element) => {
      const edit = state.edits[element.dataset.cmsId] ||= { styles: {} };
      const frame = imageFrameFor(element);
      const bounds = frame.getBoundingClientRect();
      edit.resize = {
        ...(edit.resize || { width: bounds.width, height: bounds.height }),
        [dimension]: value,
      };
      applyImageResize(element, edit.resize);
    });
    saveDraft();
  };

  const requestMedia = (kind) => {
    mediaInput.accept = kind === "video" ? "video/mp4,video/webm" : "image/jpeg,image/png,image/webp,image/gif,image/avif";
    mediaInput.click();
  };

  const isProtectedServiceCopy = (element) => element?.matches?.(".service-title, .service-summary, .service-number");

  const updateText = (value) => {
    const targets = selectionTargets().filter((element) => element.matches(TEXT_SELECTOR));
    if (!targets.length) return;
    targets.forEach((element) => {
      if (isProtectedServiceCopy(element) && !String(value || "").trim()) return;
      state.edits[element.dataset.cmsId] ||= { styles: {} };
      state.edits[element.dataset.cmsId].text = value;
      element.textContent = value;
      element.style.whiteSpace = "pre-line";
      if (element.matches?.(".service-title")) {
        const button = element.closest(".service-open");
        if (button) button.dataset.serviceTitle = value;
      }
      if (element.matches?.(".service-summary")) {
        const button = element.closest(".service-open");
        if (button) button.dataset.serviceSummary = value;
      }
      syncDialogTextToService(element);
    });
    saveDraft();
  };

  const beginTextEditing = (element) => {
    if (!element.matches(TEXT_SELECTOR) || element.isContentEditable) return;
    selectElement(element);
    element.contentEditable = "plaintext-only";
    element.classList.add("cms-text-editing");
    element.focus();
    const finish = () => {
      const edit = currentEdit();
      const next = element.innerText;
      if (isProtectedServiceCopy(element) && !String(next || "").trim()) {
        const button = element.closest(".service-open");
        const restored = element.matches(".service-title")
          ? (button?.dataset.serviceTitle || "")
          : element.matches(".service-summary")
            ? (button?.dataset.serviceSummary || "")
            : element.textContent;
        element.textContent = restored;
        delete edit.text;
      } else {
        edit.text = next;
        element.textContent = edit.text;
        if (element.matches?.(".service-title")) element.closest(".service-open") && (element.closest(".service-open").dataset.serviceTitle = next);
        if (element.matches?.(".service-summary")) element.closest(".service-open") && (element.closest(".service-open").dataset.serviceSummary = next);
      }
      element.style.whiteSpace = "pre-line";
      element.contentEditable = "false";
      element.classList.remove("cms-text-editing");
      textInput.value = element.textContent || "";
      syncDialogTextToService(element);
      saveDraft();
      element.removeEventListener("blur", finish);
    };
    element.addEventListener("input", () => {
      const edit = currentEdit();
      const next = element.innerText;
      if (isProtectedServiceCopy(element) && !String(next || "").trim()) {
        delete edit.text;
        return;
      }
      edit.text = next;
      textInput.value = edit.text;
      syncDialogTextToService(element);
      saveDraft();
    });
    element.addEventListener("blur", finish);
  };

  const publish = async () => {
    if (!window.confirm("Update the live website now? This publishes your draft, refreshes the paired preview, and starts a GitHub Pages deployment.")) {
      setStatus("Publish cancelled.");
      return;
    }
    window.clearTimeout(draftTimer);
    const recoveryDraftSaved = persistDraft();
    const button = byId("admin-publish");
    button.disabled = true;
    setStatus("Saving a recovery version, then updating the paired preview…");
    try {
      await savePublishedVersion();
      const response = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPersistableState()),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || `Publish failed (${response.status}).`);
      localStorage.removeItem(STORAGE_KEY);
      if ("BroadcastChannel" in window) {
        const channel = new BroadcastChannel("liam-site-updates");
        channel.postMessage("published");
        channel.close();
      }
      renderVersionList();
      setStatus("Paired preview updated. Starting GitHub Pages deployment…", "saved");
      try {
        const deployResponse = await fetch("/api/deploy", { method: "POST" });
        const deployResult = await deployResponse.json().catch(() => ({}));
        if (!deployResponse.ok || deployResult.ok !== true) {
          throw new Error(deployResult.error || `Deploy failed (${deployResponse.status}).`);
        }
        setStatus(deployResult.message || "Website updated and GitHub Pages deployment started.", "saved");
      } catch (deployError) {
        setStatus(`Preview updated, but GitHub deployment failed: ${deployError.message}`, "error");
      }
    } catch (error) {
      const recoveryNotice = recoveryDraftSaved ? "" : " Your browser could not save a recovery draft.";
      setStatus(`Could not update the website: ${error.message}.${recoveryNotice}`, "error");
    } finally {
      button.disabled = false;
    }
  };

  const addSection = () => {
    const titleInput = byId("admin-new-section-title");
    const title = titleInput.value.trim();
    if (!title) {
      setStatus("Enter a name for the new section first.", "error");
      titleInput.focus();
      return;
    }
    const id = `page-${crypto.randomUUID()}`;
    const layout = byId("admin-section-template").value;
    const section = {
      id,
      title,
      text: "Add your introduction here.",
      layout: layout === "case-study" ? "case-study" : "editorial",
    };
    state.sections.push(section);
    if (state.sectionOrder.length) state.sectionOrder.push(id);
    if (section.layout === "case-study") {
      for (const [heading, text] of [
        ["Challenge", "Describe the audience or brand challenge."],
        ["Approach", "Explain the creative experience and execution."],
        ["Result", "Share the outcome and what made it successful."],
      ]) {
        state.contentBlocks.push(
          { id: `content-block-${crypto.randomUUID()}`, sectionId: id, type: "heading", text: heading },
          { id: `content-block-${crypto.randomUUID()}`, sectionId: id, type: "text", text },
        );
      }
    }
    renderEditorState();
    titleInput.value = "";
    saveDraft();
    const node = document.getElementById(id);
    if (node) {
      selectElement(node);
      scrollToSection(node);
    }
    setStatus(section.layout === "case-study"
      ? "Project story section added. Replace the challenge, approach, and result prompts with your details."
      : "Editorial section added. Select its heading or text to edit it.");
  };

  const addPortfolioProject = async () => {
    try {
      const image = await new Promise((resolve) => {
        const chooser = document.createElement("input");
        chooser.type = "file";
        chooser.accept = "image/jpeg,image/png,image/webp,image/gif,image/avif";
        chooser.addEventListener("change", () => resolve(chooser.files[0] || null), { once: true });
        chooser.addEventListener("cancel", () => resolve(null), { once: true });
        chooser.click();
      });
      if (!image) return;
      const project = {
        id: `custom-${crypto.randomUUID()}`,
        title: window.prompt("Project title:")?.trim(),
        client: window.prompt("Brand or client:")?.trim() || "Independent",
        location: window.prompt("Event or location:")?.trim() || "",
        category: window.prompt("Category: activation, tour, content, or hosting", "activation")?.trim() || "activation",
        description: window.prompt("Short project description:")?.trim() || "",
        role: window.prompt("Your role:")?.trim() || "",
      };
      if (!project.title) return;
      project.category = ["activation", "tour", "content", "hosting"].includes(project.category) ? project.category : "activation";
      const uploaded = await uploadFile(image);
      project.image = uploaded.url;
      project.alt = project.title;
      state.projects.push(project);
      addProjectCard(project);
      saveDraft();
      renderCardLists();
      selectElement(document.getElementById(`project-${project.id}`));
      setStatus("Project added. Select Update website to publish it.");
    } catch (error) {
      setStatus(`Could not add project: ${error.message}`, "error");
    }
  };

  const addServiceCard = (service) => {
    const grid = document.querySelector(".services-grid");
    if (!grid || document.getElementById(`service-${service.id}`)) return;
    const article = document.createElement("article");
    article.className = "service-card cms-added-service";
    article.id = `service-${service.id}`;
    article.dataset.serviceId = service.id;
    article.dataset.cmsId = `service-${service.id}`;
    article.innerHTML = `
      <button class="service-open" type="button"
        data-service-title="${service.title.replace(/"/g, "&quot;")}"
        data-service-summary="${(service.summary || "").replace(/"/g, "&quot;")}"
        data-service-description="${(service.description || "").replace(/"/g, "&quot;")}"
        data-service-example="${(service.example || "").replace(/"/g, "&quot;")}"
        data-service-image="${service.image}"
        data-service-alt="${(service.alt || service.title).replace(/"/g, "&quot;")}"
        aria-label="Learn more about ${service.title.replace(/"/g, "&quot;")}">
        <span class="service-image-wrap">
          <img src="${service.image}" alt="${(service.alt || service.title).replace(/"/g, "&quot;")}" loading="lazy" width="900" height="650">
          <span class="service-image-action" aria-hidden="true">Explore service <span>↗</span></span>
        </span>
        <span class="service-card-copy">
          <span class="service-number">${String(grid.children.length + 1).padStart(2, "0")}</span>
          <span class="service-title">${service.title}</span>
          <span class="service-summary">${service.summary || ""}</span>
        </span>
      </button>`;
    grid.append(article);
  };

  const addService = async () => {
    try {
      const image = await new Promise((resolve) => {
        const chooser = document.createElement("input");
        chooser.type = "file";
        chooser.accept = "image/jpeg,image/png,image/webp,image/gif,image/avif";
        chooser.addEventListener("change", () => resolve(chooser.files[0] || null), { once: true });
        chooser.addEventListener("cancel", () => resolve(null), { once: true });
        chooser.click();
      });
      if (!image) return;
      const service = {
        id: `custom-${crypto.randomUUID()}`,
        title: window.prompt("Service title:")?.trim(),
        summary: window.prompt("Short summary:")?.trim() || "",
        description: window.prompt("Full description:")?.trim() || "",
        example: window.prompt("Example / case note:")?.trim() || "",
      };
      if (!service.title) return;
      const uploaded = await uploadFile(image);
      service.image = uploaded.url;
      service.alt = service.title;
      state.services ||= [];
      state.services.push(service);
      addServiceCard(service);
      assignContentIds();
      renumberServiceCards();
      saveDraft();
      renderCardLists();
      selectElement(document.getElementById(`service-${service.id}`));
      setStatus("Service card added. Select Update website to publish it.");
    } catch (error) {
      setStatus(`Could not add service: ${error.message}`, "error");
    }
  };

  const readVersionSnapshots = () => {
    const saved = localStorage.getItem(VERSION_STORAGE_KEY);
    if (!saved) return [];
    const versions = JSON.parse(saved);
    if (!Array.isArray(versions) || versions.length > 10 || versions.some((version) =>
      !version || !Number.isFinite(version.savedAt) || version.state?.version !== 1)) {
      throw new Error("The saved version history is invalid. It was left untouched.");
    }
    return versions;
  };

  const renderVersionList = () => {
    const list = byId("admin-version-list");
    const restoreBtn = byId("admin-version-restore");
    if (!list) return;
    const selected = list.value;
    try {
      const versions = readVersionSnapshots();
      list.replaceChildren();
      versions.forEach((version, index) => {
        const option = new Option(
          `${new Date(version.savedAt).toLocaleString()} — before update`,
          String(index),
        );
        list.append(option);
      });
      if (versions.some((_version, index) => String(index) === selected)) list.value = selected;
      if (restoreBtn) restoreBtn.disabled = versions.length === 0;
    } catch (error) {
      list.replaceChildren(new Option("Version history could not be read", ""));
      if (restoreBtn) restoreBtn.disabled = true;
      setStatus(error.message, "error");
    }
  };

  const savePublishedVersion = async () => {
    const response = await fetch(contentUrl, { cache: "no-store" });
    if (!response.ok) throw new Error(`Could not read the currently published version (${response.status}).`);
    const published = await response.json();
    if (!published || published.version !== 1 || typeof published.edits !== "object") {
      throw new Error("The currently published content is invalid; publishing was stopped to protect it.");
    }
    const versions = readVersionSnapshots();
    const snapshot = JSON.stringify(published);
    if (versions[0] && JSON.stringify(versions[0].state) === snapshot) return;
    versions.unshift({ savedAt: Date.now(), state: published });
    localStorage.setItem(VERSION_STORAGE_KEY, JSON.stringify(versions.slice(0, 5)));
    renderVersionList();
  };

  const restorePublishedVersion = () => {
    let versions;
    try {
      versions = readVersionSnapshots();
    } catch (error) {
      setStatus(error.message, "error");
      return;
    }
    const index = Number(byId("admin-version-list").value);
    const version = versions[index];
    if (!version) {
      setStatus("Choose a saved version first.", "error");
      return;
    }
    if (!window.confirm("Load this previous published version as an editable draft? The current published preview will not change.")) return;
    const previousDraft = JSON.stringify(buildPersistableState());
    Object.keys(state).forEach((key) => delete state[key]);
    Object.assign(state, JSON.parse(JSON.stringify(version.state)));
    state.edits ||= {};
    state.sections ||= [];
    state.sectionCopies ||= [];
    state.sectionOrder ||= [];
    state.projects ||= [];
    state.caseStudyLayouts ||= {};
    state.contentBlocks ||= [];
    state.buttons ||= [];
    state.mediaElements ||= [];
    state.customPages ||= [];
    homeDocumentSnapshot = null;
    activeCustomPageId = null;
    if (isCustomPageEditor) {
      const page = state.customPages.find((item) => item.slug === customPageSlug);
      if (page) enterCustomPageWorkspace(page);
    }
    undoHistory = [previousDraft];
    redoHistory = [];
    renderEditorState();
    lastHistorySnapshot = JSON.stringify(buildPersistableState());
    historyReady = true;
    window.clearTimeout(draftTimer);
    if (persistDraft()) {
      setStatus("Previous version loaded as a saved draft. Publish when you are ready to restore it.", "saved");
    }
  };

  const bindNumberField = (id, styleName) => {
    byId(id).addEventListener("input", (event) => {
      if (!selected) return;
      const value = event.currentTarget.value;
      if (selectedElements.size > 1) {
        selectionTargets().forEach((element) => {
          const edit = state.edits[element.dataset.cmsId] ||= { styles: {} };
          if ((isMediaElement(element)) && (styleName === "width" || styleName === "height")) {
            if (value === "") {
              delete edit.resize;
              for (const property of ["width", "height", "aspect-ratio", "max-width"]) imageFrameFor(element).style.removeProperty(property);
            } else {
              resizeSelectedMedia(styleName, Number(value));
              return;
            }
          } else if (value === "") {
            delete edit.styles[styleName];
            element.style.removeProperty(styleName.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`));
          } else {
            edit.styles[styleName] = Number(value);
            applyStyle(element, edit.styles);
          }
        });
        saveDraft();
        return;
      }
      if ((isMediaElement(selected)) && (styleName === "width" || styleName === "height")) {
        const edit = currentEdit();
        if (value === "") {
          const frame = imageFrameFor(selected);
          for (const property of ["width", "height", "aspect-ratio", "max-width"]) frame.style.removeProperty(property);
          if (frame !== selected) {
            for (const property of ["width", "height", "max-width"]) selected.style.removeProperty(property);
          }
          delete edit.resize;
          delete edit.styles.width;
          delete edit.styles.height;
          delete edit.styles.maxWidth;
          byId("admin-width").value = "";
          byId("admin-height").value = "";
          saveDraft();
          return;
        }
        resizeSelectedMedia(styleName, Number(value));
        const updated = currentEdit().resize;
        byId("admin-width").value = Math.round(updated?.width || 0);
        byId("admin-height").value = Math.round(updated?.height || 0);
        return;
      }
      if (selected.tagName === "SECTION" && selected.closest("main") && styleName === "height") {
        if (value === "") {
          const edit = currentEdit();
          delete edit.styles.minHeight;
          delete edit.styles.height;
          selected.style.removeProperty("min-height");
          selected.style.removeProperty("height");
          saveDraft();
          return;
        }
        applySectionMinHeight(selected, Number(value));
        return;
      }
      if (value === "") {
        const edit = currentEdit();
        delete edit.styles[styleName];
        selected.style.removeProperty(styleName.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`));
        saveDraft();
        return;
      }
      saveField(currentEdit(), styleName, Number(value));
    });
  };

  const isEditorChrome = (node) => Boolean(node?.closest?.(
    ".admin-toolbar, .admin-properties, .admin-rail, .admin-context-menu, .admin-float-toolbar, .editor-image-context-menu, .moveable-control-box, .admin-page-edge, .admin-preview-exit, [data-cms-control]",
  ));
  const clearSelection = () => {
    selectedElements.forEach((element) => element.classList.remove("cms-highlight", "cms-multi-selected"));
    selectedElements.clear();
    selected = null;
    selectionGroupId = null;
    selectionName.textContent = "Choose something in the page to edit it.";
    byId("admin-selection-label").textContent = "Selected element";
    byId("admin-delete").disabled = true;
    ["admin-duplicate", "admin-group", "admin-lock", "admin-send-backward", "admin-bring-forward", "admin-snap-even", "admin-snap-section", "admin-snap-match-size"].forEach((id) => {
      const control = byId(id);
      if (control) control.disabled = true;
    });
    clearSectionResizeHandles();
    syncRelevantControls(null);
    document.dispatchEvent(new CustomEvent("cms-selection-changed", { detail: { selected: null, selectedElements: [] } }));
  };
  toolbar.addEventListener("click", (event) => event.stopPropagation());
  const fillServiceDialogFromButton = (button, dialog) => {
    if (!button || !dialog) return;
    const card = button.closest(".service-card, .cms-added-service");
    const cardId = ensureServiceCardDomId(card) || button.dataset.cmsId || "";
    ensureCmsId(button);
    const dialogTitle = dialog.querySelector("#dialog-title");
    const dialogDescription = dialog.querySelector("#dialog-description");
    const dialogExample = dialog.querySelector("#dialog-example");
    const dialogImage = dialog.querySelector("#dialog-image");
    if (dialogTitle) dialogTitle.textContent = button.dataset.serviceTitle || "";
    if (dialogDescription) dialogDescription.textContent = button.dataset.serviceDescription || "";
    if (dialogExample) dialogExample.textContent = button.dataset.serviceExample || "";
    if (dialogImage) {
      dialogImage.src = button.dataset.serviceImage || dialogImage.src;
      dialogImage.alt = button.dataset.serviceAlt || button.dataset.serviceTitle || "";
      dialogImage.dataset.cmsId = dialogImage.dataset.cmsId || "dialog-image";
      dialogImage.dataset.sourceServiceSelector = cardId;
    }
    dialog.dataset.sourceServiceId = cardId;
    const bookLink = dialog.querySelector("[data-dialog-book]");
    if (bookLink) {
      bookLink.dataset.cmsId = bookLink.dataset.cmsId || "dialog-book-link";
      if (button.dataset.serviceBookHref) bookLink.setAttribute("href", button.dataset.serviceBookHref);
    }
    ["dialog-title", "dialog-description", "dialog-example"].forEach((id) => {
      const node = dialog.querySelector(`#${id}`);
      if (node) node.dataset.cmsId = id;
    });
  };

  const forceCloseServiceDialog = (dialog = document.querySelector("#service-dialog")) => {
    if (!dialog) return false;
    const wasOpen = Boolean(dialog.open || dialog.hasAttribute("open"));
    try {
      if (dialog.open) dialog.close();
    } catch (_) {
      dialog.removeAttribute("open");
    }
    dialog.classList.remove("cms-editor-dialog");
    return wasOpen;
  };

  const showEditorDialog = (dialog) => {
    if (!dialog) return;
    // Never showModal in the CMS — ::backdrop + inert document recreates the black overlay lock.
    // Non-modal panel with cms-editor-dialog stays editable alongside the sidebars.
    forceCloseServiceDialog(dialog);
    dialog.classList.add("cms-editor-dialog");
    const scrollY = window.scrollY;
    if (typeof dialog.show === "function") dialog.show();
    else dialog.setAttribute("open", "");
    window.requestAnimationFrame(() => window.scrollTo(0, scrollY));
  };

  const openServiceDialogForEdit = (button) => {
    if (!(button instanceof HTMLElement) || !button.matches?.(".service-open")) return;
    const dialog = document.querySelector("#service-dialog");
    if (!dialog) return;
    fillServiceDialogFromButton(button, dialog);
    showEditorDialog(dialog);
    document.dispatchEvent(new CustomEvent("cms-service-dialog-opened", {
      detail: { button, dialog, image: dialog.querySelector("#dialog-image") },
    }));
  };

  // Crash recovery: clear any leftover Learn more modal/backdrop from a previous broken session.
  forceCloseServiceDialog();
  // Native :modal makes the whole page inert even if the backdrop is hidden — keep clearing it.
  window.setInterval(() => {
    if (!editMode || document.body.classList.contains("cms-preview-mode")) return;
    const dialog = document.querySelector("#service-dialog");
    if (!dialog?.open) return;
    const isModal = typeof dialog.matches === "function" && dialog.matches(":modal");
    if (isModal && !dialog.classList.contains("cms-editor-dialog")) {
      forceCloseServiceDialog(dialog);
    }
  }, 400);

  const syncDialogTextToService = (element) => {
    if (!element?.id || !["dialog-title", "dialog-description", "dialog-example"].includes(element.id)) return;
    const dialog = element.closest(".service-dialog");
    const sourceId = dialog?.dataset.sourceServiceId;
    if (!sourceId) return;
    const card = resolveServiceCardFromSourceId(sourceId);
    const button = resolveServiceButtonFromSourceId(sourceId);
    if (!button) return;
    ensureCmsId(button);
    const text = element.textContent || "";
    if (element.id === "dialog-title") {
      if (!text.trim()) return;
      button.dataset.serviceTitle = text;
      const title = card?.querySelector(".service-title") || button.querySelector(".service-title");
      if (title) {
        title.textContent = text;
        const titleEdit = state.edits[title.dataset.cmsId || ensureCmsId(title)] ||= { styles: {} };
        titleEdit.text = text;
      }
      const edit = state.edits[button.dataset.cmsId] ||= { styles: {} };
      delete edit.text;
    } else if (element.id === "dialog-description") {
      button.dataset.serviceDescription = text;
      const edit = state.edits[button.dataset.cmsId] ||= { styles: {} };
      edit.serviceDescription = text;
      if (byId("admin-service-description")) byId("admin-service-description").value = text;
    } else if (element.id === "dialog-example") {
      button.dataset.serviceExample = text;
      const edit = state.edits[button.dataset.cmsId] ||= { styles: {} };
      edit.serviceExample = text;
      if (byId("admin-service-example")) byId("admin-service-example").value = text;
    }
    saveDraft();
  };

  const openProjectCaseStudyInEditor = (card) => {
    if (!(card instanceof HTMLElement)) return false;
    const projectId = card.id?.replace(/^project-/, "") || "";
    if (!projectId) return false;
    // Stay in the administrator shell so case-study tools remain available.
    const next = `${siteBaseUrl}/projects/admin.html?project=${encodeURIComponent(projectId)}`;
    window.location.assign(next);
    return true;
  };

  document.addEventListener("click", (event) => {
    if (isEditorChrome(event.target) || toolbar.contains(event.target) || !editMode) return;
    // Leave Learn more's X for the dedicated close handler (selection must not swallow it).
    if (event.target.closest?.(".dialog-close")) return;

    // Shift-click = select for multi-edit without opening detail surfaces.
    if (event.shiftKey) {
      const selectable = event.target.closest(CANDIDATE_SELECTOR);
      if (!selectable || selectable.isContentEditable) return;
      event.preventDefault();
      event.stopPropagation();
      if (!selectedElements.has(selectable)) selectElement(selectable, { preserve: true });
      return;
    }

    // Service card / Learn more: open the detail panel (the editable "new part of the page").
    const serviceOpen = event.target.closest?.(".service-open");
    if (serviceOpen && !event.target.closest?.(".dialog-close")) {
      event.preventDefault();
      event.stopPropagation();
      window.liamAdminEditor?.closeFloatToolbar?.();
      clearSectionResizeHandles();
      openServiceDialogForEdit(serviceOpen);
      const dialogImage = document.querySelector("#service-dialog #dialog-image");
      if (dialogImage) {
        assignContentIds();
        ensureCmsId(dialogImage);
        selectElement(dialogImage);
      }
      setStatus("Learn more open. Edit the photo and text here, then close with × or Esc.");
      return;
    }

    // Portfolio project: open the case-study editor page (same destination the public card uses).
    const projectCard = event.target.closest?.(".project-card[role='link']");
    if (projectCard) {
      event.preventDefault();
      event.stopPropagation();
      window.liamAdminEditor?.closeFloatToolbar?.();
      clearSectionResizeHandles();
      if (!openProjectCaseStudyInEditor(projectCard)) {
        setStatus("Could not open that portfolio project.", "error");
      }
      return;
    }

    const openDialog = document.querySelector(".service-dialog.cms-editor-dialog[open]")
      || document.querySelector(".service-dialog[open]");
    // Clicks inside the open Learn more panel must not clearSelection.
    if (openDialog?.classList.contains("cms-editor-dialog") && openDialog.contains(event.target)) {
      const imageHit = event.target.closest?.("#dialog-image, .dialog-image img, .dialog-image");
      if (imageHit) {
        const media = openDialog.querySelector("#dialog-image");
        if (media instanceof HTMLImageElement) {
          event.preventDefault();
          event.stopPropagation();
          assignContentIds();
          ensureCmsId(media);
          media.dataset.cmsId = media.dataset.cmsId || "dialog-image";
          selectElement(media);
          window.liamAdminEditor?.openFloatToolbar?.(event.clientX, event.clientY);
          document.dispatchEvent(new CustomEvent("cms-open-float-toolbar", {
            detail: { clientX: event.clientX, clientY: event.clientY, element: media },
          }));
          setStatus("Dialog photo selected. Use Crop, Resize, or Replace in Edit tools.");
        }
      } else {
        const inside = event.target.closest?.(CANDIDATE_SELECTOR);
        if (inside && openDialog.contains(inside) && !inside.isContentEditable) {
          if (inside.matches("a,button")) event.preventDefault();
          event.stopPropagation();
          selectElement(inside);
          if (event.detail === 2) beginTextEditing(inside);
        }
      }
      return;
    }
    const element = event.target.closest(CANDIDATE_SELECTOR);
    const inOpenDialog = Boolean(openDialog && (openDialog.contains(event.target) || (element && openDialog.contains(element))));
    if (!element || element.isContentEditable) {
      if (
        !element
        && !event.target.closest(CANDIDATE_SELECTOR)
        && !event.target.closest(".service-dialog.cms-editor-dialog[open]")
        && !event.target.closest(".service-dialog[open]")
        && !event.target.closest(".admin-float-toolbar")
      ) {
        if (!inOpenDialog) clearSelection();
      }
      return;
    }
    if (element.closest(".service-dialog") && !inOpenDialog && !element.closest(".service-dialog")?.open) {
      return;
    }
    // Keep primary nav usable so Portfolio / sections remain reachable from the home menu.
    const navLink = event.target.closest?.(".primary-navigation a, .site-header a.brand-mark");
    if (navLink) {
      clearSectionResizeHandles();
      window.liamAdminEditor?.closeFloatToolbar?.();
      return;
    }
    if (element.matches("a,button")) event.preventDefault();
    event.stopPropagation();
    const sectionHost = element.closest?.("main > section");
    const nearSectionEdge = (() => {
      if (!sectionHost) return false;
      const rect = sectionHost.getBoundingClientRect();
      const edge = 32;
      return event.clientY >= rect.bottom - edge
        && event.clientY <= rect.bottom + 12
        && event.clientX >= rect.left
        && event.clientX <= rect.right;
    })();
    // Empty section chrome (not cards/media/text) can select the section — still no resize dock unless on the edge.
    const clickedSectionChrome = Boolean(
      sectionHost
      && (
        element === sectionHost
        || element.matches?.(".page-width, .section-heading, .section-pad")
        || event.target === sectionHost
      )
      && !event.target.closest?.(TEXT_SELECTOR + ",img,video,a,button,.service-card,.project-card,.cms-added-content-block,.cms-shape"),
    );
    selectElement(clickedSectionChrome ? sectionHost : element);
    if (nearSectionEdge && sectionHost) {
      selectElement(sectionHost);
      syncSectionResizeHandle(sectionHost);
      setStatus("Section edge selected. Drag the gold handle or type Length / Margin.");
    } else {
      clearSectionResizeHandles();
    }
    if (event.detail === 2) beginTextEditing(element);
  }, true);

  document.addEventListener("dblclick", (event) => {
    if (isEditorChrome(event.target) || toolbar.contains(event.target) || !editMode) return;
    if (event.target.closest?.(".cms-section-resize-handle")) return;
    if (event.target.closest?.(".primary-navigation a, .site-header a.brand-mark")) return;
    const media = event.target.closest("img, video")
      || event.target.closest(".project-image-wrap, .service-image-wrap, .about-image-wrap, .featured-image, .dialog-image")?.querySelector("img, video");
    const section = event.target.closest?.("main > section");
    const element = media || event.target.closest(CANDIDATE_SELECTOR);
    if (!element) return;
    event.preventDefault();
    event.stopPropagation();
    selectElement(element);
    if (element.matches?.(TEXT_SELECTOR) && !isMediaElement(element)) {
      window.liamAdminEditor?.closeFloatToolbar?.();
      clearSectionResizeHandles();
      beginTextEditing(element);
    } else if (isMediaElement(element)) {
      // Image tools only on double-click — keeps service cards clickable for text edits.
      window.liamAdminEditor?.openFloatToolbar?.(event.clientX, event.clientY);
      document.dispatchEvent(new CustomEvent("cms-open-float-toolbar", {
        detail: { clientX: event.clientX, clientY: event.clientY, element },
      }));
      setStatus("Image tools open. Use Crop/Resize/Replace/Delete from the floating toolbar. Close with ×.");
    } else if (section && (element === section || !media)) {
      selectElement(section);
      // Resize dock only from the section edge, not every double-click inside the section.
      clearSectionResizeHandles();
      setStatus("Section selected. Click near the bottom edge to show the Length / Margin resize bar.");
    }
  }, true);

  const previewExit = document.createElement("button");
  previewExit.type = "button";
  previewExit.id = "admin-preview-exit";
  previewExit.className = "admin-preview-exit";
  previewExit.hidden = true;
  previewExit.textContent = "Exit preview · restore tools";
  previewExit.dataset.cmsControl = "true";
  document.body.append(previewExit);

  byId("admin-publish").addEventListener("click", publish);
  const adminMark = document.querySelector(".admin-mark") || document.body.appendChild(Object.assign(document.createElement("span"), { className: "admin-mark", textContent: "ADMINISTRATOR COPY" }));
  const restoreTools = document.createElement("button");
  restoreTools.type = "button";
  restoreTools.id = "admin-restore-tools";
  restoreTools.className = "admin-restore-tools";
  restoreTools.textContent = "Show tools";
  restoreTools.hidden = true;
  restoreTools.dataset.cmsControl = "true";
  document.body.append(restoreTools);
  const toggleToolbar = (collapsed) => {
    toolbar.classList.toggle("is-collapsed", collapsed);
    byId("admin-collapse").textContent = collapsed ? "Show tools" : "Hide tools";
    byId("admin-collapse").setAttribute("aria-expanded", String(!collapsed));
    document.body.classList.toggle("cms-administrator-collapsed", collapsed);
    adminMark.classList.toggle("admin-mark-active", !collapsed);
    restoreTools.hidden = !collapsed;
    if (collapsed) {
      document.body.style.setProperty("--admin-sidebar-width", "0px");
      setStatus("Tools hidden. Click Show tools or the editor badge to bring them back.");
    } else {
      let savedWidth = Number(localStorage.getItem(sidebarWidthKey)) || (document.body.classList.contains("cms-canva-shell") ? 360 : 278);
      try {
        savedWidth = Number(localStorage.getItem(sidebarWidthKey)) || savedWidth;
      } catch (error) {
        setStatus(`Could not restore the saved sidebar width: ${error.message}`, "error");
      }
      setSidebarWidth(Math.max(278, savedWidth));
      setStatus("Editing tools restored.");
    }
  };
  const setPreviewMode = (previewing, { announce = true } = {}) => {
    editMode = !previewing;
    document.body.classList.toggle("cms-preview-mode", previewing);
    byId("admin-edit-mode").setAttribute("aria-pressed", String(editMode));
    byId("admin-preview-toggle").setAttribute("aria-pressed", String(previewing));
    byId("admin-preview-toggle").textContent = editMode ? "Preview draft" : "Return to editing";
    previewExit.hidden = !previewing;
    previewExit.style.display = previewing ? "block" : "";
    if (previewing) {
      restoreTools.hidden = false;
      restoreTools.textContent = "Exit preview · show tools";
    } else if (!toolbar.classList.contains("is-collapsed")) {
      restoreTools.hidden = true;
      restoreTools.textContent = "Show tools";
    }
    try {
      if (previewing) sessionStorage.setItem(PREVIEW_MODE_KEY, JSON.stringify({ active: true, returnTo: window.location.pathname }));
      else sessionStorage.removeItem(PREVIEW_MODE_KEY);
    } catch (_) { /* ignore */ }
    if (previewing) {
      selectedElements.forEach((element) => element.classList.remove("cms-highlight", "cms-multi-selected"));
      clearSectionResizeHandles();
    } else {
      selectedElements.forEach((element) => element.classList.add("cms-highlight"));
      toggleToolbar(false);
      clearSectionResizeHandles();
      window.liamAdminEditor?.closeFloatToolbar?.();
    }
    document.dispatchEvent(new CustomEvent("cms-preview-changed", { detail: { previewing } }));
    if (announce) {
      setStatus(editMode
        ? "Edit mode restored. Toolbar is available on this page."
        : "Draft preview is active. Use Exit preview on any page to bring tools back.");
    }
  };
  byId("admin-edit-mode").addEventListener("click", () => setPreviewMode(false));
  byId("admin-preview-toggle").addEventListener("click", () => setPreviewMode(editMode));
  previewExit.addEventListener("click", () => {
    const onEditorPage = Boolean(document.querySelector(".admin-toolbar"));
    if (onEditorPage) {
      setPreviewMode(false);
      return;
    }
    try { sessionStorage.removeItem(PREVIEW_MODE_KEY); } catch (_) { /* ignore */ }
    window.location.href = "/admin.html";
  });
  document.addEventListener("click", (event) => {
    if (editMode || !document.body.classList.contains("cms-preview-mode")) return;
    const link = event.target.closest?.("a[href]");
    if (!link || link.target === "_blank" || link.hasAttribute("download")) return;
    const href = link.getAttribute("href") || "";
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("http")) return;
    event.preventDefault();
    let next = href;
    if (href === "/" || href === "/index.html" || href.startsWith("/?") || href.startsWith("/#")) next = "/admin.html";
    else if (href.startsWith("/projects") && !href.includes("admin.html")) {
      next = href.includes("?")
        ? href.replace("/projects/", "/projects/admin.html").replace("/projects?", "/projects/admin.html?")
        : "/projects/admin.html?preview=draft";
      if (!next.includes("preview=")) next += (next.includes("?") ? "&" : "?") + "preview=draft";
    }
    try { sessionStorage.setItem(PREVIEW_MODE_KEY, JSON.stringify({ active: true, returnTo: next })); } catch (_) { /* ignore */ }
    window.location.href = next;
  }, true);
  try {
    const previewState = JSON.parse(sessionStorage.getItem(PREVIEW_MODE_KEY) || "null");
    if (previewState?.active) setPreviewMode(true, { announce: false });
  } catch (_) { /* ignore */ }
  adminMark.setAttribute("role", "button");
  adminMark.setAttribute("tabindex", "0");
  adminMark.setAttribute("aria-label", "Show the website editing tools");
  adminMark.classList.add("admin-mark-active");
  const restoreEditorChrome = () => {
    if (document.body.classList.contains("cms-preview-mode")) {
      setPreviewMode(false);
      return;
    }
    if (toolbar.classList.contains("is-collapsed") || document.body.classList.contains("cms-administrator-collapsed")) {
      toggleToolbar(false);
    }
  };
  adminMark.addEventListener("click", restoreEditorChrome);
  restoreTools.addEventListener("click", restoreEditorChrome);
  adminMark.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      restoreEditorChrome();
    }
  });
  byId("admin-collapse").addEventListener("click", () => {
    toggleToolbar(!toolbar.classList.contains("is-collapsed"));
  });
  document.querySelectorAll("[data-preview-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      const mode = button.dataset.previewMode;
      document.body.classList.remove("cms-preview-tablet", "cms-preview-mobile");
      if (mode === "tablet") document.body.classList.add("cms-preview-tablet");
      if (mode === "mobile") document.body.classList.add("cms-preview-mobile");
      document.querySelectorAll("[data-preview-mode]").forEach((option) => {
        option.setAttribute("aria-pressed", String(option === button));
      });
    });
  });
  textInput.addEventListener("input", () => updateText(textInput.value));
  byId("admin-theme").addEventListener("change", (event) => {
    state.theme = event.currentTarget.value;
    applyTheme();
    saveDraft();
  });
  byId("admin-font").addEventListener("change", (event) => {
    state.fontFamily = event.currentTarget.value;
    state.googleFont = "";
    document.querySelector("#editor-google-font-stylesheet")?.remove();
    if (state.fontFamily === "custom" && !state.fontFile) {
      state.fontFamily = "inherit";
      setToolbarAppearance();
      setStatus("Import a font file before choosing the imported font.");
      return;
    }
    if (state.fontFamily !== "custom") state.fontFile = null;
    applyTheme();
    saveDraft();
  });
  byId("admin-import-font").addEventListener("click", () => fontInput.click());
  fontInput.addEventListener("change", async () => {
    if (!fontInput.files?.[0]) return;
    try {
      const uploaded = await uploadFile(fontInput.files[0]);
      state.fontFile = uploaded;
      state.fontFamily = "custom";
      state.googleFont = "";
      document.querySelector("#editor-google-font-stylesheet")?.remove();
      const googleFontInput = document.querySelector("#editor-google-font");
      if (googleFontInput) googleFontInput.value = "";
      applyTheme();
      setToolbarAppearance();
      saveDraft();
      setStatus("Font imported and applied to the preview.");
    } catch (error) {
      setStatus(`Could not import font: ${error.message}`, "error");
    } finally {
      fontInput.value = "";
    }
  });
  byId("admin-replace-media").addEventListener("click", () => {
    if (selected) requestMedia(isVideoElement(selected) ? "video" : "image");
  });
  const syncDialogImageToService = (imageEl, url, alt) => {
    if (!imageEl || imageEl.id !== "dialog-image") return;
    const dialog = imageEl.closest(".service-dialog");
    const sourceId = dialog?.dataset.sourceServiceId || imageEl.dataset.sourceServiceSelector || "";
    const button = resolveServiceButtonFromSourceId(sourceId);
    if (button) {
      button.dataset.serviceImage = url;
      if (alt) button.dataset.serviceAlt = alt;
      const cardImg = button.querySelector("img");
      if (cardImg) {
        cardImg.src = url;
        if (alt) cardImg.alt = alt;
        ensureCmsId(cardImg);
        const cardEdit = state.edits[cardImg.dataset.cmsId] ||= { styles: {} };
        cardEdit.media = url;
      }
      ensureCmsId(button);
      const buttonEdit = state.edits[button.dataset.cmsId] ||= { styles: {} };
      buttonEdit.serviceImage = url;
    }
    ensureCmsId(imageEl);
    const dialogEdit = state.edits[imageEl.dataset.cmsId] ||= { styles: {} };
    dialogEdit.media = url;
    if (alt) dialogEdit.alt = alt;
  };
  mediaInput.addEventListener("change", async () => {
    if (!selected || !mediaInput.files?.[0]) return;
    try {
      const uploaded = await uploadFile(mediaInput.files[0]);
      const project = isImageElement(selected) ? projectForElement(selected) : null;
      const edit = currentEdit();
      edit.media = uploaded.url;
      if (isImageElement(selected)) {
        selected.src = uploaded.url;
        if (project) {
          project.image = uploaded.url;
          delete edit.media;
        }
        if (selected.id === "dialog-image" || selected.closest?.(".dialog-image")) {
          syncDialogImageToService(selected.id === "dialog-image" ? selected : selected.closest(".dialog-image")?.querySelector("img") || selected, uploaded.url, selected.alt);
        }
        const serviceButton = selected.closest(".service-open");
        if (serviceButton) serviceButton.dataset.serviceImage = uploaded.url;
      }
      if (isVideoElement(selected)) {
        selected.src = uploaded.url;
        selected.load();
        if (selected.matches(".hero-video")) {
          state.heroVideos ||= { items: [], interval: 8 };
          state.heroVideos.items ||= [];
          if (state.heroVideos.items.length) state.heroVideos.items[0] = uploaded.url;
          else state.heroVideos.items.push(uploaded.url);
        }
        await selected.play().catch((error) => {
          if (error.name !== "NotAllowedError") throw error;
        });
      }
      saveDraft();
      setStatus("Media replaced. Select Update website to publish it.");
    } catch (error) {
      setStatus(`Could not replace the media: ${error.message}`, "error");
    } finally {
      mediaInput.value = "";
    }
  });
  byId("admin-replace-hero-video")?.addEventListener("click", () => {
    const hero = document.querySelector(".hero-video");
    if (!hero) {
      setStatus("No opening hero video found on this page.", "error");
      return;
    }
    selectElement(hero);
    requestMedia("video");
    setStatus("Choose a video file to replace the Section 1 opening video.");
  });
  const applyUniformSectionMargin = (value) => {
    const px = Math.max(0, Math.min(160, Number(value) || 0));
    state.sectionMargin = px || null;
    document.documentElement.style.setProperty("--cms-section-margin", px ? `${px}px` : "");
    document.body.classList.toggle("cms-uniform-section-margin", Boolean(px));
    [...document.querySelectorAll("main > section")].forEach((section) => {
      ensureCmsId(section);
      const edit = state.edits[section.dataset.cmsId] ||= { styles: {} };
      edit.styles ||= {};
      if (px) {
        edit.sectionMargin = px;
        section.style.setProperty("padding-inline", `${px}px`, "important");
      } else {
        delete edit.sectionMargin;
        section.style.removeProperty("padding-inline");
      }
    });
    saveDraft();
    setStatus(px ? `Uniform section margin set to ${px}px.` : "Uniform section margin cleared.");
  };
  byId("admin-apply-section-margin")?.addEventListener("click", () => {
    applyUniformSectionMargin(byId("admin-section-margin")?.value);
  });
  byId("admin-clear-section-margin")?.addEventListener("click", () => {
    if (byId("admin-section-margin")) byId("admin-section-margin").value = "";
    applyUniformSectionMargin(0);
  });
  document.addEventListener("cms-service-dialog-opened", (event) => {
    const image = event.detail?.image;
    const dialog = event.detail?.dialog || document.querySelector("#service-dialog");
    // Keep cms-editor-dialog so the Learn more panel stays a usable non-modal editor surface.
    if (dialog) dialog.classList.add("cms-editor-dialog");
    if (!image) {
      setStatus("Learn more open. Edit the service details here. Close with × or Esc.");
      return;
    }
    assignContentIds();
    ensureCmsId(image);
    image.dataset.cmsId = image.dataset.cmsId || "dialog-image";
    setStatus("Learn more open. Edit the photo and text here. Close with × or Esc.");
  });

  // Clicking the Learn more photo must select it and open crop/resize tools without closing the panel.
  document.addEventListener("click", (event) => {
    if (!editMode) return;
    if (event.target.closest?.(".dialog-close")) return;
    const dialog = document.querySelector(".service-dialog.cms-editor-dialog[open]");
    if (!dialog || !dialog.contains(event.target)) return;
    if (isEditorChrome(event.target)) return;
    const imageHit = event.target.closest("#dialog-image, .dialog-image img, .dialog-image");
    if (!imageHit) return;
    const media = dialog.querySelector("#dialog-image");
    if (!(media instanceof HTMLImageElement)) return;
    event.preventDefault();
    event.stopPropagation();
    assignContentIds();
    ensureCmsId(media);
    media.dataset.cmsId = media.dataset.cmsId || "dialog-image";
    selectElement(media);
    window.liamAdminEditor?.openFloatToolbar?.(event.clientX, event.clientY);
    document.dispatchEvent(new CustomEvent("cms-open-float-toolbar", {
      detail: { clientX: event.clientX, clientY: event.clientY, element: media },
    }));
    setStatus("Dialog photo selected. Use Crop, Resize, or Replace in Edit tools.");
  }, true);

  // Keep the Learn more panel open when using editor chrome (sidebar / float toolbar).
  document.addEventListener("pointerdown", (event) => {
    const dialog = document.querySelector(".service-dialog.cms-editor-dialog[open]");
    if (!dialog || !editMode) return;
    if (isEditorChrome(event.target) || toolbar.contains(event.target) || event.target.closest?.(".admin-float-toolbar")) {
      event.stopPropagation();
    }
  }, true);

  const closeServiceDialogForEdit = (dialog = document.querySelector(".service-dialog.cms-editor-dialog[open], #service-dialog[open], #service-dialog:modal")) => {
    if (!dialog) {
      // Last-resort: any open service dialog / modal leftover after a crash.
      const anyOpen = document.querySelector("#service-dialog");
      if (!anyOpen || !(anyOpen.open || anyOpen.hasAttribute("open"))) return false;
      forceCloseServiceDialog(anyOpen);
      setStatus("Cleared the Learn more overlay. You can edit services on the cards again.");
      return true;
    }
    forceCloseServiceDialog(dialog);
    clearSelection();
    setStatus("Closed the Learn more panel. Click a service again anytime to edit it.");
    return true;
  };

  document.addEventListener("click", (event) => {
    const closeBtn = event.target.closest?.(".dialog-close");
    if (!closeBtn || !editMode) return;
    const dialog = closeBtn.closest?.(".service-dialog");
    if (!dialog) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    closeServiceDialogForEdit(dialog);
  }, true);

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    // Always clear a stuck Learn more overlay, even if editMode crashed mid-session.
    if (closeServiceDialogForEdit()) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);

  bindNumberField("admin-width", "width");
  bindNumberField("admin-height", "height");
  bindNumberField("admin-font-size", "fontSize");
  bindNumberField("admin-left", "left");
  bindNumberField("admin-top", "top");
  bindNumberField("admin-z-index", "zIndex");
  bindNumberField("admin-rotate", "rotate");
  bindNumberField("admin-radius", "borderRadius");
  bindNumberField("admin-border-width", "borderWidth");
  bindNumberField("admin-line-height", "lineHeight");
  bindNumberField("admin-letter-spacing", "letterSpacing");
  byId("admin-opacity").addEventListener("input", (event) => {
    updateSelectedStyles("opacity", Math.max(0, Math.min(100, Number(event.currentTarget.value) || 0)) / 100);
  });
  byId("admin-border-color").addEventListener("input", (event) => updateSelectedStyles("borderColor", event.currentTarget.value));
  byId("admin-send-to-front").addEventListener("click", () => updateSelectedStyles("zIndex", 9999));
  byId("admin-send-to-back").addEventListener("click", () => updateSelectedStyles("zIndex", -9999));
  const alignSelection = (axis, mode) => {
    const targets = selectionTargets();
    if (targets.length < 2) {
      setStatus("Select at least two elements (Shift-click) to align.", "error");
      return;
    }
    const boxes = targets.map((element) => ({ element, rect: element.getBoundingClientRect() }));
    const minLeft = Math.min(...boxes.map((item) => item.rect.left));
    const maxRight = Math.max(...boxes.map((item) => item.rect.right));
    const minTop = Math.min(...boxes.map((item) => item.rect.top));
    const maxBottom = Math.max(...boxes.map((item) => item.rect.bottom));
    const midX = (minLeft + maxRight) / 2;
    const midY = (minTop + maxBottom) / 2;
    boxes.forEach(({ element, rect }) => {
      const edit = state.edits[element.dataset.cmsId] ||= { styles: {} };
      edit.styles ||= {};
      const currentLeft = Number(edit.styles.left || 0);
      const currentTop = Number(edit.styles.top || 0);
      let nextLeft = currentLeft;
      let nextTop = currentTop;
      if (axis === "x") {
        if (mode === "left") nextLeft = currentLeft + (minLeft - rect.left);
        if (mode === "center") nextLeft = currentLeft + (midX - (rect.left + rect.width / 2));
        if (mode === "right") nextLeft = currentLeft + (maxRight - rect.right);
      } else {
        if (mode === "top") nextTop = currentTop + (minTop - rect.top);
        if (mode === "middle") nextTop = currentTop + (midY - (rect.top + rect.height / 2));
        if (mode === "bottom") nextTop = currentTop + (maxBottom - rect.bottom);
      }
      edit.styles.left = Math.round(nextLeft);
      edit.styles.top = Math.round(nextTop);
      applyStyle(element, edit.styles);
    });
    saveDraft();
    setStatus("Selection aligned.");
  };
  const distributeSelection = (axis) => {
    const targets = selectionTargets();
    if (targets.length < 3) {
      setStatus("Select at least three elements to distribute.", "error");
      return;
    }
    const boxes = targets.map((element) => ({
      element,
      rect: element.getBoundingClientRect(),
      edit: (state.edits[element.dataset.cmsId] ||= { styles: {} }),
    })).sort((a, b) => axis === "x" ? a.rect.left - b.rect.left : a.rect.top - b.rect.top);
    const first = boxes[0];
    const last = boxes[boxes.length - 1];
    const span = axis === "x"
      ? (last.rect.left - first.rect.left)
      : (last.rect.top - first.rect.top);
    const step = span / (boxes.length - 1);
    boxes.forEach((item, index) => {
      item.edit.styles ||= {};
      if (axis === "x") {
        const desired = first.rect.left + step * index;
        item.edit.styles.left = Math.round(Number(item.edit.styles.left || 0) + (desired - item.rect.left));
      } else {
        const desired = first.rect.top + step * index;
        item.edit.styles.top = Math.round(Number(item.edit.styles.top || 0) + (desired - item.rect.top));
      }
      applyStyle(item.element, item.edit.styles);
    });
    saveDraft();
    setStatus("Selection distributed evenly.");
  };
  byId("admin-align-left").addEventListener("click", () => alignSelection("x", "left"));
  byId("admin-align-center").addEventListener("click", () => alignSelection("x", "center"));
  byId("admin-align-right").addEventListener("click", () => alignSelection("x", "right"));
  byId("admin-align-top").addEventListener("click", () => alignSelection("y", "top"));
  byId("admin-align-middle").addEventListener("click", () => alignSelection("y", "middle"));
  byId("admin-align-bottom").addEventListener("click", () => alignSelection("y", "bottom"));
  byId("admin-distribute-h").addEventListener("click", () => distributeSelection("x"));
  byId("admin-distribute-v").addEventListener("click", () => distributeSelection("y"));
  byId("admin-align-text-left").addEventListener("click", () => updateSelectedStyles("textAlign", "left"));
  byId("admin-align-text-center").addEventListener("click", () => updateSelectedStyles("textAlign", "center"));
  byId("admin-align-text-right").addEventListener("click", () => updateSelectedStyles("textAlign", "right"));
  const syncSeoFields = () => {
    state.seo ||= {};
    byId("admin-seo-title").value = state.seo.title || "";
    byId("admin-seo-description").value = state.seo.description || "";
    byId("admin-seo-og-image").value = state.seo.ogImage || "";
    byId("admin-seo-canonical").value = state.seo.canonical || "";
    byId("admin-ga4-id").value = state.analytics?.ga4 || "";
  };
  ["admin-seo-title", "admin-seo-description", "admin-seo-og-image", "admin-seo-canonical"].forEach((id) => {
    byId(id).addEventListener("input", (event) => {
      state.seo ||= {};
      const map = {
        "admin-seo-title": "title",
        "admin-seo-description": "description",
        "admin-seo-og-image": "ogImage",
        "admin-seo-canonical": "canonical",
      };
      state.seo[map[id]] = event.currentTarget.value;
      saveDraft();
    });
  });
  byId("admin-ga4-id").addEventListener("input", (event) => {
    state.analytics ||= {};
    state.analytics.ga4 = event.currentTarget.value.trim();
    saveDraft();
  });
  const normalizeBrandKit = () => {
    state.brandKit ||= { colors: [...DEFAULT_BRAND_COLORS], kits: [], activeKit: "Captain Campaign" };
    if (!Array.isArray(state.brandKit.colors) || !state.brandKit.colors.length) {
      state.brandKit.colors = [...DEFAULT_BRAND_COLORS];
    }
    state.brandKit.kits ||= [];
    state.brandKit.activeKit ||= "Captain Campaign";
    return state.brandKit;
  };
  const renderBrandKitUi = () => {
    const kit = normalizeBrandKit();
    const swatches = byId("admin-brand-swatches");
    const editors = byId("admin-brand-color-editors");
    const select = byId("admin-brand-kit-select");
    const nameField = byId("admin-brand-kit-name");
    if (!swatches || !editors || !select) return;
    if (nameField && !nameField.value) nameField.value = kit.activeKit || "";
    swatches.replaceChildren(...kit.colors.map((color, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.brandColor = color;
      button.title = color;
      button.style.background = color;
      button.dataset.index = String(index);
      return button;
    }));
    editors.replaceChildren(...kit.colors.map((color, index) => {
      const label = document.createElement("label");
      label.className = "admin-brand-color-edit";
      label.innerHTML = `Colour ${index + 1}<input type="color" data-brand-index="${index}" value="${color}">`;
      const remove = document.createElement("button");
      remove.type = "button";
      remove.dataset.removeBrandIndex = String(index);
      remove.textContent = "×";
      remove.title = "Remove colour";
      label.append(remove);
      return label;
    }));
    const options = [
      { name: "Captain Campaign", colors: DEFAULT_BRAND_COLORS },
      ...kit.kits,
    ];
    select.replaceChildren(...options.map((entry) => {
      const option = document.createElement("option");
      option.value = entry.name;
      option.textContent = entry.name;
      if (entry.name === kit.activeKit) option.selected = true;
      return option;
    }));
  };
  const applyBrandColorsToTheme = (colors = normalizeBrandKit().colors) => {
    const [primary = "#1A2B49", accent = "#FFB81C", deep = "#122038"] = colors;
    state.theme = "original";
    byId("admin-theme").value = "original";
    applyTheme();
    document.documentElement.style.setProperty("--forest", primary);
    document.documentElement.style.setProperty("--forest-deep", deep || primary);
    document.documentElement.style.setProperty("--lime", accent);
    document.documentElement.style.setProperty("--lime-dark", accent);
    saveDraft();
  };
  byId("admin-apply-brand-theme").addEventListener("click", () => {
    applyBrandColorsToTheme();
    setStatus("Brand kit colours applied to the theme.");
  });
  byId("admin-brand-swatches").addEventListener("click", (event) => {
    const swatch = event.target.closest("[data-brand-color]");
    if (!swatch) return;
    updateSelectedStyles("color", swatch.dataset.brandColor);
  });
  byId("admin-brand-color-editors").addEventListener("input", (event) => {
    const input = event.target.closest("input[data-brand-index]");
    if (!input) return;
    const kit = normalizeBrandKit();
    const index = Number(input.dataset.brandIndex);
    kit.colors[index] = input.value;
    renderBrandKitUi();
    saveDraft();
  });
  byId("admin-brand-color-editors").addEventListener("click", (event) => {
    const remove = event.target.closest("[data-remove-brand-index]");
    if (!remove) return;
    const kit = normalizeBrandKit();
    if (kit.colors.length <= 1) {
      setStatus("Keep at least one brand colour.", "error");
      return;
    }
    kit.colors.splice(Number(remove.dataset.removeBrandIndex), 1);
    renderBrandKitUi();
    saveDraft();
  });
  byId("admin-brand-add-color").addEventListener("click", () => {
    const kit = normalizeBrandKit();
    if (kit.colors.length >= 12) {
      setStatus("Brand kits support up to 12 colours.", "error");
      return;
    }
    kit.colors.push("#ffffff");
    renderBrandKitUi();
    saveDraft();
  });
  byId("admin-brand-save-kit").addEventListener("click", () => {
    const kit = normalizeBrandKit();
    const name = (byId("admin-brand-kit-name").value || "").trim().slice(0, 40);
    if (!name) {
      setStatus("Name your brand kit before saving.", "error");
      return;
    }
    if (name === "Captain Campaign") {
      setStatus("Choose a custom name — Captain Campaign is the built-in default.", "error");
      return;
    }
    const existing = kit.kits.findIndex((entry) => entry.name === name);
    const payload = { name, colors: [...kit.colors] };
    if (existing >= 0) kit.kits[existing] = payload;
    else kit.kits.push(payload);
    kit.activeKit = name;
    renderBrandKitUi();
    saveDraft();
    setStatus(`Saved brand kit “${name}”.`);
  });
  byId("admin-brand-load-kit").addEventListener("click", () => {
    const kit = normalizeBrandKit();
    const name = byId("admin-brand-kit-select").value;
    if (name === "Captain Campaign") {
      kit.colors = [...DEFAULT_BRAND_COLORS];
      kit.activeKit = name;
      byId("admin-brand-kit-name").value = name;
      renderBrandKitUi();
      saveDraft();
      setStatus("Loaded Captain Campaign colours.");
      return;
    }
    const found = kit.kits.find((entry) => entry.name === name);
    if (!found) {
      setStatus("Choose a saved kit to load.", "error");
      return;
    }
    kit.colors = [...found.colors];
    kit.activeKit = found.name;
    byId("admin-brand-kit-name").value = found.name;
    renderBrandKitUi();
    saveDraft();
    setStatus(`Loaded brand kit “${found.name}”.`);
  });
  byId("admin-brand-delete-kit").addEventListener("click", () => {
    const kit = normalizeBrandKit();
    const name = byId("admin-brand-kit-select").value;
    if (name === "Captain Campaign") {
      setStatus("The default Captain Campaign kit cannot be deleted.", "error");
      return;
    }
    kit.kits = kit.kits.filter((entry) => entry.name !== name);
    if (kit.activeKit === name) {
      kit.activeKit = "Captain Campaign";
      kit.colors = [...DEFAULT_BRAND_COLORS];
      byId("admin-brand-kit-name").value = kit.activeKit;
    }
    renderBrandKitUi();
    saveDraft();
    setStatus(`Deleted brand kit “${name}”.`);
  });
  byId("admin-show-grid").addEventListener("change", (event) => {
    document.body.classList.toggle("cms-show-grid", event.currentTarget.checked);
  });
  syncSeoFields();
  renderBrandKitUi();

  const snapTargets = () => selectionTargets().filter((element) =>
    isMediaElement(element));
  const setMediaOffset = (element, offsetX, offsetY) => {
    const edit = state.edits[element.dataset.cmsId] ||= { styles: {} };
    const frame = imageFrameFor(element);
    const bounds = frame.getBoundingClientRect();
    edit.resize = {
      ...(edit.resize || { width: Math.round(bounds.width) || 400, height: Math.round(bounds.height) || 300 }),
      offsetX: Math.round(offsetX),
      offsetY: Math.round(offsetY),
    };
    applyImageResize(element, edit.resize);
  };
  byId("admin-snap-even").addEventListener("click", () => {
    const media = snapTargets();
    if (media.length < 2) {
      setStatus("Select at least two images or videos first (Shift-click).", "error");
      return;
    }
    const containers = new Map();
    media.forEach((element) => {
      const section = element.closest("main > section") || document.body;
      if (!containers.has(section)) containers.set(section, []);
      containers.get(section).push(element);
    });
    containers.forEach((items) => {
      const ordered = items.sort((a, b) =>
        (a.getBoundingClientRect().left + a.getBoundingClientRect().top) -
        (b.getBoundingClientRect().left + b.getBoundingClientRect().top));
      const slots = ordered.length;
      const containerWidth = (ordered[0].closest("main > section") || document.body).getBoundingClientRect().width;
      const slotWidth = containerWidth / slots;
      ordered.forEach((element, index) => {
        const bounds = imageFrameFor(element).getBoundingClientRect();
        const targetLeft = slotWidth * index + (slotWidth - bounds.width) / 2;
        const elementLeft = bounds.left;
        const currentOffsetX = Number.parseFloat(imageFrameFor(element).style.left) || 0;
        setMediaOffset(element, currentOffsetX + (targetLeft - elementLeft),
          Number.parseFloat(imageFrameFor(element).style.top) || 0);
      });
    });
    saveDraft();
    setStatus("Selected media snapped into evenly spaced columns.");
  });
  byId("admin-snap-section").addEventListener("click", () => {
    const media = snapTargets();
    if (!media.length) {
      setStatus("Select an image or video to snap it to the section grid.", "error");
      return;
    }
    const section = media[0].closest("main > section");
    if (!section) return;
    const sectionRect = section.getBoundingClientRect();
    const pageWidth = Math.min(1200, sectionRect.width);
    const margin = Math.max(24, (sectionRect.width - pageWidth) / 2);
    media.forEach((element) => {
      const frame = imageFrameFor(element);
      const bounds = frame.getBoundingClientRect();
      const currentOffsetX = Number.parseFloat(frame.style.left) || 0;
      const currentOffsetY = Number.parseFloat(frame.style.top) || 0;
      const targetLeft = sectionRect.left + margin;
      const targetTop = Math.round((sectionRect.height - bounds.height) / 2);
      setMediaOffset(element,
        currentOffsetX + (targetLeft - bounds.left),
        currentOffsetY + (targetTop - bounds.top));
    });
    saveDraft();
    setStatus("Media snapped to the section's content grid.");
  });
  let matchSizePickMode = false;
  const applyMatchSizeFromReference = (reference, targets) => {
    const refRect = imageFrameFor(reference).getBoundingClientRect();
    const width = Math.round(refRect.width);
    const height = Math.round(refRect.height);
    targets.forEach((element) => {
      if (element === reference) return;
      const edit = state.edits[element.dataset.cmsId] ||= { styles: {} };
      const frame = imageFrameFor(element);
      edit.resize = {
        width,
        height,
        offsetX: Number.parseFloat(frame.style.left) || 0,
        offsetY: Number.parseFloat(frame.style.top) || 0,
      };
      applyImageResize(element, edit.resize);
    });
    saveDraft();
    setStatus(`Matched ${targets.length} image${targets.length === 1 ? "" : "s"} to ${width}×${height}.`);
  };
  byId("admin-snap-match-size").addEventListener("click", () => {
    const media = snapTargets();
    if (!media.length) {
      setStatus("Select the image(s) you want to resize first.", "error");
      return;
    }
    if (media.length >= 2) {
      applyMatchSizeFromReference(media[0], media.slice(1));
      return;
    }
    matchSizePickMode = true;
    document.body.classList.add("cms-match-size-pick");
    setStatus("Click the image whose size you want to match.", "saved");
  });
  document.addEventListener("click", (event) => {
    if (!matchSizePickMode) return;
    const reference = event.target.closest("img, video");
    if (!reference || isEditorChrome(event.target)) return;
    event.preventDefault();
    event.stopPropagation();
    matchSizePickMode = false;
    document.body.classList.remove("cms-match-size-pick");
    if (!reference.dataset.cmsId) assignContentIds();
    applyMatchSizeFromReference(reference, snapTargets());
  }, true);
  byId("admin-color").addEventListener("input", (event) => updateSelectedStyles("color", event.currentTarget.value));
  byId("admin-background").addEventListener("input", (event) => updateSelectedStyles("backgroundColor", event.currentTarget.value));
  byId("admin-filter").addEventListener("change", (event) => updateSelectedStyles("filter", event.currentTarget.value || undefined));
  byId("admin-alt").addEventListener("input", (event) => {
    if (!(isImageElement(selected))) return;
    currentEdit().alt = event.currentTarget.value;
    selected.alt = event.currentTarget.value;
    const project = projectForElement(selected);
    if (project) project.alt = event.currentTarget.value;
    saveDraft();
  });
  byId("admin-href").addEventListener("change", (event) => {
    if (!isEditableLink(selected)) return;
    const value = event.currentTarget.value.trim();
    const valid = selected instanceof HTMLIFrameElement
      ? /^(https:\/\/|\/(?!\/))/i.test(value)
      : /^(https?:\/\/|mailto:|\/|#)/i.test(value);
    if (!valid) {
      setStatus("Use a secure HTTPS embed, http/https link, email link, or page anchor.", "error");
      event.currentTarget.value = selected instanceof HTMLIFrameElement ? selected.getAttribute("src") : selected.getAttribute("href");
      return;
    }
    if (selected instanceof HTMLIFrameElement) {
      currentEdit().src = value;
      selected.src = value;
    } else {
      currentEdit().href = value;
      selected.setAttribute("href", value);
      if (selected.matches?.("[data-dialog-book]")) {
        const dialog = selected.closest(".service-dialog");
        const sourceId = dialog?.dataset.sourceServiceId || "";
        const button = resolveServiceButtonFromSourceId(sourceId);
        if (button) {
          button.dataset.serviceBookHref = value;
          ensureCmsId(button);
          const buttonEdit = state.edits[button.dataset.cmsId] ||= { styles: {} };
          buttonEdit.serviceBookHref = value;
        }
      }
    }
    saveDraft();
    setStatus("Link destination updated.");
  });
  const resolveServiceButtonFromSelection = () => {
    if (!selected) return null;
    if (selected.matches?.(".service-open")) return selected;
    const nested = selected.closest?.(".service-open");
    if (nested) return nested;
    const sourceId = selected.closest?.(".service-dialog")?.dataset.sourceServiceId;
    if (!sourceId) return null;
    return resolveServiceButtonFromSourceId(sourceId);
  };
  byId("admin-service-description").addEventListener("input", (event) => {
    const button = resolveServiceButtonFromSelection();
    if (!button) return;
    ensureCmsId(button);
    const edit = state.edits[button.dataset.cmsId] ||= { styles: {} };
    edit.serviceDescription = event.currentTarget.value;
    button.dataset.serviceDescription = event.currentTarget.value;
    const dialogDescription = document.querySelector("#dialog-description");
    if (dialogDescription) dialogDescription.textContent = event.currentTarget.value;
    saveDraft();
  });
  byId("admin-service-example").addEventListener("input", (event) => {
    const button = resolveServiceButtonFromSelection();
    if (!button) return;
    ensureCmsId(button);
    const edit = state.edits[button.dataset.cmsId] ||= { styles: {} };
    edit.serviceExample = event.currentTarget.value;
    button.dataset.serviceExample = event.currentTarget.value;
    const dialogExample = document.querySelector("#dialog-example");
    if (dialogExample) dialogExample.textContent = event.currentTarget.value;
    saveDraft();
  });
  for (const [id, field] of [
    ["admin-project-title", "title"],
    ["admin-project-client", "client"],
    ["admin-project-location", "location"],
    ["admin-project-category", "category"],
    ["admin-project-description", "description"],
    ["admin-project-role", "role"],
    ["admin-project-alt", "alt"],
  ]) {
    byId(id).addEventListener("input", (event) => updateProjectField(field, event.currentTarget.value));
    byId(id).addEventListener("change", (event) => updateProjectField(field, event.currentTarget.value));
  }
  byId("admin-project-preview").addEventListener("click", previewCaseStudy);

  const PHOTO_TEMPLATE_NAMES = ["single", "two-column", "three-up", "feature-row"];
  const photoTemplateSlotCount = (template) => ({
    single: 1,
    "two-column": 2,
    "three-up": 3,
    "feature-row": 3,
  }[template] || 0);
  let photoEditorProjectId = "";

  const activeCaseStudyProjectId = () => {
    const fromCard = projectForElement(selected)?.id;
    if (fromCard) return fromCard;
    const fromBody = document.body.dataset.caseStudyProjectId || "";
    return /^[\w-]{1,120}$/.test(fromBody) ? fromBody : "";
  };

  const layoutRecordFor = (projectId) => {
    state.caseStudyLayouts ||= {};
    const project = (state.projects || []).find((item) => item.id === projectId);
    return project?.photoLayout || state.caseStudyLayouts[projectId] || null;
  };

  const storePhotoLayout = (projectId, layout) => {
    state.caseStudyLayouts ||= {};
    state.caseStudyLayouts[projectId] = layout;
    const project = (state.projects || []).find((item) => item.id === projectId);
    if (project) project.photoLayout = layout;
    return layout;
  };

  const ensurePhotoLayout = (projectId, template) => {
    const name = PHOTO_TEMPLATE_NAMES.includes(template) ? template : "two-column";
    const count = photoTemplateSlotCount(name);
    const previous = Array.isArray(layoutRecordFor(projectId)?.slots) ? layoutRecordFor(projectId).slots : [];
    const slots = Array.from({ length: count }, (_, index) => ({
      image: typeof previous[index]?.image === "string" ? previous[index].image : "",
      caption: typeof previous[index]?.caption === "string" ? previous[index].caption : "",
      alt: typeof previous[index]?.alt === "string" ? previous[index].alt : "",
    }));
    return storePhotoLayout(projectId, { template: name, slots });
  };

  const validLayoutImage = (path) => typeof path === "string" && /^\/(?:uploads|assets)\/[\w./-]+$/.test(path) && !path.split("/").includes("..");

  const renderCaseStudyPhotoLayoutLive = (projectId, layout) => {
    const host = document.querySelector("#case-study-photo-layout");
    if (!host || !layout) return;
    host.replaceChildren();
    const grid = document.createElement("div");
    grid.className = `case-study-photo-layout case-study-photo-layout-${layout.template || "two-column"}`;
    (layout.slots || []).forEach((slot, index) => {
      const figure = document.createElement("figure");
      figure.className = "case-study-photo-slot";
      figure.dataset.slotIndex = String(index);
      if (validLayoutImage(slot?.image)) {
        const img = document.createElement("img");
        img.src = slot.image;
        img.alt = slot.alt || slot.caption || "Project photo";
        img.loading = "lazy";
        figure.append(img);
      } else {
        const empty = document.createElement("div");
        empty.className = "case-study-photo-empty";
        empty.textContent = "Drop a photo";
        figure.append(empty);
      }
      if (slot?.caption) {
        const caption = document.createElement("figcaption");
        caption.textContent = slot.caption;
        figure.append(caption);
      }
      grid.append(figure);
    });
    host.append(grid);
  };

  const renderPhotoSlotFields = (projectId, layout) => {
    const host = byId("admin-photo-layout-slots");
    if (!host) return;
    host.replaceChildren();
    if (!projectId || !layout?.slots?.length) {
      const note = document.createElement("small");
      note.textContent = "Apply a photo template to add captioned slots.";
      host.append(note);
      return;
    }
    layout.slots.forEach((slot, index) => {
      const row = document.createElement("div");
      row.className = "admin-photo-slot";
      row.dataset.slotIndex = String(index);
      if (validLayoutImage(slot.image)) {
        const img = document.createElement("img");
        img.src = slot.image;
        img.alt = slot.caption || `Photo ${index + 1}`;
        row.append(img);
      }
      const drop = document.createElement("div");
      drop.className = "admin-photo-slot-drop";
      drop.tabIndex = 0;
      drop.textContent = slot.image ? "Replace photo" : "Drop photo or click to upload";
      drop.addEventListener("click", () => {
        const fileInput = byId("admin-photo-layout-file");
        if (!fileInput) return;
        fileInput.dataset.slot = String(index);
        fileInput.click();
      });
      drop.addEventListener("dragover", (event) => {
        event.preventDefault();
        drop.classList.add("is-dragover");
      });
      drop.addEventListener("dragleave", () => drop.classList.remove("is-dragover"));
      drop.addEventListener("drop", (event) => {
        event.preventDefault();
        drop.classList.remove("is-dragover");
        const file = event.dataTransfer?.files?.[0];
        if (file) placePhotoInLayout(index, file);
      });
      const label = document.createElement("label");
      label.append(document.createTextNode("Caption"));
      const input = document.createElement("input");
      input.type = "text";
      input.maxLength = 240;
      input.value = slot.caption || "";
      input.setAttribute("aria-label", `Caption for photo ${index + 1}`);
      input.addEventListener("input", () => {
        const current = layoutRecordFor(projectId);
        if (!current?.slots?.[index]) return;
        current.slots[index].caption = input.value.slice(0, 240);
        storePhotoLayout(projectId, current);
        const caption = document.querySelector(`#case-study-photo-layout [data-slot-index="${index}"] figcaption`);
        if (caption) caption.textContent = current.slots[index].caption;
        else if (current.slots[index].caption) renderCaseStudyPhotoLayoutLive(projectId, current);
        saveDraft();
      });
      label.append(input);
      row.append(drop, label);
      host.append(row);
    });
  };

  const refreshCaseStudyPhotoEditor = ({ force = false } = {}) => {
    const host = byId("admin-photo-layout-slots");
    if (!host) return;
    const projectId = activeCaseStudyProjectId();
    if (!projectId) {
      photoEditorProjectId = "";
      renderPhotoSlotFields("", null);
      return;
    }
    if (!force && projectId === photoEditorProjectId && host.childElementCount) return;
    photoEditorProjectId = projectId;
    const layout = layoutRecordFor(projectId);
    const select = byId("admin-photo-template");
    if (select && layout?.template && PHOTO_TEMPLATE_NAMES.includes(layout.template)) select.value = layout.template;
    renderPhotoSlotFields(projectId, layout);
    if (layout) renderCaseStudyPhotoLayoutLive(projectId, layout);
  };

  const uploadLayoutFile = (file) => (window.liamAdminEditor?.uploadFile || uploadFile)(file);

  const placePhotoInLayout = async (slotIndex, file) => {
    const projectId = activeCaseStudyProjectId();
    if (!projectId) {
      setStatus("Open a case study or select a portfolio project before adding a photo.", "error");
      return;
    }
    if (!file) return;
    try {
      const template = byId("admin-photo-template")?.value || layoutRecordFor(projectId)?.template || "two-column";
      const layout = ensurePhotoLayout(projectId, template);
      const uploaded = await uploadLayoutFile(file);
      let index = Number.isInteger(slotIndex) ? slotIndex : layout.slots.findIndex((slot) => !slot.image);
      if (index < 0 || index >= layout.slots.length) index = Math.max(0, layout.slots.length - 1);
      const name = (file.name || "Photo").replace(/\.[^.]+$/, "");
      layout.slots[index] = {
        ...layout.slots[index],
        image: uploaded.url,
        alt: layout.slots[index].caption || name,
      };
      storePhotoLayout(projectId, layout);
      saveDraft();
      refreshCaseStudyPhotoEditor({ force: true });
      setStatus("Photo added to the layout. Select Update website to publish it.");
    } catch (error) {
      setStatus(`Could not add photo: ${error.message}`, "error");
    }
  };

  const applyPhotoTemplate = () => {
    const projectId = activeCaseStudyProjectId();
    if (!projectId) {
      setStatus("Open a case study or select a portfolio project before applying a photo template.", "error");
      return;
    }
    const template = byId("admin-photo-template")?.value || "two-column";
    const layout = ensurePhotoLayout(projectId, template);
    saveDraft();
    refreshCaseStudyPhotoEditor({ force: true });
    setStatus(`Applied “${layout.template}” photo template. Drop a photo into a slot or use Add photo to layout.`);
  };

  byId("admin-photo-template-apply")?.addEventListener("click", applyPhotoTemplate);
  byId("admin-photo-template-add")?.addEventListener("click", () => {
    const fileInput = byId("admin-photo-layout-file");
    if (!fileInput) return;
    delete fileInput.dataset.slot;
    fileInput.click();
  });
  byId("admin-photo-layout-file")?.addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    const slot = event.target.dataset.slot;
    event.target.value = "";
    if (!file) return;
    placePhotoInLayout(slot === undefined || slot === "" ? undefined : Number(slot), file);
  });
  document.querySelector("#case-study-photo-layout")?.addEventListener("dragover", (event) => {
    if (event.target.closest?.("[data-slot-index]")) event.preventDefault();
  });
  document.querySelector("#case-study-photo-layout")?.addEventListener("drop", (event) => {
    const slot = event.target.closest?.("[data-slot-index]");
    if (!slot) return;
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (file) placePhotoInLayout(Number(slot.dataset.slotIndex), file);
  });
  document.addEventListener("cms-case-study-ready", () => refreshCaseStudyPhotoEditor({ force: true }));

  byId("admin-parent").addEventListener("click", () => {
    const parent = selected?.parentElement?.closest(CANDIDATE_SELECTOR);
    if (parent) selectElement(parent);
  });

  for (const [id, name, value] of [
    ["admin-bold", "fontWeight", "700"],
    ["admin-italic", "fontStyle", "italic"],
    ["admin-underline", "textDecoration", "underline"],
    ["admin-shadow", "textShadow", "1"],
  ]) {
    byId(id).addEventListener("click", () => {
      if (!selected) return;
      const active = byId(id).getAttribute("aria-pressed") !== "true";
      byId(id).setAttribute("aria-pressed", String(active));
      updateSelectedStyles(name, active ? value : undefined);
    });
  }
  byId("admin-duplicate").addEventListener("click", () => duplicateSelected());
  byId("admin-group").addEventListener("click", () => {
    assignContentIds();
    const targets = [...selectedElements].filter(Boolean);
    if (!targets.length) return;
    const existingGroup = targets.map((element) => state.edits[element.dataset.cmsId]?.groupId).find(Boolean);
    if (existingGroup || selectionGroupId) {
      const activeGroup = selectionGroupId || existingGroup;
      targets.forEach((element) => {
        const edit = state.edits[element.dataset.cmsId];
        if (edit?.groupId === activeGroup) delete edit.groupId;
      });
      allCandidates().forEach((element) => {
        const edit = state.edits[element.dataset.cmsId];
        if (edit?.groupId === activeGroup) delete edit.groupId;
      });
      selectionGroupId = null;
      byId("admin-group").textContent = "Group";
      saveDraft();
      setStatus("Selected elements ungrouped.");
      return;
    }
    if (targets.length < 2) {
      setStatus("Shift-click at least two elements before grouping.", "error");
      return;
    }
    const groupId = `group-${(globalThis.crypto || crypto).randomUUID()}`;
    targets.forEach((element) => {
      state.edits[element.dataset.cmsId] ||= { styles: {} };
      state.edits[element.dataset.cmsId].groupId = groupId;
      selectedElements.add(element);
      element.classList.add("cms-highlight", "cms-multi-selected");
    });
    selectionGroupId = groupId;
    byId("admin-group").textContent = "Ungroup";
    saveDraft();
    setStatus(`${targets.length} elements grouped. Drag any one to move them together.`);
    document.dispatchEvent(new CustomEvent("cms-selection-changed", {
      detail: { selected, selectedElements: [...selectedElements] },
    }));
  });
  byId("admin-lock").addEventListener("click", () => {
    const targets = selectionTargets();
    if (!targets.length) return;
    const lock = !state.edits[selected.dataset.cmsId]?.locked;
    targets.forEach((element) => {
      state.edits[element.dataset.cmsId] ||= { styles: {} };
      state.edits[element.dataset.cmsId].locked = lock;
      element.classList.toggle("cms-editor-locked", lock);
    });
    byId("admin-lock").textContent = lock ? "Unlock" : "Lock";
    const lockBox = byId("admin-lock-checkbox");
    if (lockBox) lockBox.checked = lock;
    saveDraft();
    setStatus(lock ? "Selected elements locked against dragging." : "Selected elements unlocked.");
  });
  byId("admin-send-backward").addEventListener("click", () => {
    selectionTargets().forEach((element) => {
      const current = Number(state.edits[element.dataset.cmsId]?.styles?.zIndex ?? getComputedStyle(element).zIndex) || 0;
      state.edits[element.dataset.cmsId] ||= { styles: {} };
      state.edits[element.dataset.cmsId].styles.zIndex = current - 1;
      applyStyle(element, state.edits[element.dataset.cmsId].styles);
    });
    saveDraft();
  });
  byId("admin-bring-forward").addEventListener("click", () => {
    selectionTargets().forEach((element) => {
      const current = Number(state.edits[element.dataset.cmsId]?.styles?.zIndex ?? getComputedStyle(element).zIndex) || 0;
      state.edits[element.dataset.cmsId] ||= { styles: {} };
      state.edits[element.dataset.cmsId].styles.zIndex = current + 1;
      applyStyle(element, state.edits[element.dataset.cmsId].styles);
    });
    saveDraft();
  });

  const isRemovableAddition = (element) => Boolean(
    element.classList?.contains("cms-added-content-block")
    || element.classList?.contains("cms-shape")
    || element.classList?.contains("cms-published-addition")
    || element.classList?.contains("cms-added-service")
    || element.classList?.contains("cms-stock-image")
    || element.id?.startsWith("element-copy-")
    || element.id?.startsWith("shape-")
    || element.id?.startsWith("content-block-")
    || element.id?.startsWith("project-custom-")
    || element.id?.startsWith("service-custom-")
    || element.id?.startsWith("custom-cta-")
    || element.id?.startsWith("stock-image-"),
  );

  const deleteElements = (elements) => {
    const targets = [...new Set((elements || []).map(resolveDeleteTarget).filter(isDeletable))];
    if (!targets.length) {
      setStatus("Select something to delete first.", "error");
      return false;
    }
    assignContentIds();
    targets.forEach((element) => {
      if (!isDeletable(element)) return;
      ensureCmsId(element);
      const projectCard = element.matches?.(".project-card") ? element : null;
      const serviceCard = element.matches?.(".service-card, .cms-added-service") ? element : null;
      const contentBlock = element.matches?.(".cms-added-content-block, .cms-shape, .cms-stock-image") ? element : null;
      if (projectCard?.id?.startsWith("project-")) {
        const projectId = projectCard.id.replace(/^project-/, "");
        const customInState = (state.projects || []).some((project) => project.id === projectId);
        if (projectCard.id.startsWith("project-custom-") || customInState) {
          state.projects = (state.projects || []).filter((project) => project.id !== projectId);
          projectCard.remove();
        } else {
          ensureCmsId(projectCard);
          const cmsId = projectCard.dataset.cmsId || projectCard.id;
          state.edits[cmsId] ||= { styles: {} };
          state.edits[cmsId].deleted = true;
          projectCard.hidden = true;
        }
      } else if (serviceCard) {
        const serviceId = serviceCard.dataset.serviceId;
        if (serviceId?.startsWith("custom-") || serviceCard.classList.contains("cms-added-service")) {
          state.services = (state.services || []).filter((service) => service.id !== serviceId);
          serviceCard.remove();
        } else if (!serviceId) {
          ensureCmsId(serviceCard);
          const cmsId = serviceCard.dataset.cmsId || stableContentId(serviceCard);
          state.edits[cmsId] ||= { styles: {} };
          state.edits[cmsId].deleted = true;
          serviceCard.hidden = true;
        } else {
          state.services = (state.services || []).filter((service) => service.id !== serviceId);
          serviceCard.remove();
        }
      } else if (contentBlock) {
        if (contentBlock.id) {
          state.contentBlocks = (state.contentBlocks || []).filter((block) => block.id !== contentBlock.id);
          state.shapes = (state.shapes || []).filter((shape) => shape.id !== contentBlock.id);
          state.mediaElements = (state.mediaElements || []).filter((item) => item.id !== contentBlock.id);
        }
        const cmsId = ensureCmsId(contentBlock);
        if (cmsId) {
          state.edits[cmsId] ||= { styles: {} };
          state.edits[cmsId].deleted = true;
        }
        contentBlock.hidden = true;
        contentBlock.remove();
      } else if (isRemovableAddition(element)) {
        const id = element.id || element.dataset.cmsId;
        state.elementCopies = (state.elementCopies || []).filter((copy) => copy.id !== id);
        state.shapes = (state.shapes || []).filter((shape) => shape.id !== id);
        state.buttons = (state.buttons || []).filter((button) => button.id !== id);
        state.mediaElements = (state.mediaElements || []).filter((item) => item.id !== id);
        state.contentBlocks = (state.contentBlocks || []).filter((block) => block.id !== id);
        if (element.dataset.cmsId) delete state.edits[element.dataset.cmsId];
        element.remove();
      } else {
        let cmsId = ensureCmsId(element);
        if (!cmsId) {
          element.dataset.cmsId = `deleted-${crypto.randomUUID()}`;
          cmsId = element.dataset.cmsId;
        }
        state.edits[cmsId] ||= { styles: {} };
        state.edits[cmsId].deleted = true;
        element.hidden = true;
        if (typeof element.style?.setProperty === "function") {
          element.style.setProperty("display", "none", "important");
        }
      }
      element.classList?.remove("cms-highlight", "cms-multi-selected");
    });
    selectedElements.clear();
    selected = null;
    selectionName.textContent = "Deleted. Use Restore hidden elements if needed.";
    byId("admin-delete").disabled = true;
    ["admin-duplicate", "admin-group", "admin-lock", "admin-send-backward", "admin-bring-forward"].forEach((id) => { byId(id).disabled = true; });
    renumberServiceCards();
    saveDraft();
    renderSectionList();
    setStatus("Deleted selected item(s).");
    document.dispatchEvent(new CustomEvent("cms-selection-changed", { detail: { selected: null, selectedElements: [] } }));
    return true;
  };
  byId("admin-delete").addEventListener("click", () => {
    const targets = selectionTargets();
    if (!targets.length && selected) targets.push(selected);
    deleteElements(targets);
  });
  byId("admin-restore").addEventListener("click", () => {
    for (const [id, edit] of Object.entries(state.edits)) {
      if (!edit.deleted) continue;
      const element = document.querySelector(`[data-cms-id="${CSS.escape(id)}"]`);
      if (element) element.hidden = false;
      delete edit.deleted;
    }
    saveDraft();
    renderSectionList();
    setStatus("Hidden elements restored.");
  });
  byId("admin-add-section").addEventListener("click", addSection);
  byId("admin-add-page")?.addEventListener("click", addCustomPage);
  byId("admin-new-section-title").addEventListener("keydown", (event) => {
    if (event.key === "Enter") addSection();
  });
  byId("admin-add-project").addEventListener("click", addPortfolioProject);
  byId("admin-add-service").addEventListener("click", addService);
  byId("admin-add-heading-block").addEventListener("click", () => addTextBlock("heading"));
  byId("admin-add-text-block").addEventListener("click", () => addTextBlock("text"));
  byId("admin-add-image-block").addEventListener("click", () => byId("admin-block-image-file").click());
  byId("admin-block-image-file").addEventListener("change", async (event) => {
    const input = event.currentTarget;
    await addImageBlock(input.files?.[0]);
    input.value = "";
  });
  byId("admin-block-up").addEventListener("click", () => moveContentBlock(-1));
  byId("admin-block-down").addEventListener("click", () => moveContentBlock(1));
  byId("admin-version-restore").addEventListener("click", restorePublishedVersion);
  byId("admin-reset-draft").addEventListener("click", () => {
    if (!window.confirm("Discard your unpublished browser draft and reload the last published website?")) return;
    localStorage.removeItem(STORAGE_KEY);
    window.location.reload();
  });

  byId("admin-drag").addEventListener("click", () => {
    dragMode = !dragMode;
    byId("admin-drag").setAttribute("aria-pressed", String(dragMode));
    setStatus("Every selected element can already be dragged directly. Alt-drag creates a copy; this toggle is kept for compatibility.");
  });
  let dragStart = null;
  document.addEventListener("pointerdown", (event) => {
    if (!editMode || isEditorChrome(event.target) || toolbar.contains(event.target) || event.button !== 0) return;
    if (event.target.closest?.(".dialog-close")) return;
    if (event.target.closest(".moveable-control, .moveable-line, .editor-resize-handle")) return;
    const clicked = event.target.closest(CANDIDATE_SELECTOR);
    const openDialog = clicked?.closest?.(".service-dialog");
    if (!clicked || (openDialog && !openDialog.open)) return;
    if (openDialog?.open) {
      // Allow selecting dialog media/links; skip drag sessions inside the modal.
      if (!selectedElements.has(clicked)) selectElement(clicked);
      return;
    }
    if (event.shiftKey) {
      if (!selectedElements.has(clicked)) selectElement(clicked, { preserve: true });
    } else if (!selectedElements.has(clicked)) {
      selectElement(clicked);
    }
    if (!selectedElements.has(clicked)) return;
    const clickedEdit = state.edits[clicked.dataset.cmsId] || {};
    if (clickedEdit.locked) {
      setStatus("This element is locked. Unlock it before moving.", "error");
      return;
    }
    const clickedGroup = clickedEdit.groupId;
    const moving = clickedGroup
      ? [...document.querySelectorAll("[data-cms-id]")].filter((element) =>
        state.edits[element.dataset.cmsId]?.groupId === clickedGroup && !state.edits[element.dataset.cmsId]?.locked)
      : selectionTargets().filter((element) => !state.edits[element.dataset.cmsId]?.locked);
    const uniqueMoving = moving.length ? moving : [clicked];
    uniqueMoving.forEach((element) => {
      selectedElements.add(element);
      element.classList.add("cms-highlight");
      element.classList.toggle("cms-multi-selected", uniqueMoving.length > 1);
    });
    dragStart = {
      x: event.clientX,
      y: event.clientY,
      items: uniqueMoving.map((element) => {
        const edit = state.edits[element.dataset.cmsId] ||= { styles: {} };
        const target = (isMediaElement(element))
          ? imageFrameFor(element)
          : element;
        const left = Number.parseFloat(target.style.left);
        const top = Number.parseFloat(target.style.top);
        return {
          element,
          target,
          left: Number.isFinite(left) ? left : Number(edit.styles?.left || edit.resize?.offsetX || 0),
          top: Number.isFinite(top) ? top : Number(edit.styles?.top || edit.resize?.offsetY || 0),
        };
      }),
    };
    event.preventDefault();
  });
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
  const collectSnapGuides = (movingElements) => {
    const guidesX = [];
    const guidesY = [];
    const section = movingElements[0]?.closest("main > section") || document.querySelector("main");
    if (section) {
      const rect = section.getBoundingClientRect();
      guidesX.push(0, Math.round(rect.width / 2), Math.round(rect.width));
      guidesY.push(0, Math.round(rect.height / 2), Math.round(rect.height));
      // Sparse grid only — dense 20px guides created an unusable snap-digit storm.
      for (let step = 40; step < rect.width; step += 40) guidesX.push(step);
      for (let step = 40; step < rect.height; step += 40) guidesY.push(step);
    }
    [...document.querySelectorAll("[data-cms-id]")]
      .filter((element) => !movingElements.includes(element) && element.getClientRects().length)
      .slice(0, 40)
      .forEach((element) => {
        const rect = element.getBoundingClientRect();
        const parent = element.closest("main > section") || document.querySelector("main");
        if (!parent) return;
        const parentRect = parent.getBoundingClientRect();
        guidesX.push(Math.round(rect.left - parentRect.left), Math.round(rect.left + rect.width / 2 - parentRect.left), Math.round(rect.right - parentRect.left));
        guidesY.push(Math.round(rect.top - parentRect.top), Math.round(rect.top + rect.height / 2 - parentRect.top), Math.round(rect.bottom - parentRect.top));
      });
    return { guidesX, guidesY };
  };
  const collectSizeGuides = (resizingElements = []) => {
    const widths = [];
    const heights = [];
    [...document.querySelectorAll("img, video")]
      .filter((element) => element.dataset?.cmsId)
      .forEach((element) => {
        if (resizingElements.includes(element) || !element.getClientRects().length) return;
        const rect = imageFrameFor(element).getBoundingClientRect();
        if (rect.width >= 40) widths.push(Math.round(rect.width));
        if (rect.height >= 30) heights.push(Math.round(rect.height));
      });
    return { widths: [...new Set(widths)], heights: [...new Set(heights)] };
  };
  const snapResizeDimensions = (width, height, resizingElements = [], threshold = 8) => {
    if (snapHoldOff || (byId("admin-snap-size")?.checked === false && byId("admin-snap-enabled")?.checked === false)) {
      return { width, height, snappedW: false, snappedH: false };
    }
    const { widths, heights } = collectSizeGuides(resizingElements);
    const snappedW = snapValue(width, widths, threshold);
    const snappedH = snapValue(height, heights, threshold);
    return {
      width: snappedW.value,
      height: snappedH.value,
      snappedW: snappedW.snapped,
      snappedH: snappedH.snapped,
    };
  };
  const collectNeighborRects = (movingElements) => {
    const section = movingElements[0]?.closest("main > section") || document.querySelector("main");
    if (!section) return { parentRect: null, neighbors: [] };
    const parentRect = section.getBoundingClientRect();
    const movingCenters = movingElements.map((element) => {
      const rect = element.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    });
    const neighbors = [...section.querySelectorAll("[data-cms-id]")]
      .filter((element) => !movingElements.includes(element) && element.getClientRects().length)
      .map((element) => {
        const rect = element.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const dist = Math.min(...movingCenters.map((point) => Math.hypot(point.x - centerX, point.y - centerY)));
        return {
          element,
          dist,
          left: rect.left - parentRect.left,
          top: rect.top - parentRect.top,
          right: rect.right - parentRect.left,
          bottom: rect.bottom - parentRect.top,
          width: rect.width,
          height: rect.height,
          centerX: centerX - parentRect.left,
          centerY: centerY - parentRect.top,
        };
      })
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 12);
    return { parentRect, neighbors };
  };
  const equalGapSnap = (box, neighbors, threshold = 8) => {
    const gapsX = [];
    const gapsY = [];
    const markers = [];
    const pushUniqueGap = (list, entry) => {
      if (entry.gap < 8 || entry.gap > 480) return;
      if (list.some((item) => Math.abs(item.gap - entry.gap) < 1 && Math.abs(item.from - entry.from) < 1)) return;
      list.push(entry);
    };
    neighbors.forEach((leftNeighbor) => {
      neighbors.forEach((rightNeighbor) => {
        if (leftNeighbor === rightNeighbor) return;
        if (leftNeighbor.right <= rightNeighbor.left) {
          pushUniqueGap(gapsX, {
            gap: rightNeighbor.left - leftNeighbor.right,
            from: leftNeighbor.right,
            to: rightNeighbor.left,
            y: (leftNeighbor.centerY + rightNeighbor.centerY) / 2,
          });
        }
        if (leftNeighbor.bottom <= rightNeighbor.top) {
          pushUniqueGap(gapsY, {
            gap: rightNeighbor.top - leftNeighbor.bottom,
            from: leftNeighbor.bottom,
            to: rightNeighbor.top,
            x: (leftNeighbor.centerX + rightNeighbor.centerX) / 2,
          });
        }
      });
    });
    let left = box.left;
    let top = box.top;
    let snappedX = false;
    let snappedY = false;
    const addMarker = (marker) => {
      if (markers.length >= 4) return;
      if (!Number.isFinite(marker.from) || !Number.isFinite(marker.to) || marker.to <= marker.from) return;
      if (marker.to - marker.from > 480) return;
      markers.push(marker);
    };
    neighbors.forEach((neighbor) => {
      gapsX.slice(0, 8).forEach((sample) => {
        const candidate = neighbor.right + sample.gap;
        if (Math.abs(box.left - candidate) <= threshold) {
          left = Math.round(candidate);
          snappedX = true;
          addMarker({ axis: "x", from: neighbor.right, to: candidate, gap: sample.gap, y: box.top + box.height / 2 });
          addMarker({ axis: "x", from: sample.from, to: sample.to, gap: sample.gap, y: sample.y });
        }
        const candidateLeft = neighbor.left - sample.gap - box.width;
        if (Math.abs(box.left - candidateLeft) <= threshold) {
          left = Math.round(candidateLeft);
          snappedX = true;
          addMarker({ axis: "x", from: candidateLeft + box.width, to: neighbor.left, gap: sample.gap, y: box.top + box.height / 2 });
          addMarker({ axis: "x", from: sample.from, to: sample.to, gap: sample.gap, y: sample.y });
        }
      });
      gapsY.slice(0, 8).forEach((sample) => {
        const candidate = neighbor.bottom + sample.gap;
        if (Math.abs(box.top - candidate) <= threshold) {
          top = Math.round(candidate);
          snappedY = true;
          addMarker({ axis: "y", from: neighbor.bottom, to: candidate, gap: sample.gap, x: box.left + box.width / 2 });
          addMarker({ axis: "y", from: sample.from, to: sample.to, gap: sample.gap, x: sample.x });
        }
        const candidateTop = neighbor.top - sample.gap - box.height;
        if (Math.abs(box.top - candidateTop) <= threshold) {
          top = Math.round(candidateTop);
          snappedY = true;
          addMarker({ axis: "y", from: candidateTop + box.height, to: neighbor.top, gap: sample.gap, x: box.left + box.width / 2 });
          addMarker({ axis: "y", from: sample.from, to: sample.to, gap: sample.gap, x: sample.x });
        }
      });
      neighbors.forEach((other) => {
        if (neighbor === other) return;
        if (neighbor.right < other.left) {
          const span = other.left - neighbor.right;
          const equalLeft = neighbor.right + (span - box.width) / 2;
          if (span > box.width + 4 && span < 900 && Math.abs(box.left - equalLeft) <= threshold) {
            left = Math.round(equalLeft);
            snappedX = true;
            const gap = Math.round((span - box.width) / 2);
            addMarker({ axis: "x", from: neighbor.right, to: left, gap, y: box.top + box.height / 2 });
            addMarker({ axis: "x", from: left + box.width, to: other.left, gap, y: box.top + box.height / 2 });
          }
        }
        if (neighbor.bottom < other.top) {
          const span = other.top - neighbor.bottom;
          const equalTop = neighbor.bottom + (span - box.height) / 2;
          if (span > box.height + 4 && span < 900 && Math.abs(box.top - equalTop) <= threshold) {
            top = Math.round(equalTop);
            snappedY = true;
            const gap = Math.round((span - box.height) / 2);
            addMarker({ axis: "y", from: neighbor.bottom, to: top, gap, x: box.left + box.width / 2 });
            addMarker({ axis: "y", from: top + box.height, to: other.top, gap, x: box.left + box.width / 2 });
          }
        }
      });
    });
    return { left, top, snappedX, snappedY, markers };
  };
  const paintGapMarkers = (guideLayer, parentRect, markers) => {
    if (!guideLayer || !parentRect || !markers?.length) return;
    markers.slice(0, 4).forEach((marker) => {
      const span = Math.max(2, Math.min(240, marker.to - marker.from));
      const mid = (marker.from + marker.to) / 2;
      const line = document.createElement("div");
      const label = document.createElement("span");
      label.className = "cms-guide-gap-label";
      label.textContent = `=${Math.round(marker.gap)}`;
      if (marker.axis === "x") {
        line.className = "cms-guide-gap cms-guide-gap-x";
        line.style.left = `${parentRect.left + marker.from}px`;
        line.style.width = `${span}px`;
        line.style.top = `${parentRect.top + marker.y - 1}px`;
        line.style.height = "2px";
        label.style.left = `${parentRect.left + mid}px`;
        label.style.top = `${parentRect.top + marker.y - 18}px`;
        label.style.transform = "translateX(-50%)";
      } else {
        line.className = "cms-guide-gap cms-guide-gap-y";
        line.style.top = `${parentRect.top + marker.from}px`;
        line.style.height = `${span}px`;
        line.style.left = `${parentRect.left + marker.x - 1}px`;
        line.style.width = "2px";
        label.style.left = `${parentRect.left + marker.x + 8}px`;
        label.style.top = `${parentRect.top + mid}px`;
        label.style.transform = "translateY(-50%)";
      }
      guideLayer.append(line, label);
    });
  };
  document.addEventListener("pointermove", (event) => {
    if (!dragStart) return;
    // Native drag owns free movement; Moveable handles resize/rotate only.
    if (window.CaptainCampaignEditor?.moveableDragging) return;
    const snapOn = !snapHoldOff && byId("admin-snap-enabled")?.checked !== false;
    const movingElements = dragStart.items.map((item) => item.element);
    const { guidesX, guidesY } = snapOn ? collectSnapGuides(movingElements) : { guidesX: [], guidesY: [] };
    const { parentRect, neighbors } = snapOn ? collectNeighborRects(movingElements) : { parentRect: null, neighbors: [] };
    const guideLayer = document.getElementById("cms-smart-guides");
    if (guideLayer) guideLayer.replaceChildren();
    dragStart.items.forEach(({ element, target, left: startLeft, top: startTop }) => {
      if (state.edits[element.dataset.cmsId]?.locked) return;
      const edit = state.edits[element.dataset.cmsId] ||= { styles: {} };
      let left = Math.round(startLeft + event.clientX - dragStart.x);
      let top = Math.round(startTop + event.clientY - dragStart.y);
      if (snapOn) {
        const snappedX = snapValue(left, guidesX);
        const snappedY = snapValue(top, guidesY);
        left = snappedX.value;
        top = snappedY.value;
        const bounds = target.getBoundingClientRect();
        const gap = equalGapSnap({
          left,
          top,
          width: bounds.width || Number(edit.resize?.width) || 120,
          height: bounds.height || Number(edit.resize?.height) || 80,
        }, neighbors);
        left = gap.left;
        top = gap.top;
        if (guideLayer && (snappedX.snapped || snappedY.snapped)) {
          if (snappedX.snapped) {
            const line = document.createElement("div");
            line.className = "cms-guide-line cms-guide-x";
            line.style.left = `${(parentRect?.left || 0) + left}px`;
            guideLayer.append(line);
          }
          if (snappedY.snapped) {
            const line = document.createElement("div");
            line.className = "cms-guide-line cms-guide-y";
            line.style.top = `${(parentRect?.top || 0) + top}px`;
            guideLayer.append(line);
          }
        }
        if (gap.snappedX || gap.snappedY) paintGapMarkers(guideLayer, parentRect, gap.markers);
      }
      if (isMediaElement(element)) {
        const bounds = target.getBoundingClientRect();
        edit.resize = {
          ...(edit.resize || { width: bounds.width || 400, height: bounds.height || 300 }),
          offsetX: left,
          offsetY: top,
        };
        applyImageResize(element, edit.resize);
        target.dataset.cmsKeepOffset = "true";
        element.dataset.cmsKeepOffset = "true";
      } else {
        edit.styles ||= {};
        edit.styles.left = left;
        edit.styles.top = top;
        target.style.position = "relative";
        target.style.left = `${left}px`;
        target.style.top = `${top}px`;
        target.dataset.cmsKeepOffset = "true";
        applyStyle(element, edit.styles);
      }
      if (element === selected) {
        byId("admin-left").value = left;
        byId("admin-top").value = top;
      }
    });
  });
  document.addEventListener("pointerup", () => {
    if (!dragStart) return;
    dragStart = null;
    document.getElementById("cms-smart-guides")?.replaceChildren();
    saveDraft();
  });
  document.addEventListener("pointercancel", () => {
    if (!dragStart) return;
    dragStart = null;
    document.getElementById("cms-smart-guides")?.replaceChildren();
  });
  const handleEditorShortcut = (event) => {
    const modifier = event.ctrlKey || event.metaKey;
    const key = event.key.toLowerCase();
    const typing = event.target.matches("input, textarea, select") || event.target.isContentEditable;
    if (modifier && key === "s") {
      event.preventDefault();
      saveDraft();
      setStatus("Saving your draft…");
      return;
    }
    if (typing) return;
    if (modifier && key === "z") {
      event.preventDefault();
      event.shiftKey ? moveHistory(redoHistory, undoHistory) : moveHistory(undoHistory, redoHistory);
      return;
    }
    if (modifier && key === "y") {
      event.preventDefault();
      moveHistory(redoHistory, undoHistory);
      return;
    }
    if (modifier && key === "delete") {
      event.preventDefault();
      const section = selected?.closest("main > section");
      if (section && (section.classList.contains("cms-new-section") || section.classList.contains("cms-section-copy"))) {
        deleteAddedSection(section);
      } else if (section && window.confirm(`Hide "${sectionTitle(section)}" from the published page? You can restore it later.`)) {
        toggleSectionVisibility(section);
      }
      return;
    }
    if ((key === "delete" || key === "backspace") && (selectedElements.size || selected)) {
      event.preventDefault();
      const targets = selectionTargets();
      if (!targets.length && selected) targets.push(selected);
      deleteElements(targets);
      return;
    }
    if (modifier && event.shiftKey && key === "g") {
      event.preventDefault();
      if (selectionGroupId) byId("admin-group").click();
      else setStatus("Select a grouped element first to ungroup it.", "error");
      return;
    }
    if (modifier && (key === "[" || key === "]")) {
      event.preventDefault();
      const amount = event.altKey ? 9999 : 1;
      updateSelectedStyles("zIndex", key === "]" ? amount : -amount);
      return;
    }
    if (event.shiftKey && modifier && [">", "."].includes(key)) {
      event.preventDefault();
      const field = byId("admin-font-size");
      field.value = String((Number(field.value) || 16) + 2);
      field.dispatchEvent(new Event("input", { bubbles: true }));
      return;
    }
    if (event.shiftKey && modifier && ["<", ","].includes(key)) {
      event.preventDefault();
      const field = byId("admin-font-size");
      field.value = String(Math.max(8, (Number(field.value) || 16) - 2));
      field.dispatchEvent(new Event("input", { bubbles: true }));
      return;
    }
    if (event.shiftKey && modifier && key === "8") {
      event.preventDefault();
      updateSelectedStyles("whiteSpace", undefined);
      if (selected?.matches(TEXT_SELECTOR)) {
        const edit = currentEdit();
        edit.text = selected.textContent
          .split(/\s*\n\s*/).filter(Boolean).map((line) => `• ${line.trim()}`).join("\n");
        selected.textContent = edit.text;
        selected.style.whiteSpace = "pre-line";
      }
      saveDraft();
      return;
    }
    if (event.altKey && event.shiftKey && key === "t" && selectedElements.size > 1) {
      event.preventDefault();
      const targets = selectionTargets();
      const lefts = targets.map((element) => Number(state.edits[element.dataset.cmsId]?.styles?.left || 0));
      const tops = targets.map((element) => Number(state.edits[element.dataset.cmsId]?.styles?.top || 0));
      const avgLeft = Math.round(lefts.reduce((sum, value) => sum + value, 0) / targets.length);
      const avgTop = Math.round(tops.reduce((sum, value) => sum + value, 0) / targets.length);
      targets.forEach((element) => {
        state.edits[element.dataset.cmsId] ||= { styles: {} };
        state.edits[element.dataset.cmsId].styles.left = avgLeft;
        state.edits[element.dataset.cmsId].styles.top = avgTop;
        applyStyle(element, state.edits[element.dataset.cmsId].styles);
      });
      saveDraft();
      setStatus("Selected elements tidied to a shared position.");
      return;
    }
    if (modifier && key === "a") {
      event.preventDefault();
      const candidates = allCandidates().filter((element) => !element.hidden && element.getClientRects().length);
      selectedElements.forEach((element) => element.classList.remove("cms-highlight", "cms-multi-selected"));
      selectedElements.clear();
      candidates.forEach((element) => selectedElements.add(element));
      selected = candidates.at(-1) || null;
      if (selected) selectElement(selected, { preserve: true });
      setStatus(`${selectedElements.size} visible elements selected.`);
      return;
    }
    if (modifier && key === "c") {
      event.preventDefault();
      if (selectedElements.size === 1) elementClipboard = selected;
      else setStatus("Copy one element at a time; multi-element copying is not supported yet.", "error");
      return;
    }
    if (modifier && key === "x") {
      event.preventDefault();
      if (selectedElements.size === 1) {
        elementClipboard = selected;
        deleteElements([selected]);
      } else setStatus("Cut one element at a time.", "error");
      return;
    }
    if (modifier && key === "v") {
      event.preventDefault();
      if (elementClipboard) duplicateSelected(elementClipboard);
      return;
    }
    if (modifier && key === "d") {
      event.preventDefault();
      duplicateSelected();
      return;
    }
    if (modifier && key === "g") {
      event.preventDefault();
      if (selectedElements.size > 1) byId("admin-group").click();
      else setStatus("Select multiple elements with Shift-click before grouping.", "error");
      return;
    }
    if (modifier && key === "enter") {
      event.preventDefault();
      addSection();
      return;
    }
    if (modifier && key === "/") {
      event.preventDefault();
      byId("admin-collapse").click();
      return;
    }
    if ((modifier && key === "e") || key === "/") {
      event.preventDefault();
      document.getElementById("editor-elements-tab")?.click();
      document.getElementById("editor-elements-search")?.focus();
      return;
    }
    if (modifier && key === "b") {
      event.preventDefault();
      byId("admin-bold").click();
      return;
    }
    if (modifier && key === "i") {
      event.preventDefault();
      byId("admin-italic").click();
      return;
    }
    if (modifier && key === "u") {
      event.preventDefault();
      byId("admin-underline").click();
      return;
    }
    if (event.shiftKey && modifier && key === "k" && selected?.matches(TEXT_SELECTOR)) {
      event.preventDefault();
      selectionTargets().filter((element) => element.matches(TEXT_SELECTOR)).forEach((element) => {
        const text = element.textContent;
        state.edits[element.dataset.cmsId] ||= { styles: {} };
        state.edits[element.dataset.cmsId].text = text === text.toUpperCase() ? text.toLowerCase() : text.toUpperCase();
        element.textContent = state.edits[element.dataset.cmsId].text;
      });
      saveDraft();
      return;
    }
    if (modifier && key === "k") {
      event.preventDefault();
      const link = window.prompt("Enter a secure URL, email link, or page anchor:", selected?.getAttribute("href") || "");
      if (link !== null && selected instanceof HTMLAnchorElement) byId("admin-href").value = link;
      if (link !== null && selected instanceof HTMLAnchorElement) byId("admin-href").dispatchEvent(new Event("change"));
      return;
    }
    if (event.shiftKey && modifier && ["l", "c", "r"].includes(key)) {
      event.preventDefault();
      updateSelectedStyles("textAlign", { l: "left", c: "center", r: "right" }[key]);
      return;
    }
    if (["arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key) && selectedElements.size) {
      event.preventDefault();
      const distance = event.shiftKey ? 10 : 1;
      selectionTargets().forEach((element) => {
        const edit = state.edits[element.dataset.cmsId] ||= { styles: {} };
        if (isImageElement(element)) {
          const frame = imageFrameFor(element);
          const bounds = frame.getBoundingClientRect();
          edit.resize ||= { width: bounds.width, height: bounds.height };
          if (key === "arrowleft") edit.resize.offsetX = (edit.resize.offsetX || 0) - distance;
          if (key === "arrowright") edit.resize.offsetX = (edit.resize.offsetX || 0) + distance;
          if (key === "arrowup") edit.resize.offsetY = (edit.resize.offsetY || 0) - distance;
          if (key === "arrowdown") edit.resize.offsetY = (edit.resize.offsetY || 0) + distance;
          applyImageResize(element, edit.resize);
        } else {
          if (key === "arrowleft") edit.styles.left = (edit.styles.left || 0) - distance;
          if (key === "arrowright") edit.styles.left = (edit.styles.left || 0) + distance;
          if (key === "arrowup") edit.styles.top = (edit.styles.top || 0) - distance;
          if (key === "arrowdown") edit.styles.top = (edit.styles.top || 0) + distance;
          applyStyle(element, edit.styles);
        }
      });
      saveDraft();
      return;
    }
    if (!modifier && key === "t") {
      addTextBlock("text");
    } else if (!modifier && ["r", "l", "s"].includes(key)) {
      addShape(key);
    } else if (!modifier && key === "o") {
      // Circle uses O so C can temporarily disable snap while resizing.
      addShape("c");
    }
  };

  const renderShape = (shape) => {
    const section = document.getElementById(shape.sectionId) || document.querySelector("main");
    if (!section || document.getElementById(shape.id)) return;
    const kinds = { rectangle: "div", circle: "div", line: "div", note: "p" };
    const element = document.createElement(kinds[shape.kind] || "div");
    element.className = `cms-added-content-block cms-shape cms-shape-${shape.kind}`;
    element.id = shape.id;
    element.dataset.cmsId = shape.id;
    if (shape.text) element.textContent = shape.text;
    section.append(element);
  };

  const addShape = (kind) => {
    const section = resolvePlacementSection();
    if (!section) return;
    const shape = {
      id: `shape-${crypto.randomUUID()}`,
      sectionId: section.id || "home",
      kind: kind === "s" ? "note" : { r: "rectangle", c: "circle", l: "line" }[kind] || "rectangle",
      text: kind === "s" ? "Sticky note" : "",
    };
    state.shapes ||= [];
    if (state.shapes.length >= 100) {
      setStatus("The page supports up to 100 added shapes.", "error");
      return;
    }
    state.shapes.push(shape);
    renderShape(shape);
    assignContentIds();
    const element = document.getElementById(shape.id);
    if (element) {
      selectElement(element);
      scrollToSection(element);
    }
    saveDraft();
    setStatus({ rectangle: "Rectangle", circle: "Circle", line: "Line", note: "Sticky note" }[shape.kind] +
      " added. Drag it anywhere; select Update website to publish it.");
  };
  document.addEventListener("keydown", (event) => {
    if (event.key.toLowerCase() === "c" && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const typing = event.target.matches("input, textarea, select") || event.target.isContentEditable;
      if (!typing) {
        event.preventDefault();
        event.stopImmediatePropagation();
        snapHoldOff = true;
        document.body.classList.add("cms-snap-hold-off");
        return; // hold C = unsnap only — never scroll or jump the page
      }
    }
    handleEditorShortcut(event);
  }, true);
  document.addEventListener("keyup", (event) => {
    if (event.key.toLowerCase() === "c" && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const typing = event.target.matches("input, textarea, select") || event.target.isContentEditable;
      if (typing) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      snapHoldOff = false;
      document.body.classList.remove("cms-snap-hold-off");
      // Do not refreshMoveable here — recreating Moveable was jumping the page.
    }
  }, true);

  /* Right-button drag marquee multi-select */
  let marquee = null;
  const marqueeBox = document.createElement("div");
  marqueeBox.className = "cms-marquee-box";
  marqueeBox.hidden = true;
  marqueeBox.dataset.cmsControl = "true";
  document.body.append(marqueeBox);
  document.addEventListener("pointerdown", (event) => {
    if (!editMode || event.button !== 2 || isEditorChrome(event.target) || toolbar.contains(event.target)) return;
    if (event.target.closest(CANDIDATE_SELECTOR) && !event.shiftKey) return;
    marquee = { x: event.clientX, y: event.clientY };
    marqueeBox.hidden = false;
    marqueeBox.style.left = `${marquee.x}px`;
    marqueeBox.style.top = `${marquee.y}px`;
    marqueeBox.style.width = "0px";
    marqueeBox.style.height = "0px";
    event.preventDefault();
  }, true);
  document.addEventListener("pointermove", (event) => {
    if (!marquee) return;
    const left = Math.min(marquee.x, event.clientX);
    const top = Math.min(marquee.y, event.clientY);
    const width = Math.abs(event.clientX - marquee.x);
    const height = Math.abs(event.clientY - marquee.y);
    marqueeBox.style.left = `${left}px`;
    marqueeBox.style.top = `${top}px`;
    marqueeBox.style.width = `${width}px`;
    marqueeBox.style.height = `${height}px`;
  }, true);
  document.addEventListener("pointerup", (event) => {
    if (!marquee) return;
    const left = Math.min(marquee.x, event.clientX);
    const top = Math.min(marquee.y, event.clientY);
    const right = Math.max(marquee.x, event.clientX);
    const bottom = Math.max(marquee.y, event.clientY);
    marquee = null;
    marqueeBox.hidden = true;
    if (right - left < 6 || bottom - top < 6) return;
    selectedElements.forEach((element) => element.classList.remove("cms-highlight", "cms-multi-selected"));
    selectedElements.clear();
    allCandidates().forEach((element) => {
      if (element.hidden || !element.getClientRects().length) return;
      const rect = element.getBoundingClientRect();
      const hits = rect.left < right && rect.right > left && rect.top < bottom && rect.bottom > top;
      if (!hits) return;
      selectedElements.add(element);
      element.classList.add("cms-highlight", "cms-multi-selected");
    });
    selected = [...selectedElements].at(-1) || null;
    if (selected) selectElement(selected, { preserve: true });
    setStatus(`${selectedElements.size} element${selectedElements.size === 1 ? "" : "s"} selected.`);
  }, true);
  document.addEventListener("contextmenu", (event) => {
    if (!editMode) return;
    if (marqueeBox && !marqueeBox.hidden) {
      event.preventDefault();
      return;
    }
    // Allow right-drag select without opening menus when starting on empty page area
    if (!event.target.closest(CANDIDATE_SELECTOR) && !isEditorChrome(event.target)) {
      event.preventDefault();
    }
  }, true);

  const portfolio = document.querySelector(".portfolio-section");
  const addButton = document.createElement("button");
  addButton.type = "button";
  addButton.className = "admin-add-project-button";
  addButton.textContent = "＋ Add project";
  addButton.addEventListener("click", (event) => {
    event.stopPropagation();
    addPortfolioProject();
  });
  portfolio?.querySelector(".section-heading")?.append(addButton);

  const servicesSection = document.querySelector(".services-section");
  if (servicesSection && !servicesSection.querySelector(".admin-add-service-button")) {
    const addServiceBtn = document.createElement("button");
    addServiceBtn.type = "button";
    addServiceBtn.className = "admin-add-project-button admin-add-service-button";
    addServiceBtn.textContent = "＋ Add service card";
    addServiceBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      addService();
    });
    (servicesSection.querySelector(".section-heading") || servicesSection.querySelector(".page-width") || servicesSection)
      .append(addServiceBtn);
  }

  const filterNewCards = () => {
    const filter = document.querySelector(".filter-button.is-active")?.dataset.filter || "all";
    const customCards = [...document.querySelectorAll(".project-card[id^='project-custom-']")];
    customCards.forEach((card) => { card.hidden = filter !== "all" && card.dataset.category !== filter; });
  };
  document.querySelectorAll(".filter-button").forEach((button) => button.addEventListener("click", filterNewCards));

  assignContentIds();
  populateBlockTargets();
  let placementSyncTimer = 0;
  const syncPlacementFromViewport = () => {
    window.clearTimeout(placementSyncTimer);
    placementSyncTimer = window.setTimeout(() => {
      if (selected?.closest?.("main > section")) {
        syncBlockTarget(selected.closest("main > section"));
        return;
      }
      resolvePlacementSection({ preferSelectValue: false });
    }, 120);
  };
  window.addEventListener("scroll", syncPlacementFromViewport, { passive: true });
  document.addEventListener("cms-selection-changed", syncPlacementFromViewport);
  syncPlacementFromViewport();
  const ready = hydrateState().catch((error) => {
    setStatus(`Could not load editor data: ${error.message}`, "error");
    throw error;
  });
  // Export immediately so extensions boot even if later UI helpers throw.
  const editorApi = {
    get state() { return state; },
    get selected() { return selected; },
    get ready() { return ready; },
    byId,
    currentEdit,
    selectElement,
    forceCloseServiceDialog,
    syncSectionResizeHandle,
    applyStyle,
    applyTheme,
    assignContentIds,
    saveDraft,
    uploadFile,
    applyPhotoTemplate,
    photoTemplateSlotCount,
    setStatus,
    addProjectCard,
    renderSectionList,
    renderCustomPageList,
    addCustomPage,
    deleteCustomPage,
    addContentBlock,
    resolvePlacementSection,
    syncBlockTarget,
    applyImageResize,
    imageFrameFor,
    ensureImageCropFrame,
    buildPersistableState,
    setExtensionRenderer: (renderer) => { extensionRenderer = renderer; },
    undo: () => moveHistory(undoHistory, redoHistory),
    redo: () => moveHistory(redoHistory, undoHistory),
    snapValue,
    snapResizeDimensions,
    collectSizeGuides,
    equalGapSnap,
    clearSelection,
    setPreviewMode,
    renderBrandKitUi,
    toggleToolbar,
    addService,
    addServiceCard,
    deleteElements,
    deleteSelectedElements: deleteElements,
    resolveDeleteTarget,
    renderCardLists,
    removePageCard,
    renumberServiceCards,
    cardLabel,
    selectionKind,
    syncRelevantControls,
    applySectionMinHeight,
    isEditableLink,
    applyUniformSectionMargin,
    syncDialogImageToService,
    syncDialogTextToService,
    openServiceDialogForEdit,
    openProjectCaseStudyInEditor,
    ensureServiceCardDomId,
    resolveServiceCardFromSourceId,
    resolveServiceButtonFromSourceId,
    openFloatToolbar: (clientX, clientY) => {
      document.dispatchEvent(new CustomEvent("cms-open-float-toolbar", {
        detail: { clientX: clientX ?? window.innerWidth / 2, clientY: clientY ?? 120 },
      }));
    },
    closeFloatToolbar: () => {
      document.querySelectorAll(".admin-float-toolbar").forEach((node) => {
        node.hidden = true;
        node.style.display = "none";
      });
    },
  };
  // Keep a stable export that cannot be silently deleted by later scripts.
  let editorRef = editorApi;
  const bindEditor = (target) => {
    try {
      delete target.liamAdminEditor;
    } catch (_) { /* ignore */ }
    try {
      Object.defineProperty(target, "liamAdminEditor", {
        configurable: false,
        enumerable: true,
        get: () => editorRef,
        set: (value) => {
          if (value == null) {
            document.documentElement.dataset.adminExportCleared = "1";
            return;
          }
          editorRef = value;
        },
      });
    } catch (_) {
      try {
        target.liamAdminEditor = editorApi;
      } catch (_) { /* ignore */ }
    }
  };
  bindEditor(window);
  bindEditor(document);
  bindEditor(globalThis);
  // Backup handle for automation / later scripts if a host deletes the window binding.
  try {
    Object.defineProperty(document.documentElement, "__liamAdminEditor", {
      configurable: false,
      enumerable: false,
      get: () => editorRef,
    });
  } catch (_) {
    document.documentElement.__liamAdminEditor = editorApi;
  }
  document.documentElement.dataset.adminExported = "1";
  document.documentElement.dataset.adminExportOk = window.liamAdminEditor === editorApi ? "1" : "0";
  try {
    renderVersionList();
  } catch (error) {
    console.error("Version history UI failed to initialize.", error);
  }
  let imageResizeTimer;
  window.addEventListener("resize", () => {
    window.clearTimeout(imageResizeTimer);
    imageResizeTimer = window.setTimeout(() => {
      Object.entries(state.edits || {}).forEach(([id, edit]) => {
        const image = document.querySelector(`img[data-cms-id="${CSS.escape(id)}"]`);
        const legacyResize = edit.styles?.width && edit.styles?.height
          ? { width: edit.styles.width, height: edit.styles.height, offsetX: edit.styles.left, offsetY: edit.styles.top }
          : null;
        if (image && (edit.resize || legacyResize)) applyImageResize(image, edit.resize || legacyResize);
      });
    }, 100);
  });
})();
