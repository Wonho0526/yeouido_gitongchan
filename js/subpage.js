(() => {
  document.querySelectorAll("[data-treatment-tabs]").forEach((group) => {
    const tabs = Array.from(group.querySelectorAll('[role="tab"]'));
    const panels = tabs.map((tab) => document.getElementById(tab.getAttribute("aria-controls")));

    if (!tabs.length || panels.some((panel) => !panel || !group.contains(panel))) {
      return;
    }

    const activate = (activeIndex) => {
      tabs.forEach((tab, index) => {
        const isActive = index === activeIndex;
        tab.classList.toggle("is-active", isActive);
        tab.setAttribute("aria-selected", String(isActive));
        tab.tabIndex = isActive ? 0 : -1;
        panels[index].hidden = !isActive;
      });
    };

    activate(Math.max(tabs.findIndex((tab) => tab.getAttribute("aria-selected") === "true"), 0));

    tabs.forEach((tab, index) => {
      tab.addEventListener("click", () => activate(index));
      tab.addEventListener("keydown", (event) => {
        let nextIndex;
        switch (event.key) {
          case "ArrowRight":
            nextIndex = (index + 1) % tabs.length;
            break;
          case "ArrowLeft":
            nextIndex = (index - 1 + tabs.length) % tabs.length;
            break;
          case "Home":
            nextIndex = 0;
            break;
          case "End":
            nextIndex = tabs.length - 1;
            break;
          default:
            return;
        }
        event.preventDefault();
        activate(nextIndex);
        tabs[nextIndex].focus();
      });
    });
  });
})();

(() => {
  document.querySelectorAll('[data-related-slider]').forEach(slider => {
    const controls = document.createElement('div');
    controls.className = 'related-slider-controls';
    const buttons = [-1, 1].map(direction => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = direction < 0 ? '←' : '→';
      button.setAttribute('aria-label', direction < 0 ? '이전 카드' : '다음 카드');
      button.addEventListener('click', () => move(direction));
      controls.append(button);
      return button;
    });
    function move(direction) {
      const step = slider.firstElementChild.getBoundingClientRect().width + parseFloat(getComputedStyle(slider).gap);
      slider.scrollBy({left: step * direction, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'});
    }
    function update() {
      buttons[0].disabled = slider.scrollLeft <= 1;
      buttons[1].disabled = slider.scrollLeft >= slider.scrollWidth - slider.clientWidth - 1;
    }
    slider.after(controls);
    slider.addEventListener('scroll', update, {passive: true});
    slider.addEventListener('keydown', event => {
      if (event.target !== slider || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      move(event.key === 'ArrowLeft' ? -1 : 1);
    });
    new ResizeObserver(update).observe(slider);
    update();
  });
})();
