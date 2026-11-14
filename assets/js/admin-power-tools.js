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
        <button type="button" id="admin-float-close" aria-label="Close toolbar">×</button>
      </header>
      <div class="admin-float-body">
        <label class="admin-float-lock"><input type="checkbox" id="admin-float-lock-checkbox"> Locked</label>
        <label class="admin-float-lock"><input type="checkbox" id="admin-float-lock-parent-checkbox"> Parent locked</label>
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
        <div class="admin-float-row" data-for="any">
          <label>X<input id="admin-float-x" type="number"></label>
          <label>Y<input id="admin-float-y" type="number"></label>
          <label>W<input id="admin-float-w" type="number"></label>
          <label>H<input id="admin-float-h" type="number"></label>
        </div>
        <div class="admin-float-row" data-for="media">
          <button type="button" data-float="crop">Crop</button>
          <button type="button" data-float="resize">Resize</button>
          <button type="button" data-float="recolor">Recolor</button>
          <label>Tint<input id="admin-float-tint" type="color" value="#1A2B49"></label>
        </div>
        <div class="admin-float-row" data-for="any">
          <button type="button" data-float="duplicate">Duplicate</button>
          <button type="button" data-float="group">Group</button>
          <button type="button" data-float="delete">Delete</button>
        </div>
        <small data-for="media">Crop tip: drag to pan focus; scroll wheel zooms crop; use X/Y sliders for axis crop.</small>
      </div>
    `;
    document.body.append(float);

    let floatDrag = null;
    float.querySelector("[data-float-drag]")?.addEventListener("pointerdown", (event) => {
      floatDrag = { x: event.clientX, y: event.clientY, left: float.offsetLeft, top: float.offsetTop };
      event.currentTarget.setPointerCapture(event.pointerId);
    });
    float.querySelector("[data-float-drag]")?.addEventListener("pointermove", (event) => {
      if (!floatDrag) return;
      float.style.left = `${Math.max(8, floatDrag.left + event.clientX - floatDrag.x)}px`;
      float.style.top = `${Math.max(8, floatDrag.top + event.clientY - floatDrag.y)}px`;
      float.style.right = "auto";
    });
    float.querySelector("[data-float-drag]")?.addEventListener("pointerup", () => { floatDrag = null; });
    byId("admin-float-close").addEventListener("click", () => { float.hidden = true; });

    const syncFloat = () => {
      const selected = editor.selected;
      if (!selected) return;
      const edit = state.edits[selected.dataset.cmsId] || {};
      const isText = selected.matches?.("h1,h2,h3,h4,p,a,span,button,li,.brand-name,.section-number");
      const isMedia = selected instanceof HTMLImageElement || selected instanceof HTMLVideoElement;
      float.querySelectorAll("[data-for]").forEach((node) => {
        const kind = node.getAttribute("data-for");
        node.hidden = kind === "text" ? !isText : kind === "media" ? !isMedia : false;
      });
      byId("admin-float-lock-checkbox").checked = Boolean(edit.locked);
      if (byId("admin-lock-checkbox")) byId("admin-lock-checkbox").checked = Boolean(edit.locked);
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
    };

    const openFloat = (clientX, clientY) => {
      float.hidden = false;
      float.style.left = `${Math.max(8, Math.min(clientX, window.innerWidth - 340))}px`;
      float.style.top = `${Math.max(8, Math.min(clientY, window.innerHeight - 280))}px`;
      float.style.right = "auto";
      syncFloat();
    };

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
        delete: () => byId("admin-delete")?.click(),
        crop: () => {
          document.getElementById("editor-image-crop-mode")?.click();
          editor.setStatus("Crop mode: drag to pan, scroll to zoom, use axis sliders.");
        },
        resize: () => document.getElementById("editor-image-resize-mode")?.click(),
        recolor: () => {
          const tint = byId("admin-float-tint").value;
          const edit = state.edits[editor.selected.dataset.cmsId] ||= { styles: {} };
          edit.styles.filter = "contrast(1.08) saturate(1.2)";
          edit.styles.borderColor = tint;
          edit.styles.borderWidth = 3;
          editor.selected.style.filter = edit.styles.filter;
          editor.selected.style.outline = `3px solid ${tint}`;
          editor.saveDraft();
        },
        echo: () => {
          const edit = state.edits[editor.selected.dataset.cmsId] ||= { styles: {} };
          edit.styles.textShadow = "1";
          editor.selected.style.textShadow = "0 0 1px currentColor, 2px 2px 0 rgba(26,43,73,.35), 4px 4px 0 rgba(255,184,28,.35)";
          editor.saveDraft();
        },
        bullet: () => {
          const selected = editor.selected;
          if (!selected) return;
          const edit = state.edits[selected.dataset.cmsId] ||= { styles: {} };
          const lines = selected.textContent.split(/\n+/).map((line) => line.replace(/^[•\-]\s*/, "").trim()).filter(Boolean);
          edit.text = lines.map((line) => `• ${line}`).join("\n");
          selected.textContent = edit.text;
          selected.style.whiteSpace = "pre-line";
          editor.saveDraft();
        },
      };
      map[action]?.();
      syncFloat();
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
      const edit = state.edits[image.dataset.cmsId] ||= { styles: {} };
      const zoom = Math.max(100, Math.min(220, Number(edit.crop?.zoom || 100) + (event.deltaY < 0 ? 8 : -8)));
      edit.crop = {
        fit: "cover",
        x: Number(edit.crop?.x ?? 50),
        y: Number(edit.crop?.y ?? 50),
        zoom,
      };
      image.style.objectFit = "cover";
      image.style.objectPosition = `${edit.crop.x}% ${edit.crop.y}%`;
      image.style.transform = `scale(${zoom / 100})`;
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
        const edit = state.edits[image.dataset.cmsId] ||= { styles: {} };
        edit.crop = {
          fit: "cover",
          x: Number(byId("admin-crop-axis-x").value),
          y: Number(byId("admin-crop-axis-y").value),
          zoom: Number(byId("admin-crop-axis-zoom").value),
        };
        image.style.objectFit = "cover";
        image.style.objectPosition = `${edit.crop.x}% ${edit.crop.y}%`;
        image.style.transform = `scale(${edit.crop.zoom / 100})`;
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
      const items = state.mediaLibrary.folders[state.mediaLibrary.activeFolder] || [];
      grid.replaceChildren(...items.map((item) => {
        const card = document.createElement("button");
        card.type = "button";
        card.className = "admin-lib-card";
        card.title = item.name || item.url;
        if (/\.(mp4|webm)$/i.test(item.url)) card.textContent = "🎬 " + (item.name || "Video");
        else {
          const img = document.createElement("img");
          img.src = item.url;
          img.alt = item.name || "";
          card.append(img);
        }
        card.addEventListener("click", async () => {
          if (editor.selected instanceof HTMLImageElement || editor.selected instanceof HTMLVideoElement) {
            const edit = state.edits[editor.selected.dataset.cmsId] ||= { styles: {} };
            edit.media = item.url;
            editor.selected.src = item.url;
            if (editor.selected instanceof HTMLVideoElement) editor.selected.load();
            editor.saveDraft();
            editor.setStatus("Media replaced from uploads library.");
            return;
          }
          editor.addContentBlock?.({
            id: `content-block-${crypto.randomUUID()}`,
            type: /\.(mp4|webm)$/i.test(item.url) ? "video" : "image",
            sectionId: byId("admin-block-target")?.value || "work",
            src: item.url,
            text: "",
          });
        });
        return card;
      }));
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
      const shape = {
        id: `shape-${crypto.randomUUID()}`,
        kind: kind === "triangle" ? "rectangle" : kind,
        sectionId: byId("admin-block-target")?.value || document.querySelector("main > section")?.id || "home",
        text: kind === "note" ? "Sticky note" : "",
      };
      state.shapes.push(shape);
      const section = document.getElementById(shape.sectionId) || document.querySelector("main");
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
      const sectionId = byId("admin-block-target")?.value || "work";
      const section = document.getElementById(sectionId) || document.querySelector("main");
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
    topEdge.title = "Drag to resize page height";
    bottomEdge.title = "Drag to resize page height";
    document.body.append(topEdge, bottomEdge);
    let pageResize = null;
    const applyPageHeight = (height) => {
      const main = document.querySelector("main");
      if (!main) return;
      main.style.minHeight = `${Math.max(600, height)}px`;
      state.siteChrome.pageHeight = Math.max(600, height);
      editor.saveDraft();
    };
    [topEdge, bottomEdge].forEach((edge) => {
      edge.addEventListener("pointerdown", (event) => {
        const main = document.querySelector("main");
        if (!main) return;
        pageResize = {
          edge,
          y: event.clientY,
          height: main.getBoundingClientRect().height,
        };
        edge.setPointerCapture(event.pointerId);
      });
      edge.addEventListener("pointermove", (event) => {
        if (!pageResize || pageResize.edge !== edge) return;
        const delta = edge === bottomEdge ? event.clientY - pageResize.y : pageResize.y - event.clientY;
        applyPageHeight(pageResize.height + delta);
      });
      edge.addEventListener("pointerup", () => { pageResize = null; });
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
      editor.setStatus("Opened page. Re-open /admin.html anytime to restore the toolbar on the home editor.");
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
      document.body.classList.remove("cms-administrator-collapsed");
      document.querySelector(".admin-toolbar")?.classList.remove("is-collapsed");
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
