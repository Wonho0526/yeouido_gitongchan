(() => {
  if (!window.React || !window.ReactDOM) {
    return;
  }

  const h = React.createElement;
  const components = window.YgtcComponents || {};

  const mount = (id, Component, props = {}) => {
    const target = document.getElementById(id);

    if (!target || !Component) {
      return;
    }

    ReactDOM.createRoot(target).render(h(Component, props));
  };

  mount("site-header-root", components.Header);
  mount("site-footer-root", components.Footer);
  const localNavigation = document.getElementById("site-local-nav-root");
  if (localNavigation) {
    mount("site-local-nav-root", components.LocalNavigation, { group: localNavigation.dataset.navGroup });
  }
})();
