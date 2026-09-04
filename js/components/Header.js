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
        { href: "location.html", label: "진료시간 & 오시는 길" },
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
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

    return h(
      "header",
      {
        className: [
          "site-header",
          isSubPage && isMobileMenuOpen ? "is-mobile-menu-open" : "",
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
        isSubPage && h(
          "button",
          {
            type: "button",
            className: "subpage-mobile-menu-toggle",
            onClick: () => setIsMobileMenuOpen((isOpen) => !isOpen),
            "aria-controls": "subpage-main-nav",
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
            id: isSubPage ? "subpage-main-nav" : undefined,
            className: "main-nav",
            "aria-label": "주요 메뉴",
          },
          h(
            "ul",
            { className: "main-nav-list" },
            navItems.map((item) =>
              h(
                "li",
                {
                  key: item.href,
                  className: [
                    "main-nav-item",
                    item.children ? "has-children" : "",
                    isActive(item) ? "is-active" : "",
                  ].filter(Boolean).join(" "),
                },
                h(
                  "a",
                  {
                    href: navHref(item),
                    className: "main-nav-link",
                    "aria-haspopup": item.children ? "true" : undefined,
                  },
                  item.label
                ),
                item.children &&
                  h(
                    "div",
                    { className: "sub-nav-panel" },
                    h(
                      "ul",
                      { className: "sub-nav-list" },
                      item.children.map((child) =>
                        h(
                          "li",
                          { key: child.href },
                          h(
                            "a",
                            {
                              href: navHref(child),
                              className: currentPage === child.href ? "sub-nav-link is-active" : "sub-nav-link",
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
            href: "tel:0200000000",
            className: "phone-cta",
            "aria-label": "전화문의 02-000-0000",
          },
          h("span", null, "전화문의"),
          h("strong", null, "02-000-0000")
        )
      )
    );
  }

  window.YgtcComponents = window.YgtcComponents || {};
  window.YgtcComponents.Header = Header;
})();
