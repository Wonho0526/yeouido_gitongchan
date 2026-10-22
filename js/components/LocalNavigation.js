(() => {
  if (!window.React) {
    return;
  }

  const h = React.createElement;
  const navigationGroups = {
    intro: {
      label: "여의도기통찬 소개",
      items: [
        { href: "about.html", label: "여의도기통찬 스토리" },
        { href: "special.html", label: "여의도기통찬 특별함" },
        { href: "doctor.html", label: "여의도기통찬 의료진" },
        { href: "values.html", label: "여의도기통찬 약속" },
      ],
    },
    treatment: {
      label: "기능까지 살피는 진료",
      items: [
        { href: "neck-shoulder.html", label: "목·어깨" },
        { href: "spine-joint.html", label: "허리·골반" },
        { href: "hand-wrist.html", label: "팔꿈치·손" },
        { href: "knee.html", label: "무릎" },
        { href: "foot-heel.html", label: "발·발목" },
        { href: "neuralgia.html", label: "두통·신경통" },
      ],
    },
    care: {
      label: "통증을 회복으로 이끄는 치료",
      items: [
        { href: "injection.html", label: "원인을 찾아가는 주사치료" },
        { href: "shockwave.html", label: "조직 회복을 돕는 체외충격파" },
        { href: "manual-therapy.html", label: "움직임을 회복하는 도수치료" },
        { href: "autonomic.html", label: "균형을 되찾는 자율신경 주사치료(SNEPI)" },
        { href: "recovery-iv.html", label: "몸의 회복을 돕는 기능회복 수액" },
      ],
    },
    environment: {
      label: "찬란한 일상을 위한 진료환경",
      items: [
        { href: "equipment.html#c-arm", label: "C-arm" },
        { href: "equipment.html#ultrasound", label: "초음파진단장치" },
        { href: "equipment.html#cryo-jet", label: "Cryo-Jet" },
        { href: "equipment.html#eswt", label: "체외충격파" },
        { href: "spaces.html", label: "공간 둘러보기" },
      ],
    },
  };

  // 메뉴가 잘릴 때 더 있는 쪽을 가리키는 꺾쇠. 스크롤바를 숨겨 둔 화면에서는
  // 옆으로 쓸어 넘길 수 있다는 것이 드러나지 않는다.
  const chevron = (direction) => h(
    "svg",
    {
      width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor",
      strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", focusable: "false",
    },
    h("path", { d: direction === "left" ? "m15 18-6-6 6-6" : "m9 18 6-6-6-6" })
  );

  function LocalNavigation({ group }) {
    const navigation = navigationGroups[group];
    const currentPage = window.location.pathname.split("/").pop();
    const [currentHash, setCurrentHash] = React.useState(() => window.location.hash || "#c-arm");
    const isCurrent = (href) => {
      const [page, hash] = href.split("#");
      return page === currentPage && (!hash || `#${hash}` === currentHash);
    };
    const listRef = React.useRef(null);
    const [more, setMore] = React.useState({ left: false, right: false });
    React.useEffect(() => {
      const syncHash = () => setCurrentHash(window.location.hash || "#c-arm");
      window.addEventListener("hashchange", syncHash);
      return () => window.removeEventListener("hashchange", syncHash);
    }, []);
    React.useEffect(() => {
      const list = listRef.current;
      const active = list?.querySelector('[aria-current="page"]');
      if (list && active) {
        list.scrollLeft = Math.max(0, active.offsetLeft - list.offsetLeft - (list.clientWidth - active.clientWidth) / 2);
      }
    }, [group, currentPage, currentHash]);

    // 가운데 맞추기가 끝난 뒤에 재어야 스크롤 위치가 반영된다.
    React.useEffect(() => {
      const list = listRef.current;
      if (!list) {
        return undefined;
      }
      const measure = () => {
        const slack = list.scrollWidth - list.clientWidth;
        setMore(slack <= 1
          ? { left: false, right: false }
          : { left: list.scrollLeft > 1, right: list.scrollLeft < slack - 1 });
      };
      measure();
      list.addEventListener("scroll", measure, { passive: true });
      window.addEventListener("resize", measure);
      // 글꼴이 늦게 적용되면 글자 폭이 달라져 잘리는 여부도 바뀐다.
      document.fonts?.ready.then(measure).catch(() => {});
      const observer = typeof ResizeObserver === "function" ? new ResizeObserver(measure) : null;
      observer?.observe(list);
      return () => {
        list.removeEventListener("scroll", measure);
        window.removeEventListener("resize", measure);
        observer?.disconnect();
      };
    }, [group, currentPage, currentHash]);

    if (!navigation) {
      return null;
    }

    return h(
      "nav",
      { className: `sub-local-nav sub-local-nav--${group}`, "aria-label": `${navigation.label} 세부 메뉴` },
      h(
        "div",
        {
          className: [
            "inner sub-local-nav-inner",
            more.left ? "has-more-left" : "",
            more.right ? "has-more-right" : "",
          ].filter(Boolean).join(" "),
        },
        h("span", { className: "sub-local-nav-cue sub-local-nav-cue--left", "aria-hidden": "true" },
          chevron("left")),
        h("span", { className: "sub-local-nav-cue sub-local-nav-cue--right", "aria-hidden": "true" },
          chevron("right")),
        h(
          "ul",
          { ref: listRef },
          navigation.items.filter(item => currentPage !== "equipment.html" || item.href !== "spaces.html").map((item) =>
            h(
              "li",
              { key: `${item.href}-${item.label}` },
              h(
                "a",
                {
                  href: item.href,
                  className: isCurrent(item.href) ? "is-active" : "",
                  "aria-current": isCurrent(item.href) ? "page" : undefined,
                },
                item.label
              )
            )
          )
        )
      )
    );
  }

  window.YgtcComponents = window.YgtcComponents || {};
  window.YgtcComponents.LocalNavigation = LocalNavigation;
})();
