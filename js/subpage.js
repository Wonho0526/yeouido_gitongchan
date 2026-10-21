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
  document.querySelectorAll('.related-links').forEach(slider => {
    const mobileOnly = !slider.hasAttribute('data-related-slider');
    const mobile = matchMedia('(max-width: 768px)');
    if (mobileOnly) {
      slider.classList.add('related-links-mobile-slider');
      slider.setAttribute('role', 'region');
      slider.setAttribute('aria-label', '함께 살펴보세요 카드');
      const sync = () => {
        if (mobile.matches) slider.tabIndex = 0;
        else {
          slider.removeAttribute('tabindex');
          slider.scrollLeft = 0;
        }
      };
      mobile.addEventListener('change', sync);
      sync();
    }
    const controls = document.createElement('div');
    controls.className = `related-slider-controls${mobileOnly ? ' related-slider-controls--mobile' : ''}`;
    const buttons = [-1, 1].map(direction => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = direction < 0 ? '←' : '→';
      button.setAttribute('aria-label', direction < 0 ? '이전 카드' : '다음 카드');
      button.addEventListener('click', () => move(direction));
      controls.append(button);
      return button;
    });
    // 자동 넘김이 있는 슬라이더에서만 쓰므로 기본은 숨겨 둔다.
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'related-slider-toggle';
    toggle.hidden = true;
    controls.insertBefore(toggle, buttons[1]);
    function move(direction) {
      if (mobileOnly && !mobile.matches) return;
      const step = slider.firstElementChild.getBoundingClientRect().width + parseFloat(getComputedStyle(slider).gap);
      slider.scrollBy({left: step * direction, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'});
    }
    function update() {
      buttons[0].disabled = slider.scrollLeft <= 1;
      buttons[1].disabled = slider.scrollLeft >= slider.scrollWidth - slider.clientWidth - 1;
    }
    // 카드가 화면 밖으로 이어지는 슬라이더는 2초마다 한 장씩 넘겨, 뒤쪽 카드도
    // 직접 넘기지 않고 보이게 한다. 끝에 닿으면 처음으로 돌아간다.
    function autoPlay() {
      const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
      // 멈출 이유를 각각 따로 기억한다. 한 가지 이유가 풀렸다고 해서 다른
      // 이유까지 덮어쓰고 다시 움직이면 안 된다.
      const held = {touched: false, focused: false, hidden: document.hidden, offScreen: true, byUser: false};
      let timer = 0;
      let resume = 0;
      const atEnd = () => slider.scrollLeft >= slider.scrollWidth - slider.clientWidth - 1;
      const advance = () => {
        if (atEnd()) slider.scrollTo({left: 0, behavior: 'smooth'});
        else move(1);
      };
      const sync = () => {
        const run = !reduceMotion.matches && !Object.values(held).some(Boolean);
        if (run && !timer) timer = setInterval(advance, 2000);
        if (!run && timer) { clearInterval(timer); timer = 0; }
        toggle.textContent = held.byUser ? '▶' : '❚❚';
        toggle.setAttribute('aria-label', held.byUser ? '자동 넘김 시작' : '자동 넘김 멈춤');
      };
      const hold = (key, value) => { held[key] = value; sync(); };

      // 카드와 좌우 버튼 위에서는 멈춘다. 재생 버튼은 뺀다. 눌러서 재생시킨
      // 직후에도 그 버튼에 포인터나 포커스가 남아 다시 멈춰 버리기 때문이다.
      // 손을 뗀 직후에는 관성 스크롤이 남아 있어 조금 기다렸다 재개한다.
      const area = [slider, ...buttons];
      area.forEach(element => {
        element.addEventListener('pointerenter', () => { clearTimeout(resume); hold('touched', true); });
        element.addEventListener('pointerdown', () => { clearTimeout(resume); hold('touched', true); });
        element.addEventListener('pointerleave', () => {
          clearTimeout(resume);
          resume = setTimeout(() => hold('touched', false), 1200);
        });
        element.addEventListener('focusin', () => hold('focused', true));
        element.addEventListener('focusout', event => {
          if (!area.some(node => node.contains(event.relatedTarget))) hold('focused', false);
        });
      });
      document.addEventListener('visibilitychange', () => hold('hidden', document.hidden));
      reduceMotion.addEventListener('change', sync);
      new IntersectionObserver(([entry]) => hold('offScreen', !entry.isIntersecting), {threshold: 0.2}).observe(slider);

      // 자동으로 움직이는 것을 멈출 방법은 눈에 보이게 둔다(WCAG 2.2.2).
      toggle.addEventListener('click', () => hold('byUser', !held.byUser));
      toggle.hidden = false;
      sync();
    }

    slider.after(controls);
    if (slider.hasAttribute('data-related-slider')) autoPlay();
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
