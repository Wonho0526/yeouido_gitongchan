(() => {
  const slider = document.querySelector("[data-clinic-slider]");

  if (!slider) {
    return;
  }

  const slides = Array.from(slider.querySelectorAll("[data-clinic-slide]"));
  const mainImage = slider.querySelector("[data-clinic-main]");
  const current = slider.querySelector("[data-clinic-current]");
  const total = slider.querySelector("[data-clinic-total]");
  const title = slider.querySelector("[data-clinic-title]");
  const subtitle = slider.querySelector("[data-clinic-subtitle]");
  const desc = slider.querySelector("[data-clinic-desc]");
  const more = slider.querySelector("[data-clinic-more]");
  const slideInfo = slider.querySelector(".clinic-slide-info");
  const previewTrack = slider.querySelector("[data-clinic-track]");
  const prev = slider.querySelector("[data-clinic-prev]");
  const next = slider.querySelector("[data-clinic-next]");
  let activeIndex = 0;
  let isAnimating = false;
  let queuedIndex = null;

  if (!slides.length || !mainImage || !current || !total || !title || !subtitle || !desc || !slideInfo || !previewTrack || !prev || !next) {
    return;
  }

  const arrangePreviewTrack = () => {
    const orderedSlides = slides.map((_, offset) => {
      return slides[(activeIndex + offset + 1) % slides.length];
    });

    orderedSlides.forEach((button) => {
      previewTrack.appendChild(button);
    });
  };

  const setPreviewState = () => {
    slides.forEach((button, index) => {
      const isActive = index === activeIndex;
      button.classList.toggle("is-active", isActive);
      button.classList.toggle("is-current-preview", isActive);
      button.setAttribute("aria-pressed", isActive ? "true" : "false");
      button.tabIndex = isActive ? -1 : 0;
    });
  };

  const resetPreviewTrack = () => {
    previewTrack.classList.add("is-resetting");
    previewTrack.style.transform = "translate3d(0, 0, 0)";
    arrangePreviewTrack();
    previewTrack.offsetHeight;
    previewTrack.classList.remove("is-resetting");
  };

  const getTrackStep = () => {
    const sample = slides.find((button) => button.offsetWidth > 0) || slides[0];
    const trackStyle = window.getComputedStyle(previewTrack);
    const gap = parseFloat(trackStyle.columnGap || trackStyle.gap) || 0;

    return sample.offsetWidth + gap;
  };

  const syncContentHeights = () => {
    const width = slideInfo.getBoundingClientRect().width;
    if (!width) {
      return;
    }

    // Reserve each text field's tallest slide at the current width and font.
    const measurement = slideInfo.cloneNode(true);
    measurement.classList.remove("is-changing");
    measurement.setAttribute("aria-hidden", "true");
    measurement.inert = true;
    measurement.style.cssText = `position: absolute; top: 0; left: 0; width: ${width}px; visibility: hidden; pointer-events: none; transition: none; transform: none;`;
    slideInfo.parentElement.appendChild(measurement);

    const fields = ["title", "subtitle", "desc"].map((name) => ({
      name,
      element: measurement.querySelector(`[data-clinic-${name}]`),
      height: 0,
    }));

    slides.forEach((slide) => {
      fields.forEach((field) => {
        field.element.textContent = slide.dataset[field.name];
      });
      fields.forEach((field) => {
        field.height = Math.max(field.height, Math.ceil(field.element.getBoundingClientRect().height));
      });
    });

    measurement.remove();
    fields.forEach((field) => {
      slideInfo.style.setProperty(`--clinic-${field.name}-height`, `${field.height}px`);
    });
  };

  let heightSyncFrame = 0;
  const scheduleHeightSync = () => {
    window.cancelAnimationFrame(heightSyncFrame);
    heightSyncFrame = window.requestAnimationFrame(syncContentHeights);
  };

  const updateContent = (targetIndex, shouldAnimate = true) => {
    const slide = slides[targetIndex];

    const applyContent = () => {
      mainImage.src = slide.dataset.image;
      mainImage.alt = slide.dataset.alt || slide.dataset.title;
      current.textContent = slide.dataset.number;
      title.textContent = slide.dataset.title;
      subtitle.textContent = slide.dataset.subtitle;
      desc.textContent = slide.dataset.desc;
      if (more && slide.dataset.href) {
        more.href = slide.dataset.href;
        more.setAttribute("aria-label", `${slide.dataset.title} 자세히 보기`);
      }
    };

    if (shouldAnimate) {
      mainImage.classList.add("is-changing");
      slideInfo.classList.add("is-changing");

      window.setTimeout(() => {
        applyContent();
        mainImage.classList.remove("is-changing");
        slideInfo.classList.remove("is-changing");
      }, 120);
    } else {
      applyContent();
    }
  };

  const finishTrackMove = (targetIndex, afterMove) => {
    const complete = () => {
      activeIndex = targetIndex;
      setPreviewState();
      resetPreviewTrack();
      isAnimating = false;
      afterMove();
    };

    window.setTimeout(complete, 620);
  };

  const moveOneStep = (direction, afterMove) => {
    const targetIndex = (activeIndex + (direction === "next" ? 1 : -1) + slides.length) % slides.length;
    const currentButton = slides[activeIndex];
    const step = getTrackStep();

    isAnimating = true;
    currentButton.classList.remove("is-active", "is-current-preview");
    currentButton.setAttribute("aria-pressed", "false");
    currentButton.tabIndex = 0;
    updateContent(targetIndex);

    previewTrack.classList.add("is-resetting");

    if (direction === "prev") {
      const currentOrder = slides.map((_, offset) => {
        return slides[(activeIndex + offset) % slides.length];
      });

      currentOrder.forEach((button) => {
        previewTrack.appendChild(button);
      });

      previewTrack.style.transform = `translate3d(${-step}px, 0, 0)`;
    } else {
      previewTrack.style.transform = "translate3d(0, 0, 0)";
    }

    previewTrack.offsetHeight;
    previewTrack.classList.remove("is-resetting");

    window.requestAnimationFrame(() => {
      previewTrack.style.transform = direction === "next"
        ? `translate3d(${-step}px, 0, 0)`
        : "translate3d(0, 0, 0)";
    });

    finishTrackMove(targetIndex, afterMove);
  };

  const getDirection = (targetIndex) => {
    const forward = (targetIndex - activeIndex + slides.length) % slides.length;
    const backward = (activeIndex - targetIndex + slides.length) % slides.length;

    return forward <= backward ? "next" : "prev";
  };

  const runQueuedMove = () => {
    if (queuedIndex === null || queuedIndex === activeIndex) {
      queuedIndex = null;
      return;
    }

    const direction = getDirection(queuedIndex);
    moveOneStep(direction, runQueuedMove);
  };

  const renderSlide = (targetIndex) => {
    const normalizedIndex = (targetIndex + slides.length) % slides.length;

    if (normalizedIndex === activeIndex) {
      return;
    }

    queuedIndex = normalizedIndex;

    if (!isAnimating) {
      runQueuedMove();
    }
  };

  total.textContent = String(slides.length).padStart(2, "0");
  updateContent(activeIndex, false);
  syncContentHeights();
  setPreviewState();
  resetPreviewTrack();

  window.addEventListener("resize", scheduleHeightSync);
  if (document.fonts) {
    document.fonts.ready.then(scheduleHeightSync);
    document.fonts.addEventListener("loadingdone", scheduleHeightSync);
  }

  prev.addEventListener("click", () => renderSlide(activeIndex - 1));
  next.addEventListener("click", () => renderSlide(activeIndex + 1));

  slides.forEach((button, index) => {
    button.addEventListener("click", () => renderSlide(index));
  });
})();
