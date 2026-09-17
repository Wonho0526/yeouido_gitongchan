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
