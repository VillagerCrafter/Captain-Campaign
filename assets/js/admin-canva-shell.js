(() => {
  const waitForEditor = () => new Promise((resolve) => {
    const tick = () => {
      if (window.liamAdminEditor?.byId && document.querySelector(".admin-toolbar")) resolve(window.liamAdminEditor);
      else window.setTimeout(tick, 40);
    };
    tick();
  });

  const icon = (name) => `<i data-lucide="${name}" aria-hidden="true"></i>`;

  waitForEditor().then((editor) => {
    const toolbar = document.querySelector(".admin-toolbar");
    if (!toolbar || toolbar.dataset.canvaShell === "true") return;
    toolbar.dataset.canvaShell = "true";
    document.body.classList.add("cms-canva-shell");

    const guideLayer = document.createElement("div");
    guideLayer.id = "cms-smart-guides";
    guideLayer.setAttribute("aria-hidden", "true");
    document.body.append(guideLayer);

    const props = document.createElement("aside");
    props.className = "admin-properties";
    props.setAttribute("aria-label", "Element properties");
    props.dataset.cmsControl = "true";
    props.innerHTML = `
      <header class="admin-properties-header">
        <span class="admin-toolbar-kicker">Properties</span>
        <strong id="admin-properties-title">Nothing selected</strong>
      </header>
      <div class="admin-properties-body" id="admin-properties-body"></div>
    `;
    document.body.append(props);

    const rail = document.createElement("nav");
    rail.className = "admin-rail";
    rail.setAttribute("aria-label", "Editor panels");
    rail.dataset.cmsControl = "true";
    ["pointerdown", "click", "mousedown"].forEach((type) => {
      props.addEventListener(type, (event) => event.stopPropagation());
      rail.addEventListener(type, (event) => event.stopPropagation());
    });
    const tabs = [
      ["design", "palette", "Design"],
      ["elements", "shapes", "Elements"],
      ["text", "type", "Text"],
      ["uploads", "image", "Uploads"],
      ["brand", "bookmark", "Brand"],
      ["layers", "layers", "Layers"],
      ["pages", "layout-template", "Pages"],
      ["seo", "search", "SEO"],
      ["analytics", "bar-chart-3", "Analytics"],
    ];
    rail.innerHTML = tabs.map(([id, lucideName, label], index) => `
      <button type="button" class="admin-rail-btn" data-rail="${id}" aria-pressed="${index === 0}" title="${label}">
        ${icon(lucideName)}<span>${label}</span>
      </button>
    `).join("");

    const panelHost = document.createElement("div");
    panelHost.className = "admin-panel-host";
    const existingChildren = [...toolbar.children];
    toolbar.replaceChildren(rail, panelHost);

    const header = existingChildren.find((node) => node.classList?.contains("admin-toolbar-header"));
    const status = existingChildren.find((node) => node.id === "admin-status");
    const publish = existingChildren.find((node) => node.id === "admin-publish");
    const modeRow = existingChildren.find((node) => node.classList?.contains("admin-button-row"));
    const previewModes = existingChildren.find((node) => node.classList?.contains("admin-preview-modes"));
    const hint = existingChildren.find((node) => node.classList?.contains("admin-hint"));
    const chrome = document.createElement("div");
    chrome.className = "admin-chrome";
    [header, status, publish, modeRow, previewModes, hint].filter(Boolean).forEach((node) => chrome.append(node));
    panelHost.append(chrome);

    const groups = existingChildren.filter((node) => node.classList?.contains("admin-tool-group"));
    const extensions = existingChildren.find((node) => node.classList?.contains("editor-extensions"));
    const leftovers = existingChildren.filter((node) =>
      !chrome.contains(node) && !groups.includes(node) && node !== extensions);

    const panels = {
      design: document.createElement("div"),
      elements: document.createElement("div"),
      text: document.createElement("div"),
      uploads: document.createElement("div"),
      brand: document.createElement("div"),
      layers: document.createElement("div"),
      pages: document.createElement("div"),
      seo: document.createElement("div"),
      analytics: document.createElement("div"),
    };
    Object.entries(panels).forEach(([name, panel]) => {
      panel.className = "admin-rail-panel";
      panel.dataset.railPanel = name;
      panel.hidden = name !== "design";
      panelHost.append(panel);
    });

    const moveGroup = (panelName, matcher) => {
      groups.filter(matcher).forEach((group) => panels[panelName].append(group));
    };
    const propsBody = document.getElementById("admin-properties-body");
    const propsTitle = document.getElementById("admin-properties-title");
    moveGroup("design", (group) => /Page appearance|Version history/i.test(group.querySelector("summary")?.textContent || ""));
    moveGroup("pages", (group) => /Build your page|Page sections/i.test(group.querySelector("summary")?.textContent || ""));
    moveGroup("brand", (group) => group.dataset.adminPanel === "brand");
    moveGroup("layers", (group) => group.dataset.adminPanel === "layers");
    moveGroup("seo", (group) => group.dataset.adminPanel === "seo");
    moveGroup("analytics", (group) => group.dataset.adminPanel === "analytics");
    const propsGroups = groups.filter((group) =>
      /Selected element|Size and position|Colors and effects/i.test(group.querySelector("summary")?.textContent || ""));
    propsGroups.forEach((group) => {
      group.open = true;
      propsBody.append(group);
    });
    groups.forEach((group) => {
      if (!group.parentElement || group.parentElement === toolbar) panels.design.append(group);
    });
    if (extensions) panels.design.append(extensions);
    leftovers.forEach((node) => {
      if (node.id === "admin-delete" || node.id === "admin-restore" || node.id === "admin-reset-draft") {
        propsBody.append(node);
      } else {
        panels.design.append(node);
      }
    });

    const textQuick = document.createElement("div");
    textQuick.className = "admin-text-quick";
    textQuick.innerHTML = `
      <p class="admin-hint">Add text blocks, then style them in Properties.</p>
      <div class="admin-button-row">
        <button type="button" id="admin-quick-heading">＋ Heading</button>
        <button type="button" id="admin-quick-text">＋ Paragraph</button>
      </div>
    `;
    panels.text.prepend(textQuick);
    textQuick.querySelector("#admin-quick-heading")?.addEventListener("click", () => {
      document.getElementById("admin-add-heading-block")?.click();
    });
    textQuick.querySelector("#admin-quick-text")?.addEventListener("click", () => {
      document.getElementById("admin-add-text-block")?.click();
    });

    const uploadsQuick = document.createElement("div");
    uploadsQuick.className = "admin-uploads-quick";
    uploadsQuick.innerHTML = `
      <p class="admin-hint">Replace selected media or add a photo block.</p>
      <button type="button" class="admin-full admin-primary" id="admin-quick-upload">Upload / replace media</button>
      <button type="button" class="admin-full" id="admin-quick-photo-block">＋ Photo block</button>
    `;
    panels.uploads.append(uploadsQuick);
    uploadsQuick.querySelector("#admin-quick-upload")?.addEventListener("click", () => {
      document.getElementById("admin-replace-media")?.click();
      document.getElementById("admin-media-file")?.click();
    });
    uploadsQuick.querySelector("#admin-quick-photo-block")?.addEventListener("click", () => {
      document.getElementById("admin-add-image-block")?.click();
    });

    const setRail = (name) => {
      Object.entries(panels).forEach(([key, panel]) => { panel.hidden = key !== name; });
      rail.querySelectorAll(".admin-rail-btn").forEach((button) => {
        button.setAttribute("aria-pressed", String(button.dataset.rail === name));
      });
      if (name === "elements") document.getElementById("editor-elements-tab")?.click();
      if (name === "design") document.getElementById("editor-design-tab")?.click();
      if (name === "layers") renderLayers();
    };
    rail.addEventListener("click", (event) => {
      const button = event.target.closest(".admin-rail-btn");
      if (button) setRail(button.dataset.rail);
    });

    const refreshPropertiesMirror = () => {
      const selectedLabel = document.getElementById("admin-selection-name");
      propsTitle.textContent = selectedLabel?.textContent?.trim() || "Nothing selected";
    };

    const moveableTarget = () => {
      const selected = editor.selected;
      if (!selected || selected.hidden) return null;
      if (editor.state.edits?.[selected.dataset.cmsId]?.locked) return null;
      if (selected instanceof HTMLImageElement || selected instanceof HTMLVideoElement) {
        return editor.imageFrameFor?.(selected) || selected;
      }
      return selected;
    };

    let moveable = null;
    const destroyMoveable = () => {
      moveable?.destroy();
      moveable = null;
    };

    const persistTransform = (target, { left, top, width, height, rotate }) => {
      const selected = editor.selected;
      if (!selected) return;
      const edit = editor.state.edits[selected.dataset.cmsId] ||= { styles: {} };
      edit.styles ||= {};
      if (selected instanceof HTMLImageElement || selected instanceof HTMLVideoElement) {
        const bounds = target.getBoundingClientRect();
        edit.resize = {
          ...(edit.resize || { width: bounds.width, height: bounds.height }),
          width: width ?? edit.resize?.width ?? bounds.width,
          height: height ?? edit.resize?.height ?? bounds.height,
          offsetX: left ?? edit.resize?.offsetX ?? 0,
          offsetY: top ?? edit.resize?.offsetY ?? 0,
        };
        editor.applyImageResize(selected, edit.resize);
        target.dataset.cmsKeepOffset = "true";
        const widthField = document.getElementById("admin-width");
        const heightField = document.getElementById("admin-height");
        const leftField = document.getElementById("admin-left");
        const topField = document.getElementById("admin-top");
        if (widthField) widthField.value = Math.round(edit.resize.width);
        if (heightField) heightField.value = Math.round(edit.resize.height);
        if (leftField) leftField.value = Math.round(edit.resize.offsetX || 0);
        if (topField) topField.value = Math.round(edit.resize.offsetY || 0);
      } else {
        if (left !== undefined) edit.styles.left = Math.round(left);
        if (top !== undefined) edit.styles.top = Math.round(top);
        if (width !== undefined) edit.styles.width = Math.round(width);
        if (height !== undefined) edit.styles.height = Math.round(height);
        if (rotate !== undefined) edit.styles.rotate = Math.round(rotate);
        editor.applyStyle(selected, edit.styles);
        const leftField = document.getElementById("admin-left");
        const topField = document.getElementById("admin-top");
        const rotateField = document.getElementById("admin-rotate");
        if (leftField && left !== undefined) leftField.value = Math.round(left);
        if (topField && top !== undefined) topField.value = Math.round(top);
        if (rotateField && rotate !== undefined) rotateField.value = Math.round(rotate);
      }
      editor.saveDraft();
    };

    const initMoveable = () => {
      destroyMoveable();
      const MoveableCtor = window.Moveable;
      const target = moveableTarget();
      if (!MoveableCtor || !target || document.body.classList.contains("cms-preview-mode")) return;
      const snapOn = document.getElementById("admin-snap-enabled")?.checked !== false;
      const keepRatio = document.getElementById("admin-aspect-lock")?.checked !== false;
      moveable = new MoveableCtor(document.body, {
        target,
        container: document.body,
        draggable: false,
        resizable: true,
        rotatable: true,
        snappable: snapOn,
        snapGap: true,
        snapThreshold: 6,
        isDisplaySnapDigit: true,
        keepRatio,
        origin: false,
        throttleResize: 0,
        throttleRotate: 0,
        edge: false,
        renderDirections: ["nw", "n", "ne", "w", "e", "sw", "s", "se"],
      });

      moveable.on("resize", ({ target: el, width, height, drag }) => {
        window.CaptainCampaignEditor.moveableDragging = true;
        el.style.width = `${width}px`;
        el.style.height = `${height}px`;
        if (drag) {
          el.style.position = "relative";
          el.style.left = `${Math.round(drag.left)}px`;
          el.style.top = `${Math.round(drag.top)}px`;
        }
      });
      moveable.on("resizeEnd", ({ target: el }) => {
        window.CaptainCampaignEditor.moveableDragging = false;
        persistTransform(el, {
          left: Number.parseFloat(el.style.left) || 0,
          top: Number.parseFloat(el.style.top) || 0,
          width: el.getBoundingClientRect().width,
          height: el.getBoundingClientRect().height,
        });
      });
      moveable.on("rotate", ({ target: el, rotate }) => {
        window.CaptainCampaignEditor.moveableDragging = true;
        el.style.transform = `rotate(${rotate}deg)`;
      });
      moveable.on("rotateEnd", ({ target: el }) => {
        window.CaptainCampaignEditor.moveableDragging = false;
        const match = /rotate\((-?\d+(?:\.\d+)?)deg\)/.exec(el.style.transform || "");
        persistTransform(el, { rotate: match ? Number(match[1]) : 0 });
      });
    };

    const renderLayers = () => {
      const list = document.getElementById("admin-layers-list");
      if (!list) return;
      const candidates = [...document.querySelectorAll("[data-cms-id]")]
        .filter((element) => !element.closest(".admin-toolbar, .admin-properties, .admin-rail, .service-dialog, .admin-mark, .moveable-control-box, #cms-smart-guides"))
        .filter((element) => element.getClientRects().length || element.hidden);
      list.replaceChildren();
      candidates.slice(0, 120).forEach((element) => {
        const edit = editor.state.edits?.[element.dataset.cmsId] || {};
        const row = document.createElement("div");
        row.className = "admin-layer-row";
        row.draggable = true;
        row.dataset.cmsId = element.dataset.cmsId;
        if (editor.selected === element) row.classList.add("is-active");
        const label = document.createElement("button");
        label.type = "button";
        label.className = "admin-layer-label";
        label.textContent = edit.layerName
          || `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ""}`;
        label.addEventListener("click", () => editor.selectElement(element));
        const rename = document.createElement("button");
        rename.type = "button";
        rename.textContent = "Name";
        rename.addEventListener("click", () => {
          const next = window.prompt("Layer name", edit.layerName || label.textContent);
          if (next === null) return;
          editor.state.edits[element.dataset.cmsId] ||= { styles: {} };
          editor.state.edits[element.dataset.cmsId].layerName = next.trim().slice(0, 80);
          editor.saveDraft();
          renderLayers();
        });
        const hide = document.createElement("button");
        hide.type = "button";
        hide.textContent = element.hidden ? "Show" : "Hide";
        hide.addEventListener("click", () => {
          element.hidden = !element.hidden;
          editor.state.edits[element.dataset.cmsId] ||= { styles: {} };
          editor.state.edits[element.dataset.cmsId].deleted = element.hidden;
          editor.saveDraft();
          renderLayers();
        });
        const lock = document.createElement("button");
        lock.type = "button";
        lock.textContent = edit.locked ? "Unlock" : "Lock";
        lock.addEventListener("click", () => {
          editor.state.edits[element.dataset.cmsId] ||= { styles: {} };
          editor.state.edits[element.dataset.cmsId].locked = !edit.locked;
          element.classList.toggle("cms-editor-locked", Boolean(editor.state.edits[element.dataset.cmsId].locked));
          editor.saveDraft();
          renderLayers();
          initMoveable();
        });
        row.append(label, rename, hide, lock);
        list.append(row);
      });

      if (window.Sortable && !list.dataset.sortableBound) {
        list.dataset.sortableBound = "true";
        window.Sortable.create(list, {
          animation: 150,
          onEnd: () => {
            [...list.children].reverse().forEach((row, index) => {
              const element = document.querySelector(`[data-cms-id="${CSS.escape(row.dataset.cmsId)}"]`);
              if (!element) return;
              editor.state.edits[element.dataset.cmsId] ||= { styles: {} };
              editor.state.edits[element.dataset.cmsId].styles ||= {};
              editor.state.edits[element.dataset.cmsId].styles.zIndex = index + 1;
              editor.applyStyle(element, editor.state.edits[element.dataset.cmsId].styles);
            });
            editor.saveDraft();
          },
        });
      }
    };

    const contextMenu = document.createElement("div");
    contextMenu.className = "admin-context-menu";
    contextMenu.hidden = true;
    contextMenu.innerHTML = `
      <button type="button" data-action="duplicate">Duplicate</button>
      <button type="button" data-action="lock">Lock / Unlock</button>
      <button type="button" data-action="front">Bring to front</button>
      <button type="button" data-action="back">Send to back</button>
      <button type="button" data-action="delete">Delete</button>
    `;
    document.body.append(contextMenu);
    const hideContext = () => { contextMenu.hidden = true; };
    document.addEventListener("click", hideContext);
    document.addEventListener("contextmenu", (event) => {
      if (!document.body.classList.contains("cms-administrator")) return;
      const target = event.target.closest("[data-cms-id]");
      if (!target || target.closest(".admin-toolbar, .admin-properties, .admin-rail")) return;
      event.preventDefault();
      editor.selectElement(target);
      contextMenu.hidden = false;
      contextMenu.style.left = `${event.clientX}px`;
      contextMenu.style.top = `${event.clientY}px`;
    });
    contextMenu.addEventListener("click", (event) => {
      const action = event.target.closest("button")?.dataset.action;
      if (!action) return;
      if (action === "duplicate") document.getElementById("admin-duplicate")?.click();
      if (action === "lock") document.getElementById("admin-lock")?.click();
      if (action === "front") document.getElementById("admin-send-to-front")?.click();
      if (action === "back") document.getElementById("admin-send-to-back")?.click();
      if (action === "delete") document.getElementById("admin-delete")?.click();
      hideContext();
    });

    document.addEventListener("cms-selection-changed", () => {
      refreshPropertiesMirror();
      initMoveable();
      if (!panels.layers.hidden) renderLayers();
      document.body.classList.toggle("cms-has-selection", Boolean(editor.selected));
    });
    document.getElementById("admin-aspect-lock")?.addEventListener("change", initMoveable);
    document.getElementById("admin-snap-enabled")?.addEventListener("change", initMoveable);
    document.getElementById("admin-preview-toggle")?.addEventListener("click", () => {
      window.setTimeout(() => {
        document.body.classList.toggle("cms-preview-mode",
          document.getElementById("admin-preview-toggle")?.getAttribute("aria-pressed") === "true");
        initMoveable();
      }, 0);
    });

    window.CaptainCampaignEditor = {
      useMoveable: false,
      moveableDragging: false,
      setRail,
      renderLayers,
      refreshMoveable: initMoveable,
    };

    const snapBox = document.getElementById("admin-snap-enabled");
    const gridBox = document.getElementById("admin-show-grid");
    if (snapBox) snapBox.checked = true;
    if (gridBox) {
      gridBox.checked = true;
      document.body.classList.add("cms-show-grid");
    }

    if (window.lucide?.createIcons) window.lucide.createIcons({ attrs: { "stroke-width": 1.75 } });
    setRail("design");
    refreshPropertiesMirror();
    renderLayers();
    editor.setStatus?.("Captain Campaign editor ready — free drag, snap, and grid are on.");
  });
})();
