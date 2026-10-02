(() => {
  const explorer = document.querySelector('[data-condition-explorer]');
  if (!explorer) return;
  const tabs = [...explorer.querySelectorAll('[role="tab"]')];
  const panels = tabs.map(tab => document.getElementById(tab.getAttribute('aria-controls')));
  if (!tabs.length || panels.some(panel => !panel)) return;
  const indexFromHash = () => Math.max(0, panels.findIndex(panel => `#${panel.id}` === location.hash));
  const activate = (index, { updateHash = false, focus = false } = {}) => {
    tabs.forEach((tab, i) => {
      const active = i === index;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      panels[i].hidden = !active;
    });
    if (updateHash && location.hash !== `#${panels[index].id}`) {
      // Use native hash navigation so file://, refresh and Back all work.
      location.hash = panels[index].id;
    }
    if (focus) tabs[index].focus({ preventScroll: true });
  };
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', event => {
      event.preventDefault();
      activate(index, { updateHash: true });
      panels[index].scrollIntoView({ block: 'start', behavior: 'auto' });
    });
    tab.addEventListener('keydown', event => {
      const keys = { ArrowRight: (index + 1) % tabs.length, ArrowLeft: (index - 1 + tabs.length) % tabs.length, Home: 0, End: tabs.length - 1 };
      if (!(event.key in keys)) return;
      event.preventDefault();
      activate(keys[event.key], { updateHash: true, focus: true });
    });
  });
  window.addEventListener('hashchange', () => activate(indexFromHash()));
  activate(indexFromHash());
  if (location.hash && panels.some(panel => `#${panel.id}` === location.hash)) {
    requestAnimationFrame(() => panels[indexFromHash()].scrollIntoView({ block: 'start' }));
  }
})();
