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

  const patientRights = [
    "① 환자는 인간으로서의 존엄과 가치를 바탕으로 인격을 존중 받을 권리가 있다.",
    "② 환자는 국적, 성별, 연령, 종교, 경제·사회적 지위, 질병의 종류 등 어떤 이유로도 차별 받지 않으며, 평등한 의료 서비스를 받을 권리가 있다.",
    "③ 환자는 최선의 진료를 위하여 지정의 및 의료기관을 선택할 권리가 있다.",
    "④ 환자는 적법한 자격을 갖춘 의료인으로부터 의료행위를 제공받을 권리가 있다.",
    "⑤ 환자 및 보호자는 환자의 진료기록에 관한 정보 및 기록을 요구할 권리가 있다.",
    "⑥ 환자 및 보호자는 환자의 질병상태 및 치료 행위의 목적, 방법, 내용과 그 결과에 대해 설명을 듣고, 치료 방법 또는 치료 거부에 대해 선택할 권리가 있다.",
    "⑦ 환자 및 보호자는 의료행위와 관련된 문서에 서명하기 전에 그 내용에 대해 설명을 들을 권리가 있다.",
    "⑧ 환자 및 보호자는 의료행위에 소요된 의료비 내역에 대해 알 권리가 있다.",
    "⑨ 환자는 질병. 치료에 관련된 정보 및 사생활에 관한 모든 비밀을 침해 받지 않을 권리가 있다.",
    "⑩ 환자 및 보호자는 병원 내 의료서비스를 포함한 기타 사항에 대해 불만이 있을 경우, 의견을 표현하고 그에 대하여 답변을 들을 권리가 있다.",
  ];

  const patientResponsibilities = [
    "① 환자는 현재 증상, 과거 병력, 약물 치료 및 기타 기록 등 진료에 관련된 사안을 직접 또는 법적 대리인을 통해 의료진에게 제공할 책임이 있다.",
    "② 본인의 치료와 관련해 모르는 점이 있을 때, 확인 할 책임이 있다.",
    "③ 환자는 의료진이 권장한 치료 계획에 참여하고, 치료에 협력할 책임이 있다.",
    "④ 환자는 치료 계획 불응 시 발생한 결과에 대한 책임이 있다.",
    "⑤ 환자는 다른 환자 및 의료진을 존중하며, 병원의 자산을 중요시 할 책임이 있다.",
    "⑥ 환자는 치료와 관련된 재정적 의무를 다할 책임이 있다.",
    "⑦ 환자는 병원의 규칙 및 규정에 따를 책임이 있다.",
  ];

  function PatientRightsModal({ onClose }) {
    const dialogRef = React.useRef(null);

    React.useEffect(() => {
      const previouslyFocused = document.activeElement;
      dialogRef.current && dialogRef.current.focus();
      document.body.classList.add("modal-open");

      const handleKeyDown = (event) => {
        if (event.key === "Escape") {
          onClose();
        }
      };
      document.addEventListener("keydown", handleKeyDown);

      return () => {
        document.removeEventListener("keydown", handleKeyDown);
        document.body.classList.remove("modal-open");
        previouslyFocused && previouslyFocused.focus && previouslyFocused.focus();
      };
    }, [onClose]);

    return h(
      "div",
      {
        className: "modal-overlay",
        onMouseDown: (event) => {
          if (event.target === event.currentTarget) {
            // Keep the default focus shift from clobbering the focus we restore on unmount.
            event.preventDefault();
            onClose();
          }
        },
      },
      h(
        "div",
        {
          className: "modal-dialog",
          role: "dialog",
          "aria-modal": "true",
          "aria-labelledby": "patient-rights-title",
          tabIndex: -1,
          ref: dialogRef,
        },
        h(
          "button",
          { type: "button", className: "modal-close", "aria-label": "닫기", onClick: onClose },
          "×"
        ),
        h("h2", { id: "patient-rights-title", className: "modal-title" }, "환자 권리장전"),
        h(
          "p",
          { className: "modal-lead" },
          "모든 환자는 인간으로서 존엄과 가치를 지니고, 건강한 삶을 영위하기 위해 다음과 같은 권리를 가지며 이에 따른 책임과 의무를 가진다."
        ),
        h(
          "div",
          { className: "modal-body" },
          h(
            "div",
            { className: "modal-section" },
            h("h3", null, "환자의 권리"),
            h(
              "ul",
              { className: "modal-list" },
              patientRights.map((item) => h("li", { key: item }, item))
            )
          ),
          h(
            "div",
            { className: "modal-section" },
            h("h3", null, "환자의 책임"),
            h(
              "ul",
              { className: "modal-list" },
              patientResponsibilities.map((item) => h("li", { key: item }, item))
            )
          )
        )
      )
    );
  }

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
    const [isRightsModalOpen, setRightsModalOpen] = React.useState(false);

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
            h(
              "button",
              { type: "button", className: "footer-policy-link", onClick: () => setRightsModalOpen(true) },
              "환자권리장전"
            )
          )
        )
      ),
      isRightsModalOpen && h(PatientRightsModal, { onClose: () => setRightsModalOpen(false) })
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
