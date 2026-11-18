(() => {
  const contentScript = document.querySelector('script[data-content-url]');
  const contentUrl = contentScript?.dataset.contentUrl;
  const configuredBase = contentScript?.dataset.siteBaseurl || "";
  // Local preview serves from "/" even when GitHub Pages uses /Captain-Campaign.
  const siteBaseUrl = (() => {
    if (!configuredBase || configuredBase === "/") return "";
    const host = location.hostname;
    if (host === "localhost" || host === "127.0.0.1") return "";
    if (location.pathname.startsWith(configuredBase + "/") || location.pathname === configuredBase) {
      return configuredBase;
    }
    return "";
  })();
  const resolveSitePath = (path) => {
    if (typeof path !== "string" || !path.startsWith("/")) return path;
    if (!siteBaseUrl) return path;
    if (path === siteBaseUrl || path.startsWith(`${siteBaseUrl}/`)) return path;
    return `${siteBaseUrl}${path}`;
  };
  const textSelector = [
    "h1", "h2", "h3", "h4", "p", ".brand-name", ".brand-band-heading",
    ".hero-note", ".section-number", ".story-kicker", ".step-number",
    ".step-arrow", ".service-number", ".service-title", ".service-summary",
    ".service-image-action", ".project-meta > span", ".project-index",
    ".project-role", ".project-description", ".about-image-caption",
    ".featured-client", ".featured-project-title", ".footer-bottom > span",
    ".footer-bottom > a", ".primary-navigation > a", ".hero-actions > a",
    ".intro-actions > a", "a", "button:not(.service-open)",
  ].join(",");
  const getCandidates = (root = document) => [
    ...root.querySelectorAll(`${textSelector}, img, video, section, article, div, form, nav, footer, header, iframe, .service-open, button, #dialog-image, [data-dialog-book]`),
  ].filter((element) => {
    if (element.closest(".admin-toolbar, .admin-mark")) return false;
    const dialog = element.closest(".service-dialog");
    if (!dialog) return true;
    return element.id === "dialog-image" || element.matches?.("[data-dialog-book]");
  });

  const stableContentId = (element) => {
    if (element.id && /^(project-|service-|shape-|content-block-|element-copy-|custom-cta-|stock-image-)/.test(element.id)) {
      return element.id;
    }
    const projectCard = element.closest?.(".project-card[id^='project-']");
    if (projectCard) {
      if (element === projectCard) return projectCard.id;
      // Unique ids only — shared ids made baseline restore wipe wraps to "01" and delete photos.
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

  const assignContentIds = () => {
    getCandidates().forEach((element, index) => {
      if (!element.dataset.cmsId) {
        element.dataset.cmsId = stableContentId(element) || `element-${index}-${element.tagName.toLowerCase()}`;
      }
      if (element instanceof HTMLImageElement && element.getAttribute("src") && !element.dataset.cmsFallback) {
        element.dataset.cmsFallback = element.getAttribute("src");
      }
    });
  };

  const getContentElement = (id) => {
    if (!/^[\w-]+$/.test(id)) return null;
    return document.querySelector(`[data-cms-id="${CSS.escape(id)}"]`);
  };
  assignContentIds();
  const baseline = new Map(getCandidates().map((element) => [element.dataset.cmsId, {
    html: element.matches(textSelector) ? element.innerHTML : null,
    src: element.getAttribute("src"),
    alt: element.getAttribute("alt"),
    href: element.getAttribute("href"),
    style: element.getAttribute("style"),
    hidden: element.hasAttribute("hidden"),
    serviceImage: element.dataset.serviceImage,
    serviceDescription: element.dataset.serviceDescription,
    serviceExample: element.dataset.serviceExample,
  }]));
  const originalSections = [...document.querySelectorAll("main > section")];
  const heroVideo = document.querySelector(".hero-video");
  const originalHeroVideo = heroVideo?.querySelector("source")?.src || "";
  let heroVideoTimer;
  const slideshowTimers = new Map();
  let appliedContent = null;
  let imageResizeTimer;

  const applyAnimation = (element, animation) => {
    const animations = {
      fade: "cmsFadeIn 1.2s ease both",
      float: "cmsFloat 3s ease-in-out infinite",
      spin: "cmsSpin 6s linear infinite",
      pulse: "cmsPulse 2s ease-in-out infinite",
    };
    element.style.animation = animations[animation] || "";
  };

  const applyGoogleFont = (family) => {
    const link = document.querySelector("#published-google-font");
    if (!family || typeof family !== "string" || family.length > 100 || /["<>;]/.test(family)) {
      link?.remove();
      return;
    }
    const stylesheet = link || document.createElement("link");
    stylesheet.id = "published-google-font";
    stylesheet.rel = "stylesheet";
    stylesheet.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, "+")}&display=swap`;
    document.head.append(stylesheet);
    document.documentElement.style.setProperty("--site-font", `"${family}", sans-serif`);
  };

  const renderCredit = (image, credit, creditContainer = image.parentElement?.parentElement) => {
    if (!credit || !image.parentElement) return;
    const parent = creditContainer;
    if (!parent) return;
    parent.querySelector(":scope > .cms-stock-credit")?.remove();
    const sourceUrl = /^https:\/\//i.test(credit.source_url || "") ? credit.source_url : "";
    const licenseUrl = /^https:\/\//i.test(credit.license_url || "") ? credit.license_url : "";
    if (!sourceUrl || !licenseUrl) return;
    const caption = document.createElement("small");
    caption.className = "cms-stock-credit";
    const source = document.createElement("a");
    source.href = sourceUrl;
    source.target = "_blank";
    source.rel = "noopener noreferrer";
    source.textContent = [credit.title, credit.creator && `by ${credit.creator}`].filter(Boolean).join(" ");
    const license = document.createElement("a");
    license.href = licenseUrl;
    license.target = "_blank";
    license.rel = "noopener noreferrer";
    license.textContent = `${credit.license || "Creative Commons"} ${credit.license_version || ""}`.trim();
    caption.append(source, document.createTextNode(" · "), license);
    parent.append(caption);
  };

  /* Recover broken images instead of permanently hiding them. */
  const watchBrokenImages = () => {
    document.querySelectorAll("img").forEach((image) => {
      if (image.dataset.cmsBrokenWatched) return;
      image.dataset.cmsBrokenWatched = "true";
      const originalSrc = baseline.get(image.dataset.cmsId)?.src
        || image.getAttribute("data-cms-fallback")
        || "";
      if (originalSrc) image.setAttribute("data-cms-fallback", originalSrc);
      const recover = () => {
        const broken = (!image.getAttribute("src") && !image.currentSrc)
          || (image.complete && image.naturalWidth === 0);
        if (!broken) {
          image.classList.remove("cms-image-missing");
          return;
        }
        const fallback = image.getAttribute("data-cms-fallback") || originalSrc;
        const current = image.getAttribute("src") || "";
        if (fallback && current !== fallback && resolveSitePath(fallback) !== current) {
          image.classList.remove("cms-image-missing");
          image.src = resolveSitePath(fallback);
          return;
        }
        // Keep frame visible; do not display:none away the only photo slot.
        image.classList.remove("cms-image-missing");
      };
      image.addEventListener("error", recover);
      image.addEventListener("load", () => image.classList.remove("cms-image-missing"));
      if (image.complete) recover();
    });
  };

  const applyHeroVideos = (settings) => {
    if (!heroVideo) return;
    window.clearInterval(heroVideoTimer);
    heroVideo.loop = true;
    heroVideo.setAttribute("loop", "");
    heroVideo.setAttribute("playsinline", "");
    heroVideo.muted = true;
    const restart = () => {
      try {
        heroVideo.currentTime = 0;
        heroVideo.play().catch(() => {});
      } catch (_) { /* ignore */ }
    };
    if (!heroVideo.dataset.cmsLoopBound) {
      heroVideo.dataset.cmsLoopBound = "true";
      heroVideo.addEventListener("ended", restart);
      heroVideo.addEventListener("pause", () => {
        if (heroVideo.ended || heroVideo.currentTime >= (heroVideo.duration || 0) - 0.15) restart();
      });
    }
    const items = Array.isArray(settings?.items)
      ? settings.items.filter((item) => typeof item === "string" && /^\/(?:uploads\/[\w.-]+|assets\/videos\/[\w./-]+)$/.test(item)).slice(0, 12)
      : [];
    if (!items.length) {
      // Default HTML uses <source> only (no video[src]). Keep the file playing without
      // calling load() unless the source actually changed (load() aborts in-flight play).
      const source = heroVideo.querySelector("source");
      const fallback = originalHeroVideo
        || source?.getAttribute("src")
        || "/assets/videos/hero-loop.mp4";
      const fallbackPath = resolveSitePath(fallback);
      const currentPath = heroVideo.currentSrc || source?.src || "";
      const needsSwap = !currentPath
        || (!currentPath.includes("hero-loop.mp4") && !currentPath.includes("gx010514-loop.mp4") && fallbackPath && !currentPath.endsWith(fallbackPath.split("/").pop()));
      if (heroVideo.getAttribute("src")) heroVideo.removeAttribute("src");
      if (needsSwap) {
        if (source) source.src = fallbackPath.startsWith("http") ? fallback : fallbackPath;
        else {
          const next = document.createElement("source");
          next.src = fallback;
          next.type = "video/mp4";
          heroVideo.append(next);
        }
        try { heroVideo.load(); } catch (_) { /* ignore */ }
      }
      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        const kick = () => {
          heroVideo.muted = true;
          heroVideo.defaultMuted = true;
          heroVideo.loop = true;
          if (!heroVideo.paused && heroVideo.readyState >= 2) return;
          heroVideo.play().catch((error) => {
            if (error.name !== "AbortError") console.error("Could not resume the original hero video.", error);
          });
        };
        if (heroVideo.readyState >= 2) kick();
        else heroVideo.addEventListener("canplay", kick, { once: true });
        window.setTimeout(kick, 500);
      }
      return;
    }
    let index = 0;
    const playCurrent = () => {
      heroVideo.src = resolveSitePath(items[index % items.length]);
      heroVideo.loop = items.length === 1;
      heroVideo.load();
      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        heroVideo.play().catch((error) => {
          if (error.name !== "AbortError") console.error("The rotating hero video could not start.", error);
        });
      }
      index += 1;
    };
    playCurrent();
    if (items.length > 1 && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const interval = Math.max(3, Math.min(300, Number(settings.interval) || 8));
      heroVideoTimer = window.setInterval(playCurrent, interval * 1000);
    }
  };

  const applyStyle = (element, styles = {}) => {
    const allowed = {
      width: (value) => `${Math.max(40, Math.min(2400, Number(value)))}px`,
      height: (value) => `${Math.max(30, Math.min(1800, Number(value)))}px`,
      minHeight: (value) => `${Math.max(120, Math.min(4000, Number(value)))}px`,
      fontSize: (value) => `${Math.max(8, Math.min(300, Number(value)))}px`,
      left: (value) => `${Math.max(-4000, Math.min(4000, Number(value)))}px`,
      top: (value) => `${Math.max(-4000, Math.min(4000, Number(value)))}px`,
      zIndex: (value) => String(Math.max(-9999, Math.min(9999, Number(value)))),
      color: (value) => /^#[0-9a-f]{3,8}$/i.test(value) ? value : null,
      backgroundColor: (value) => /^#[0-9a-f]{3,8}$/i.test(value) ? value : null,
      borderColor: (value) => /^#[0-9a-f]{3,8}$/i.test(value) ? value : null,
      borderWidth: (value) => `${Math.max(0, Math.min(40, Number(value)))}px`,
      borderRadius: (value) => `${Math.max(0, Math.min(400, Number(value)))}px`,
      opacity: (value) => String(Math.max(0, Math.min(1, Number(value)))),
      lineHeight: (value) => String(Math.max(0.8, Math.min(3, Number(value)))),
      letterSpacing: (value) => `${Math.max(-5, Math.min(40, Number(value)))}px`,
      fontWeight: (value) => ["400", "600", "700", "800"].includes(String(value)) ? value : null,
      fontStyle: (value) => value === "italic" ? value : null,
      textDecoration: (value) => value === "underline" ? value : null,
      textAlign: (value) => ["left", "center", "right", "justify"].includes(value) ? value : null,
      textShadow: (value) => value === "1" ? "0 2px 12px rgba(0,0,0,.38)" : null,
      filter: (value) => ["grayscale(1)", "sepia(1)", "brightness(1.15)", "contrast(1.15)", "none"].includes(value) ? value : null,
      maxWidth: (value) => value === "none" ? value : null,
      fontFamily: (value) => ["inherit", "Georgia, serif", "Arial, sans-serif", "custom"].includes(value) ? value : null,
    };

    // Story cards, the stakes note, and headings inside .story-section stay in
    // normal flow. Free-drag left/top was stacking that copy on top of itself.
    const lockFlowLayout = Boolean(
      element.matches?.(".hero-shade, .hero-media, .hero-video, .hero")
      || element.closest?.(".story-section, .hero-shade, .hero-media"),
    );
    if (!lockFlowLayout && styles.rotate !== undefined) {
      element.style.transform = `rotate(${Math.max(-180, Math.min(180, Number(styles.rotate)))}deg)`;
    }
    const nextStyles = lockFlowLayout
      ? Object.fromEntries(Object.entries(styles).filter(([name]) => name !== "left" && name !== "top"))
      : styles;
    if (nextStyles.left !== undefined || nextStyles.top !== undefined) element.dataset.cmsKeepOffset = "true";
    if (nextStyles.borderWidth !== undefined && Number(nextStyles.borderWidth) > 0) element.style.borderStyle = "solid";

    Object.entries(nextStyles).forEach(([name, value]) => {
      if (!Object.hasOwn(allowed, name)) return;
      if (lockFlowLayout && (name === "left" || name === "top")) return;
      const cssValue = allowed[name](value);
      if (cssValue) {
        element.style[name] = name === "fontFamily" && value === "custom" ? "LiamImportedFont, sans-serif" : cssValue;
        if (!lockFlowLayout && (name === "zIndex" || name === "left" || name === "top") && getComputedStyle(element).position === "static") element.style.position = "relative";
      }
    });
    if (lockFlowLayout) {
      element.style.removeProperty("left");
      element.style.removeProperty("top");
      element.style.removeProperty("inset");
      element.style.removeProperty("position");
      element.style.removeProperty("transform");
      delete element.dataset.cmsKeepOffset;
    }
  };

  const imageFrameFor = (media) => {
    if (media instanceof HTMLVideoElement) return media.closest(".hero") || media;
    return media?.closest(
      ".service-image-wrap, .project-image-wrap, .about-image-wrap, .featured-image, .dialog-image, .cms-added-image, .cms-stock-image",
    ) || media;
  };
  const isBuiltInImageFrame = (frame) => frame?.matches?.(
    ".project-image-wrap, .service-image-wrap, .about-image-wrap, .featured-image, .dialog-image",
  );
  const isUploadedImageFrame = (frame) => frame?.matches?.(".cms-added-image, .cms-stock-image");
  const applyImageResize = (media, dimensions) => {
    if (!(media instanceof HTMLImageElement || media instanceof HTMLVideoElement) || !dimensions) return;
    const width = Math.max(40, Math.min(2400, Number(dimensions.width) || 0));
    const height = Math.max(30, Math.min(1800, Number(dimensions.height) || 0));
    if (!width || !height) return;
    const frame = imageFrameFor(media);
    // Card frames must stay in layout — freefloat offsets were hiding portfolio photos.
    if (isBuiltInImageFrame(frame)) {
      frame.style.width = "";
      frame.style.height = "";
      frame.style.aspectRatio = "";
      frame.style.maxWidth = "";
      frame.style.left = "";
      frame.style.top = "";
      frame.style.position = "";
      media.style.width = "100%";
      media.style.height = "100%";
      media.style.maxWidth = "none";
      media.style.objectFit = media.style.objectFit || "cover";
      return;
    }
    // Uploaded images: lock the figure box; never stretch the img to 100% of the section.
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
      if (media !== box) {
        media.style.width = "100%";
        media.style.height = "100%";
        media.style.maxWidth = "none";
      }
      media.style.objectFit = media.style.objectFit || "cover";
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
      media.style.height = "auto";
      media.style.aspectRatio = `${width} / ${height}`;
      media.style.maxWidth = "none";
    }
  };

  const renderContentBlock = (block) => {
    const section = document.getElementById(block.sectionId);
    if (!section || !/^content-block-[\w-]+$/.test(block.id || "") ||
        document.getElementById(block.id)) return;
    const isImage = block.type === "image";
    const element = isImage ? document.createElement("figure") :
      document.createElement(block.type === "heading" ? "h3" : "p");
    element.className = `cms-added-content-block cms-added-${block.type} cms-published-addition`;
    element.id = block.id;
    element.dataset.cmsId = block.id;
    if (isImage && /^\/uploads\/[\w.-]+$/.test(block.image || "")) {
      const image = document.createElement("img");
      image.dataset.cmsId = `${block.id}-image`;
      image.src = resolveSitePath(block.image);
      image.alt = typeof block.alt === "string" ? block.alt : "";
      image.loading = "lazy";
      element.append(image);
    } else if (!isImage) {
      element.textContent = typeof block.text === "string" ? block.text : "";
    } else {
      return;
    }
    section.append(element);
  };

  const renderElementCopies = (copies) => {
    if (!Array.isArray(copies)) return;
    copies.forEach((copy) => {
      if (!copy || !/^element-copy-[\w-]+$/.test(copy.id || "") ||
          !["p", "h2", "h3", "h4", "span", "a", "button", "img"].includes(copy.tag) ||
          document.getElementById(copy.id)) return;
      const parent = getContentElement(copy.parentId);
      if (!parent) return;
      const element = document.createElement(copy.tag);
      element.id = copy.id;
      element.dataset.cmsId = copy.id;
      element.classList.add("cms-published-addition");
      if (copy.tag === "img") {
        if (!/^(?:\/uploads\/[\w.-]+|\/assets\/[\w./-]+)$/.test(copy.src || "") || copy.src.includes("..")) return;
        element.src = resolveSitePath(copy.src);
        element.alt = typeof copy.alt === "string" ? copy.alt : "";
        element.loading = "lazy";
      } else {
        element.textContent = typeof copy.text === "string" ? copy.text : "";
        if (copy.tag === "a" && /^(https?:|mailto:|\/(?!\/)|#)/i.test(copy.href || "")) {
          element.setAttribute("href", copy.href);
        }
      }
      const after = getContentElement(copy.afterId);
      if (after) after.after(element);
      else parent.append(element);
    });
  };

  const renderSectionCopies = (copies) => {
    const root = document.querySelector("main");
    if (!root || !Array.isArray(copies)) return;
    copies.forEach((copy) => {
      if (!copy || !/^section-copy-[\w-]+$/.test(copy.id || "") ||
          !/^[\w-]+$/.test(copy.sourceId || "") || document.getElementById(copy.id)) return;
      const source = [...root.querySelectorAll(":scope > section")]
        .find((section) => section.dataset.cmsId === copy.sourceId);
      if (!source || source.querySelector("form,iframe,video")) return;
      const clone = source.cloneNode(true);
      clone.classList.add("cms-published-addition", "cms-section-copy");
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
      sourceNodes.forEach((_sourceNode, index) => {
        const cloneNode = cloneNodes[index];
        if (cloneNode) cloneNode.dataset.cmsId = index === 0 ? copy.id : `${copy.id}-element-${index}`;
      });
      root.append(clone);
    });
  };

  const renderService = (service) => {
    const grid = document.querySelector(".services-grid");
    if (!grid || !service?.id || document.getElementById(`service-${service.id}`)) return;
    if (!/^custom-[\w-]+$/.test(service.id) || !/^\/(?:uploads\/[\w.-]+|assets\/images\/[\w./-]+)$/.test(service.image || "")) return;
    const article = document.createElement("article");
    article.className = "service-card cms-published-addition";
    article.id = `service-${service.id}`;
    article.dataset.serviceId = service.id;
    article.dataset.cmsId = `service-${service.id}`;
    article.innerHTML = `
      <button class="service-open" type="button"
        data-service-title=""
        data-service-summary=""
        data-service-description=""
        data-service-example=""
        data-service-image=""
        data-service-alt=""
        aria-label="">
        <span class="service-image-wrap"><img loading="lazy" width="900" height="650"><span class="service-image-action" aria-hidden="true">Explore service <span>↗</span></span></span>
        <span class="service-card-copy"><span class="service-number"></span><span class="service-title"></span><span class="service-summary"></span></span>
      </button>`;
    const button = article.querySelector(".service-open");
    button.dataset.serviceTitle = service.title || "";
    button.dataset.serviceSummary = service.summary || "";
    button.dataset.serviceDescription = service.description || "";
    button.dataset.serviceExample = service.example || "";
    button.dataset.serviceImage = resolveSitePath(service.image);
    button.dataset.serviceAlt = service.alt || service.title || "";
    button.setAttribute("aria-label", `Learn more about ${service.title || "service"}`);
    article.querySelector("img").src = resolveSitePath(service.image);
    article.querySelector("img").alt = service.alt || service.title || "";
    article.querySelector(".service-number").textContent = String(grid.children.length + 1).padStart(2, "0");
    article.querySelector(".service-title").textContent = service.title || "";
    article.querySelector(".service-summary").textContent = service.summary || "";
    grid.append(article);
  };

  const renderProject = (project) => {
    const grid = document.querySelector(".portfolio-grid");
    if (!grid || !project?.id || !project.title || !project.image) return;
    const existing = document.getElementById(`project-${project.id}`);
    if (existing) {
      existing.classList.add("cms-published-addition");
      return;
    }
    const card = document.createElement("article");
    card.className = "project-card";
    card.classList.add("cms-published-addition");
    card.id = `project-${project.id}`;
    card.dataset.category = project.category || "activation";
    card.dataset.projectUrl = `${siteBaseUrl}/projects/?project=${encodeURIComponent(project.id)}`;
    card.setAttribute("role", "link");
    card.tabIndex = 0;
    card.setAttribute("aria-label", `View case study: ${project.title}`);
    card.innerHTML = '<div class="project-image-wrap"><img loading="lazy" width="1200" height="800"><span class="project-index"></span></div><div class="project-meta"><span></span><span></span></div><h3></h3><p class="project-description"></p><p class="project-role"><span>MY ROLE</span></p>';
    card.querySelector("img").src = resolveSitePath(project.image);
    card.querySelector("img").alt = project.alt || project.title;
    card.querySelector(".project-index").textContent = String(grid.children.length + 1).padStart(2, "0");
    card.querySelector(".project-meta span:first-child").textContent = project.client || "Independent";
    card.querySelector(".project-meta span:last-child").textContent = project.location || "";
    card.querySelector("h3").textContent = project.title;
    card.querySelector(".project-description").textContent = project.description || "";
    card.querySelector(".project-role").append(document.createTextNode(project.role || ""));
    card.dataset.cmsId = `project-${project.id}`;
    grid.append(card);
  };

  const renderSection = (section) => {
    const main = document.querySelector("main");
    if (!main || !section?.id) return;
    const existing = document.getElementById(section.id);
    if (existing) {
      existing.classList.add("cms-published-addition");
      return;
    }
    const element = document.createElement("section");
    element.className = "added-page-section section-pad cms-published-addition";
    element.id = section.id;
    element.dataset.cmsId = section.id;
    const width = document.createElement("div");
    width.className = "page-width";
    const title = document.createElement("h2");
    title.textContent = section.title || "New page";
    title.dataset.cmsId = `${section.id}-title`;
    const paragraph = document.createElement("p");
    paragraph.textContent = section.text || "Add your content here.";
    paragraph.dataset.cmsId = `${section.id}-text`;
    width.append(title, paragraph);
    element.append(width);
    main.append(element);
  };

  const injectCustomPageNav = (rootContent) => {
    const nav = document.querySelector(".primary-navigation");
    if (!nav) return;
    nav.querySelectorAll("a[data-cms-custom-page]").forEach((link) => link.remove());
    (rootContent.customPages || []).forEach((page) => {
      if (!page || page.showInNav === false || typeof page.slug !== "string" || !page.slug.trim()) return;
      const link = document.createElement("a");
      link.href = resolveSitePath(`/pages/?page=${encodeURIComponent(page.slug)}`);
      link.textContent = String(page.navLabel || page.title || page.slug).slice(0, 80);
      link.dataset.cmsCustomPage = page.slug;
      const cta = nav.querySelector(".nav-cta");
      if (cta) nav.insertBefore(link, cta);
      else nav.append(link);
    });
  };

  const applyContent = (rawContent) => {
    if (!rawContent || typeof rawContent !== "object") return;
    const pageSlug = (new URLSearchParams(location.search).get("page") || document.body.dataset.pageSlug || "").trim();
    const customPage = pageSlug && Array.isArray(rawContent.customPages)
      ? rawContent.customPages.find((page) => page && page.slug === pageSlug)
      : null;
    if (customPage) {
      document.querySelector("main")?.replaceChildren();
      const pageTitle = String(customPage.title || customPage.slug).slice(0, 160);
      document.title = `${pageTitle} | Captain Campaign`;
    } else if (pageSlug && /\/pages\//.test(location.pathname)) {
      document.querySelector("main")?.replaceChildren();
      const missing = document.createElement("section");
      missing.className = "section-pad";
      missing.innerHTML = `<div class="page-width"><h1>Page not found</h1><p>This custom page is not published yet.</p><p><a href="${resolveSitePath("/")}">Back home</a></p></div>`;
      document.querySelector("main")?.append(missing);
      injectCustomPageNav(rawContent);
      appliedContent = rawContent;
      return;
    }
    const content = customPage ? {
      ...rawContent,
      edits: customPage.edits || {},
      sections: customPage.sections || [],
      sectionOrder: customPage.sectionOrder || [],
      sectionCopies: customPage.sectionCopies || [],
      contentBlocks: customPage.contentBlocks || [],
      elementCopies: customPage.elementCopies || [],
      projects: customPage.projects || [],
      services: customPage.services || [],
      buttons: customPage.buttons || [],
      mediaElements: customPage.mediaElements || [],
      shapes: customPage.shapes || [],
      groups: customPage.groups || [],
      heroVideos: null,
    } : rawContent;
    appliedContent = content;

    baseline.forEach((original, id) => {
      if (customPage) return;
      const element = getContentElement(id);
      if (!element) return;
      // Only restore HTML on leaf text nodes — never on wraps/cards (that wiped portfolio <img> tags).
      if (original.html !== null && element.matches(textSelector) && !element.querySelector("img, video, .project-image-wrap, .service-image-wrap")) {
        element.innerHTML = original.html;
      }
      const previousSrc = element.getAttribute("src");
      for (const [attribute, value] of [["src", original.src], ["alt", original.alt], ["href", original.href], ["style", original.style]]) {
        if (!(attribute in element) && attribute !== "style") continue;
        if (element instanceof HTMLVideoElement && attribute === "src" && content.heroVideos?.items?.length) continue;
        if (attribute === "src" && !(element instanceof HTMLImageElement || element instanceof HTMLVideoElement || element instanceof HTMLIFrameElement)) continue;
        if (value === null) element.removeAttribute(attribute);
        else element.setAttribute(attribute, value);
      }
      if (original.hidden) element.setAttribute("hidden", "");
      else element.removeAttribute("hidden");
      if (original.serviceImage === undefined) delete element.dataset.serviceImage;
      else element.dataset.serviceImage = original.serviceImage;
      if (original.serviceDescription === undefined) delete element.dataset.serviceDescription;
      else element.dataset.serviceDescription = original.serviceDescription;
      if (original.serviceExample === undefined) delete element.dataset.serviceExample;
      else element.dataset.serviceExample = original.serviceExample;
      if (element instanceof HTMLVideoElement && !content.heroVideos?.items?.length && previousSrc !== original.src) {
        element.load();
        if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          element.play().catch((error) => console.error("The background video could not start.", error));
        }
      }
    });

    const additionIds = new Set([
      ...(content.sections || []).map((section) => section.id),
      ...(content.sectionCopies || []).map((section) => section.id),
      ...(content.projects || []).map((project) => `project-${project.id}`),
      ...(content.services || []).map((service) => `service-${service.id}`),
      ...(content.contentBlocks || []).map((block) => block.id),
      ...(content.elementCopies || []).map((copy) => copy.id),
      ...(content.buttons || []).map((item) => item.id),
      ...(content.mediaElements || []).map((item) => item.id),
    ]);
    document.querySelectorAll(".cms-published-addition").forEach((element) => {
      if (!additionIds.has(element.dataset.cmsId) && !additionIds.has(element.id)) element.remove();
    });
    document.querySelectorAll(".cms-stock-credit").forEach((caption) => caption.remove());
    if (!customPage) originalSections.forEach((section) => document.querySelector("main")?.append(section));
    (content.sections || []).forEach(renderSection);
    (content.projects || []).forEach(renderProject);
    (content.services || []).forEach(renderService);
    (content.contentBlocks || []).forEach(renderContentBlock);
    (content.mediaElements || []).forEach((item) => {
      if (!item || !/^stock-image-[\w-]+$/.test(item.id || "") ||
          !/^\/uploads\/[\w.-]+$/.test(item.image || "")) return;
      const section = document.getElementById(item.sectionId);
      if (!section || document.getElementById(item.id)) return;
      const figure = document.createElement("figure");
      figure.className = "cms-stock-image cms-published-addition";
      figure.id = item.id;
      figure.dataset.cmsId = item.id;
      const image = document.createElement("img");
      image.dataset.cmsId = `${item.id}-image`;
      image.src = resolveSitePath(item.image);
      image.alt = typeof item.alt === "string" ? item.alt : "";
      image.loading = "lazy";
      figure.append(image);
      if (item.credit) renderCredit(image, item.credit, figure);
      section.append(figure);
    });
    assignContentIds();
    renderSectionCopies(content.sectionCopies);
    assignContentIds();
    renderElementCopies(content.elementCopies);
    assignContentIds();

    // Keep card label fallbacks before edits so empty text payloads can be repaired.
    document.querySelectorAll(".service-open").forEach((button) => {
      const title = button.querySelector(".service-title")?.textContent?.trim() || "";
      const summary = button.querySelector(".service-summary")?.textContent?.trim() || "";
      if (title) button.dataset.serviceTitle = button.dataset.serviceTitle || title;
      if (summary) button.dataset.serviceSummary = button.dataset.serviceSummary || summary;
    });

    Object.entries(content.edits || {}).forEach(([id, edit]) => {
      const element = getContentElement(id);
      if (!element) return;
      if (edit.deleted) {
        element.hidden = true;
        return;
      }
      if (typeof edit.text === "string" && element.matches(textSelector)) {
        const isServiceCopy = element.matches?.(".service-title, .service-summary, .service-number");
        if (!(isServiceCopy && !edit.text.trim())) {
          element.textContent = edit.text;
          element.style.whiteSpace = "pre-line";
        }
      }
      if (element.matches(".service-open")) {
        if (typeof edit.serviceDescription === "string") element.dataset.serviceDescription = edit.serviceDescription;
        if (typeof edit.serviceExample === "string") element.dataset.serviceExample = edit.serviceExample;
        if (typeof edit.serviceSummary === "string" && edit.serviceSummary.trim()) {
          element.dataset.serviceSummary = edit.serviceSummary;
        }
        if (typeof edit.serviceBookHref === "string" && /^(https?:|mailto:|\/|#)/i.test(edit.serviceBookHref)) {
          element.dataset.serviceBookHref = edit.serviceBookHref;
        }
        if (typeof edit.serviceImage === "string" && /^\/(?:uploads\/[\w.-]+|assets\/(?:images|videos)\/[\w./-]+)$/.test(edit.serviceImage)) {
          element.dataset.serviceImage = edit.serviceImage;
          const img = element.querySelector("img");
          if (img) img.src = resolveSitePath(edit.serviceImage);
        }
      }
      if (typeof edit.sectionMargin === "number" && edit.sectionMargin > 0 && element.tagName === "SECTION") {
        element.style.setProperty("padding-inline", `${Math.max(0, Math.min(160, edit.sectionMargin))}px`);
      }
      if (typeof edit.alt === "string" && element instanceof HTMLImageElement) element.alt = edit.alt;
      if (edit.crop && element instanceof HTMLImageElement) {
        element.style.objectFit = ["cover", "contain", "fill"].includes(edit.crop.fit) ? edit.crop.fit : "cover";
        const x = Math.max(0, Math.min(100, Number(edit.crop.x) || 0));
        const y = Math.max(0, Math.min(100, Number(edit.crop.y) || 0));
        const zoom = Math.max(100, Math.min(220, Number(edit.crop.zoom) || 100));
        element.style.objectPosition = `${x}% ${y}%`;
        if (zoom !== 100) element.style.transform = `scale(${zoom / 100})`;
      }
      const legacyResize = edit.styles?.width && edit.styles?.height
        ? { width: edit.styles.width, height: edit.styles.height, offsetX: edit.styles.left, offsetY: edit.styles.top }
        : null;
      if ((element instanceof HTMLImageElement || element instanceof HTMLVideoElement) && (edit.resize || legacyResize)) {
        applyImageResize(element, edit.resize || legacyResize);
      }
      if (typeof edit.href === "string" && element instanceof HTMLAnchorElement && /^(https?:|mailto:|\/|#)/i.test(edit.href)) {
        element.setAttribute("href", edit.href);
      }
      if (typeof edit.src === "string" && element instanceof HTMLIFrameElement && /^(https:\/\/|\/(?!\/))/i.test(edit.src)) {
        element.src = resolveSitePath(edit.src);
      }
      if (typeof edit.media === "string" && /^\/(?:uploads\/[\w.-]+|assets\/(?:images|videos)\/[\w./-]+)$/.test(edit.media)) {
        if (element instanceof HTMLImageElement) {
          const nextSrc = resolveSitePath(edit.media);
          const fallback = baseline.get(id)?.src
            || element.getAttribute("data-cms-fallback")
            || element.getAttribute("src")
            || "";
          if (fallback) element.setAttribute("data-cms-fallback", fallback);
          element.classList.remove("cms-image-missing");
          const onFail = () => {
            const back = element.getAttribute("data-cms-fallback") || fallback;
            if (back && element.getAttribute("src") !== resolveSitePath(back)) {
              element.src = resolveSitePath(back);
            }
            element.classList.remove("cms-image-missing");
          };
          element.addEventListener("error", onFail, { once: true });
          element.src = nextSrc;
          const serviceButton = element.closest(".service-open");
          if (serviceButton) serviceButton.dataset.serviceImage = edit.media;
        }
        if (element instanceof HTMLVideoElement) {
          element.src = resolveSitePath(edit.media);
          element.loop = true;
          element.load();
          element.play().catch((error) => console.error("The edited background video could not start.", error));
        }
      }
      const styles = { ...(edit.styles || {}) };
      if ((element instanceof HTMLImageElement || element instanceof HTMLVideoElement) && (edit.resize || legacyResize)) {
        delete styles.width;
        delete styles.height;
        delete styles.maxWidth;
        delete styles.left;
        delete styles.top;
      }
      applyStyle(element, styles);
      applyAnimation(element, edit.animation);
      const previousSlideshow = slideshowTimers.get(element);
      if (previousSlideshow) window.clearInterval(previousSlideshow);
      if (edit.slideshow?.items?.length && element instanceof HTMLImageElement) {
        const items = edit.slideshow.items.filter((item) => typeof item === "string" && /^\/uploads\/[\w.-]+$/.test(item)).slice(0, 30);
        if (items.length) {
          let index = 0;
          element.src = resolveSitePath(items[0]);
          const interval = Math.max(2, Math.min(300, Number(edit.slideshow.interval) || 5));
          if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) slideshowTimers.set(element, window.setInterval(() => {
            index = (index + 1) % items.length;
            element.src = resolveSitePath(items[index]);
          }, interval * 1000));
        }
      }
      if (edit.credit && element instanceof HTMLImageElement) renderCredit(element, edit.credit);
    });

    document.querySelectorAll(".service-open").forEach((button) => {
      const title = button.querySelector(".service-title");
      const summary = button.querySelector(".service-summary");
      if (title && !title.textContent.trim() && button.dataset.serviceTitle) {
        title.textContent = button.dataset.serviceTitle;
      }
      if (summary && !summary.textContent.trim() && button.dataset.serviceSummary) {
        summary.textContent = button.dataset.serviceSummary;
      }
    });

    const themes = {
      original: { "--forest": "#1A2B49", "--forest-deep": "#122038", "--lime": "#FFB81C", "--lime-dark": "#E5A410", "--site-font": '"Avenir Next", Avenir, "Segoe UI", sans-serif' },
      coastal: { "--forest": "#1c3038", "--forest-deep": "#122128", "--lime": "#82d4ce", "--lime-dark": "#55a8a2", "--paper": "#f0f3ef" },
      sunset: { "--forest": "#3b2825", "--forest-deep": "#241a19", "--lime": "#f4b77a", "--lime-dark": "#d68d59", "--paper": "#f7eee7" },
      violet: { "--forest": "#302641", "--forest-deep": "#1d1728", "--lime": "#c7a6ed", "--lime-dark": "#9f7bc9", "--paper": "#f3eef8" },
    };
    ["--forest", "--forest-deep", "--lime", "--lime-dark", "--paper", "--site-font"].forEach((property) => {
      document.documentElement.style.removeProperty(property);
    });
    Object.entries(themes[content.theme] || themes.original || {}).forEach(([property, value]) => {
      document.documentElement.style.setProperty(property, value);
    });
    document.documentElement.style.setProperty(
      "--site-font",
      content.fontFile ? "LiamImportedFont, sans-serif" :
        (content.fontFamily && content.fontFamily !== "inherit" && content.fontFamily !== "custom" ? content.fontFamily : '"Avenir Next", Avenir, "Segoe UI", sans-serif'),
    );
    applyGoogleFont(content.googleFont);
    if (content.fontFile?.url && /^\/uploads\/[\w.-]+$/.test(content.fontFile.url)) {
      const fontStyle = document.querySelector("#imported-site-font") || document.createElement("style");
      fontStyle.id = "imported-site-font";
      const format = ["woff2", "woff", "truetype", "opentype"].includes(content.fontFile.format) ? content.fontFile.format : "woff2";
      fontStyle.textContent = `@font-face{font-family:LiamImportedFont;src:url("${resolveSitePath(content.fontFile.url)}") format("${format}");font-display:swap}`;
      document.head.append(fontStyle);
    } else {
      document.querySelector("#imported-site-font")?.remove();
    }

    (content.sectionOrder || []).forEach((id) => {
      const section = getContentElement(id);
      if (section?.tagName === "SECTION") document.querySelector("main")?.append(section);
    });
    (content.shapes || []).forEach((shape) => {
      if (!shape || !/^shape-[\w-]+$/.test(shape.id || "")) return;
      const section = document.getElementById(shape.sectionId) || document.querySelector("main");
      if (!section || document.getElementById(shape.id)) return;
      if (!["rectangle", "circle", "line", "note"].includes(shape.kind)) return;
      const kinds = { rectangle: "div", circle: "div", line: "div", note: "p" };
      const element = document.createElement(kinds[shape.kind] || "div");
      element.className = `cms-added-content-block cms-shape cms-shape-${shape.kind} cms-published-addition`;
      element.id = shape.id;
      element.dataset.cmsId = shape.id;
      if (shape.text) element.textContent = shape.text;
      section.append(element);
    });
    assignContentIds();
    (content.buttons || []).forEach((item) => {
      if (!item || !/^custom-cta-[\w-]+$/.test(item.id || "") ||
          !/^(https:\/\/[^\s]+|mailto:[^\s@]+@[^\s@]+|\/(?!\/)[^\s]*|#[\w-]+)$/i.test(item.href || "") ||
          typeof item.label !== "string" || !item.label.trim()) return;
      const section = document.getElementById(item.sectionId) || document.querySelector("main");
      if (!section || document.getElementById(item.id)) return;
      let group = section.querySelector(".custom-cta-group");
      if (!group) {
        group = document.createElement("div");
        group.className = "custom-cta-group";
        section.append(group);
      }
      const link = document.createElement("a");
      link.className = "button button-lime custom-cta cms-published-addition";
      link.id = item.id;
      link.dataset.cmsId = item.id;
      link.href = item.href;
      link.textContent = item.label;
      group.append(link);
    });
    applyHeroVideos(content.heroVideos);
    const sectionMargin = Number(content.sectionMargin);
    if (Number.isFinite(sectionMargin) && sectionMargin > 0) {
      const px = Math.max(0, Math.min(160, Math.round(sectionMargin)));
      document.body.classList.add("cms-uniform-section-margin");
      document.documentElement.style.setProperty("--cms-section-margin", `${px}px`);
      document.querySelectorAll("main > section").forEach((section) => {
        section.style.setProperty("padding-inline", `${px}px`);
      });
    } else {
      document.body.classList.remove("cms-uniform-section-margin");
      document.documentElement.style.removeProperty("--cms-section-margin");
    }
    const seo = content.seo || {};
    if (typeof seo.title === "string" && seo.title.trim()) {
      document.title = seo.title.trim().slice(0, 70);
      document.querySelector('meta[property="og:title"]')?.setAttribute("content", seo.title.trim().slice(0, 70));
      document.querySelector('meta[name="twitter:title"]')?.setAttribute("content", seo.title.trim().slice(0, 70));
    }
    if (typeof seo.description === "string" && seo.description.trim()) {
      document.querySelector('meta[name="description"]')?.setAttribute("content", seo.description.trim().slice(0, 160));
      document.querySelector('meta[property="og:description"]')?.setAttribute("content", seo.description.trim().slice(0, 160));
      document.querySelector('meta[name="twitter:description"]')?.setAttribute("content", seo.description.trim().slice(0, 160));
    }
    if (typeof seo.ogImage === "string" && seo.ogImage.trim()) {
      const imageUrl = resolveSitePath(seo.ogImage.trim());
      document.querySelector('meta[property="og:image"]')?.setAttribute("content", imageUrl);
      document.querySelector('meta[name="twitter:image"]')?.setAttribute("content", imageUrl);
    }
    if (typeof seo.canonical === "string" && seo.canonical.trim()) {
      const link = document.querySelector('link[rel="canonical"]') || document.createElement("link");
      link.rel = "canonical";
      link.href = seo.canonical.startsWith("http") ? seo.canonical : `${location.origin}${siteBaseUrl}${seo.canonical.startsWith("/") ? "" : "/"}${seo.canonical}`;
      document.head.append(link);
    }
    const ga4 = content.analytics?.ga4;
    if (typeof ga4 === "string" && /^G-[A-Z0-9]+$/i.test(ga4) && !document.getElementById("cms-ga4")) {
      const script = document.createElement("script");
      script.id = "cms-ga4";
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${ga4}`;
      document.head.append(script);
      const inline = document.createElement("script");
      inline.textContent = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config','${ga4}');`;
      document.head.append(inline);
    }
    document.querySelectorAll(".filter-button").forEach((button) => {
      if (button.dataset.cmsFilterBound) return;
      button.dataset.cmsFilterBound = "true";
      button.addEventListener("click", () => {
        const filter = document.querySelector(".filter-button.is-active")?.dataset.filter || "all";
        const customCards = [...document.querySelectorAll(".project-card[id^='project-custom-']")];
        customCards.forEach((card) => { card.hidden = filter !== "all" && card.dataset.category !== filter; });
        const visibleCards = [...document.querySelectorAll(".project-card")].filter((card) => !card.hidden);
        const emptyMessage = document.querySelector(".portfolio-empty");
        if (emptyMessage) emptyMessage.hidden = visibleCards.length > 0;
      });
    });
    injectCustomPageNav(rawContent);
  };

  window.addEventListener("resize", () => {
    window.clearTimeout(imageResizeTimer);
    imageResizeTimer = window.setTimeout(() => {
      Object.entries(appliedContent?.edits || {}).forEach(([id, edit]) => {
        const image = getContentElement(id);
        const legacyResize = edit.styles?.width && edit.styles?.height
          ? { width: edit.styles.width, height: edit.styles.height, offsetX: edit.styles.left, offsetY: edit.styles.top }
          : null;
        if (image instanceof HTMLImageElement && (edit.resize || legacyResize)) {
          applyImageResize(image, edit.resize || legacyResize);
        }
        const video = getContentElement(id);
        if (video instanceof HTMLVideoElement && (edit.resize || legacyResize)) {
          applyImageResize(video, edit.resize || legacyResize);
        }
      });
    }, 100);
  });

  const updatePublishedContent = async () => {
    if (!contentUrl) return;
    const response = await fetch(contentUrl, { cache: "no-store" });
    if (response.status === 404) return;
    if (!response.ok) throw new Error(`Could not load published site edits (${response.status}).`);
    applyContent(await response.json());
  };

  assignContentIds();
  watchBrokenImages();
  updatePublishedContent().catch((error) => console.error(error));

  if ("BroadcastChannel" in window) {
    const updates = new BroadcastChannel("liam-site-updates");
    updates.addEventListener("message", (event) => {
      if (event.data === "published") {
        updatePublishedContent().catch((error) => console.error(error));
        watchBrokenImages();
      }
    });
  }
})();
