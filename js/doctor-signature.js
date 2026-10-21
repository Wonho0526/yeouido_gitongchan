(() => {
  const signature = document.querySelector('.sub-doctor-signature');
  if (!signature || !('IntersectionObserver' in window)) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // 서명이 화면에 들어오기 전에 감춰 둔다. 스타일은 revision.css에 있다.
  signature.dataset.sign = 'ready';

  const observer = new IntersectionObserver(entries => {
    if (!entries.some(entry => entry.isIntersecting)) return;
    observer.disconnect();
    // 웹폰트가 아직이면 대체 글꼴로 써지다가 글자가 바뀌므로 기다린다.
    const start = () => { signature.dataset.sign = 'writing'; };
    document.fonts ? document.fonts.ready.then(start, start) : start();
  }, { threshold: 0.6 });

  observer.observe(signature);
})();
