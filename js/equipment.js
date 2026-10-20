(() => {
  const slider = document.querySelector('[data-equipment-slider]');
  if (!slider) return;
  const keys = ['c-arm', 'ultrasound', 'cryo-jet', 'eswt'];
  const names = ['C-arm', '초음파진단장치', 'Cryo-Jet', '체외충격파'];
  const cards = keys.map(key => slider.querySelector(`[data-equipment-card="${key}"]`));
  const track = slider.querySelector(".equipment-card-track");
  const panels = keys.map(key => document.querySelector(`[data-equipment-panel="${key}"]`));
  if ([...cards, ...panels, track].some(element => !element)) return;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const status = document.querySelector('[data-equipment-status]');
  let activeIndex = -1;
  let touch = null;

  // Boundary copies keep the next/previous card visible at both ends.
  const makeCopy = card => {
    const copy = card.cloneNode(true);
    copy.removeAttribute('data-equipment-card');
    copy.removeAttribute('aria-pressed');
    copy.setAttribute('aria-hidden', 'true');
    copy.inert = true;
    copy.tabIndex = -1;
    copy.classList.remove('is-active');
    copy.dataset.equipmentClone = card.dataset.equipmentCard;
    return copy;
  };
  track.prepend(...cards.map(makeCopy));
  track.append(...cards.map(makeCopy));
  const visualCards = [...track.children];
  let visualIndex = keys.length;
  let resetTimer;
  let boundaryPending = false;
  const positionTrack = () => {
    track.style.transform = `translateX(-${visualCards[visualIndex].offsetLeft - visualCards[0].offsetLeft}px)`;
  };
  const markCards = () => visualCards.forEach((card, index) => {
    card.classList.toggle('is-active', index === visualIndex);
  });
  const settle = () => {
    clearTimeout(resetTimer);
    boundaryPending = false;
    visualIndex = activeIndex + keys.length;
    track.classList.add('is-repositioning');
    markCards();
    positionTrack();
    // Flush the invisible boundary reset before re-enabling motion.
    void track.offsetWidth;
    track.classList.remove('is-repositioning');
  };
  track.addEventListener('transitionend', event => {
    if (event.target === track && event.propertyName === 'transform' && boundaryPending) settle();
  });

  const readIndex = () => Math.max(0, keys.indexOf(location.hash.slice(1)));
  const show = (index, { writeHistory = false, scrollToGallery = false } = {}) => {
    const next = ((index % keys.length) + keys.length) % keys.length;
    if (next === activeIndex) {
      if (scrollToGallery) slider.scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth', block: 'start' });
      return;
    }
    if (boundaryPending) settle();
    const initial = activeIndex < 0;
    const previous = activeIndex;
    const restoreFocus = panels[activeIndex]?.contains(document.activeElement);
    activeIndex = next;
    cards.forEach((card, i) => {
      card.setAttribute('aria-pressed', String(i === next));
      card.tabIndex = i === next ? 0 : -1;
      panels[i].hidden = i !== next;
    });
    visualIndex = index < 0 && previous === 0 ? keys.length - 1
      : index >= keys.length && previous === keys.length - 1 ? keys.length * 2 : next + keys.length;
    boundaryPending = visualIndex < keys.length || visualIndex >= keys.length * 2;
    markCards();
    positionTrack();
    if (initial || reducedMotion.matches) settle();
    else if (boundaryPending) resetTimer = setTimeout(settle, 600);
    document.body.dataset.equipmentActive = keys[next];
    status.textContent = `${names[next]} 장비 안내 (${next + 1} / ${keys.length})`;
    if (writeHistory) {
      history.pushState(null, '', `#${keys[next]}`);
      window.dispatchEvent(new Event('hashchange'));
    }
    if (restoreFocus) {
      panels[next].tabIndex = -1;
      panels[next].focus({ preventScroll: true });
    }
    if (scrollToGallery) slider.scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth', block: 'start' });
  };

  cards.forEach((card, index) => card.addEventListener('click', () => show(index, { writeHistory: index !== activeIndex })));
  new ResizeObserver(() => {
    if (activeIndex >= 0) settle();
  }).observe(slider);

  document.querySelectorAll('[data-equipment-prev], [data-equipment-next]').forEach(button => {
    button.addEventListener('click', () => show(activeIndex + (button.hasAttribute('data-equipment-next') ? 1 : -1), {
      writeHistory: true,
      scrollToGallery: !slider.contains(button),
    }));
  });
  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
    const link = event.target.closest('a[href]');
    if (!link || link.target === '_blank' || link.hasAttribute('download')) return;
    const url = new URL(link.href);
    const index = keys.indexOf(url.hash.slice(1));
    if (url.origin !== location.origin || url.pathname !== location.pathname || index < 0) return;
    event.preventDefault();
    show(index, { writeHistory: index !== activeIndex, scrollToGallery: true });
  });
  const restore = () => show(readIndex());
  addEventListener('hashchange', restore);
  addEventListener('popstate', restore);
  slider.addEventListener('keydown', event => {
    if ((!event.target.matches('[data-equipment-card]') && event.target !== slider) || event.altKey || event.ctrlKey || event.metaKey) return;
    const actions = { ArrowLeft: activeIndex - 1, ArrowRight: activeIndex + 1, Home: 0, End: keys.length - 1 };
    if (!(event.key in actions)) return;
    event.preventDefault();
    show(actions[event.key], { writeHistory: true });
  });
  slider.addEventListener('touchstart', event => {
    touch = event.touches.length === 1 ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null;
  }, { passive: true });
  slider.addEventListener('touchcancel', () => { touch = null; }, { passive: true });
  slider.addEventListener('touchend', event => {
    if (!touch || event.touches.length || !event.changedTouches.length) { touch = null; return; }
    const dx = event.changedTouches[0].clientX - touch.x;
    const dy = event.changedTouches[0].clientY - touch.y;
    touch = null;
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.3) return;
    show(activeIndex + (dx < 0 ? 1 : -1), { writeHistory: true });
  }, { passive: true });

  if (!keys.includes(location.hash.slice(1))) history.replaceState(null, '', '#c-arm');
  show(readIndex());
  document.querySelectorAll('[data-equipment-controls]').forEach(controls => { controls.hidden = false; });
})();
