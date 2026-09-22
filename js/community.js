(() => {
  const board = document.querySelector("[data-community-board]");
  if (!board) {
    return;
  }

  // Relative so it resolves under both a sub-path host (GitHub Pages) and a domain root (Cafe24).
  const API_URL = "../admin/api/public/community.php";
  const PAGE_WINDOW = 5;
  const baseTitle = document.title;

  const params = new URLSearchParams(window.location.search);
  const listPage = Math.max(1, Number.parseInt(params.get("page"), 10) || 1);
  const postId = Number.parseInt(params.get("id"), 10);

  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  const srOnly = (text) => el("span", "community-sr-only", text);
  const formatDate = (iso) => iso.replaceAll("-", ".");
  const listHref = (page) => (page > 1 ? `community.html?page=${page}` : "community.html");
  const postHref = (id) => `community.html?id=${id}${listPage > 1 ? `&page=${listPage}` : ""}`;

  const showStatus = (message, action) => {
    const wrap = el("div", "community-status");
    wrap.append(el("p", "", message));
    if (action) wrap.append(action);
    board.replaceChildren(wrap);
  };

  // Separates "the API answered: no such post" from "there is no API here" (the static
  // GitHub Pages copy has no PHP, so the request 404s with HTML or returns the raw source).
  const request = async (query) => {
    let response;
    try {
      response = await fetch(`${API_URL}?${query}`, { headers: { Accept: "application/json" } });
    } catch {
      return { kind: "unavailable" };
    }
    let body;
    try {
      body = await response.json();
    } catch {
      return { kind: "unavailable" };
    }
    if (response.status === 404 && body && body.error) return { kind: "not-found" };
    if (!response.ok || !body || !body.data) return { kind: "unavailable" };
    return { kind: "ok", data: body.data };
  };

  const renderRow = (post, number) => {
    const row = el("li", post.isPinned ? "community-row is-pinned" : "community-row");

    const num = el("span", "community-row-num");
    if (post.isPinned) {
      num.append(el("span", "community-badge", "공지"));
    } else {
      num.append(srOnly("번호 "), document.createTextNode(String(number)));
    }

    const title = el("a", "community-row-title");
    title.href = postHref(post.id);
    title.append(el("span", "community-row-title-text", post.title));
    if (post.hasImage) {
      title.append(el("span", "community-row-image", "이미지 포함"));
    }

    const date = el("time", "community-row-date", formatDate(post.publishedAt));
    date.dateTime = post.publishedAt;

    const views = el("span", "community-row-views");
    views.append(srOnly("조회 "), document.createTextNode(post.viewCount.toLocaleString("ko-KR")));

    row.append(num, title, date, views);
    return row;
  };

  const renderPagination = (page, totalPages) => {
    const nav = el("nav", "community-pagination");
    nav.setAttribute("aria-label", "게시판 페이지");

    const link = (target, label, className, ariaLabel) => {
      const a = el("a", className, label);
      a.href = listHref(target);
      if (ariaLabel) a.setAttribute("aria-label", ariaLabel);
      return a;
    };

    if (page > 1) nav.append(link(page - 1, "‹", "community-page-step", "이전 페이지"));

    const start = Math.max(1, Math.min(page - Math.floor(PAGE_WINDOW / 2), totalPages - PAGE_WINDOW + 1));
    const end = Math.min(totalPages, start + PAGE_WINDOW - 1);
    for (let p = start; p <= end; p += 1) {
      if (p === page) {
        const current = el("span", "community-page is-current", String(p));
        current.setAttribute("aria-current", "page");
        nav.append(current);
      } else {
        nav.append(link(p, String(p), "community-page", `${p}페이지`));
      }
    }

    if (page < totalPages) nav.append(link(page + 1, "›", "community-page-step", "다음 페이지"));
    return nav;
  };

  const renderList = (data) => {
    if (!data.pinned.length && !data.items.length) {
      showStatus("아직 등록된 게시글이 없습니다.");
      return;
    }

    const head = el("div", "community-list-head");
    head.setAttribute("aria-hidden", "true");
    ["번호", "제목", "등록일", "조회"].forEach((label) => head.append(el("span", "", label)));

    const list = el("ul", "community-list");
    data.pinned.forEach((post) => list.append(renderRow(post)));
    data.items.forEach((post, index) => list.append(renderRow(post, data.firstNumber - index)));

    const children = [el("p", "community-count", `전체 ${data.total.toLocaleString("ko-KR")}건`), head, list];
    if (data.totalPages > 1) children.push(renderPagination(data.page, data.totalPages));
    board.replaceChildren(...children);
  };

  const renderNeighbour = (post, label, className) => {
    const item = el(post ? "a" : "p", `community-neighbour ${className}`);
    item.append(el("span", "community-neighbour-label", label));
    item.append(el("span", "community-neighbour-title", post ? post.title : `${label}이 없습니다.`));
    if (post) item.href = postHref(post.id);
    else item.classList.add("is-empty");
    return item;
  };

  const renderPost = ({ post, older, newer }) => {
    document.title = `${post.title} | ${baseTitle}`;

    const article = el("article", "community-post");

    const head = el("header", "community-post-head");
    if (post.isPinned) head.append(el("p", "community-badge", "공지"));
    head.append(el("h2", "community-post-title", post.title));
    const meta = el("p", "community-post-meta");
    const date = el("time", "", formatDate(post.publishedAt));
    date.dateTime = post.publishedAt;
    meta.append(date, el("span", "", `조회 ${post.viewCount.toLocaleString("ko-KR")}`));
    head.append(meta);
    article.append(head);

    if (post.imageUrl) {
      const figure = el("figure", "community-post-image");
      const img = el("img");
      img.src = post.imageUrl;
      img.alt = "";
      img.decoding = "async";
      figure.append(img);
      article.append(figure);
    }

    // Plain text by design: rendered via textContent with pre-wrap, so line breaks survive
    // and nothing in a post can ever be interpreted as markup.
    article.append(el("div", "community-post-body", post.content));

    const neighbours = el("nav", "community-neighbours");
    neighbours.setAttribute("aria-label", "이전 글, 다음 글");
    neighbours.append(
      renderNeighbour(newer, "다음 글", "is-newer"),
      renderNeighbour(older, "이전 글", "is-older")
    );
    article.append(neighbours);

    const actions = el("div", "community-post-actions");
    const back = el("a", "view-more-btn", "목록으로");
    back.href = listHref(listPage);
    actions.append(back);
    article.append(actions);

    board.replaceChildren(article);
  };

  const backToList = () => {
    const back = el("a", "view-more-btn", "목록으로");
    back.href = listHref(1);
    return back;
  };

  const load = async () => {
    const isDetail = Number.isInteger(postId) && postId > 0;
    const result = await request(isDetail ? `id=${postId}` : `page=${listPage}`);

    if (result.kind === "unavailable") {
      showStatus("커뮤니티 게시판을 준비하고 있습니다. 곧 새로운 소식으로 찾아뵙겠습니다.");
      return;
    }
    if (result.kind === "not-found") {
      showStatus("요청하신 게시글을 찾을 수 없습니다.", backToList());
      return;
    }
    if (isDetail) renderPost(result.data);
    else renderList(result.data);
  };

  load();
})();
