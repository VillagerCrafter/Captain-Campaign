(() => {
  const heroVideo = document.querySelector(".hero-video");
  if (heroVideo) {
    const canAutoplay = () => !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ensureHeroPlaying = () => {
      if (!canAutoplay()) return;
      heroVideo.loop = true;
      heroVideo.setAttribute("loop", "");
      heroVideo.muted = true;
      heroVideo.defaultMuted = true;
      heroVideo.setAttribute("muted", "");
      heroVideo.setAttribute("playsinline", "");
      heroVideo.setAttribute("autoplay", "");
      const play = () => {
        const result = heroVideo.play();
        if (result && typeof result.catch === "function") {
          result.catch((error) => {
            if (error?.name === "AbortError") return;
            // Retry once after a short delay (covers interrupted loads).
            window.setTimeout(() => {
              heroVideo.play().catch((retryError) => {
                if (retryError?.name !== "AbortError") {
                  console.error("The background video could not start.", retryError);
                }
              });
            }, 250);
          });
        }
      };
      if (heroVideo.error || heroVideo.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) {
        try { heroVideo.load(); } catch (_) { /* ignore */ }
        heroVideo.addEventListener("loadeddata", play, { once: true });
      }
      play();
    };
    const restartHero = () => {
      try {
        heroVideo.currentTime = 0;
        ensureHeroPlaying();
      } catch (_) { /* ignore */ }
    };
    heroVideo.addEventListener("ended", restartHero);
    // Resume if the loop stalls near the end; avoid fighting intentional load()/pause races.
    heroVideo.addEventListener("pause", () => {
      if (!canAutoplay() || document.hidden) return;
      if (heroVideo.ended || heroVideo.currentTime >= (heroVideo.duration || 0) - 0.25) {
        restartHero();
      }
    });
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) window.setTimeout(ensureHeroPlaying, 50);
    });
    if (heroVideo.readyState >= 2) ensureHeroPlaying();
    else heroVideo.addEventListener("canplay", ensureHeroPlaying, { once: true });
    window.setTimeout(ensureHeroPlaying, 600);
  }

  const PREVIEW_MODE_KEY = "liam-cms-preview-mode-v1";
  /*
   * SECURITY: Public visitors must never see editor chrome.
   * A localStorage draft, a localhost or 127.0.0.1 hostname, a bare
   * ?preview= query, and a pathname are not an administrator session.
   * Inject #site-editor-chrome only when sessionStorage
   * liam-cms-preview-mode-v1 parses to {active:true}. That bar may contain
   * Exit preview only. Never inject it when body already has cms-administrator.
   */
  const shouldShowEditorChrome = () => {
    if (document.body.classList.contains("cms-administrator")) return false;
    try {
      const preview = JSON.parse(sessionStorage.getItem(PREVIEW_MODE_KEY) || "null");
      return Boolean(preview && preview.active === true);
    } catch (_) { /* ignore malformed preview session */ }
    return false;
  };
  const safeEditorPath = (value) => {
    const path = String(value || "");
    if (!/^\/(?!\/)(?:[A-Za-z0-9._~-]+\/)*admin\.html(?:\?[A-Za-z0-9._~%=&+-]*)?$/.test(path)) {
      return "/admin.html";
    }
    return path;
  };
  if (shouldShowEditorChrome() && !document.getElementById("site-editor-chrome")) {
    const chrome = document.createElement("div");
    chrome.id = "site-editor-chrome";
    chrome.className = "site-editor-chrome";
    const returnTo = (() => {
      try {
        const preview = JSON.parse(sessionStorage.getItem(PREVIEW_MODE_KEY) || "null");
        return safeEditorPath(preview?.returnTo);
      } catch (_) {
        return "/admin.html";
      }
    })();
    chrome.innerHTML = `<button type="button" id="site-exit-preview">Exit preview</button>`;
    document.body.append(chrome);
    chrome.querySelector("#site-exit-preview")?.addEventListener("click", () => {
      try { sessionStorage.removeItem(PREVIEW_MODE_KEY); } catch (_) { /* ignore */ }
      window.location.href = returnTo;
    });
  }

  const menuToggle = document.querySelector(".menu-toggle");
  const navigation = document.querySelector(".primary-navigation");

  if (menuToggle && navigation) {
    menuToggle.addEventListener("click", () => {
      const isExpanded = menuToggle.getAttribute("aria-expanded") === "true";
      menuToggle.setAttribute("aria-expanded", String(!isExpanded));
      navigation.classList.toggle("is-open", !isExpanded);
    });

    navigation.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        menuToggle.setAttribute("aria-expanded", "false");
        navigation.classList.remove("is-open");
      });
    });
  }

  const serviceDialog = document.querySelector("#service-dialog");
  const dialogTitle = document.querySelector("#dialog-title");
  const dialogDescription = document.querySelector("#dialog-description");
  const dialogExample = document.querySelector("#dialog-example");
  const dialogImage = document.querySelector("#dialog-image");

  const isCmsAdministrator = () => document.body.classList.contains("cms-administrator");
  const isCmsEditing = () => isCmsAdministrator()
    && !document.body.classList.contains("cms-preview-mode");

  const closeServiceDialog = () => {
    if (!serviceDialog) return;
    try {
      if (serviceDialog.open) serviceDialog.close();
    } catch (_) {
      serviceDialog.removeAttribute("open");
    }
    serviceDialog.classList.remove("cms-editor-dialog");
  };

  if (serviceDialog) {
    // Crash recovery: never boot the admin shell with a leftover modal backdrop.
    if (isCmsAdministrator()) closeServiceDialog();

    document.querySelectorAll(".service-open").forEach((button) => {
      button.addEventListener("click", (event) => {
        // In the CMS editor, admin.js opens Learn more via openServiceDialogForEdit.
        // Still allow an explicit flag, and never block Preview/public opens.
        if (isCmsEditing() && !event.__cmsOpenServiceDialog) {
          return;
        }
        dialogTitle.textContent = button.dataset.serviceTitle;
        dialogDescription.textContent = button.dataset.serviceDescription;
        dialogExample.textContent = button.dataset.serviceExample;
        dialogImage.src = button.dataset.serviceImage;
        dialogImage.alt = button.dataset.serviceAlt;
        serviceDialog.dataset.sourceServiceId = button.closest(".service-card, .cms-added-service")?.id
          || button.dataset.cmsId
          || "";
        if (dialogImage) {
          dialogImage.dataset.sourceServiceSelector = serviceDialog.dataset.sourceServiceId;
          dialogImage.dataset.cmsId = dialogImage.dataset.cmsId || "dialog-image";
        }
        const bookLink = serviceDialog.querySelector("[data-dialog-book]");
        if (bookLink) {
          bookLink.dataset.cmsId = bookLink.dataset.cmsId || "dialog-book-link";
          if (button.dataset.serviceBookHref) bookLink.setAttribute("href", button.dataset.serviceBookHref);
        }
        // Public/preview: real centered modal. dialog.show() paints the panel in page flow at the footer.
        serviceDialog.classList.remove("cms-editor-dialog");
        const scrollY = window.scrollY;
        if (typeof serviceDialog.showModal === "function") serviceDialog.showModal();
        else serviceDialog.setAttribute("open", "");
        window.requestAnimationFrame(() => window.scrollTo(0, scrollY));
        document.dispatchEvent(new CustomEvent("cms-service-dialog-opened", {
          detail: { button, dialog: serviceDialog, image: dialogImage },
        }));
      });
    });

    serviceDialog.querySelector(".dialog-close").addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      closeServiceDialog();
    });
    serviceDialog.addEventListener("click", (event) => {
      // Backdrop / dialog chrome click always dismisses — never trap the CMS behind a black overlay.
      if (event.target === serviceDialog) closeServiceDialog();
    });
    serviceDialog.querySelector("[data-dialog-book]").addEventListener("click", (event) => {
      if (isCmsEditing()) {
        event.preventDefault();
        return;
      }
      closeServiceDialog();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && serviceDialog.open) closeServiceDialog();
    });
  }

  const filterButtons = document.querySelectorAll(".filter-button");
  const emptyMessage = document.querySelector(".portfolio-empty");
  const portfolioGrid = document.querySelector(".portfolio-grid");
  const portfolioShowMore = document.querySelector("#portfolio-show-more");
  const PORTFOLIO_PAGE_SIZE = 9;
  let portfolioExpanded = false;

  const openProjectPage = (card) => {
    if (card?.dataset.projectUrl) window.location.assign(card.dataset.projectUrl);
  };

  const activePortfolioFilter = () => (
    document.querySelector(".filter-button.is-active")?.dataset.filter || "all"
  );

  const portfolioCards = () => [...document.querySelectorAll(".portfolio-grid .project-card")];

  const matchingPortfolioCards = (filter = activePortfolioFilter()) => (
    portfolioCards().filter((card) => filter === "all" || card.dataset.category === filter)
  );

  // Public pages show 9 projects at a time. CMS edit mode always shows the full list.
  const applyPortfolioVisibility = () => {
    const filter = activePortfolioFilter();
    const cards = portfolioCards();
    const matching = matchingPortfolioCards(filter);
    const showAll = portfolioExpanded || isCmsEditing();

    cards.forEach((card) => {
      const matches = filter === "all" || card.dataset.category === filter;
      if (!matches) {
        card.hidden = true;
        return;
      }
      if (showAll) {
        card.hidden = false;
        return;
      }
      card.hidden = matching.indexOf(card) >= PORTFOLIO_PAGE_SIZE;
    });

    if (emptyMessage) emptyMessage.hidden = matching.length > 0;

    if (portfolioShowMore) {
      const overflow = matching.length > PORTFOLIO_PAGE_SIZE;
      const showToggle = overflow && !isCmsEditing();
      portfolioShowMore.hidden = !showToggle;
      portfolioShowMore.setAttribute("aria-expanded", String(portfolioExpanded && showToggle));
      if (portfolioExpanded) {
        portfolioShowMore.innerHTML = 'Show less <span aria-hidden="true">↗</span>';
      } else {
        const remaining = Math.max(0, matching.length - PORTFOLIO_PAGE_SIZE);
        portfolioShowMore.innerHTML = remaining
          ? `Show more <span class="portfolio-more-count">(${remaining})</span> <span aria-hidden="true">↘</span>`
          : 'Show more <span aria-hidden="true">↘</span>';
      }
    }
  };

  const revealPortfolioCard = (card) => {
    if (!(card instanceof HTMLElement)) return;
    const filter = activePortfolioFilter();
    if (filter !== "all" && card.dataset.category && card.dataset.category !== filter) {
      document.querySelector('.filter-button[data-filter="all"]')?.click();
    }
    if (card.hidden) {
      portfolioExpanded = true;
      applyPortfolioVisibility();
    }
  };

  portfolioGrid?.addEventListener("click", (event) => {
    // CMS editor handles project opens itself (admin case-study route). Public navigates here.
    if (isCmsEditing()) return;
    if (event.target.closest("a,button")) return;
    openProjectPage(event.target.closest(".project-card[role='link']"));
  });
  portfolioGrid?.addEventListener("keydown", (event) => {
    if (isCmsEditing()) return;
    if (event.key !== "Enter") return;
    const card = event.target.closest(".project-card[role='link']");
    if (!card) return;
    event.preventDefault();
    openProjectPage(card);
  });

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      filterButtons.forEach((filterButton) => {
        const isActive = filterButton === button;
        filterButton.classList.toggle("is-active", isActive);
        filterButton.setAttribute("aria-pressed", String(isActive));
      });
      // Changing category collapses back to the first page of that filter.
      portfolioExpanded = false;
      applyPortfolioVisibility();
    });
  });

  portfolioShowMore?.addEventListener("click", () => {
    portfolioExpanded = !portfolioExpanded;
    applyPortfolioVisibility();
    if (!portfolioExpanded) {
      document.querySelector("#work")?.scrollIntoView({ block: "start", behavior: "smooth" });
    }
  });

  applyPortfolioVisibility();
  document.addEventListener("cms-portfolio-changed", applyPortfolioVisibility);
  window.liamPortfolio = {
    pageSize: PORTFOLIO_PAGE_SIZE,
    refresh: applyPortfolioVisibility,
    reveal: revealPortfolioCard,
    get expanded() { return portfolioExpanded; },
    setExpanded: (value) => {
      portfolioExpanded = Boolean(value);
      applyPortfolioVisibility();
    },
  };

  const slides = Array.from(document.querySelectorAll(".featured-slide"));
  const dots = Array.from(document.querySelectorAll(".carousel-dot"));
  let activeSlide = 0;
  let carouselTimer;

  const showSlide = (index) => {
    if (!slides.length) return;
    activeSlide = (index + slides.length) % slides.length;
    slides.forEach((slide, slideIndex) => {
      const isActive = slideIndex === activeSlide;
      slide.hidden = !isActive;
      slide.classList.toggle("is-active", isActive);
    });
    dots.forEach((dot, dotIndex) => {
      const isActive = dotIndex === activeSlide;
      dot.classList.toggle("is-active", isActive);
      dot.setAttribute("aria-pressed", String(isActive));
    });
  };

  const stopCarousel = () => window.clearInterval(carouselTimer);
  const startCarousel = () => {
    stopCarousel();
    if (slides.length > 1 && !window.matchMedia("(prefers-reduced-motion: reduce)").matches && !document.hidden) {
      carouselTimer = window.setInterval(() => showSlide(activeSlide + 1), 5000);
    }
  };

  document.querySelector("[data-carousel-prev]")?.addEventListener("click", () => {
    showSlide(activeSlide - 1);
    startCarousel();
  });
  document.querySelector("[data-carousel-next]")?.addEventListener("click", () => {
    showSlide(activeSlide + 1);
    startCarousel();
  });
  dots.forEach((dot) => {
    dot.addEventListener("click", () => {
      showSlide(Number(dot.dataset.goTo));
      startCarousel();
    });
  });

  const carousel = document.querySelector(".featured-carousel");
  if (carousel) {
    slides.forEach((slide) => {
      slide.addEventListener("click", () => {
        const target = document.querySelector(slide.hash);
        if (target) revealPortfolioCard(target);
      });
    });
    carousel.addEventListener("mouseenter", stopCarousel);
    carousel.addEventListener("mouseleave", startCarousel);
    carousel.addEventListener("focusin", stopCarousel);
    carousel.addEventListener("focusout", startCarousel);
  }
  document.addEventListener("visibilitychange", startCarousel);
  startCarousel();

  const lightbox = document.createElement("dialog");
  lightbox.className = "site-lightbox";
  lightbox.innerHTML = `
    <button type="button" class="site-lightbox-close" aria-label="Close image">×</button>
    <img alt="">
  `;
  document.body.append(lightbox);
  const lightboxImage = lightbox.querySelector("img");
  lightbox.querySelector(".site-lightbox-close").addEventListener("click", () => lightbox.close());
  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) lightbox.close();
  });
  document.addEventListener("click", (event) => {
    if (document.body.classList.contains("cms-administrator")) return;
    const image = event.target.closest(".portfolio-grid img, .featured-slide img, .cms-stock-image img, .cms-added-image img");
    if (!image?.src) return;
    if (event.target.closest("a,button,.project-card[role='link']")) return;
    event.preventDefault();
    lightboxImage.src = image.currentSrc || image.src;
    lightboxImage.alt = image.alt || "Portfolio image";
    lightbox.showModal();
  });

  const inquiryForm = document.querySelector("#inquiry-form");
  if (inquiryForm) {
    inquiryForm.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!inquiryForm.reportValidity()) return;

      const formData = new FormData(inquiryForm);
      const subject = `Website inquiry from ${formData.get("name")}`;
      const body = [
        `Name: ${formData.get("name")}`,
        `Company: ${formData.get("company") || "Not provided"}`,
        `Email: ${formData.get("email")}`,
        "",
        "Project details:",
        formData.get("project"),
      ].join("\n");
      const emailLink = `mailto:${inquiryForm.dataset.recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

      document.querySelector("#form-status").textContent = "Your email app should open with the inquiry ready to send. If it does not, email liam.bennicoff@gmail.com directly.";
      if (location.hostname === "127.0.0.1" || location.hostname === "localhost") {
        fetch("/api/inquiries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formData.get("name"),
            email: formData.get("email"),
            project: formData.get("project"),
          }),
        }).catch(() => {});
      }
      window.location.href = emailLink;
    });
  }
})();
