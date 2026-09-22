(() => {
  if (!window.React) {
    return;
  }

  const h = React.createElement;
  const isSubPage = window.location.pathname.replace(/\\/g, "/").includes("/sub/");
  const rootPrefix = isSubPage ? "../" : "";

  const hours = [
    { term: "월 화 목 금", desc: "09:00 ~ 20:00", badge: "야간진료", badgeType: "night" },
    { term: "수요일", desc: "09:00 ~ 19:00" },
    { term: "토요일", desc: "09:00 ~ 14:00", badge: "단축진료", badgeType: "short" },
    { term: "점심시간", desc: "13:30 ~ 14:30" },
  ];

  const hoursNotes = [
    "진료 종료 30분 전 접수 마감입니다.",
    "일요일 · 일반 공휴일 휴진입니다.",
    "토요일 점심시간 없이 진료합니다.",
  ];

  const location = [
    { term: "주소", desc: "서울특별시 영등포구 국제금융로 72 4층" },
    { term: "주차안내", desc: "호정빌딩 지하주차장 이용" },
  ];

  const DefinitionRows = ({ items }) =>
    items.map((item) =>
      h(
        "div",
        { key: item.term },
        h("dt", null, item.term),
        h(
          "dd",
          null,
          h("span", null, item.desc),
          item.badge && h("span", { className: `clinic-hours-badge clinic-hours-badge--${item.badgeType}` }, item.badge)
        )
      )
    );

  function FooterInfoBlock({ id, title, items, className = "", notes = [] }) {
    return h(
      "div",
      {
        className: ["footer-info-block", className].filter(Boolean).join(" "),
        "aria-labelledby": id,
      },
      h("h3", { id }, title),
      h("dl", null, h(DefinitionRows, { items })),
      notes.length > 0 && h(
        "ul",
        { className: "clinic-hours-notes", "aria-label": "진료 안내" },
        notes.map((note) => h("li", { key: note }, note))
      )
    );
  }

  function Footer() {
    return h(
      "footer",
      { className: "site-footer" },
      h(
        "div",
        { className: "footer-contact", id: "hours" },
        h(
          "div",
          { className: "inner-fluid footer-contact-inner" },
          h("h2", null, "여의도기통찬의원", h("br"), h("span", null, "진료안내")),
          h("div", { className: "footer-map", "aria-label": "네이버 지도 영역" }),
          h(
            "div",
            { className: "inner footer-info-grid" },
            h(FooterInfoBlock, {
              id: "footer-hours-title",
              title: "진료시간",
              items: hours,
              className: "clinic-hours",
              notes: hoursNotes,
            }),
            h(FooterInfoBlock, {
              id: "footer-location-title",
              title: "오시는 길",
              items: location,
            }),
            h(
              "div",
              {
                className: "footer-info-block footer-call",
                "aria-labelledby": "footer-call-title",
              },
              h("h3", { id: "footer-call-title" }, "진료문의"),
              h("p", null, "02-782-7070")
            )
          )
        )
      ),
      h(
        "div",
        { className: "footer-business" },
        h(
          "div",
          { className: "inner footer-business-inner" },
          h(
            "a",
            { href: `${rootPrefix}index.html`, className: "footer-logo", "aria-label": "여의도기통찬의원 홈" },
            h("img", { src: `${rootPrefix}img/logo_wide.png`, alt: "여의도기통찬의원" })
          ),
          h(
            "div",
            { className: "footer-company-text" },
            h(
              "p",
              null,
              "대표자 : 이동현 ",
              h("span", null, "|"),
              " 사업자등록번호 : 000-00-00000"
            ),
            h("p", null, "주소 : 서울특별시 영등포구 국제금융로 72 4층(여의도동, 호정빌딩)"),
            h(
              "p",
              null,
              "TEL : 02-782-7070 ",
              h("span", null, "|"),
              " FAX : 02-123-4567"
            )
          ),
          h(
            "div",
            { className: "footer-policy-links" },
            h("a", { href: "#" }, "비급여항목"),
            h("span", null, "|"),
            h("a", { href: "#" }, "환자권리장전")
          )
        )
      )
    );
  }

  // Add the clinic's external URLs here when they are available.
  const quickLinkUrls = {
    kakao: "",
    reservation: "",
    blog: "",
  };

  function QuickLinks() {
    const items = [
      { id: "top", label: "최상단 이동", icon: "arrow-up" },
      { id: "phone", label: "전화 문의", icon: "phone", href: "tel:027827070" },
      { id: "kakao", label: "카카오톡 상담", icon: "message-circle", href: quickLinkUrls.kakao, external: true },
      { id: "location", label: "오시는길", icon: "map-pin", href: `${rootPrefix}sub/location.html` },
      { id: "reservation", label: "네이버 예약", icon: "calendar-check", href: quickLinkUrls.reservation, external: true },
      { id: "blog", label: "네이버 블로그", icon: "notebook-pen", href: quickLinkUrls.blog, external: true },
    ];

    return h("nav", { className: "quick-links", "aria-label": "빠른 안내" },
      items.map((item) => {
        const unavailable = item.id !== "top" && !item.href;
        const props = {
          key: item.id,
          className: `quick-link quick-link--${item.id}`,
          "aria-label": unavailable ? `${item.label} (준비 중)` : item.label,
          title: unavailable ? `${item.label} (준비 중)` : item.label,
        };
        if (item.href) {
          props.href = item.href;
          if (item.external) {
            props.target = "_blank";
            props.rel = "noopener noreferrer";
          }
        } else {
          props.type = "button";
          props.disabled = unavailable;
          if (item.id === "top") {
            props.onClick = () => window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
          }
        }
        return h(item.href ? "a" : "button", props,
          h("img", { src: `${rootPrefix}img/icons/${item.icon}.svg`, width: 24, height: 24, alt: "", "aria-hidden": "true" }),
          h("span", null, item.label)
        );
      })
    );
  }

  window.YgtcComponents = window.YgtcComponents || {};
  window.YgtcComponents.QuickLinks = QuickLinks;
  window.YgtcComponents.Footer = Footer;
})();
