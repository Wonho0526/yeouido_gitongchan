(() => {
  if (!window.React || !window.ReactDOM || !window.YgtcSubpageData) {
    return;
  }

  const h = React.createElement;
  const pageKey = document.body.dataset.page;
  const page = window.YgtcSubpageData[pageKey];
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

  function ImageFrame({ image, label, alt, className = "" }) {
    if (image) {
      return h(
        "figure",
        { className: cx("sub-image-frame", className) },
        h("img", { src: assetPath(image), alt: alt || label || "" })
      );
    }

    return h(
      "div",
      { className: cx("sub-image-frame sub-image-placeholder", className), role: "img", "aria-label": label },
      h("span", null, label)
    );
  }

  function Hero() {
    const shouldContainHeroImage = page.heroImage && (
      page.heroImage.includes("logo") ||
      page.heroImage.includes("equipment")
    );

    return h(
      "section",
      { className: "sub-hero" },
      h(
        "div",
        { className: "inner sub-hero-inner" },
        h(
          "div",
          { className: "sub-hero-copy" },
          h("span", { className: "clinic-kicker" }, page.eyebrow),
          h("p", { className: "sub-hero-category" }, page.category),
          h("h1", null, page.title),
          h("p", { className: "sub-hero-desc" }, page.subtitle)
        ),
        h(ImageFrame, {
          image: page.heroImage,
          label: page.title,
          alt: page.title,
          className: cx("sub-hero-visual", shouldContainHeroImage ? "is-contain" : ""),
        })
      )
    );
  }

  function AboutPage() {
    return [
      h(
        "section",
        { className: "sub-section sub-meaning-section", key: "meaning" },
        h(
          "div",
          { className: "inner sub-centered-copy" },
          h("img", { src: assetPath("img/logo.png"), alt: "여의도기통찬의원", className: "sub-logo-mark" }),
          h("h2", null, "여의도기통찬의원의 ", h("span", null, "약속")),
          page.meaning.map((text) => h("p", { key: text }, text)),
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
        { className: "sub-section", key: "why" },
        h(
          "div",
          { className: "inner sub-split" },
          h(ImageFrame, { label: "병원 외관 사진", className: "sub-tall-visual" }),
          h(
            "div",
            { className: "sub-copy-stack" },
            h("span", { className: "clinic-kicker" }, "MISSION & VISION"),
            h("h2", null, page.whyTitle),
            page.why.map((text) => h("p", { key: text }, text))
          )
        )
      ),
    ];
  }

  function DoctorPage() {
    return h(
      "section",
      { className: "sub-section" },
      h(
        "div",
        { className: "inner sub-split sub-doctor-layout" },
        h(ImageFrame, { image: "img/doctor_profile.png", label: "원장님 프로필 사진", alt: "이동현 대표원장", className: "sub-doctor-photo" }),
        h(
          "div",
          { className: "sub-copy-stack" },
          h("span", { className: "clinic-kicker" }, "DOCTOR MESSAGE"),
          page.message.map((text) => h("p", { key: text, className: "sub-large-text" }, text)),
          h("h2", null, page.doctorName),
          h("blockquote", null, page.quote),
          h("div", { className: "sub-profile-box" }, page.profileNote)
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
          h("span", { className: "clinic-kicker" }, "YEOUIDO GITONG CHAN"),
          h("h2", null, "여의도 기통찬의 ", h("span", null, "핵심가치")),
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
            null,
            h("span", { className: "clinic-kicker" }, "PROMISE"),
            h("h2", null, "여의도 기통찬의 ", h("span", null, "약속")),
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
      { className: "sub-section" },
      h(
        "div",
        { className: "inner sub-location-layout" },
        h(ImageFrame, { image: "img/map_holder.png", label: "네이버지도", alt: "네이버 지도 영역", className: "sub-map-frame" }),
        h(
          "div",
          { className: "sub-guide-grid" },
          h(
            "article",
            { className: "sub-guide-card" },
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
            h("h2", null, "오시는길"),
            h("p", null, page.address),
            h("strong", null, "주차안내"),
            h("p", null, page.parking)
          ),
          h(
            "article",
            { className: "sub-guide-card sub-guide-call" },
            h("h2", null, "진료문의"),
            h("a", { href: "tel:021234567" }, page.tel),
            h("div", { className: "sub-action-row" }, h("a", { href: "#" }, "카카오톡 상담"), h("a", { href: "#" }, "네이버 예약"))
          )
        )
      )
    );
  }

  function ConditionsPage() {
    return h(
      "section",
      { className: "sub-section sub-condition-section" },
      h(
        "div",
        { className: "inner sub-condition-list" },
        page.conditions.map((condition, index) =>
          h(
            "article",
            { className: "sub-condition-card", key: condition.title },
            h(
              "div",
              { className: "sub-condition-copy" },
              h("span", { className: "sub-count" }, String(index + 1).padStart(2, "0")),
              h("h2", null, condition.title),
              h("p", null, condition.desc),
              h("div", { className: "sub-symptom-box" }, h("h3", null, "대표 증상"), h("p", null, condition.symptom)),
              h("h3", null, "맞춤 치료법"),
              list(condition.treatments, "sub-tag-list")
            ),
            h(
              "div",
              { className: "sub-condition-media" },
              h(ImageFrame, { label: "질환 사진" }),
              h(ImageFrame, { label: "치료 사진" })
            ),
            h(
              "div",
              { className: "sub-therapy-note" },
              h("strong", null, page.therapyNote.title),
              h("h3", null, page.therapyNote.subtitle),
              page.therapyNote.body.map((text) => h("p", { key: text }, text))
            )
          )
        )
      )
    );
  }

  function CarePage() {
    return [
      h(
        "section",
        { className: "sub-section", key: "intro" },
        h(
          "div",
          { className: "inner sub-split" },
          h(
            "div",
            { className: "sub-copy-stack" },
            h("span", { className: "clinic-kicker" }, page.category),
            h("h2", null, page.title),
            h("blockquote", null, page.subtitle),
            h("p", null, page.intro)
          ),
          h(ImageFrame, { image: page.heroImage, label: page.title, alt: page.title, className: "sub-tall-visual" })
        )
      ),
      h(
        "section",
        { className: "sub-section sub-point-section", key: "points" },
        h(
          "div",
          { className: "inner" },
          h("span", { className: "clinic-kicker" }, "POINT 3"),
          h("h2", null, page.pointsTitle),
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
        { className: "sub-section", key: "features" },
        h(
          "div",
          { className: "inner sub-care-detail" },
          h(
            "div",
            { className: "sub-feature-grid" },
            page.features.map((feature) =>
              h("article", { className: "sub-feature-card", key: feature.title }, h("h3", null, feature.title), h("p", null, feature.body))
            )
          ),
          h(
            "aside",
            { className: "sub-disease-box" },
            h("span", { className: "clinic-kicker" }, "INDICATION"),
            h("h2", null, "주요 적용 질환"),
            list(page.diseases, "sub-disease-list")
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
        h("span", { className: "clinic-kicker" }, "YEOUIDO GITONG CHAN"),
        h("h2", null, "철저히 검증된 검사·치료 장비"),
        h(
          "div",
          { className: "sub-equipment-grid" },
          page.items.map((item) =>
            h(
              "article",
              { className: "sub-equipment-card", key: item.title },
              h(ImageFrame, { image: item.image, label: "장비사진", alt: item.title, className: "sub-equipment-image" }),
              h("span", null, item.english),
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
      { className: "sub-section" },
      h(
        "div",
        { className: "inner sub-simple-grid" },
        page.cards.map((card) =>
          h(
            "article",
            { className: "sub-simple-card", key: card.title },
            h("h2", null, card.title),
            h("p", null, card.body),
            h("a", { href: card.href }, card.action)
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

    return h(
      React.Fragment,
      null,
      h(Hero),
      h(Component)
    );
  }

  ReactDOM.createRoot(root).render(h(PageBody));
})();
