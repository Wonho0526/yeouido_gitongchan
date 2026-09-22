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
        { href: "about.html", label: "‘기통찬’뜻 & 미션 비전" },
        { href: "doctor.html", label: "기통찬 의료진 소개" },
        { href: "values.html", label: "기통찬의 핵심가치 & 약속" },
        { href: "hours.html", label: "진료시간" },
        { href: "location.html", label: "오시는길" },
      ],
    },
    {
      href: "neck-shoulder.html",
      label: "기(氣)를 돌보는 진료",
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
      label: "통(通)쾌하게 이끄는 치료",
      children: [
        { href: "injection.html", label: "원인을 살피는 정밀 주사치료" },
        { href: "shockwave.html", label: "조직 회복을 돕는 체외충격파" },
        { href: "manual-therapy.html", label: "기능 회복을 돕는 도수치료" },
        { href: "autonomic.html", label: "균형을 되찾는 자율신경 주사치료" },
        { href: "recovery-iv.html", label: "개인의 상태에 맞춘 회복수액" },
      ],
    },
    { href: "equipment.html", label: "찬(燦)찬히 짚어내는 장비" },
    { href: "#", label: "기통찬 진료예약", external: true },
    { href: "#", label: "기가 통하는 커뮤니티", external: true },
  ];

  const currentPage = window.location.pathname.split("/").pop() || "index.html";
  const isSubPage = window.location.pathname.replace(/\\/g, "/").includes("/sub/");
  const rootPrefix = isSubPage ? "../" : "";
  const subPrefix = isSubPage ? "" : "sub/";
  const itemPages = (item) => [item.href].concat((item.children || []).map((child) => child.href));
  const isActive = (item) => itemPages(item).includes(currentPage);
  const navHref = (item) => item.external ? item.href : `${subPrefix}${item.href}`;

  function Header() {
    const [isCompact, setIsCompact] = React.useState(() => window.matchMedia("(max-width: 1440px)").matches);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
    const [openSubmenu, setOpenSubmenu] = React.useState(null);
    const [isOverDark, setIsOverDark] = React.useState(() => !isSubPage && window.scrollY === 0);
    const headerRef = React.useRef(null);
    const menuButtonRef = React.useRef(null);
    const navRef = React.useRef(null);

    const closeMenus = () => {
      setIsMobileMenuOpen(false);
      setOpenSubmenu(null);
    };

    React.useEffect(() => {
      let frame = 0;
      const updateContrast = () => {
        const bar = headerRef.current?.querySelector(".header-inner");
        if (!bar) return;
        const hero = !isSubPage && document.querySelector("main > .hero");
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
      const media = window.matchMedia("(max-width: 1440px)");
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
          "a",
          { href: `${rootPrefix}index.html`, className: "brand", "aria-label": "여의도기통찬의원 홈" },
          h("img", {
            src: `${rootPrefix}img/logo_wide.png`,
            alt: "여의도기통찬의원",
            className: "header-logo",
          })
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
                    className: "main-nav-link",
                    "aria-controls": item.children ? `site-sub-nav-${index}` : undefined,
                    "aria-expanded": item.children ? openSubmenu === index : undefined,
                    "aria-current": !item.children && currentPage === item.href ? "page" : undefined,
                    onClick: isCompact && item.children
                      ? () => setOpenSubmenu((open) => open === index ? null : index)
                      : closeMenus,
                  },
                  item.label
                ),
                item.children &&
                  h(
                    "div",
                    {
                      id: `site-sub-nav-${index}`,
                      className: "sub-nav-panel",
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
                              className: currentPage === child.href ? "sub-nav-link is-active" : "sub-nav-link",
                              "aria-current": currentPage === child.href ? "page" : undefined,
                              onClick: closeMenus,
                            },
                            child.label
                          )
                        )
                      )
                    )
                  )
              )
            )
          )
        ),
        h(
          "a",
          {
            href: "tel:027827070",
            className: "phone-cta",
            "aria-label": "전화문의 02-782-7070",
          },
          h("span", null, "전화문의"),
          h("strong", null, "02-782-7070")
        )
      )
    );
  }

  window.YgtcComponents = window.YgtcComponents || {};
  window.YgtcComponents.Header = Header;
})();
