(() => {
  const gallery = document.querySelector('[data-space-sliders]');
  if (!gallery) return;
  const slides = [...gallery.querySelectorAll('.space-slide')];
  const thumbs = [...gallery.querySelectorAll('.space-thumb')];
  const track = gallery.querySelector('.space-thumb-track');
  const status = gallery.querySelector('.space-slide-status');
  let active = 0;
  function select(index) {
    active = (index + slides.length) % slides.length;
    slides.forEach((slide, i) => { slide.hidden = i !== active; });
    thumbs.forEach((thumb, i) => thumb.setAttribute('aria-pressed', String(i === active)));
    // Rotate the thumbnail order so previous / active / next are always visible.
    const focusedThumb = thumbs.includes(document.activeElement) ? document.activeElement : null;
    for (let offset = 0; offset < thumbs.length; offset += 1) {
      const thumb = thumbs[(active - 1 + offset + thumbs.length) % thumbs.length];
      thumb.inert = offset >= 3;
      track.appendChild(thumb);
    }
    track.style.transform = 'none';
    if (focusedThumb && !focusedThumb.inert) focusedThumb.focus({preventScroll: true});
    status.textContent = `${String(active + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')}`;
  }
  gallery.querySelectorAll('[data-space-prev]').forEach(button => button.addEventListener('click', () => select(active - 1)));
  gallery.querySelectorAll('[data-space-next]').forEach(button => button.addEventListener('click', () => select(active + 1)));
  thumbs.forEach((thumb, index) => thumb.addEventListener('click', () => select(index)));
  gallery.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    select(event.key === 'Home' ? 0 : event.key === 'End' ? slides.length - 1 : active + (event.key === 'ArrowLeft' ? -1 : 1));
    if (event.target.classList.contains('space-thumb')) thumbs[active].focus({preventScroll: true});
  });
  new ResizeObserver(() => select(active)).observe(gallery.querySelector('.space-thumb-viewport'));
  select(0);
})();
