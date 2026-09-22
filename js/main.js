(() => {
  const slider = document.querySelector("[data-clinic-slider]");

  if (!slider) {
    return;
  }

  const slides = Array.from(slider.querySelectorAll("[data-clinic-slide]"));
  const mainImage = slider.querySelector("[data-clinic-main]");
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

  if (!slides.length || !mainImage || !title || !subtitle || !desc || !slideInfo || !previewTrack || !prev || !next) {
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

    fields.forEach((field) => {
      field.element.style.minHeight = "0px";
    });

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

(() => {
  const track = document.querySelector(".facility-track");
  const controls = document.querySelector(".facility-controls");
  const prev = document.querySelector("[data-facility-prev]");
  const next = document.querySelector("[data-facility-next]");
  if (!track || !controls || !prev || !next) {
    return;
  }

  const slides = Array.from(track.querySelectorAll(".facility-slide"));
  if (!slides.length) {
    return;
  }
  const desktop = window.matchMedia("(min-width: 921px)");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let activeIndex = desktop.matches ? Math.min(1, slides.length - 1) : 0;
  let drag = null;
  let resizeFrame = 0;

  const slidePosition = (index) => {
    const slide = slides[index];
    const offset = desktop.matches ? (track.clientWidth - slide.offsetWidth) / 2 : 0;
    return Math.max(0, Math.min(slide.offsetLeft - offset, track.scrollWidth - track.clientWidth));
  };

  const nearestIndex = () => slides.reduce((nearest, slide, index) => (
    Math.abs(slidePosition(index) - track.scrollLeft) < Math.abs(slidePosition(nearest) - track.scrollLeft)
      ? index : nearest
  ), 0);

  const syncControls = () => {
    const maxScroll = track.scrollWidth - track.clientWidth;
    controls.hidden = maxScroll <= 1;
    prev.disabled = track.scrollLeft <= 1;
    next.disabled = track.scrollLeft >= maxScroll - 1;
    activeIndex = nearestIndex();
    slides.forEach((slide, index) => {
      slide.classList.toggle("is-active", index === activeIndex);
      if (index === activeIndex) {
        slide.setAttribute("aria-current", "true");
      } else {
        slide.removeAttribute("aria-current");
      }
    });
  };

  const goTo = (index, instant = false) => {
    const target = Math.max(0, Math.min(index, slides.length - 1));
    track.scrollTo({
      left: slidePosition(target),
      behavior: instant || reducedMotion.matches ? "instant" : "smooth",
    });
  };

  const move = (direction) => goTo(activeIndex + direction);

  prev.addEventListener("click", () => move(-1));
  next.addEventListener("click", () => move(1));
  track.addEventListener("keydown", (event) => {
    if (event.target !== track || event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      move(event.key === "ArrowLeft" ? -1 : 1);
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      goTo(event.key === "Home" ? 0 : slides.length - 1, true);
    }
  });

  track.addEventListener("pointerdown", (event) => {
    if (event.pointerType !== "mouse" || event.button !== 0) {
      return;
    }
    drag = { id: event.pointerId, x: event.clientX, scrollLeft: track.scrollLeft };
    track.setPointerCapture(event.pointerId);
  });
  track.addEventListener("pointermove", (event) => {
    if (!drag || event.pointerId !== drag.id) {
      return;
    }
    const distance = event.clientX - drag.x;
    if (Math.abs(distance) < 4 && !track.classList.contains("is-dragging")) {
      return;
    }
    track.classList.add("is-dragging");
    track.scrollLeft = drag.scrollLeft - distance;
  });
  const finishDrag = (event) => {
    if (!drag || event.pointerId !== drag.id) {
      return;
    }
    const wasDragging = track.classList.contains("is-dragging");
    const target = nearestIndex();
    drag = null;
    track.classList.remove("is-dragging");
    if (track.hasPointerCapture(event.pointerId)) {
      track.releasePointerCapture(event.pointerId);
    }
    if (wasDragging) {
      goTo(target);
    }
    syncControls();
  };
  track.addEventListener("pointerup", finishDrag);
  track.addEventListener("pointercancel", finishDrag);
  track.addEventListener("lostpointercapture", finishDrag);
  track.addEventListener("scroll", syncControls, { passive: true });
  window.addEventListener("resize", () => {
    const index = activeIndex;
    window.cancelAnimationFrame(resizeFrame);
    resizeFrame = window.requestAnimationFrame(() => {
      goTo(index, true);
      syncControls();
    });
  });
  goTo(activeIndex, true);
  syncControls();
})();
(() => {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (!window.AOS || reducedMotion.matches) {
    return;
  }

  window.AOS.init({
    duration: 650,
    easing: "ease-out-cubic",
    offset: 60,
    once: true,
    mirror: false,
  });
  document.documentElement.classList.add("aos-enabled");

  const refresh = () => window.requestAnimationFrame(() => window.AOS.refresh());
  window.addEventListener("load", refresh, { once: true });
  if (document.fonts) {
    document.fonts.ready.then(refresh);
  }
  document.addEventListener("focusin", (event) => {
    const animated = event.target.closest("[data-aos]");
    if (animated) {
      animated.classList.add("aos-animate");
    }
  });
})();
