(() => {
  const wait = () => new Promise((resolve) => {
    const tick = () => (window.liamAdminEditor?.byId ? resolve(window.liamAdminEditor) : setTimeout(tick, 40));
    tick();
  });

  wait().then((editor) => {
    const byId = (id) => document.getElementById(id);
    const state = editor.state;
    state.mediaLibrary ||= { folders: { Inbox: [] }, activeFolder: "Inbox" };
    state.siteChrome ||= { headerHtml: "", footerHtml: "", pageHeight: null };
    state.analytics ||= { ga4: "" };
    state.bookings ||= [];

    /* ---------- Floating right-click toolbar ---------- */
    const float = document.createElement("div");
    float.className = "admin-float-toolbar";
    float.dataset.cmsControl = "true";
    float.hidden = true;
    float.innerHTML = `
      <header class="admin-float-header" data-float-drag="true">
        <strong>Edit tools</strong>
        <button type="button" id="admin-float-close" aria-label="Close edit tools">×</button>
      </header>
      <p class="admin-float-close-hint">Close only with × — this panel stays open until you dismiss it.</p>
      <div class="admin-float-body">
        <label class="admin-float-lock" data-for="any"><input type="checkbox" id="admin-float-lock-checkbox"> Locked</label>
        <label class="admin-float-lock" data-for="any"><input type="checkbox" id="admin-float-lock-parent-checkbox"> Parent locked</label>
        <div class="admin-float-row" data-for="text">
          <button type="button" data-float="bold"><b>B</b></button>
          <button type="button" data-float="italic"><i>I</i></button>
          <button type="button" data-float="underline"><u>U</u></button>
          <button type="button" data-float="bullet">• List</button>
          <button type="button" data-float="shadow">Shadow</button>
          <button type="button" data-float="echo">Echo</button>
        </div>
        <div class="admin-float-row" data-for="text">
          <label>Font<select id="admin-float-font">
            <option value="inherit">Default</option>
            <option value="Georgia, serif">Georgia</option>
            <option value="Arial, sans-serif">Arial</option>
            <option value="custom">Imported</option>
          </select></label>
          <label>Size<input id="admin-float-size" type="number" min="8" max="300" step="1"></label>
        </div>
        <div class="admin-float-row" data-for="text">
          <label>Spacing<input id="admin-float-letter" type="number" step="0.1"></label>
          <label>Line<input id="admin-float-line" type="number" step="0.05"></label>
          <label>BG<input id="admin-float-bg" type="color" value="#f4f2e9"></label>
          <label>Color<input id="admin-float-color" type="color" value="#172019"></label>
        </div>
        <div class="admin-float-row" data-for="media,shape,block">
          <label>X<input id="admin-float-x" type="number"></label>
          <label>Y<input id="admin-float-y" type="number"></label>
          <label>W<input id="admin-float-w" type="number"></label>
          <label>H<input id="admin-float-h" type="number"></label>
        </div>
        <div class="admin-float-row" data-for="section">
          <label>Section length<input id="admin-float-section-height" type="number" min="120" max="4000" step="10"></label>
          <button type="button" data-float="section-taller">＋ Longer</button>
          <button type="button" data-float="section-shorter">− Shorter</button>
        </div>
        <div class="admin-float-row" data-for="media">
          <button type="button" data-float="replace">Replace</button>
          <button type="button" data-float="resize">Resize</button>
          <button type="button" data-float="recolor">Recolor</button>
          <label>Tint<input id="admin-float-tint" type="color" value="#1A2B49"></label>
        </div>
        <div class="admin-float-row" data-for="image">
          <button type="button" data-float="crop">Crop</button>
        </div>
        <small data-for="media">Resize stays off until you click it. Replace uploads a new photo or video.</small>
        <small data-for="image">Crop tip: drag to pan focus; scroll wheel zooms crop; use axis sliders in Design tools.</small>
        <div class="admin-float-row" data-for="any">
          <button type="button" data-float="duplicate">Duplicate</button>
          <button type="button" data-float="group">Group</button>
          <button type="button" data-float="front">Front</button>
          <button type="button" data-float="back">Back</button>
          <button type="button" data-float="delete">Delete</button>
        </div>
        <small data-for="section">Drag the gold handle on the section, or use Section length here.</small>
      </div>
    `;
    document.body.append(float);

    let floatDrag = null;
    const closeFloat = () => {
      float.hidden = true;
      float.style.display = "none";
    };

    const chromeRects = () => {
      const rects = [];
      document.querySelectorAll(".admin-toolbar, .admin-properties, .admin-rail").forEach((node) => {
        if (node.hidden || node.getClientRects?.().length === 0) return;
        rects.push(node.getBoundingClientRect());
      });
      return rects;
    };

    const overlapsRect = (left, top, width, height, pad = 12) => {
      const box = { left: left - pad, top: top - pad, right: left + width + pad, bottom: top + height + pad };
      return chromeRects().some((rect) =>
        box.left < rect.right && box.right > rect.left && box.top < rect.bottom && box.bottom > rect.top);
    };

    const placeFloat = (preferredX, preferredY) => {
      const width = Math.min(320, window.innerWidth - 16);
      const height = Math.min(float.offsetHeight || 280, window.innerHeight - 24);
      const props = document.querySelector(".admin-properties");
      const rail = document.querySelector(".admin-rail") || document.querySelector(".admin-toolbar");
      const rightLimit = props && !props.hidden
        ? Math.max(16, props.getBoundingClientRect().left - width - 16)
        : window.innerWidth - width - 8;
      const leftLimit = rail && !rail.hidden
        ? Math.min(rightLimit, rail.getBoundingClientRect().right + 12)
        : 8;
      let left = Math.max(leftLimit, Math.min(preferredX, rightLimit));
      let top = Math.max(8, Math.min(preferredY, window.innerHeight - height - 8));
      if (overlapsRect(left, top, width, height)) {
        left = Math.max(8, Math.min(leftLimit, rightLimit));
        top = Math.max(8, Math.min(120, window.innerHeight - height - 8));
      }
      if (overlapsRect(left, top, width, height)) {
        left = 16;
        top = 72;
      }
      float.style.left = `${left}px`;
      float.style.top = `${top}px`;
      float.style.right = "auto";
    };

    float.querySelector("[data-float-drag]")?.addEventListener("pointerdown", (event) => {
      // Close button lives in the drag header — never start a drag from it.
      if (event.target.closest("#admin-float-close, button")) return;
      const rect = float.getBoundingClientRect();
      floatDrag = { x: event.clientX, y: event.clientY, left: rect.left, top: rect.top };
      event.currentTarget.setPointerCapture(event.pointerId);
    });
    float.querySelector("[data-float-drag]")?.addEventListener("pointermove", (event) => {
      if (!floatDrag) return;
      const nextLeft = floatDrag.left + event.clientX - floatDrag.x;
      const nextTop = floatDrag.top + event.clientY - floatDrag.y;
      placeFloat(nextLeft, nextTop);
    });
    float.querySelector("[data-float-drag]")?.addEventListener("pointerup", () => { floatDrag = null; });
    byId("admin-float-close").addEventListener("pointerdown", (event) => {
      event.preventDefault();
      event.stopPropagation();
      closeFloat();
    });
    byId("admin-float-close").addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      closeFloat();
    });
    // Intentionally no outside-click / Escape close — × is the only dismiss path.

    const syncFloat = () => {
      const selected = editor.selected;
      if (!selected) {
        float.querySelectorAll("[data-for]").forEach((node) => { node.hidden = true; });
        return;
      }
      const edit = state.edits[selected.dataset.cmsId] || {};
      const kind = editor.selectionKind?.(selected)
        || (selected.tagName === "SECTION" ? "section"
          : (selected instanceof HTMLImageElement || selected instanceof HTMLVideoElement) ? "media"
            : selected.matches?.("h1,h2,h3,h4,p,a,span,button,li,.brand-name,.section-number") ? "text"
              : "any");
      const tokens = new Set([kind, "any"]);
      if (kind === "link") tokens.add("text");
      if (kind === "media" && selected instanceof HTMLImageElement) tokens.add("image");
      float.querySelectorAll("[data-for]").forEach((node) => {
        const allowed = String(node.getAttribute("data-for") || "")
          .split(",")
          .map((part) => part.trim())
          .filter(Boolean);
        const show = allowed.some((token) => tokens.has(token));
        node.hidden = !show;
      });
      byId("admin-float-lock-checkbox").checked = Boolean(edit.locked);
      if (byId("admin-lock-checkbox")) byId("admin-lock-checkbox").checked = Boolean(edit.locked);
      const parent = selected.parentElement?.closest?.("[data-cms-id]");
      const parentLock = byId("admin-float-lock-parent-checkbox");
      if (parentLock) {
        parentLock.checked = Boolean(parent && state.edits[parent.dataset.cmsId]?.locked);
        parentLock.disabled = !parent;
      }
      byId("admin-float-size").value = edit.styles?.fontSize || "";
      byId("admin-float-letter").value = edit.styles?.letterSpacing || "";
      byId("admin-float-line").value = edit.styles?.lineHeight || "";
      byId("admin-float-color").value = edit.styles?.color || "#172019";
      byId("admin-float-bg").value = edit.styles?.backgroundColor || "#f4f2e9";
      byId("admin-float-font").value = edit.styles?.fontFamily || "inherit";
      byId("admin-float-x").value = edit.resize?.offsetX ?? edit.styles?.left ?? "";
      byId("admin-float-y").value = edit.resize?.offsetY ?? edit.styles?.top ?? "";
      byId("admin-float-w").value = edit.resize?.width ?? edit.styles?.width ?? "";
      byId("admin-float-h").value = edit.resize?.height ?? edit.styles?.height ?? "";
      const sectionHeight = byId("admin-float-section-height");
      if (sectionHeight) {
        sectionHeight.value = edit.styles?.minHeight
          || Math.round(selected.getBoundingClientRect?.().height || 0)
          || "";
      }
    };

    const openFloat = (clientX, clientY) => {
      if (!editor.selected) {
        editor.setStatus?.("Select something on the page first, then open Edit tools.", "error");
        return;
      }
      float.hidden = false;
      float.removeAttribute("hidden");
      float.style.display = "grid";
      float.style.visibility = "visible";
      float.style.opacity = "1";
      float.style.pointerEvents = "auto";
      float.style.zIndex = "10060";
      syncFloat();
      // Measure after content visibility changes, then park clear of sidebars.
      window.requestAnimationFrame(() => placeFloat(clientX ?? 40, clientY ?? 120));
    };
    document.addEventListener("cms-selection-changed", () => {
      if (!float.hidden) syncFloat();
    });
    editor.openFloatToolbar = openFloat;
    document.addEventListener("cms-open-float-toolbar", (event) => {
      const { clientX = 40, clientY = 120, element } = event.detail || {};
      if (element) editor.selectElement(element);
      openFloat(clientX, clientY);
    });
    // Fallback: double-click media anywhere opens the float toolbar even if admin.js missed it.
    document.addEventListener("dblclick", (event) => {
      if (!document.body.classList.contains("cms-administrator")) return;
      if (event.target.closest(".admin-toolbar, .admin-properties, .admin-rail, .admin-float-toolbar")) return;
      const media = event.target.closest("img, video")
        || event.target.closest(".project-image-wrap, .service-image-wrap, .about-image-wrap, .featured-image, .dialog-image")?.querySelector("img, video");
      if (!media) return;
      event.preventDefault();
      event.stopPropagation();
      editor.selectElement(media);
      openFloat(event.clientX, event.clientY);
    }, true);

    // Do NOT auto-open Edit tools on single-click — it blocked service card editing.
    // Double-click (above) and right-click (below) still open the float toolbar.
    editor.closeFloatToolbar = closeFloat;

    document.addEventListener("contextmenu", (event) => {
      if (!document.body.classList.contains("cms-administrator")) return;
      if (event.target.closest(".admin-toolbar, .admin-properties, .admin-float-toolbar, .admin-rail")) return;
      const target = event.target.closest("[data-cms-id]");
      if (!target) return;
      event.preventDefault();
      event.stopPropagation();
      editor.selectElement(target);
      openFloat(event.clientX, event.clientY);
    }, true);

    const applyLockFromCheckbox = (checked) => {
      if (!editor.selected) return;
      state.edits[editor.selected.dataset.cmsId] ||= { styles: {} };
      state.edits[editor.selected.dataset.cmsId].locked = checked;
      editor.selected.classList.toggle("cms-editor-locked", checked);
      byId("admin-lock").textContent = checked ? "Unlock" : "Lock";
      if (byId("admin-lock-checkbox")) byId("admin-lock-checkbox").checked = checked;
      if (byId("admin-float-lock-checkbox")) byId("admin-float-lock-checkbox").checked = checked;
      editor.saveDraft();
    };
    byId("admin-float-lock-checkbox").addEventListener("change", (event) => applyLockFromCheckbox(event.currentTarget.checked));
    byId("admin-lock-checkbox")?.addEventListener("change", (event) => applyLockFromCheckbox(event.currentTarget.checked));
    byId("admin-float-lock-parent-checkbox").addEventListener("change", (event) => {
      const parent = editor.selected?.parentElement?.closest?.("[data-cms-id]");
      if (!parent) return;
      state.edits[parent.dataset.cmsId] ||= { styles: {} };
      state.edits[parent.dataset.cmsId].locked = event.currentTarget.checked;
      parent.classList.toggle("cms-editor-locked", event.currentTarget.checked);
      if (byId("admin-lock-parent-checkbox")) byId("admin-lock-parent-checkbox").checked = event.currentTarget.checked;
      editor.saveDraft();
    });
    byId("admin-lock-parent-checkbox")?.addEventListener("change", (event) => {
      byId("admin-float-lock-parent-checkbox").checked = event.currentTarget.checked;
      byId("admin-float-lock-parent-checkbox").dispatchEvent(new Event("change"));
    });

    float.addEventListener("click", (event) => {
      const action = event.target.closest("[data-float]")?.dataset.float;
      if (!action || !editor.selected) return;
      const map = {
        bold: () => byId("admin-bold")?.click(),
        italic: () => byId("admin-italic")?.click(),
        underline: () => byId("admin-underline")?.click(),
        shadow: () => byId("admin-shadow")?.click(),
        duplicate: () => byId("admin-duplicate")?.click(),
        group: () => byId("admin-group")?.click(),
        front: () => byId("admin-send-to-front")?.click(),
        back: () => byId("admin-send-to-back")?.click(),
        delete: () => byId("admin-delete")?.click(),
        replace: () => {
          const button = document.getElementById("admin-replace-media");
          if (!button || button.disabled || button.classList.contains("admin-relevant-hidden")) {
            editor.setStatus("Select an image or video before replacing media.", "error");
            return;
          }
          button.click();
        },
        crop: () => {
          let media = editor.selected;
          if (!(media instanceof HTMLImageElement)) {
            media = media?.closest?.(".project-image-wrap, .service-image-wrap, .about-image-wrap, .featured-image, .dialog-image")?.querySelector("img")
              || media?.querySelector?.("img")
              || document.getElementById("dialog-image");
            if (media) editor.selectElement(media);
          }
          if (!(media instanceof HTMLImageElement)) {
            editor.setStatus("Crop works on images only. Select a photo first.", "error");
            return;
          }
          if (typeof editor.setImageTool === "function") editor.setImageTool("crop");
          else {
            const button = document.getElementById("editor-image-crop-mode");
            if (button) { button.disabled = false; button.click(); }
          }
          editor.setStatus("Crop mode: drag to pan, scroll to zoom, use axis sliders.");
        },
        resize: () => {
          let media = editor.selected;
          if (!(media instanceof HTMLImageElement || media instanceof HTMLVideoElement)) {
            media = media?.closest?.(".project-image-wrap, .service-image-wrap, .about-image-wrap, .featured-image")?.querySelector("img, video")
              || media?.querySelector?.("img, video");
            if (media) editor.selectElement(media);
          }
          if (!(media instanceof HTMLImageElement || media instanceof HTMLVideoElement)) {
            editor.setStatus("Select an image or video first to resize it.", "error");
            return;
          }
          if (typeof editor.setImageTool === "function") {
            editor.setImageTool("resize");
          } else {
            const button = document.getElementById("editor-image-resize-mode");
            if (button) {
              button.disabled = false;
              button.click();
            }
          }
          // Fallback: nudge size via numeric fields so Resize always does something visible.
          if (media instanceof HTMLImageElement || media instanceof HTMLVideoElement) {
            const bounds = (editor.imageFrameFor?.(media) || media).getBoundingClientRect();
            const edit = state.edits[media.dataset.cmsId] ||= { styles: {} };
            edit.resize = {
              width: Math.round(edit.resize?.width || bounds.width || 400),
              height: Math.round(edit.resize?.height || bounds.height || 300),
              offsetX: edit.resize?.offsetX || 0,
              offsetY: edit.resize?.offsetY || 0,
            };
            editor.applyImageResize?.(media, edit.resize);
            if (byId("admin-width")) byId("admin-width").value = edit.resize.width;
            if (byId("admin-height")) byId("admin-height").value = edit.resize.height;
            editor.saveDraft();
          }
          editor.setStatus("Resize mode: drag the yellow handles around the image.");
        },
        recolor: () => {
          if (!(editor.selected instanceof HTMLImageElement || editor.selected instanceof HTMLVideoElement)) {
            editor.setStatus("Recolor applies to images and videos.", "error");
            return;
          }
          const tint = byId("admin-float-tint").value;
          const edit = state.edits[editor.selected.dataset.cmsId] ||= { styles: {} };
          edit.styles ||= {};
          edit.styles.filter = "contrast(1.08) saturate(1.2)";
          edit.styles.borderColor = tint;
          edit.styles.borderWidth = 3;
          editor.applyStyle?.(editor.selected, edit.styles);
          editor.saveDraft();
        },
        echo: () => {
          const kind = editor.selectionKind?.(editor.selected);
          if (kind !== "text" && kind !== "link") {
            editor.setStatus("Echo shadow applies to text.", "error");
            return;
          }
          const edit = state.edits[editor.selected.dataset.cmsId] ||= { styles: {} };
          edit.styles ||= {};
          edit.styles.textShadow = "echo";
          editor.applyStyle?.(editor.selected, edit.styles);
          editor.saveDraft();
        },
        bullet: () => {
          const selected = editor.selected;
          const kind = editor.selectionKind?.(selected);
          if (!selected || (kind !== "text" && kind !== "link")) {
            editor.setStatus("List formatting applies to text.", "error");
            return;
          }
          const edit = state.edits[selected.dataset.cmsId] ||= { styles: {} };
          const lines = selected.textContent.split(/\n+/).map((line) => line.replace(/^[•\-]\s*/, "").trim()).filter(Boolean);
          edit.text = lines.map((line) => `• ${line}`).join("\n");
          selected.textContent = edit.text;
          selected.style.whiteSpace = "pre-line";
          editor.saveDraft();
        },
        "section-taller": () => {
          const section = editor.selected?.tagName === "SECTION" ? editor.selected : editor.selected?.closest?.("main > section");
          if (!section) return;
          const current = Number(state.edits[section.dataset.cmsId]?.styles?.minHeight)
            || Math.round(section.getBoundingClientRect().height || 400);
          editor.applySectionMinHeight?.(section, current + 80);
          editor.selectElement(section);
        },
        "section-shorter": () => {
          const section = editor.selected?.tagName === "SECTION" ? editor.selected : editor.selected?.closest?.("main > section");
          if (!section) return;
          const current = Number(state.edits[section.dataset.cmsId]?.styles?.minHeight)
            || Math.round(section.getBoundingClientRect().height || 400);
          editor.applySectionMinHeight?.(section, Math.max(120, current - 80));
          editor.selectElement(section);
        },
      };
      map[action]?.();
      syncFloat();
    });
    byId("admin-float-section-height")?.addEventListener("input", (event) => {
      const section = editor.selected?.tagName === "SECTION" ? editor.selected : editor.selected?.closest?.("main > section");
      if (!section) return;
      editor.applySectionMinHeight?.(section, Number(event.currentTarget.value));
    });

    const bindFloatField = (id, apply) => {
      byId(id)?.addEventListener("input", (event) => {
        if (!editor.selected) return;
        apply(event.currentTarget.value);
        editor.saveDraft();
      });
    };
    bindFloatField("admin-float-font", (value) => {
      const edit = state.edits[editor.selected.dataset.cmsId] ||= { styles: {} };
      edit.styles.fontFamily = value;
      editor.applyStyle(editor.selected, edit.styles);
    });
    bindFloatField("admin-float-size", (value) => {
      const edit = state.edits[editor.selected.dataset.cmsId] ||= { styles: {} };
      edit.styles.fontSize = Number(value);
      editor.applyStyle(editor.selected, edit.styles);
      byId("admin-font-size").value = value;
    });
    bindFloatField("admin-float-letter", (value) => {
      const edit = state.edits[editor.selected.dataset.cmsId] ||= { styles: {} };
      edit.styles.letterSpacing = Number(value);
      editor.applyStyle(editor.selected, edit.styles);
    });
    bindFloatField("admin-float-line", (value) => {
      const edit = state.edits[editor.selected.dataset.cmsId] ||= { styles: {} };
      edit.styles.lineHeight = Number(value);
      editor.applyStyle(editor.selected, edit.styles);
    });
    bindFloatField("admin-float-color", (value) => {
      byId("admin-color").value = value;
      byId("admin-color").dispatchEvent(new Event("input", { bubbles: true }));
    });
    bindFloatField("admin-float-bg", (value) => {
      byId("admin-background").value = value;
      byId("admin-background").dispatchEvent(new Event("input", { bubbles: true }));
    });
    ["admin-float-x", "admin-float-y", "admin-float-w", "admin-float-h"].forEach((id) => {
      byId(id)?.addEventListener("input", () => {
        const selected = editor.selected;
        if (!selected) return;
        const edit = state.edits[selected.dataset.cmsId] ||= { styles: {} };
        const x = Number(byId("admin-float-x").value);
        const y = Number(byId("admin-float-y").value);
        const w = Number(byId("admin-float-w").value);
        const h = Number(byId("admin-float-h").value);
        if (selected instanceof HTMLImageElement || selected instanceof HTMLVideoElement) {
          const frame = editor.imageFrameFor(selected);
          const rect = frame.getBoundingClientRect();
          edit.resize = {
            width: Number.isFinite(w) && w > 0 ? w : rect.width,
            height: Number.isFinite(h) && h > 0 ? h : rect.height,
            offsetX: Number.isFinite(x) ? x : 0,
            offsetY: Number.isFinite(y) ? y : 0,
          };
          editor.applyImageResize(selected, edit.resize);
        } else {
          if (Number.isFinite(x)) edit.styles.left = x;
          if (Number.isFinite(y)) edit.styles.top = y;
          if (Number.isFinite(w)) edit.styles.width = w;
          if (Number.isFinite(h)) edit.styles.height = h;
          editor.applyStyle(selected, edit.styles);
        }
        editor.saveDraft();
      });
    });

    /* ---------- Crop scroll zoom + axis ---------- */
    document.addEventListener("wheel", (event) => {
      if (!document.body.classList.contains("cms-crop-mode")) return;
      const image = editor.selected;
      if (!(image instanceof HTMLImageElement)) return;
      event.preventDefault();
      editor.ensureImageCropFrame?.(image);
      const edit = state.edits[image.dataset.cmsId] ||= { styles: {} };
      const zoom = Math.max(100, Math.min(220, Number(edit.crop?.zoom || 100) + (event.deltaY < 0 ? 8 : -8)));
      edit.crop = {
        fit: edit.crop?.fit || "cover",
        x: Number(edit.crop?.x ?? 50),
        y: Number(edit.crop?.y ?? 50),
        zoom,
      };
      image.style.objectFit = edit.crop.fit;
      image.style.objectPosition = `${edit.crop.x}% ${edit.crop.y}%`;
      image.style.transform = zoom === 100 ? "" : `scale(${zoom / 100})`;
      editor.saveDraft();
    }, { passive: false });

    const axisWrap = document.createElement("div");
    axisWrap.className = "admin-crop-axis";
    axisWrap.dataset.cmsControl = "true";
    axisWrap.innerHTML = `
      <label>Crop X axis <input id="admin-crop-axis-x" type="range" min="0" max="100" value="50"></label>
      <label>Crop Y axis <input id="admin-crop-axis-y" type="range" min="0" max="100" value="50"></label>
      <label>Crop zoom <input id="admin-crop-axis-zoom" type="range" min="100" max="220" value="100"></label>
    `;
    document.body.append(axisWrap);
    const syncAxisVisibility = () => {
      axisWrap.classList.toggle("is-visible", document.body.classList.contains("cms-crop-mode") && editor.selected instanceof HTMLImageElement);
      if (!(editor.selected instanceof HTMLImageElement)) return;
      const crop = state.edits[editor.selected.dataset.cmsId]?.crop || {};
      byId("admin-crop-axis-x").value = crop.x ?? 50;
      byId("admin-crop-axis-y").value = crop.y ?? 50;
      byId("admin-crop-axis-zoom").value = crop.zoom ?? 100;
    };
    ["admin-crop-axis-x", "admin-crop-axis-y", "admin-crop-axis-zoom"].forEach((id) => {
      byId(id).addEventListener("input", () => {
        const image = editor.selected;
        if (!(image instanceof HTMLImageElement)) return;
        editor.ensureImageCropFrame?.(image);
        const edit = state.edits[image.dataset.cmsId] ||= { styles: {} };
        const zoom = Math.max(100, Math.min(220, Number(byId("admin-crop-axis-zoom").value) || 100));
        edit.crop = {
          fit: edit.crop?.fit || "cover",
          x: Number(byId("admin-crop-axis-x").value),
          y: Number(byId("admin-crop-axis-y").value),
          zoom,
        };
        image.style.objectFit = edit.crop.fit;
        image.style.objectPosition = `${edit.crop.x}% ${edit.crop.y}%`;
        image.style.transform = zoom === 100 ? "" : `scale(${zoom / 100})`;
        editor.saveDraft();
      });
    });

    /* ---------- Uploads library with folders ---------- */
    const uploadsPanel = document.querySelector('[data-rail-panel="uploads"]') || document.querySelector(".admin-panel-host");
    const library = document.createElement("div");
    library.className = "admin-media-library";
    library.innerHTML = `
      <h3>Uploads library</h3>
      <div class="admin-button-row">
        <button type="button" id="admin-lib-upload">Upload files</button>
        <button type="button" id="admin-lib-folder">New folder</button>
      </div>
      <label>Folder<select id="admin-lib-folder-select"></select></label>
      <div id="admin-lib-grid" class="admin-lib-grid"></div>
      <input id="admin-lib-files" type="file" accept="image/*,video/mp4,video/webm" multiple hidden>
    `;
    uploadsPanel?.append(library);

    const refreshLibrary = async () => {
      try {
        const response = await fetch("/api/media-library", { cache: "no-store" });
        if (response.ok) {
          const payload = await response.json();
          state.mediaLibrary = payload.library || state.mediaLibrary;
        }
      } catch (_) { /* offline/public preview */ }
      state.mediaLibrary.folders ||= { Inbox: [] };
      state.mediaLibrary.activeFolder ||= Object.keys(state.mediaLibrary.folders)[0] || "Inbox";
      const select = byId("admin-lib-folder-select");
      const grid = byId("admin-lib-grid");
      if (!select || !grid) return;
      select.replaceChildren(...Object.keys(state.mediaLibrary.folders).map((name) => {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        if (name === state.mediaLibrary.activeFolder) option.selected = true;
        return option;
      }));
      const placeUploadOnPage = (item, clientX, clientY, { replaceSelected = false } = {}) => {
        const isVideo = /\.(mp4|webm)$/i.test(item.url || "");
        const dropTarget = clientX != null ? document.elementFromPoint(clientX, clientY) : null;
        const dropOnSelectedMedia = replaceSelected
          || (dropTarget && editor.selected && (dropTarget === editor.selected || editor.selected.contains?.(dropTarget)));
        if (dropOnSelectedMedia && (editor.selected instanceof HTMLImageElement || editor.selected instanceof HTMLVideoElement)) {
          const edit = state.edits[editor.selected.dataset.cmsId] ||= { styles: {} };
          edit.media = item.url;
          editor.selected.src = item.url;
          if (editor.selected instanceof HTMLVideoElement) editor.selected.load();
          editor.saveDraft();
          editor.setStatus("Media replaced from uploads library.");
          return;
        }
        const section = dropTarget?.closest?.("main > section")
          || editor.resolvePlacementSection?.()
          || document.getElementById(byId("admin-block-target")?.value || "")
          || document.querySelector("main > section");
        if (!section) {
          editor.setStatus("Scroll to a page section before dropping media.", "error");
          return;
        }
        editor.syncBlockTarget?.(section);
        const block = {
          id: `content-block-${crypto.randomUUID()}`,
          type: isVideo ? "video" : "image",
          sectionId: section.id || "work",
          image: item.url,
          src: item.url,
          alt: (item.name || "Upload").replace(/\.[^.]+$/, ""),
          text: "",
        };
        state.contentBlocks ||= [];
        state.contentBlocks.push(block);
        editor.addContentBlock?.(block);
        editor.assignContentIds?.();
        const placed = document.querySelector(`[data-cms-id="${CSS.escape(block.id)}-image"]`)
          || document.querySelector(`[data-cms-id="${CSS.escape(block.id)}"]`);
        if (placed && clientX != null && clientY != null) {
          const sectionRect = section.getBoundingClientRect();
          const edit = state.edits[placed.dataset.cmsId] ||= { styles: {} };
          const offsetX = Math.round(clientX - sectionRect.left - 160);
          const offsetY = Math.round(clientY - sectionRect.top - 110);
          if (placed instanceof HTMLImageElement || placed instanceof HTMLVideoElement) {
            edit.resize = { width: 320, height: 220, offsetX, offsetY };
            editor.applyImageResize?.(placed, edit.resize);
          } else {
            edit.styles.left = offsetX;
            edit.styles.top = offsetY;
            editor.applyStyle?.(placed, edit.styles);
          }
          editor.selectElement?.(placed);
        } else if (placed) {
          editor.selectElement?.(placed);
        }
        editor.saveDraft();
        editor.setStatus("Upload placed on the page. Drag to fine-tune position.");
      };

      const parseUploadPayload = (dataTransfer) => {
        if (!dataTransfer) return null;
        const raw = dataTransfer.getData("application/x-cms-upload")
          || dataTransfer.getData("text/plain")
          || "";
        if (raw) {
          try { return JSON.parse(raw); } catch (_) { /* fall through */ }
        }
        const uri = dataTransfer.getData("text/uri-list") || dataTransfer.getData("text/uri-list".toLowerCase()) || "";
        if (uri && /^\/uploads\//.test(uri.split("\n")[0])) {
          return { url: uri.split("\n")[0].trim(), name: uri.split("/").pop() };
        }
        return null;
      };
      const isUploadDrag = (dataTransfer) => {
        if (window.__cmsUploadDragItem) return true;
        const types = [...(dataTransfer?.types || [])].map(String);
        return types.some((type) =>
          type === "application/x-cms-upload"
          || type === "text/plain"
          || type === "text/uri-list");
      };

      const items = state.mediaLibrary.folders[state.mediaLibrary.activeFolder] || [];
      grid.replaceChildren(...items.map((item) => {
        const card = document.createElement("div");
        card.className = "admin-lib-card";
        card.draggable = true;
        card.tabIndex = 0;
        card.setAttribute("role", "button");
        card.title = `${item.name || item.url} — drag onto the page or click to place`;
        card.dataset.uploadUrl = item.url;
        card.dataset.uploadName = item.name || "";
        if (/\.(mp4|webm)$/i.test(item.url)) card.textContent = "🎬 " + (item.name || "Video");
        else {
          const img = document.createElement("img");
          img.src = item.url;
          img.alt = item.name || "";
          img.draggable = false;
          card.append(img);
        }
        let nativeDragStarted = false;
        card.addEventListener("dragstart", (event) => {
          nativeDragStarted = true;
          window.__cmsUploadDragItem = item;
          const payload = JSON.stringify(item);
          event.dataTransfer.setData("application/x-cms-upload", payload);
          event.dataTransfer.setData("text/plain", payload);
          event.dataTransfer.setData("text/uri-list", item.url);
          event.dataTransfer.effectAllowed = "copy";
          card.classList.add("is-dragging");
        });
        card.addEventListener("dragend", () => {
          nativeDragStarted = false;
          window.__cmsUploadDragItem = null;
          card.classList.remove("is-dragging");
          document.body.classList.remove("cms-upload-drop-target");
        });
        // Pointer drag works even when HTML5 DnD from the sidebar is blocked
        card.addEventListener("pointerdown", (event) => {
          if (event.button !== 0) return;
          nativeDragStarted = false;
          const start = { x: event.clientX, y: event.clientY, moved: false };
          const onMove = (moveEvent) => {
            if (nativeDragStarted) return;
            if (Math.hypot(moveEvent.clientX - start.x, moveEvent.clientY - start.y) < 8) return;
            start.moved = true;
            window.__cmsUploadDragItem = item;
            document.body.classList.add("cms-upload-drop-target");
            moveEvent.preventDefault();
          };
          const onUp = (upEvent) => {
            document.removeEventListener("pointermove", onMove, true);
            document.removeEventListener("pointerup", onUp, true);
            document.body.classList.remove("cms-upload-drop-target");
            if (nativeDragStarted) return;
            const dragging = window.__cmsUploadDragItem;
            window.__cmsUploadDragItem = null;
            if (!start.moved) {
              placeUploadOnPage(item);
              return;
            }
            if (!dragging) return;
            if (upEvent.target.closest?.(".admin-toolbar, .admin-properties, .admin-rail, .admin-float-toolbar")) return;
            placeUploadOnPage(dragging, upEvent.clientX, upEvent.clientY);
          };
          document.addEventListener("pointermove", onMove, true);
          document.addEventListener("pointerup", onUp, true);
        });
        return card;
      }));
      if (!document.body.dataset.cmsUploadDropBound) {
        document.body.dataset.cmsUploadDropBound = "true";
        document.addEventListener("dragover", (event) => {
          if (!isUploadDrag(event.dataTransfer)) return;
          if (event.target.closest(".admin-toolbar, .admin-properties, .admin-rail, .admin-float-toolbar")) return;
          event.preventDefault();
          event.dataTransfer.dropEffect = "copy";
          document.body.classList.add("cms-upload-drop-target");
        });
        document.addEventListener("dragleave", (event) => {
          if (event.relatedTarget && document.body.contains(event.relatedTarget)) return;
          document.body.classList.remove("cms-upload-drop-target");
        });
        document.addEventListener("drop", (event) => {
          document.body.classList.remove("cms-upload-drop-target");
          const item = parseUploadPayload(event.dataTransfer) || window.__cmsUploadDragItem;
          window.__cmsUploadDragItem = null;
          if (!item) return;
          if (event.target.closest(".admin-toolbar, .admin-properties, .admin-rail, .admin-float-toolbar")) return;
          event.preventDefault();
          try {
            placeUploadOnPage(item, event.clientX, event.clientY);
          } catch (_) {
            editor.setStatus("Could not place that upload on the page.", "error");
          }
        });
      }
    };
    byId("admin-lib-folder-select")?.addEventListener("change", (event) => {
      state.mediaLibrary.activeFolder = event.currentTarget.value;
      refreshLibrary();
    });
    byId("admin-lib-folder")?.addEventListener("click", async () => {
      const name = window.prompt("Folder name");
      if (!name?.trim()) return;
      const folder = name.trim().slice(0, 40);
      state.mediaLibrary.folders[folder] ||= [];
      state.mediaLibrary.activeFolder = folder;
      await fetch("/api/media-library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ library: state.mediaLibrary }),
      }).catch(() => {});
      editor.saveDraft();
      refreshLibrary();
    });
    byId("admin-lib-upload")?.addEventListener("click", () => byId("admin-lib-files")?.click());
    byId("admin-lib-files")?.addEventListener("change", async (event) => {
      const files = [...(event.currentTarget.files || [])];
      for (const file of files) {
        const uploaded = await editor.uploadFile(file);
        const folder = state.mediaLibrary.activeFolder || "Inbox";
        state.mediaLibrary.folders[folder] ||= [];
        state.mediaLibrary.folders[folder].push({
          url: uploaded.url,
          name: file.name,
          type: file.type,
          addedAt: Date.now(),
        });
      }
      await fetch("/api/media-library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ library: state.mediaLibrary }),
      }).catch(() => {});
      editor.saveDraft();
      refreshLibrary();
      event.currentTarget.value = "";
      editor.setStatus("Files added to uploads library.");
    });

    /* ---------- Shapes + video insert ---------- */
    const elementsPanel = document.querySelector('[data-rail-panel="elements"]');
    const shapes = document.createElement("div");
    shapes.className = "admin-shape-library";
    shapes.innerHTML = `
      <h3>Basic shapes</h3>
      <div class="admin-button-row">
        <button type="button" data-shape="rectangle">Rectangle</button>
        <button type="button" data-shape="circle">Circle</button>
        <button type="button" data-shape="line">Line</button>
        <button type="button" data-shape="triangle">Triangle</button>
        <button type="button" data-shape="note">Note</button>
      </div>
      <button type="button" class="admin-full" id="admin-add-free-video">＋ Add video block</button>
      <input id="admin-free-video-file" type="file" accept="video/mp4,video/webm" hidden>
    `;
    elementsPanel?.prepend(shapes);
    shapes.addEventListener("click", (event) => {
      const kind = event.target.closest("[data-shape]")?.dataset.shape;
      if (!kind) return;
      state.shapes ||= [];
      const section = editor.resolvePlacementSection?.()
        || document.getElementById(byId("admin-block-target")?.value || "")
        || document.querySelector("main > section");
      const shape = {
        id: `shape-${crypto.randomUUID()}`,
        kind: kind === "triangle" ? "rectangle" : kind,
        sectionId: section?.id || "home",
        text: kind === "note" ? "Sticky note" : "",
      };
      state.shapes.push(shape);
      editor.syncBlockTarget?.(section);
      const element = document.createElement(kind === "note" ? "p" : "div");
      element.className = `cms-added-content-block cms-shape cms-shape-${kind}`;
      element.id = shape.id;
      element.dataset.cmsId = shape.id;
      if (kind === "triangle") {
        element.style.clipPath = "polygon(50% 0, 0 100%, 100% 100%)";
        element.style.background = "rgba(255,184,28,.55)";
      }
      if (shape.text) element.textContent = shape.text;
      section?.append(element);
      editor.assignContentIds?.();
      editor.selectElement(element);
      editor.saveDraft();
    });
    byId("admin-add-free-video")?.addEventListener("click", () => byId("admin-free-video-file")?.click());
    byId("admin-free-video-file")?.addEventListener("change", async (event) => {
      const file = event.currentTarget.files?.[0];
      if (!file) return;
      const uploaded = await editor.uploadFile(file);
      const section = editor.resolvePlacementSection?.()
        || document.getElementById(byId("admin-block-target")?.value || "")
        || document.querySelector("main > section");
      const sectionId = section?.id || "work";
      editor.syncBlockTarget?.(section);
      const wrap = document.createElement("figure");
      wrap.className = "cms-added-content-block cms-added-video";
      wrap.id = `content-block-${crypto.randomUUID()}`;
      wrap.dataset.cmsId = wrap.id;
      const video = document.createElement("video");
      video.controls = true;
      video.playsInline = true;
      video.src = uploaded.url;
      video.dataset.cmsId = `${wrap.id}-video`;
      wrap.append(video);
      section?.append(wrap);
      state.contentBlocks ||= [];
      state.contentBlocks.push({ id: wrap.id, type: "video", sectionId, src: uploaded.url });
      const folder = state.mediaLibrary.activeFolder || "Inbox";
      state.mediaLibrary.folders[folder] ||= [];
      state.mediaLibrary.folders[folder].push({ url: uploaded.url, name: file.name, type: file.type, addedAt: Date.now() });
      editor.selectElement(video);
      editor.saveDraft();
      refreshLibrary();
      event.currentTarget.value = "";
      editor.setStatus("Video added. Drag to position and resize.");
    });

    /* ---------- Page height edges ---------- */
    const topEdge = document.createElement("div");
    const bottomEdge = document.createElement("div");
    topEdge.className = "admin-page-edge admin-page-edge-top";
    bottomEdge.className = "admin-page-edge admin-page-edge-bottom";
    topEdge.dataset.cmsControl = "true";
    bottomEdge.dataset.cmsControl = "true";
    topEdge.title = "Drag to extend page height";
    bottomEdge.title = "Drag to extend page height";
    document.body.append(topEdge, bottomEdge);
    let pageResize = null;
    const applyPageHeight = (height) => {
      const main = document.querySelector("main");
      if (!main) return;
      main.style.minHeight = `${Math.max(600, height)}px`;
      state.siteChrome.pageHeight = Math.max(600, height);
      editor.saveDraft();
    };
    const syncPageEdgeNear = (clientY) => {
      const nearTop = clientY <= 28;
      const nearBottom = clientY >= window.innerHeight - 28;
      topEdge.classList.toggle("is-near", nearTop && !pageResize);
      bottomEdge.classList.toggle("is-near", nearBottom && !pageResize);
    };
    document.addEventListener("pointermove", (event) => {
      if (pageResize) return;
      syncPageEdgeNear(event.clientY);
    });
    [topEdge, bottomEdge].forEach((edge) => {
      edge.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const main = document.querySelector("main");
        if (!main) return;
        pageResize = {
          edge,
          y: event.clientY,
          height: main.getBoundingClientRect().height,
        };
        edge.classList.add("is-active");
        edge.setPointerCapture(event.pointerId);
      });
      edge.addEventListener("pointermove", (event) => {
        if (!pageResize || pageResize.edge !== edge) return;
        const delta = edge === bottomEdge ? event.clientY - pageResize.y : pageResize.y - event.clientY;
        applyPageHeight(pageResize.height + delta);
      });
      edge.addEventListener("pointerup", () => {
        edge.classList.remove("is-active");
        pageResize = null;
      });
      edge.addEventListener("pointercancel", () => {
        edge.classList.remove("is-active");
        pageResize = null;
      });
    });
    if (state.siteChrome.pageHeight) applyPageHeight(state.siteChrome.pageHeight);

    /* ---------- Headers / footers ---------- */
    const pagesPanel = document.querySelector('[data-rail-panel="pages"]');
    const chromePanel = document.createElement("div");
    chromePanel.className = "admin-chrome-tools";
    chromePanel.innerHTML = `
      <h3>Header &amp; footer</h3>
      <button type="button" id="admin-copy-header">Copy header</button>
      <button type="button" id="admin-copy-footer">Copy footer</button>
      <button type="button" id="admin-paste-header">Paste header to all pages</button>
      <button type="button" id="admin-paste-footer">Paste footer to all pages</button>
      <small>Copied chrome is stored in your draft and applied on this page and case-study pages when published.</small>
      <h3>Custom pages</h3>
      <button type="button" class="admin-full admin-primary" id="admin-pages-add-page">＋ Add page</button>
      <div id="admin-pages-custom-list"></div>
      <label>Open page
        <select id="admin-page-nav">
          <option value="/admin.html">Home (editor)</option>
          <option value="/projects/admin.html?preview=draft">Case study (editor)</option>
          <option value="/projects/?preview=draft">Case study preview</option>
        </select>
      </label>
      <button type="button" id="admin-open-page">Open page with toolbar</button>
    `;
    pagesPanel?.append(chromePanel);
    const refreshPageNav = () => {
      const select = byId("admin-page-nav");
      const list = byId("admin-pages-custom-list");
      if (!select) return;
      [...select.querySelectorAll("option[data-custom-page]")].forEach((option) => option.remove());
      (state.customPages || []).forEach((page) => {
        const option = document.createElement("option");
        option.value = `/pages/admin.html?page=${encodeURIComponent(page.slug)}`;
        option.textContent = `${page.title || page.slug} (editor)`;
        option.dataset.customPage = page.slug;
        select.append(option);
        const preview = document.createElement("option");
        preview.value = `/pages/?page=${encodeURIComponent(page.slug)}`;
        preview.textContent = `${page.title || page.slug} (preview)`;
        preview.dataset.customPage = page.slug;
        select.append(preview);
      });
      if (list) {
        list.replaceChildren(...(state.customPages || []).map((page) => {
          const row = document.createElement("div");
          row.className = "admin-section-row";
          row.innerHTML = `<span class="admin-section-title">${page.title || page.slug}</span>`;
          const open = document.createElement("button");
          open.type = "button";
          open.textContent = "Open";
          open.addEventListener("click", () => {
            location.assign(`/pages/admin.html?page=${encodeURIComponent(page.slug)}`);
          });
          row.append(open);
          return row;
        }));
      }
    };
    refreshPageNav();
    byId("admin-pages-add-page")?.addEventListener("click", () => editor.addCustomPage?.());
    document.addEventListener("cms-selection-changed", refreshPageNav);
    let chromeClipboard = { header: "", footer: "" };
    byId("admin-copy-header")?.addEventListener("click", () => {
      chromeClipboard.header = document.querySelector(".site-header")?.outerHTML || "";
      state.siteChrome.headerHtml = chromeClipboard.header;
      editor.saveDraft();
      editor.setStatus("Header copied.");
    });
    byId("admin-copy-footer")?.addEventListener("click", () => {
      chromeClipboard.footer = document.querySelector(".site-footer")?.outerHTML || "";
      state.siteChrome.footerHtml = chromeClipboard.footer;
      editor.saveDraft();
      editor.setStatus("Footer copied.");
    });
    const applyChrome = (which) => {
      const html = which === "header" ? (chromeClipboard.header || state.siteChrome.headerHtml) : (chromeClipboard.footer || state.siteChrome.footerHtml);
      if (!html) {
        editor.setStatus(`Copy a ${which} first.`, "error");
        return;
      }
      const current = document.querySelector(which === "header" ? ".site-header" : ".site-footer");
      if (!current) return;
      current.outerHTML = html;
      if (which === "header") state.siteChrome.headerHtml = html;
      else state.siteChrome.footerHtml = html;
      editor.assignContentIds?.();
      editor.saveDraft();
      editor.setStatus(`${which} applied. Publish to keep it across previews.`);
    };
    byId("admin-paste-header")?.addEventListener("click", () => applyChrome("header"));
    byId("admin-paste-footer")?.addEventListener("click", () => applyChrome("footer"));
    byId("admin-open-page")?.addEventListener("click", () => {
      const path = byId("admin-page-nav")?.value || "/admin.html";
      try {
        localStorage.setItem("liam-portfolio-admin-draft-v1", JSON.stringify({
          savedAt: Date.now(),
          state,
        }));
      } catch (_) { /* ignore */ }
      window.open(path, "_blank", "noopener,noreferrer");
      editor.setStatus("Opened page with editor tools. Use Exit preview or the CAPTAIN CAMPAIGN EDITOR badge to restore the toolbar anytime.");
    });

    /* ---------- Analytics + bookings ---------- */
    const analyticsPanel = document.querySelector('[data-rail-panel="analytics"]');
    const analyticsExtra = document.createElement("div");
    analyticsExtra.className = "admin-analytics-extra";
    analyticsExtra.innerHTML = `
      <h3>Visitor counts</h3>
      <div id="admin-analytics-periods" class="admin-analytics-periods">Loading…</div>
      <button type="button" id="admin-analytics-refresh">Refresh counts</button>
      <h3>Bookings &amp; invoices</h3>
      <div id="admin-bookings-list" class="admin-bookings-list"></div>
      <button type="button" id="admin-booking-add">Add booking / invoice</button>
    `;
    analyticsPanel?.append(analyticsExtra);

    const renderPeriods = (summary = {}) => {
      const host = byId("admin-analytics-periods");
      if (!host) return;
      const rows = [
        ["1 day", summary.day1 ?? 0],
        ["7 days", summary.day7 ?? 0],
        ["2 weeks", summary.day14 ?? 0],
        ["1 month", summary.day30 ?? 0],
        ["90 days", summary.day90 ?? 0],
        ["All time", summary.all ?? 0],
      ];
      host.replaceChildren(...rows.map(([label, value]) => {
        const card = document.createElement("div");
        card.className = "admin-analytics-card";
        card.innerHTML = `<strong>${value}</strong><span>${label}</span>`;
        return card;
      }));
    };
    const refreshAnalytics = async () => {
      try {
        const response = await fetch("/api/analytics/summary", { cache: "no-store" });
        if (!response.ok) throw new Error("Could not load analytics");
        renderPeriods(await response.json());
      } catch (_) {
        renderPeriods({ day1: 0, day7: 0, day14: 0, day30: 0, day90: 0, all: 0 });
      }
    };
    const renderBookings = () => {
      const list = byId("admin-bookings-list");
      if (!list) return;
      state.bookings ||= [];
      if (!state.bookings.length) {
        list.innerHTML = "<small>No bookings or invoices logged yet.</small>";
        return;
      }
      list.replaceChildren(...state.bookings.slice().reverse().map((item, index) => {
        const row = document.createElement("div");
        row.className = "admin-booking-row";
        row.innerHTML = `<strong>${item.name || "Untitled"}</strong>
          <span>${item.type || "booking"} · ${item.date || ""}</span>
          <span>${item.email || ""} ${item.amount ? `· ${item.amount}` : ""}</span>`;
        const remove = document.createElement("button");
        remove.type = "button";
        remove.textContent = "Remove";
        remove.addEventListener("click", () => {
          state.bookings.splice(state.bookings.length - 1 - index, 1);
          editor.saveDraft();
          renderBookings();
          fetch("/api/bookings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ bookings: state.bookings }),
          }).catch(() => {});
        });
        row.append(remove);
        return row;
      }));
    };
    byId("admin-analytics-refresh")?.addEventListener("click", refreshAnalytics);
    byId("admin-booking-add")?.addEventListener("click", async () => {
      const name = window.prompt("Name");
      if (!name) return;
      const type = window.prompt("Type (booking or invoice)", "booking") || "booking";
      const email = window.prompt("Email") || "";
      const amount = window.prompt("Amount (optional)") || "";
      const entry = { name, type, email, amount, date: new Date().toISOString().slice(0, 10), id: crypto.randomUUID() };
      state.bookings.push(entry);
      editor.saveDraft();
      renderBookings();
      await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookings: state.bookings }),
      }).catch(() => {});
    });

    document.addEventListener("cms-selection-changed", () => {
      syncFloat();
      syncAxisVisibility();
    });
    document.getElementById("editor-image-crop-mode")?.addEventListener("click", () => setTimeout(syncAxisVisibility, 0));
    document.getElementById("editor-image-resize-mode")?.addEventListener("click", () => setTimeout(syncAxisVisibility, 0));

    // Keep toolbar mark available on other pages if admin scripts load
    document.querySelector(".admin-mark")?.addEventListener("click", () => {
      if (editor.toggleToolbar) editor.toggleToolbar(false);
      else {
        document.body.classList.remove("cms-administrator-collapsed");
        document.querySelector(".admin-toolbar")?.classList.remove("is-collapsed");
        document.getElementById("admin-restore-tools")?.setAttribute("hidden", "true");
      }
    });

    editor.ready.then(async () => {
      refreshLibrary();
      refreshAnalytics();
      try {
        const response = await fetch("/api/bookings", { cache: "no-store" });
        if (response.ok) {
          const payload = await response.json();
          if (Array.isArray(payload.bookings)) state.bookings = payload.bookings;
        }
      } catch (_) { /* ignore */ }
      renderBookings();
      if (state.siteChrome?.pageHeight) applyPageHeight(state.siteChrome.pageHeight);
    }).catch(() => {});
  });
})();
