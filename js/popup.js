// Homepage popup, driven by the admin system's public popup API.
(() => {
  // Relative so it resolves under both a sub-path host (GitHub Pages) and a domain root (Cafe24).
  const POPUP_API_URL = "admin/api/public/popups.php";
  const POPUP_STORAGE_KEY = "ygtc_popup_hide_until";
  const POPUP_ROTATE_MS = 5000;

  // Storage can be unavailable (private mode, blocked site data); the popup then just shows.
  const readHideUntil = () => {
    try {
      return Number(window.localStorage.getItem(POPUP_STORAGE_KEY) || 0);
    } catch {
      return 0;
    }
  };

  const hideForToday = () => {
    try {
      window.localStorage.setItem(POPUP_STORAGE_KEY, String(Date.now() + 24 * 60 * 60 * 1000));
    } catch {
      // Nothing to persist to; the popup simply returns on the next visit.
    }
  };

  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  // The admin's URL check (FILTER_VALIDATE_URL) still admits "javascript://…", so only
  // site paths and http(s) links ever become clickable.
  const isSafeLink = (url) => typeof url === "string" && /^(\/(?!\/)|https?:\/\/)/i.test(url);

  const renderSlide = (popup, index) => {
    const slide = el("div", "site-popup__slide");

    const picture = el("picture");
    const source = el("source");
    source.media = "(max-width: 768px)";
    source.srcset = popup.mobileImageUrl;
    const img = el("img");
    img.src = popup.pcImageUrl;
    img.alt = popup.title;
    img.loading = index === 0 ? "eager" : "lazy";
    picture.append(source, img);

    if (isSafeLink(popup.linkUrl)) {
      const link = el("a", "site-popup__slide-link");
      link.href = popup.linkUrl;
      if (popup.linkTarget === "_blank") {
        link.target = "_blank";
        link.rel = "noopener noreferrer";
      }
      link.append(picture);
      slide.append(link);
    } else {
      const wrap = el("div", "site-popup__slide-static");
      wrap.append(picture);
      slide.append(wrap);
    }
    return slide;
  };

  const renderPopup = (popups) => {
    let activeIndex = 0;
    let timer = 0;
    const previouslyFocused = document.activeElement;

    const root = el("div", "site-popup");
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-label", "알림 팝업");

    const backdrop = el("div", "site-popup__backdrop");
    const dialog = el("div", "site-popup__dialog");
    const closeButton = el("button", "site-popup__close");
    closeButton.type = "button";
    closeButton.setAttribute("aria-label", "닫기");

    const slidesWrap = el("div", "site-popup__slides");
    const slides = popups.map(renderSlide);
    slidesWrap.append(...slides);

    const dots = [];
    if (popups.length > 1) {
      const prev = el("button", "site-popup__nav site-popup__nav--prev", "‹");
      prev.type = "button";
      prev.setAttribute("aria-label", "이전 팝업");
      const next = el("button", "site-popup__nav site-popup__nav--next", "›");
      next.type = "button";
      next.setAttribute("aria-label", "다음 팝업");
      const indicators = el("div", "site-popup__indicators");
      popups.forEach((_, index) => {
        const dot = el("button", "site-popup__dot");
        dot.type = "button";
        dot.setAttribute("aria-label", `${index + 1}번째 팝업`);
        dot.addEventListener("click", () => {
          setActive(index);
          startAutoRotate();
        });
        dots.push(dot);
        indicators.append(dot);
      });
      prev.addEventListener("click", () => {
        setActive(activeIndex - 1);
        startAutoRotate();
      });
      next.addEventListener("click", () => {
        setActive(activeIndex + 1);
        startAutoRotate();
      });
      slidesWrap.append(prev, next, indicators);
    }

    const footer = el("div", "site-popup__footer");
    const hideLabel = el("label", "site-popup__hide-today");
    const hideCheckbox = el("input");
    hideCheckbox.type = "checkbox";
    hideLabel.append(hideCheckbox, document.createTextNode("오늘 하루 보지 않기"));
    const dismiss = el("button", "site-popup__dismiss", "닫기");
    dismiss.type = "button";
    footer.append(hideLabel, dismiss);

    dialog.append(closeButton, slidesWrap, footer);
    root.append(backdrop, dialog);
    document.body.appendChild(root);

    function setActive(index) {
      activeIndex = (index + popups.length) % popups.length;
      slides.forEach((slide, i) => slide.classList.toggle("is-active", i === activeIndex));
      dots.forEach((dot, i) => {
        dot.classList.toggle("is-active", i === activeIndex);
        dot.setAttribute("aria-current", String(i === activeIndex));
      });
    }

    function stopAutoRotate() {
      window.clearInterval(timer);
      timer = 0;
    }

    function startAutoRotate() {
      stopAutoRotate();
      if (popups.length > 1 && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        timer = window.setInterval(() => setActive(activeIndex + 1), POPUP_ROTATE_MS);
      }
    }

    const onKeydown = (event) => {
      if (event.key === "Escape") close();
    };

    function close() {
      stopAutoRotate();
      if (hideCheckbox.checked) hideForToday();
      root.classList.remove("is-open");
      document.removeEventListener("keydown", onKeydown);
      window.setTimeout(() => root.remove(), 200);
      if (previouslyFocused && previouslyFocused.focus) previouslyFocused.focus();
    }

    [backdrop, closeButton, dismiss].forEach((node) => node.addEventListener("click", close));
    document.addEventListener("keydown", onKeydown);

    setActive(0);
    startAutoRotate();
    window.requestAnimationFrame(() => {
      root.classList.add("is-open");
      closeButton.focus();
    });
  };

  const init = () => {
    const hideUntil = readHideUntil();
    if (hideUntil && Date.now() < hideUntil) {
      return;
    }

    fetch(POPUP_API_URL, { headers: { Accept: "application/json" } })
      .then((response) => (response.ok ? response.json() : Promise.reject(response)))
      .then((body) => {
        const popups = (body && body.data) || [];
        if (popups.length > 0) renderPopup(popups);
      })
      .catch(() => {
        // Non-critical: without the admin API (e.g. the static GitHub Pages copy) there is no popup.
      });
  };

  init();
})();
