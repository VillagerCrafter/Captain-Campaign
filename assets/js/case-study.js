(() => {
  const config = document.querySelector("#case-study-config");
  const status = document.querySelector("#case-study-status");
  const title = document.querySelector("#case-study-title");
  const params = new URLSearchParams(window.location.search);
  let requestedId = params.get("project") || "";
  const isDraftPreview = params.get("preview") === "draft";
  const previewKey = "liam-portfolio-case-study-preview-v1";
  const isCmsEditor = document.body.classList.contains("cms-administrator");

  const showError = (message, { hard = true } = {}) => {
    if (title) {
      title.textContent = hard
        ? "This project could not be displayed."
        : "Choose a project to view";
    }
    if (status) status.textContent = message;
  };

  const imagePath = (path, baseUrl) => {
    if (typeof path !== "string" || !/^\/(?:assets|uploads)\/[\w./-]+$/.test(path) ||
        path.split("/").includes("..")) {
      throw new Error("The project image path is invalid.");
    }
    return `${baseUrl}${path}`;
  };

  const safePhotoPath = (path) => (
    typeof path === "string"
    && /^\/(?:assets|uploads)\/[\w./-]+$/.test(path)
    && !path.split("/").includes("..")
  );

  const withPhotoLayout = (project, content) => {
    if (!project || typeof project !== "object") return project;
    const mapped = content?.caseStudyLayouts?.[project.id];
    const photoLayout = project.photoLayout && typeof project.photoLayout === "object"
      ? project.photoLayout
      : (mapped && typeof mapped === "object" ? mapped : null);
    return photoLayout ? { ...project, photoLayout } : project;
  };

  const renderPhotoLayout = (project, baseUrl = "") => {
    const host = document.querySelector("#case-study-photo-layout");
    if (!host) return;
    host.replaceChildren();
    const layout = project.photoLayout;
    if (!layout || !Array.isArray(layout.slots) || !layout.slots.length) return;
    const grid = document.createElement("div");
    grid.className = `case-study-photo-layout case-study-photo-layout-${layout.template || "two-column"}`;
    layout.slots.forEach((slot, index) => {
      if (!safePhotoPath(slot?.image)) return;
      const figure = document.createElement("figure");
      figure.className = "case-study-photo-slot";
      figure.dataset.slotIndex = String(index);
      const img = document.createElement("img");
      img.src = `${baseUrl}${slot.image}`;
      img.alt = typeof slot.alt === "string" ? slot.alt : (slot.caption || project.title || "Project photo");
      img.loading = "lazy";
      figure.append(img);
      if (typeof slot.caption === "string" && slot.caption) {
        const caption = document.createElement("figcaption");
        caption.textContent = slot.caption;
        figure.append(caption);
      }
      grid.append(figure);
    });
    if (grid.children.length) host.append(grid);
  };

  const renderProject = (project, baseUrl) => {
    if (!project || typeof project !== "object" || !/^[\w-]{1,120}$/.test(project.id || "")) {
      showError("Choose a project from the portfolio to view its case study.");
      return;
    }
    const projectTitle = typeof project.title === "string" ? project.title : "";
    const description = typeof project.description === "string" ? project.description : "";
    document.title = `${projectTitle || "Project case study"} | Liam Bennicoff`;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.content = description.slice(0, 300);
    if (title) title.textContent = projectTitle;
    const client = document.querySelector("#case-study-client");
    if (client) client.textContent = project.client || "PROJECT CASE STUDY";
    const desc = document.querySelector("#case-study-description");
    if (desc) desc.textContent = description;
    const locationEl = document.querySelector("#case-study-location");
    if (locationEl) locationEl.textContent = project.location || "";
    const category = document.querySelector("#case-study-category");
    if (category) category.textContent = (project.category || "activation").replace(/^\w/, (letter) => letter.toUpperCase());
    const role = document.querySelector("#case-study-role");
    if (role) role.textContent = project.role || "";
    const image = document.querySelector("#case-study-image");
    if (image) {
      image.src = imagePath(project.image, baseUrl);
      image.alt = typeof project.alt === "string" ? project.alt : projectTitle;
    }
    const notice = document.querySelector("#case-study-preview-notice");
    if (notice) notice.hidden = !isDraftPreview;
    if (status) status.textContent = "";
    renderPhotoLayout(project, baseUrl);
    document.body.dataset.caseStudyProjectId = project.id;
    document.dispatchEvent(new CustomEvent("cms-case-study-ready", { detail: { id: project.id } }));
  };

  const renderEditorPicker = (projects, activeId) => {
    if (!isCmsEditor) return;
    const existing = document.querySelector("#case-study-editor-picker");
    existing?.remove();
    const list = document.createElement("div");
    list.id = "case-study-editor-picker";
    list.className = "case-study-editor-picker page-width";
    list.setAttribute("role", "navigation");
    list.setAttribute("aria-label", "Portfolio projects");
    const label = document.createElement("p");
    label.className = "case-study-editor-picker-label";
    label.textContent = "Portfolio projects";
    list.append(label);
    projects.slice(0, 40).forEach((project) => {
      if (!project?.id || !project.title) return;
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = project.title;
      button.setAttribute("aria-pressed", String(project.id === activeId));
      if (project.id === activeId) button.classList.add("is-active");
      button.addEventListener("click", () => {
        const url = new URL(window.location.href);
        url.searchParams.set("project", project.id);
        window.location.assign(url.toString());
      });
      list.append(button);
    });
    const host = document.querySelector(".case-study-hero .page-width") || status || title;
    host?.append(list);
  };

  const loadProject = async () => {
    try {
      if (!config || !status || !title) throw new Error("The case-study page is missing required content.");
      const baseProjects = JSON.parse(config.textContent || "[]");
      if (!Array.isArray(baseProjects)) throw new Error("The portfolio project list is invalid.");
      let content = null;
      if (isDraftPreview) {
        const draft = localStorage.getItem(previewKey);
        if (draft) {
          if (!isCmsEditor) localStorage.removeItem(previewKey);
          content = JSON.parse(draft);
        } else if (!isCmsEditor) {
          throw new Error("No local draft preview is available. Open this page from the editor.");
        }
      }
      if (!content) {
        const response = await fetch(config.dataset.contentUrl, { cache: "no-store" });
        if (!response.ok) throw new Error(`Could not load portfolio details (${response.status}).`);
        content = await response.json();
      }
      if (!content || content.version !== 1) throw new Error("The portfolio content has an unsupported version.");
      const allProjects = [
        ...(content.projects || []),
        ...baseProjects.filter((base) => !(content.projects || []).some((item) => item.id === base.id)),
      ].filter((project) => project && /^[\w-]{1,120}$/.test(project.id || ""))
        .map((project) => withPhotoLayout(project, content));
      const idValid = /^[\w-]{1,120}$/.test(requestedId);
      let project = idValid ? allProjects.find((item) => item.id === requestedId) : null;
      if (!project && isCmsEditor && allProjects.length) {
        project = allProjects[0];
        renderProject(project, config.dataset.siteBaseurl || "");
        renderEditorPicker(allProjects, project.id);
        if (status) status.textContent = "Showing the first available project. Use the project menu to switch.";
        return;
      }
      if (!project) {
        if (!idValid) {
          // Soft empty state — not a hard failure. Portfolio cards pass ?project=.
          showError("Choose a project from the portfolio to view its case study.", { hard: false });
          return;
        }
        showError("That case study is no longer available. Return to the portfolio to browse current work.");
        return;
      }
      renderProject(project, config.dataset.siteBaseurl || "");
      // Keep the portfolio navigator visible for every project while editing.
      if (isCmsEditor && allProjects.length) {
        renderEditorPicker(allProjects, project.id);
        if (status) status.textContent = "Switch projects with the menu above.";
      }
    } catch (error) {
      if (isCmsEditor) {
        if (title) title.textContent = "Case study editor";
        if (status) status.textContent = `${error.message} Use the project picker or open a project from Portfolio.`;
        return;
      }
      showError(error.message);
    }
  };

  loadProject();
})();
