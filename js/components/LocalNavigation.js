(() => {
  if (!window.React) {
    return;
  }

  const h = React.createElement;
  const navigationGroups = {
    intro: {
      label: "여의도기통찬 소개",
      items: [
        { href: "about.html", label: "기통찬 스토리" },
        { href: "doctor.html", label: "기통찬 의료진" },
        { href: "values.html", label: "기통찬 약속" },
        { href: "hours.html", label: "진료시간" },
        { href: "location.html", label: "오시는길" },
      ],
    },
    treatment: {
      label: "기(氣)를 돌보는 진료",
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
      label: "통(通)쾌하게 이끄는 치료",
      items: [
        { href: "injection.html", label: "원인을 살피는 정밀 주사치료" },
        { href: "shockwave.html", label: "조직 회복을 돕는 체외충격파" },
        { href: "manual-therapy.html", label: "기능 회복을 돕는 도수치료" },
        { href: "autonomic.html", label: "균형을 되찾는 자율신경 주사치료" },
        { href: "recovery-iv.html", label: "개인의 상태에 맞춘 회복수액" },
      ],
    },
  };

  function LocalNavigation({ group }) {
    const navigation = navigationGroups[group];
    const currentPage = window.location.pathname.split("/").pop();

    if (!navigation) {
      return null;
    }

    return h(
      "nav",
      { className: `sub-local-nav sub-local-nav--${group}`, "aria-label": `${navigation.label} 세부 메뉴` },
      h(
        "div",
        { className: "inner sub-local-nav-inner" },
        h(
          "ul",
          null,
          navigation.items.map((item) =>
            h(
              "li",
              { key: `${item.href}-${item.label}` },
              h(
                "a",
                {
                  href: item.href,
                  className: item.href === currentPage ? "is-active" : "",
                  "aria-current": item.href === currentPage ? "page" : undefined,
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
