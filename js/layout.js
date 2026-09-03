(() => {
  if (!window.React || !window.ReactDOM) {
    return;
  }

  const h = React.createElement;
  const components = window.YgtcComponents || {};

  const mount = (id, Component) => {
    const target = document.getElementById(id);

    if (!target || !Component) {
      return;
    }

    ReactDOM.createRoot(target).render(h(Component));
  };

  mount("site-header-root", components.Header);
  mount("site-footer-root", components.Footer);
})();
