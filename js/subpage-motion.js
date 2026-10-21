(() => {
  const main = document.querySelector('.subpage-main');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  if (!main || !window.AOS || motion.matches) return;
  const strongMotion = ['about', 'special', 'doctor', 'values'].includes(document.body.dataset.page);

  const targetSelectors = [
    '.sub-section-heading', '.sub-doctor-main',
    '.sub-editorial-split > *', '.sub-split > *', '.sub-care-intro-grid > *',
    '.sub-doctor-layout', '.equipment-intro-layout > *', '.equipment-features-layout > *',
    '.sub-point-grid', '.sub-feature-grid', '.sub-promise-list', '.related-links',
    '.sub-guide-grid > *', '.space-sliders', '.community-board',
    '.sub-section > .inner > h2', '.sub-section > .inner > p',
    '.condition-lead > .inner', '.condition-panel section > .inner > h2',
    '.condition-panel section > .inner > p', '.condition-panel section > .inner > figure',
    '.condition-context-grid', '.condition-assessment-grid',
    '.condition-treatment-grid', '.sub-vision-grid', '.sub-about-statement',
    '.iv-recommendations > ul',
  ];
  if (strongMotion) targetSelectors.push(
    '.sub-about-statement > p', '.sub-vision-grid > *', '.sub-value-grid > *',
    '.sub-promise-intro', '.sub-promise-list > li',
    '.about-mission-copy > .sub-copy-stack', '.about-philosophy-card',
    '.sub-doctor-heading', '.sub-doctor-credentials'
  );
  const targets = targetSelectors.join(',');
  const setIntroMotion = element => {
    let effect = 'fade-up';
    const siblings = [...element.parentElement.children];
    const index = siblings.indexOf(element);
    if (element.matches('.sub-doctor-photo')) {
      effect = 'fade-right';
    } else if (element.matches('.sub-doctor-heading, .sub-doctor-credentials')) {
      effect = 'fade-left';
    } else if (element.closest('.special-scroll-story')) {
      // Horizontal motion leaves the image-bottom measurement for the story line unchanged.
      effect = index === 0 ? 'fade-right' : 'fade-left';
    } else if (element.matches('.sub-vision-card, .sub-value-card, .about-philosophy-card')) {
      effect = 'zoom-in';
      element.dataset.aosDelay = String(Math.min(index, 2) * 100);
    } else if (element.matches('.sub-promise-list > li')) {
      effect = 'fade-left';
      element.dataset.aosDelay = String(Math.min(index, 2) * 100);
    } else if (element.matches('figure, .sub-doctor-main')) {
      effect = 'zoom-in';
    } else if (element.matches('.sub-promise-intro, .about-mission-copy > .sub-copy-stack') ||
               element.parentElement.matches('.sub-editorial-split, .sub-split')) {
      effect = index === 0 ? 'fade-right' : 'fade-left';
    }
    element.dataset.aosIntensity = 'strong';
    element.dataset.aos = effect;
    if (effect === 'zoom-in') element.dataset.aosDuration = '1000';
  };
  let frame = 0;
  let stopped = false;
  const register = () => {
    main.querySelectorAll(targets).forEach(element => {
      if (element.closest('.condition-symptoms')) return;
      if (strongMotion && element.matches('.sub-about-statement, .sub-vision-grid, .sub-promise-list, .about-mission-copy, .sub-doctor-layout, .sub-doctor-copy')) return;
      if (element.hasAttribute('data-aos') || element.closest('[hidden], [aria-hidden="true"]') || !element.getClientRects().length) return;
      // Reveal a complete slider/list as one block; its interactive children retain their transforms.
      if (element.parentElement.closest('[data-subpage-reveal]')) return;
      element.dataset.subpageReveal = '';
      if (strongMotion) setIntroMotion(element);
      else element.dataset.aos = element.closest('.special-scroll-story') ? 'fade' : 'fade-up';
    });
  };
  const refresh = () => {
    if (stopped || frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      register();
      window.AOS.refreshHard();
    });
  };

  try {
    register();
    window.AOS.init({ duration: strongMotion ? 1200 : 900, easing: 'ease-out-quad', offset: strongMotion ? 160 : 120, once: true, mirror: false, disableMutationObserver: true });
    document.documentElement.classList.add('aos-enabled');
  } catch {
    main.querySelectorAll('[data-subpage-reveal]').forEach(element => {
      element.removeAttribute('data-aos');
      element.removeAttribute('data-subpage-reveal');
      element.removeAttribute('data-aos-intensity');
      element.removeAttribute('data-aos-duration');
      element.removeAttribute('data-aos-delay');
    });
    return;
  }

  // Register newly opened equipment/disease panels and asynchronously loaded health posts.
  const observer = new MutationObserver(refresh);
  observer.observe(main, { subtree: true, childList: true, attributes: true, attributeFilter: ['hidden'] });
  main.addEventListener('load', event => { if (event.target.tagName === 'IMG') refresh(); }, true);
  window.addEventListener('load', refresh, { once: true });
  document.fonts?.ready.then(refresh);
  main.addEventListener('focusin', event => {
    event.target.closest('[data-subpage-reveal]')?.classList.add('aos-animate');
  });
  motion.addEventListener('change', event => {
    if (!event.matches) return;
    stopped = true;
    observer.disconnect();
    cancelAnimationFrame(frame);
    document.documentElement.classList.remove('aos-enabled');
  });
})();
