(() => {
  if (!window.React) {
    return;
  }

  const h = React.createElement;
  const isSubPage = window.location.pathname.replace(/\\/g, "/").includes("/sub/");
  const rootPrefix = isSubPage ? "../" : "";

  const hours = [
    { term: "월 ~ 금", desc: "09:00 - 18:30" },
    { term: "토요일", desc: "09:00 - 13:00" },
    { term: "점심시간", desc: "13:00 - 14:00" },
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
        h("dd", null, item.desc)
      )
    );

  function FooterInfoBlock({ id, title, items, className = "" }) {
    return h(
      "div",
      {
        className: ["footer-info-block", className].filter(Boolean).join(" "),
        "aria-labelledby": id,
      },
      h("h3", { id }, title),
      h("dl", null, h(DefinitionRows, { items }))
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
              h("p", null, "02-123-4567")
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
              "TEL : 02-123-4567 ",
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

  window.YgtcComponents = window.YgtcComponents || {};
  window.YgtcComponents.Footer = Footer;
})();
