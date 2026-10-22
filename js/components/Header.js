(() => {
  if (!window.React) {
    return;
  }

  const h = React.createElement;

  const navItems = [
    {
      href: "about.html",
      label: "여의도기통찬 소개",
      children: [
        { href: "about.html", label: "여의도기통찬 스토리" },
        { href: "special.html", label: "여의도기통찬 특별함" },
        { href: "doctor.html", label: "여의도기통찬 의료진" },
        { href: "values.html", label: "여의도기통찬 약속" },
      ],
    },
    {
      href: "neck-shoulder.html",
      label: "기능까지 살피는 진료",
      brandLetter: true,
      justifyChildren: true,
      children: [
        { href: "neck-shoulder.html", label: "목·어깨" },
        { href: "spine-joint.html", label: "허리·골반" },
        { href: "hand-wrist.html", label: "팔꿈치·손" },
        { href: "knee.html", label: "무릎" },
        { href: "foot-heel.html", label: "발·발목" },
        { href: "neuralgia.html", label: "두통·신경통" },
      ],
    },
    {
      href: "injection.html",
      label: "통증을 회복으로 이끄는 치료",
      brandLetter: true,
      children: [
        { href: "injection.html", label: "주사치료" },
        { href: "shockwave.html", label: "체외충격파" },
        { href: "manual-therapy.html", label: "도수치료" },
        { href: "autonomic.html", label: "자율신경 주사치료(SNEPI)" },
        { href: "recovery-iv.html", label: "기능회복 수액" },
      ],
    },
    {
      href: "equipment.html#c-arm", label: "찬란한 일상을 위한 진료환경", brandLetter: true,
      children: [
        { href: "equipment.html#c-arm", label: "C-arm" },
        { href: "equipment.html#ultrasound", label: "초음파진단장치" },
        { href: "spaces.html", label: "공간 둘러보기" },
      ],
    },
    { href: "location.html", label: "진료 안내 & 오시는 길" },
    { href: "community.html", label: "건강정보" },
    { href: "https://m.place.naver.com/hospital/2098208942/home?entry=pll", label: "예약 바로가기", external: true, reservation: true },
  ];

  const currentPage = window.location.pathname.split("/").pop() || "index.html";
  const isSubPage = window.location.pathname.replace(/\\/g, "/").includes("/sub/");
  const rootPrefix = isSubPage ? "../" : "";
  const subPrefix = isSubPage ? "" : "sub/";
  const itemPages = (item) => [item.href].concat((item.children || []).map((child) => child.href));
  const isActive = (item) => itemPages(item).some(href => href.split("#")[0] === currentPage);
  const navHref = (item) => item.external ? item.href : `${subPrefix}${item.href}`;
  const findHero = () => document.querySelector("main > .hero, main > .sub-hero");

  function Header() {
    const [currentHash, setCurrentHash] = React.useState(() => window.location.hash || "#c-arm");
    const isCurrent = (href) => {
      const [page, hash] = href.split("#");
      return page === currentPage && (!hash || `#${hash}` === currentHash);
    };
    const [isCompact, setIsCompact] = React.useState(() => window.matchMedia("(max-width: 1000px)").matches);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
    const [openSubmenu, setOpenSubmenu] = React.useState(null);
    const [isOverDark, setIsOverDark] = React.useState(() => Boolean(findHero()) && window.scrollY === 0);
    const headerRef = React.useRef(null);
    const menuButtonRef = React.useRef(null);
    const navRef = React.useRef(null);

    const closeMenus = () => {
      setIsMobileMenuOpen(false);
      setOpenSubmenu(null);
    };

    React.useEffect(() => {
      const syncHash = () => setCurrentHash(window.location.hash || "#c-arm");
      window.addEventListener("hashchange", syncHash);
      return () => window.removeEventListener("hashchange", syncHash);
    }, []);

    React.useEffect(() => {
      let frame = 0;
      const updateContrast = () => {
        const bar = headerRef.current?.querySelector(".header-inner");
        if (!bar) return;
        const hero = findHero();
        setIsOverDark(Boolean(hero && hero.getBoundingClientRect().bottom > bar.getBoundingClientRect().height));
      };
      const scheduleUpdate = () => {
        window.cancelAnimationFrame(frame);
        frame = window.requestAnimationFrame(updateContrast);
      };
      updateContrast();
      window.addEventListener("scroll", scheduleUpdate, { passive: true });
      window.addEventListener("resize", scheduleUpdate);
      window.addEventListener("load", scheduleUpdate);
      return () => {
        window.cancelAnimationFrame(frame);
        window.removeEventListener("scroll", scheduleUpdate);
        window.removeEventListener("resize", scheduleUpdate);
        window.removeEventListener("load", scheduleUpdate);
      };
    }, []);

    React.useEffect(() => {
      const media = window.matchMedia("(max-width: 1000px)");
      const onChange = (event) => {
        setIsCompact(event.matches);
        setIsMobileMenuOpen(false);
        setOpenSubmenu(null);
      };
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    }, []);

    React.useEffect(() => {
      const onPointerDown = (event) => {
        if (headerRef.current && !headerRef.current.contains(event.target)) {
          setIsMobileMenuOpen(false);
          setOpenSubmenu(null);
        }
      };
      document.addEventListener("pointerdown", onPointerDown);
      return () => document.removeEventListener("pointerdown", onPointerDown);
    }, []);

    React.useEffect(() => {
      if (isMobileMenuOpen && navRef.current) {
        navRef.current.scrollTop = 0;
      }
    }, [isMobileMenuOpen]);

    const onKeyDown = (event) => {
      if (event.key !== "Escape") {
        return;
      }
      if (openSubmenu !== null) {
        event.preventDefault();
        headerRef.current.querySelector(`#site-nav-trigger-${openSubmenu}`).focus();
        setOpenSubmenu(null);
      } else if (isMobileMenuOpen) {
        event.preventDefault();
        setIsMobileMenuOpen(false);
        menuButtonRef.current.focus();
      }
    };

    return h(
      "header",
      {
        ref: headerRef,
        onKeyDown,
        className: [
          "site-header",
          isOverDark ? "is-over-dark" : "",
          isMobileMenuOpen ? "is-mobile-menu-open" : "",
        ].filter(Boolean).join(" "),
      },
      h(
        "div",
        { className: "inner header-inner" },
        h(
          "h1",
          { className: "brand" },
          "여의도기통찬의원",
          h(
            "a",
            { href: `${rootPrefix}index.html`, "aria-label": "여의도기통찬의원 홈" },
            h("img", {
              src: `${rootPrefix}img/logo_wide.png`,
              alt: "여의도기통찬의원",
              className: "header-logo header-logo--on-light",
            }),
            h("img", {
              src: `${rootPrefix}img/logo_wide_reversed.png`,
              alt: "",
              "aria-hidden": "true",
              className: "header-logo header-logo--on-dark",
            })
          )
        ),
        h(
          "button",
          {
            ref: menuButtonRef,
            type: "button",
            className: "mobile-menu-toggle",
            onClick: () => {
              setIsMobileMenuOpen((isOpen) => !isOpen);
              setOpenSubmenu(null);
            },
            "aria-controls": "site-main-nav",
            "aria-expanded": isMobileMenuOpen ? "true" : "false",
            "aria-label": isMobileMenuOpen ? "메뉴 닫기" : "메뉴 열기",
            title: isMobileMenuOpen ? "메뉴 닫기" : "메뉴 열기",
          },
          h("span", { "aria-hidden": "true" }),
          h("span", { "aria-hidden": "true" }),
          h("span", { "aria-hidden": "true" })
        ),
        h(
          "nav",
          {
            ref: navRef,
            id: "site-main-nav",
            className: "main-nav",
            "aria-label": "주요 메뉴",
          },
          h(
            "ul",
            { className: "main-nav-list" },
            navItems.map((item, index) =>
              h(
                "li",
                {
                  key: item.label,
                  onMouseEnter: () => {
                    if (!isCompact && item.children) {
                      setOpenSubmenu(index);
                    }
                  },
                  onMouseLeave: (event) => {
                    if (!isCompact && !event.currentTarget.contains(document.activeElement)) {
                      setOpenSubmenu((open) => open === index ? null : open);
                    }
                  },
                  onFocusCapture: () => {
                    if (!isCompact && item.children) {
                      setOpenSubmenu(index);
                    }
                  },
                  onBlurCapture: (event) => {
                    if (!isCompact && !event.currentTarget.contains(event.relatedTarget)) {
                      setOpenSubmenu((open) => open === index ? null : open);
                    }
                  },
                  className: [
                    "main-nav-item",
                    item.children ? "has-children" : "",
                    isActive(item) ? "is-active" : "",
                    openSubmenu === index ? "is-submenu-open" : "",
                  ].filter(Boolean).join(" "),
                },
                h(
                  isCompact && item.children ? "button" : "a",
                  {
                    id: `site-nav-trigger-${index}`,
                    type: isCompact && item.children ? "button" : undefined,
                    href: isCompact && item.children ? undefined : navHref(item),
                    className: item.reservation ? "main-nav-link reservation-link" : "main-nav-link",
                    target: item.external ? "_blank" : undefined,
                    rel: item.external ? "noopener noreferrer" : undefined,
                    "data-naver-reservation": item.reservation ? "" : undefined,
                    "data-track-event": item.reservation ? "네이버 예약 클릭" : undefined,
                    "aria-controls": item.children ? `site-sub-nav-${index}` : undefined,
                    "aria-expanded": item.children ? openSubmenu === index : undefined,
                    "aria-current": !item.children && isCurrent(item.href) ? "page" : undefined,
                    onClick: isCompact && item.children
                      ? () => setOpenSubmenu((open) => open === index ? null : index)
                      : closeMenus,
                  },
                  item.brandLetter
                    ? h("span", null, h("span", { className: "nav-brand-letter" }, item.label[0]), item.label.slice(1))
                    : item.label
                ),
                item.children &&
                  h(
                    "div",
                    {
                      id: `site-sub-nav-${index}`,
                      className: item.justifyChildren ? "sub-nav-panel sub-nav-panel--justify" : "sub-nav-panel",
                      hidden: isCompact && openSubmenu !== index,
                    },
                    h(
                      "ul",
                      { className: "sub-nav-list" },
                      item.children.map((child) =>
                        h(
                          "li",
                          { key: `${child.href}-${child.label}` },
                          h(
                            "a",
                            {
                              href: navHref(child),
                              className: isCurrent(child.href) ? "sub-nav-link is-active" : "sub-nav-link",
                              "aria-current": isCurrent(child.href) ? "page" : undefined,
                              "aria-label": item.justifyChildren ? child.label : undefined,
                              onClick: closeMenus,
                            },
                            item.justifyChildren
                              ? h(
                                  "span",
                                  { className: "sub-nav-label", "aria-hidden": "true" },
                                  Array.from(child.label).map((char, charIndex) => h("span", { key: charIndex }, char))
                                )
                              : child.label
                          )
                        )
                      )
                    )
                  )
              )
            )
          )
        )
      )
    );
  }

  window.YgtcComponents = window.YgtcComponents || {};
  window.YgtcComponents.Header = Header;
})();
