(() => {
  const main = document.querySelector('.subpage-main');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  if (!main || !window.AOS || motion.matches) return;

  const targets = [
    '.sub-section-heading', '.sub-doctor-main',
    '.sub-editorial-split > *', '.sub-split > *', '.sub-care-intro-grid > *',
    '.sub-doctor-layout > *', '.equipment-intro-layout > *', '.equipment-features-layout > *',
    '.sub-point-grid', '.sub-feature-grid', '.sub-promise-list', '.related-links',
    '.sub-guide-grid > *', '.space-sliders', '.community-board',
    '.sub-section > .inner > h2', '.sub-section > .inner > p',
    '.condition-lead > .inner', '.condition-panel section > .inner > h2',
    '.condition-panel section > .inner > p', '.condition-panel section > .inner > figure',
    '.condition-context-grid', '.condition-symptoms-grid', '.condition-assessment-grid',
    '.condition-treatment-grid', '.sub-vision-grid',
  ].join(',');
  let frame = 0;
  let stopped = false;
  const register = () => {
    main.querySelectorAll(targets).forEach(element => {
      if (element.hasAttribute('data-aos') || element.closest('[hidden], [aria-hidden="true"]') || !element.getClientRects().length) return;
      // Reveal a complete slider/list as one block; its interactive children retain their transforms.
      if (element.parentElement.closest('[data-subpage-reveal]')) return;
      element.dataset.subpageReveal = '';
      element.dataset.aos = element.closest('.special-scroll-story') ? 'fade' : 'fade-up';
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
    window.AOS.init({ duration: 900, easing: 'ease-out-quad', offset: 120, once: true, mirror: false, disableMutationObserver: true });
    document.documentElement.classList.add('aos-enabled');
  } catch {
    main.querySelectorAll('[data-subpage-reveal]').forEach(element => {
      element.removeAttribute('data-aos');
      element.removeAttribute('data-subpage-reveal');
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
