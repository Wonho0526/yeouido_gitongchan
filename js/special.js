(() => {
  const story = document.querySelector('[data-special-scroll-story]');
  if (!story) return;
  const rows = [...story.querySelectorAll('.sub-editorial-split')];
  if (rows.length < 2) return;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0;
  let markers = [];
  let start = 0;
  let length = 1;

  const update = () => {
    frame = 0;
    const cursor = scrollY + innerHeight * 0.62;
    const progress = reducedMotion.matches ? 1 : Math.max(0, Math.min(1, (cursor - start) / length));
    story.style.setProperty('--special-line-progress', progress);
    story.classList.toggle('is-complete', reducedMotion.matches || cursor >= start + length - 1);
    rows.forEach((row, index) => row.classList.toggle('is-reached', reducedMotion.matches || cursor >= markers[index]));
  };
  const scheduleUpdate = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };
  const measure = () => {
    const storyRect = story.getBoundingClientRect();
    const storyTop = storyRect.top + scrollY;
    story.style.setProperty('--special-line-left', `${rows[0].getBoundingClientRect().left - storyRect.left}px`);
    markers = rows.map(row => row.getBoundingClientRect().top + scrollY + 24);
    start = markers[0];
    const end = rows.at(-1).querySelector('.sub-image-frame').getBoundingClientRect().bottom + scrollY;
    length = Math.max(1, end - start);
    story.style.setProperty('--special-line-top', `${start - storyTop}px`);
    story.style.setProperty('--special-line-height', `${length}px`);
    story.classList.add('has-scroll-line');
    scheduleUpdate();
  };
  addEventListener('scroll', scheduleUpdate, { passive: true });
  addEventListener('resize', measure);
  addEventListener('load', measure, { once: true });
  reducedMotion.addEventListener('change', scheduleUpdate);
  if (window.ResizeObserver) new ResizeObserver(measure).observe(story);
  if (document.fonts) document.fonts.ready.then(measure);
  measure();
})();
