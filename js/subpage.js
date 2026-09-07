(() => {
  if (!window.React || !window.ReactDOM || !window.YgtcSubpageData) {
    return;
  }

  const h = React.createElement;
  const pageKey = document.body.dataset.page;
  const page = window.YgtcSubpageData[pageKey];
  const treatmentNotes = window.YgtcTreatmentNotes || {};
  const root = document.getElementById("subpage-root");
  const isSubPage = window.location.pathname.replace(/\\/g, "/").includes("/sub/");
  const rootPrefix = isSubPage ? "../" : "";

  if (!page || !root) {
    return;
  }

  const cx = (...classes) => classes.filter(Boolean).join(" ");
  const assetPath = (path) => {
    if (!path || path.startsWith("#") || /^(https?:|data:|mailto:|tel:)/.test(path)) {
      return path;
    }

    return `${rootPrefix}${path}`;
  };

  const list = (items, className) =>
    h(
      "ul",
      { className },
      items.map((item) => h("li", { key: item }, item))
    );

  const getTreatmentNote = (treatment, condition) => {
    return treatmentNotes[treatment] || {
      title: treatment,
      subtitle: `${condition.title}에 맞춘 ${treatment}`,
      body: [
        "현재 통증 양상과 생활 패턴을 함께 확인한 뒤 필요한 범위에서 적용하는 맞춤 치료입니다.",
        "자세한 치료 횟수와 강도는 진료 후 상태에 맞춰 안내드립니다.",
      ],
    };
  };

  const heroSeries = {
    "여의도기통찬 소개": ["여의도", "기통찬", "소개"],
    "기(氣)를 돌보는 진료": ["기(氣)를", "돌보는", "진료"],
    "통(通)쾌하게 이끄는 치료": ["통(通)쾌하게", "이끄는", "치료"],
    "찬(燦)찬히 짚어내는 장비": ["찬(燦)찬히", "짚어내는", "장비"],
  };

  function ImageFrame({ image, label, alt, className = "" }) {
    if (image) {
      return h(
        "figure",
        { className: cx("sub-image-frame", className) },
        h("img", { src: assetPath(image), alt: alt || label || "", loading: "lazy" })
      );
    }

    return h(
      "div",
      { className: cx("sub-image-frame sub-image-placeholder", className), role: "img", "aria-label": label },
      h("span", null, label)
    );
  }

  function SectionHeading({ eyebrow, title, description, centered = false }) {
    return h(
      "header",
      { className: cx("sub-section-heading", centered && "is-centered") },
      eyebrow && h("p", { className: "sub-section-kicker" }, eyebrow),
      h("h2", null, title),
      description && h("p", { className: "sub-section-desc" }, description)
    );
  }

  function Hero() {
    const series = heroSeries[page.category] || [page.category];

    return h(
      React.Fragment,
      null,
      h(
        "section",
        { className: "sub-hero" },
        h(
          "div",
          { className: "inner sub-hero-inner" },
          h("p", { className: "sub-hero-eyebrow" }, page.eyebrow),
          h(
            "p",
            { className: "sub-hero-series", "aria-label": page.category },
            series.map((word, index) => h("span", { className: `tone-${index + 1}`, key: word }, word))
          ),
          h("h1", null, page.title),
          h("p", { className: "sub-hero-desc" }, page.subtitle)
        )
      )
    );
  }

  function LocalNavigation() {
    if (!page.nav || !page.nav.length) {
      return null;
    }

    return h(
      "nav",
      { className: "sub-local-nav", "aria-label": `${page.category} 세부 메뉴` },
      h(
        "div",
        { className: "inner sub-local-nav-inner" },
        h(
          "ul",
          null,
          page.nav.map((item) =>
            h(
              "li",
              { key: item.href },
              h(
                "a",
                {
                  href: item.href,
                  className: item.page === pageKey ? "is-active" : "",
                  "aria-current": item.page === pageKey ? "page" : undefined,
                },
                item.label
              )
            )
          )
        )
      )
    );
  }

  function AboutPage() {
    return [
      h(
        "section",
        { className: "sub-section sub-about-meaning", key: "meaning" },
        h(
          "div",
          { className: "inner" },
          h(SectionHeading, {
            eyebrow: "THE MEANING OF GITONGCHAN",
            title: "기(氣)가 통(通)하면 찬(燦), 밝아집니다",
            centered: true,
          }),
          h(
            "div",
            { className: "sub-about-statement" },
            page.meaning.map((text, index) => h("p", { className: index === 0 ? "is-lead" : "", key: text }, text))
          ),
          h(
            "div",
            { className: "sub-vision-grid" },
            page.visions.map((vision) =>
              h(
                "article",
                { className: "sub-vision-card", key: vision.label },
                h("span", null, vision.label),
                h("strong", null, vision.text)
              )
            )
          )
        )
      ),
      h(
        "section",
        { className: "sub-section sub-about-mission", key: "why" },
        h(
          "div",
          { className: "inner sub-editorial-split" },
          h(
            "div",
            { className: "sub-copy-stack" },
            h("span", { className: "sub-section-kicker" }, "MISSION & VISION"),
            h("h2", null, page.whyTitle),
            page.why.map((text) => h("p", { key: text }, text))
          ),
          h(ImageFrame, {
            image: "img/hero.jpg",
            label: "상담 중인 의료진",
            alt: "상담 중인 의료진",
            className: "sub-about-image",
          })
        )
      ),
    ];
  }

  function DoctorPage() {
    return h(
      "section",
      { className: "sub-section sub-doctor-section" },
      h(
        "div",
        { className: "inner sub-split sub-doctor-layout" },
        h(ImageFrame, {
          image: "img/doctor_profile.png",
          label: "이동현 대표원장",
          alt: "이동현 대표원장",
          className: "sub-doctor-photo",
        }),
        h(
          "div",
          { className: "sub-copy-stack sub-doctor-copy" },
          h("span", { className: "sub-section-kicker" }, "DOCTOR MESSAGE"),
          page.message.map((text) => h("p", { key: text, className: "sub-large-text" }, text)),
          h("h2", null, page.doctorName),
          h("blockquote", null, page.quote),
          h("p", { className: "sub-profile-note" }, page.profileNote)
        )
      )
    );
  }

  function ValuesPage() {
    return [
      h(
        "section",
        { className: "sub-section", key: "values" },
        h(
        "div",
        { className: "inner" },
          h(SectionHeading, {
            eyebrow: "CORE VALUE",
            title: "여의도 기통찬의 핵심가치",
            description: "진료의 출발점과 판단의 기준을 한결같이 지키겠습니다.",
            centered: true,
          }),
          h(
            "div",
            { className: "sub-value-grid" },
            page.values.map((item, index) =>
              h(
                "article",
                { className: "sub-value-card", key: item.title },
                h("span", null, String(index + 1).padStart(2, "0")),
                h("h3", null, item.title, h("small", null, item.english)),
                h("strong", null, item.quote),
                h("em", null, item.label),
                h("p", null, item.body)
              )
            )
          )
        )
      ),
      h(
        "section",
        { className: "sub-section sub-promise-section", key: "promises" },
        h(
          "div",
          { className: "inner sub-promise-layout" },
          h(
            "div",
            { className: "sub-promise-intro" },
            h("span", { className: "sub-section-kicker" }, "OUR PROMISE"),
            h("h2", null, "여의도 기통찬의 약속"),
            h(ImageFrame, { image: "img/doctor.jpg", label: "원장님 진료 사진", alt: "진료 중인 의료진", className: "sub-wide-photo" })
          ),
          h(
            "ol",
            { className: "sub-promise-list" },
            page.promises.map((promise, index) =>
              h(
                "li",
                { key: promise },
                h("span", null, String(index + 1).padStart(2, "0")),
                h("strong", null, promise)
              )
            )
          )
        )
      ),
    ];
  }

  function LocationPage() {
    return h(
      "section",
      { className: "sub-section sub-location-section" },
      h(
        "div",
        { className: "inner" },
        h(SectionHeading, {
          eyebrow: "VISIT GUIDE",
          title: "진료시간과 오시는 길",
          description: "진료 전 필요한 정보를 한곳에서 확인하실 수 있습니다.",
        }),
        h(ImageFrame, {
          image: "img/map_holder.png",
          label: "여의도기통찬의원 지도",
          alt: "여의도기통찬의원 위치 지도",
          className: "sub-map-frame",
        }),
        h(
          "div",
          { className: "sub-guide-grid" },
          h(
            "article",
            { className: "sub-guide-card" },
            h("span", null, "01"),
            h("h2", null, "진료시간"),
            h(
              "dl",
              null,
              page.hours.map((item) =>
                h("div", { key: item.term }, h("dt", null, item.term), h("dd", null, item.desc))
              )
            )
          ),
          h(
            "article",
            { className: "sub-guide-card" },
            h("span", null, "02"),
            h("h2", null, "오시는길"),
            h("p", null, page.address),
            h("strong", null, "주차안내"),
            h("p", null, page.parking)
          ),
          h(
            "article",
            { className: "sub-guide-card sub-guide-call" },
            h("span", null, "03"),
            h("h2", null, "진료문의"),
            h("a", { href: "tel:021234567" }, page.tel),
            h("div", { className: "sub-action-row" }, h("a", { href: "#" }, "카카오톡 상담"), h("a", { href: "#" }, "네이버 예약"))
          )
        )
      )
    );
  }

  function ConditionsPage() {
    function TreatmentTabs({ condition, notePrefix }) {
      const treatments = condition.treatments || [];
      const [activeTreatment, setActiveTreatment] = React.useState(treatments[0] || "");

      if (!treatments.length) {
        return null;
      }

      const activeIndex = Math.max(treatments.indexOf(activeTreatment), 0);
      const note = getTreatmentNote(activeTreatment, condition);
      const panelId = `${notePrefix}-panel`;

      return h(
        "div",
        { className: "sub-treatment-tabs" },
        h(
          "ul",
          { className: "sub-tag-list", role: "tablist", "aria-label": `${condition.title} 맞춤 치료법` },
          treatments.map((treatment, index) => {
            const isActive = treatment === activeTreatment;
            const tabId = `${notePrefix}-tab-${index}`;

            return h(
              "li",
              { key: treatment, role: "presentation" },
              h(
                "button",
                {
                  type: "button",
                  className: cx("sub-tag-button", isActive ? "is-active" : ""),
                  role: "tab",
                  id: tabId,
                  "aria-selected": isActive ? "true" : "false",
                  "aria-controls": panelId,
                  onClick: () => setActiveTreatment(treatment),
                },
                treatment
              )
            );
          })
        ),
        h(
          "div",
          { className: "sub-therapy-note", role: "tabpanel", id: panelId, "aria-labelledby": `${notePrefix}-tab-${activeIndex}` },
          h("strong", null, note.title),
          h("h4", null, note.subtitle),
          note.body.map((text) => h("p", { key: text }, text))
        )
      );
    }

    return [
      h(
        "section",
        { className: "sub-section sub-condition-overview", key: "overview" },
        h(
          "div",
          { className: "inner sub-condition-overview-grid" },
          h(ImageFrame, {
            image: page.heroImage,
            label: `${page.title} 진료 이미지`,
            alt: `${page.title} 진료 이미지`,
            className: "sub-condition-lead-image",
          }),
          h(
            "div",
            { className: "sub-condition-overview-copy" },
            h("span", { className: "sub-section-kicker" }, "FOCUSED CLINIC"),
            h("h2", null, page.title),
            h("p", null, page.subtitle),
            h("p", { className: "sub-condition-overview-note" }, "통증의 위치와 움직임, 생활 습관을 함께 살핀 뒤 필요한 치료 방향을 안내합니다.")
          )
        )
      ),
      h(
        "section",
        { className: "sub-section sub-condition-section", key: "conditions" },
        h(
          "div",
          { className: "inner" },
          h(SectionHeading, {
            eyebrow: "CONDITIONS",
            title: `${page.title} 주요 질환`,
            description: "증상과 원인을 읽고, 맞춤 치료법을 선택해 확인해 보세요.",
          }),
          h(
            "div",
            { className: "sub-condition-list" },
            page.conditions.map((condition, index) =>
              h(
                "article",
                { className: "sub-condition-card", key: condition.title },
                h("span", { className: "sub-count" }, String(index + 1).padStart(2, "0")),
                h(
                  "div",
                  { className: "sub-condition-main" },
                  h("h3", null, condition.title),
                  h(
                    "div",
                    { className: "sub-condition-detail-grid" },
                    h(
                      "div",
                      { className: "sub-condition-story" },
                      h("p", null, condition.desc),
                      h(
                        "div",
                        { className: "sub-symptom-box" },
                        h("strong", null, "대표 증상"),
                        h("p", null, condition.symptom)
                      )
                    ),
                    h(
                      "div",
                      { className: "sub-condition-therapy" },
                      h("p", { className: "sub-treatment-label" }, "맞춤 치료법"),
                      h(TreatmentTabs, { condition, notePrefix: `${pageKey}-${index}` })
                    )
                  )
                )
              )
            )
          )
        )
      ),
    ];
  }

  function DiseaseSlider({ diseases }) {
    if (!diseases || !diseases.length) {
      return null;
    }

    return h(
      "div",
      { className: "sub-disease-slider", role: "list", "aria-label": "주요 적용 질환" },
      diseases.map((disease, index) =>
        h(
          "article",
          { className: "sub-disease-slide-card", key: disease.title, role: "listitem" },
          h(ImageFrame, {
            image: disease.image,
            label: disease.title,
            alt: `${disease.title} 관련 진료`,
            className: "sub-disease-slide-image",
          }),
          h(
            "div",
            { className: "sub-disease-slide-copy" },
            h("p", { className: "sub-disease-slide-count" }, String(index + 1).padStart(2, "0")),
            h("h3", null, disease.title),
            h("p", null, disease.body)
          )
        )
      )
    );
  }

  function CarePage() {
    return [
      h(
        "section",
        { className: "sub-section sub-care-intro-section", key: "intro" },
        h(
          "div",
          { className: "inner sub-care-intro-grid" },
          h(
            "div",
            { className: "sub-copy-stack" },
            h("span", { className: "sub-section-kicker" }, page.eyebrow),
            h("h2", null, page.title),
            h("p", { className: "sub-care-quote" }, page.subtitle),
            h("p", null, page.intro)
          ),
          h(ImageFrame, { image: page.heroImage, label: page.title, alt: page.title, className: "sub-care-image" })
        )
      ),
      h(
        "section",
        { className: "sub-section sub-point-section", key: "points" },
        h(
          "div",
          { className: "inner" },
          h(SectionHeading, { eyebrow: "POINT 3", title: page.pointsTitle, centered: true }),
          h(
            "div",
            { className: "sub-point-grid" },
            page.points.map((point, index) =>
              h(
                "article",
                { className: "sub-point-card", key: point.title },
                h("span", null, `Point ${index + 1}`),
                h("h3", null, point.title),
                h("p", null, point.body)
              )
            )
          )
        )
      ),
      h(
        "section",
        { className: "sub-section sub-care-detail-section", key: "features" },
        h(
          "div",
          { className: "inner sub-care-detail" },
          h(
            "div",
            { className: "sub-feature-list" },
            h(SectionHeading, { eyebrow: "WHAT MAKES IT DIFFERENT", title: "여의도기통찬의 특별함" }),
            h(
              "div",
              { className: "sub-feature-grid" },
              page.features.map((feature, index) =>
                h(
                  "article",
                  { className: "sub-feature-card", key: feature.title },
                  h("span", null, String(index + 1).padStart(2, "0")),
                  h("h3", null, feature.title),
                  h("p", null, feature.body)
                )
              )
            )
          ),
          h(
            "section",
            { className: "sub-disease-section" },
            h(SectionHeading, {
              eyebrow: "INDICATION",
              title: "주요 적용 질환",
              description: "질환별 특성과 치료가 필요한 부위를 사진과 함께 살펴보세요.",
            }),
            h(DiseaseSlider, { diseases: page.diseases })
          )
        )
      ),
    ];
  }

  function EquipmentPage() {
    return h(
      "section",
      { className: "sub-section sub-equipment-section" },
      h(
        "div",
        { className: "inner" },
        h(SectionHeading, {
          eyebrow: "MEDICAL EQUIPMENT",
          title: "철저히 검증된 검사·치료 장비",
          description: page.subtitle,
          centered: true,
        }),
        h(
          "div",
          { className: "sub-equipment-grid" },
          page.items.map((item, index) =>
            h(
              "article",
              { className: "sub-equipment-card", key: item.title },
              h(ImageFrame, { image: item.image, label: "장비사진", alt: item.title, className: "sub-equipment-image" }),
              h("span", null, String(index + 1).padStart(2, "0")),
              h("p", { className: "sub-equipment-english" }, item.english),
              h("h3", null, item.title),
              h("strong", null, item.quote),
              list(item.desc, "sub-equipment-desc")
            )
          )
        )
      )
    );
  }

  function SimplePage() {
    return h(
      "section",
      { className: "sub-section sub-simple-section" },
      h(
        "div",
        { className: "inner" },
        h(
          "div",
          { className: "sub-simple-intro" },
          h(
            "div",
            { className: "sub-copy-stack" },
            h("span", { className: "sub-section-kicker" }, page.eyebrow),
            h("h2", null, page.title),
            h("p", null, page.subtitle)
          ),
          h(ImageFrame, { image: page.heroImage, label: page.title, alt: page.title, className: "sub-simple-image" })
        ),
        h(
          "div",
          { className: "sub-simple-grid" },
          page.cards.map((card, index) =>
          h(
            "article",
            { className: "sub-simple-card", key: card.title },
            h("span", null, String(index + 1).padStart(2, "0")),
            h("h2", null, card.title),
            h("p", null, card.body),
              h("a", { href: card.href }, card.action)
          )
          )
        )
      )
    );
  }

  function PageBody() {
    const layoutMap = {
      about: AboutPage,
      doctor: DoctorPage,
      values: ValuesPage,
      location: LocationPage,
      conditions: ConditionsPage,
      care: CarePage,
      equipment: EquipmentPage,
      simple: SimplePage,
    };
    const Component = layoutMap[page.layout] || SimplePage;

    document.title = `${page.title} | 여의도기통찬의원`;
    document.body.dataset.layout = page.layout;

    return h(
      React.Fragment,
      null,
      h(Hero),
      h(LocalNavigation),
      h("div", { className: `subpage-content subpage-content--${page.layout}` }, h(Component))
    );
  }

  ReactDOM.createRoot(root).render(h(PageBody));
})();
