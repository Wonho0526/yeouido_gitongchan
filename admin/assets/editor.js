// 건강정보 본문 에디터.
//
// A contenteditable surface with a toolbar, kept deliberately small: no external library,
// matching how the rest of the site vendors its scripts locally. The editor only has to be
// convenient — sanitize_html.php on the server decides what actually gets stored, so a
// broken or bypassed toolbar cannot widen what a post is allowed to contain.
//
// The editing surface carries the public page's body class (community-post-body) and the
// form links css/community.css, so the text looks the way it will be published.
//
// This file also runs on the post list (community/index.php). There it only clears the
// browser draft of a post that was just saved — the list page's success message is the one
// reliable sign that the save went through.
(() => {
  const DRAFT_PREFIX = "gtc-admin-draft:";
  const PENDING_KEY = "gtc-admin-draft-pending";
  const CONTENT_MAX = 20000; // admin/includes/community.php COMMUNITY_CONTENT_MAX
  const WARN_FROM = 18001;
  const UPLOAD_MAX = 5 * 1024 * 1024;
  const UPLOAD_TYPES = ["image/jpeg", "image/png", "image/webp"];

  const storage = (() => {
    try {
      const s = window.localStorage;
      s.setItem(DRAFT_PREFIX + "probe", "1");
      s.removeItem(DRAFT_PREFIX + "probe");
      return s;
    } catch {
      return null; // private mode or storage disabled: drafts are simply off
    }
  })();
  const readJSON = (key) => {
    if (!storage) return null;
    try { return JSON.parse(storage.getItem(key) || "null"); } catch { return null; }
  };
  const writeJSON = (key, value) => {
    if (!storage) return;
    try { storage.setItem(key, JSON.stringify(value)); } catch { /* quota: drafts are best-effort */ }
  };
  const remove = (key) => { if (storage) storage.removeItem(key); };

  const root = document.querySelector("[data-editor]");
  if (!root) {
    clearSavedDraft();
    return;
  }

  // ---------------------------------------------------------------- after a successful save
  function clearSavedDraft() {
    const pending = readJSON(PENDING_KEY);
    if (!pending) return;
    const flash = document.querySelector(".flash--success");
    // The messages come from new.php ("등록") and edit.php ("수정"); delete and toggle have others.
    const saved = flash && /게시글이 (등록|수정)되었습니다/.test(flash.textContent);
    if (saved && Date.now() - pending.at < 60 * 60 * 1000) remove(DRAFT_PREFIX + pending.key);
    remove(PENDING_KEY);
  }

  const area = root.querySelector("[data-editor-area]");
  const field = document.querySelector("#content");
  const titleInput = document.querySelector("#title");
  const fileInput = root.querySelector("[data-editor-file]");
  const toolbar = root.querySelector("[data-editor-toolbar]");
  const notice = root.querySelector("[data-editor-notice]");
  const counter = root.querySelector("[data-editor-count]");
  const uploadsBox = root.querySelector("[data-editor-uploads]");
  const form = root.closest("form");
  const draftBar = form.querySelector("[data-editor-draft]");
  const limitError = form.querySelector("[data-editor-limit]");
  const uploadUrl = root.dataset.uploadUrl;
  const draftKey = DRAFT_PREFIX + (root.dataset.draftKey || "new");
  const csrf = form.querySelector('[name="csrf_token"]').value;

  // A form page loading again after a submit means the save did not happen (validation error,
  // or the author came back). Either way the draft stays. When the server sent the form back
  // with errors, the draft is what was just submitted, so the "restore?" bar is not shown.
  const pendingSubmit = readJSON(PENDING_KEY);
  remove(PENDING_KEY);
  const returnedWithErrors = !!pendingSubmit
    && pendingSubmit.key === (root.dataset.draftKey || "new")
    && [...document.querySelectorAll(".form-error")].some((n) => !form.contains(n));

  // Preset values. "보통", "기본" and "없음" remove the property so the text follows the body.
  // The sanitizer accepts 10-48px and hex/rgb colours, so these are a guide, not a limit.
  const SIZES = [["작게", "15px"], ["보통", ""], ["크게", "22px"], ["아주 크게", "28px"]];
  const COLORS = [
    ["기본", ""], ["브랜드", "#1b4b8f"], ["강조", "#c8102e"], ["회색", "#6b7280"], ["초록", "#15803d"],
  ];
  const HIGHLIGHTS = [
    ["노랑", "#fff3b0"], ["파랑", "#dbeafe"], ["초록", "#dcfce7"], ["분홍", "#fce7f3"], ["없음", ""],
  ];
  // Class tokens: the same list as SANITIZE_CLASS_TOKENS in admin/includes/sanitize_html.php.
  const IMG_SIZES = ["post-img-small", "post-img-medium", "post-img-full"];
  const IMG_ALIGNS = ["post-img-left", "post-img-center"];
  const QUOTES = [["기본", ""], ["따옴표", "post-quote-mark"], ["상자", "post-quote-box"]];
  const RULES = [["기본 선", ""], ["짧은 선", "post-hr-short"]];
  const BLOCKS = [["본문", "P"], ["소제목", "H2"], ["작은 제목", "H3"]];

  const BLOCK_TAGS = new Set(["P", "H2", "H3", "UL", "OL", "BLOCKQUOTE", "FIGURE", "HR", "IMG", "DIV"]);

  document.execCommand("defaultParagraphSeparator", false, "p");
  document.execCommand("styleWithCSS", false, false);

  // ================================================================ helpers
  const el = (tag, attrs = {}, ...children) => {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v === null || v === undefined || v === false) continue;
      if (k === "class") node.className = v;
      else if (k === "text") node.textContent = v;
      else node.setAttribute(k, v === true ? "" : v);
    }
    node.append(...children);
    return node;
  };

  const svg = (paths) => {
    const ns = "http://www.w3.org/2000/svg";
    const s = document.createElementNS(ns, "svg");
    s.setAttribute("viewBox", "0 0 20 20");
    s.setAttribute("fill", "none");
    s.setAttribute("stroke", "currentColor");
    s.setAttribute("stroke-width", "1.75");
    s.setAttribute("stroke-linecap", "round");
    s.setAttribute("stroke-linejoin", "round");
    s.setAttribute("aria-hidden", "true");
    s.setAttribute("focusable", "false");
    s.innerHTML = paths; // fixed strings from ICONS below, never user input
    return s;
  };

  // Hand-drawn 20x20 icons.
  const ICONS = {
    photo: '<rect x="2.5" y="3.5" width="15" height="13" rx="2"/><circle cx="7" cy="8" r="1.5"/><path d="M3 15l4.5-4.5 3 3 2.5-2.5 4 4"/>',
    quote: '<path d="M4 11.5c0-3 1.5-5 4-6M4 11.5h3.2v3.8H4zM11 11.5c0-3 1.5-5 4-6M11 11.5h3.2v3.8H11z"/>',
    rule: '<path d="M3 10h14"/><path d="M6 6h8M6 14h8" stroke-opacity=".35"/>',
    link: '<path d="M8.5 11.5a3 3 0 0 0 4.2 0l2.6-2.6a3 3 0 0 0-4.2-4.2l-1 1"/><path d="M11.5 8.5a3 3 0 0 0-4.2 0l-2.6 2.6a3 3 0 0 0 4.2 4.2l1-1"/>',
    undo: '<path d="M7.5 5L4 8.5 7.5 12"/><path d="M4.5 8.5h7a4 4 0 0 1 0 8H9"/>',
    redo: '<path d="M12.5 5L16 8.5 12.5 12"/><path d="M15.5 8.5h-7a4 4 0 0 0 0 8H11"/>',
    caret: '<path d="M5.5 8l4.5 4.5L14.5 8"/>',
    ul: '<circle cx="4.5" cy="5.5" r=".9" fill="currentColor"/><circle cx="4.5" cy="10" r=".9" fill="currentColor"/><circle cx="4.5" cy="14.5" r=".9" fill="currentColor"/><path d="M8 5.5h8.5M8 10h8.5M8 14.5h8.5"/>',
    ol: '<path d="M3.5 4.5h1v3M3.3 7.5h2.4M3.4 11.6c.3-.5 2-.7 2 .4 0 .8-2 1.5-2 2.5h2.1" stroke-width="1.3"/><path d="M8.5 5.5h8M8.5 10h8M8.5 14.5h8"/>',
    alignLeft: '<path d="M3.5 5h13M3.5 8.5h8.5M3.5 12h13M3.5 15.5h8.5"/>',
    alignCenter: '<path d="M3.5 5h13M5.75 8.5h8.5M3.5 12h13M5.75 15.5h8.5"/>',
    alignRight: '<path d="M3.5 5h13M8 8.5h8.5M3.5 12h13M8 15.5h8.5"/>',
    clear: '<path d="M5 4.5h10M10 4.5v6"/><path d="M4 16.5l12-9" stroke-opacity=".9"/><path d="M8 16.5h4"/>',
  };

  const textGlyph = (text, style) => el("span", { "aria-hidden": "true", style }, text);

  const inArea = (node) => node && (node === area || area.contains(node));

  const getRange = () => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return null;
    const r = sel.getRangeAt(0);
    return inArea(r.commonAncestorContainer) ? r : null;
  };

  const setRange = (range) => {
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  };

  const caretAt = (node, offset) => {
    const r = document.createRange();
    r.setStart(node, offset);
    r.collapse(true);
    setRange(r);
  };

  const caretInto = (block, atEnd = false) => {
    const r = document.createRange();
    r.selectNodeContents(block);
    r.collapse(!atEnd);
    setRange(r);
  };

  // Top-level child of the area that holds the node (the "block" in this editor's sense).
  const topBlock = (node) => {
    while (node && node.parentNode !== area) node = node.parentNode;
    return node && node.parentNode === area ? node : null;
  };

  const closestIn = (node, selector) => {
    if (!node) return null;
    const start = node.nodeType === 1 ? node : node.parentElement;
    const found = start && start.closest(selector);
    return found && area.contains(found) ? found : null;
  };

  const emptyParagraph = () => el("p", {}, el("br"));

  // ================================================================ clean HTML
  // What is saved, counted and kept in the undo history: the area without anything that only
  // exists for editing (contenteditable on photos, editor- classes, empty captions).
  function cleanHTML() {
    const copy = area.cloneNode(true);
    copy.querySelectorAll("[contenteditable]").forEach((n) => n.removeAttribute("contenteditable"));
    copy.querySelectorAll("[draggable]").forEach((n) => n.removeAttribute("draggable"));
    copy.querySelectorAll("[class]").forEach((n) => {
      [...n.classList].filter((c) => c.startsWith("editor-")).forEach((c) => n.classList.remove(c));
      if (!n.classList.length) n.removeAttribute("class");
    });
    copy.querySelectorAll("figcaption").forEach((c) => {
      if (!c.textContent.trim() && !c.querySelector("img")) c.remove();
    });
    // Chrome's strikeThrough writes <strike>; the server only keeps <s>.
    copy.querySelectorAll("strike").forEach((n) => {
      const s = document.createElement("s");
      s.append(...n.childNodes);
      n.replaceWith(s);
    });
    return copy.innerHTML;
  }

  // Re-applies the editing-only attributes after the area's HTML has been replaced.
  function decorate() {
    area.querySelectorAll("figure").forEach((f) => {
      f.setAttribute("contenteditable", "false");
      f.querySelectorAll("figcaption").forEach((c) => c.setAttribute("contenteditable", "true"));
    });
    area.querySelectorAll("strike").forEach((n) => {
      const s = document.createElement("s");
      s.append(...n.childNodes);
      n.replaceWith(s);
    });
  }

  // ================================================================ text length
  // Same arithmetic as post_html_text_length() in sanitize_html.php:
  // mb_strlen(trim(html_entity_decode(strip_tags($html), ENT_QUOTES, 'UTF-8'))).
  function phpStripTags(html) {
    let out = "";
    let i = 0;
    while (i < html.length) {
      const ch = html[i];
      if (ch === "<" && html.startsWith("<!--", i)) {
        const end = html.indexOf("-->", i + 4);
        i = end === -1 ? html.length : end + 3;
      } else if (ch === "<" && i + 1 < html.length && !/\s/.test(html[i + 1])) {
        let quote = null;
        i++;
        while (i < html.length) {
          const c = html[i];
          if (quote) { if (c === quote) quote = null; }
          else if (c === '"' || c === "'") quote = c;
          else if (c === ">") break;
          i++;
        }
        i++;
      } else {
        out += ch;
        i++;
      }
    }
    return out;
  }
  const decoder = document.createElement("textarea");
  function decodeEntities(text) {
    if (!text.includes("&")) return text;
    decoder.innerHTML = text.replace(/</g, "&lt;");
    return decoder.value;
  }
  const phpTrim = (s) => s.replace(/^[ \t\n\r\0\x0B]+|[ \t\n\r\0\x0B]+$/g, "");
  const textLength = (html) => [...phpTrim(decodeEntities(phpStripTags(html)))].length;

  // ================================================================ notices and status bar
  let flashTimer = null;
  let flashMessage = null;
  let lastDraftAt = null;
  let overLimit = false;
  const liveRegion = el("p", { class: "write-sr-only", "aria-live": "polite" });
  root.append(liveRegion);

  function flash(message, isError = true) {
    flashMessage = { message, isError };
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => { flashMessage = null; renderStatus(); }, 4000);
    renderStatus();
  }

  const timeLabel = (ts) => {
    const d = new Date(ts);
    const h = d.getHours();
    return `${h < 12 ? "오전" : "오후"} ${h % 12 || 12}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  function renderStatus() {
    let text = "";
    let cls = "";
    if (flashMessage) {
      text = flashMessage.message;
      cls = flashMessage.isError ? "is-error" : "";
    } else if (overLimit) {
      text = limitMessage();
      cls = "is-error";
    } else if (lastDraftAt) {
      text = "임시저장 " + timeLabel(lastDraftAt);
      cls = "is-muted";
    }
    notice.textContent = text;
    notice.className = "editor-notice" + (cls ? " " + cls : "");
  }

  let currentLength = 0;
  const limitMessage = () =>
    `본문이 ${CONTENT_MAX.toLocaleString("ko-KR")}자를 넘었습니다. ${(currentLength - CONTENT_MAX).toLocaleString("ko-KR")}자를 줄여 주세요.`;

  function renderCount(html) {
    currentLength = textLength(html);
    counter.textContent = `글자 수 ${currentLength.toLocaleString("ko-KR")} / ${CONTENT_MAX.toLocaleString("ko-KR")}`;
    counter.className = "editor-count"
      + (currentLength > CONTENT_MAX ? " is-over" : currentLength >= WARN_FROM ? " is-warn" : "");
    const nowOver = currentLength > CONTENT_MAX;
    if (nowOver && !overLimit) liveRegion.textContent = limitMessage(); // announced once
    if (!nowOver) liveRegion.textContent = "";
    overLimit = nowOver;
    limitError.hidden = !nowOver;
    limitError.textContent = nowOver ? limitMessage() : "";
    renderStatus();
  }

  // ================================================================ sync
  // The textarea stays the thing that is actually submitted, so the form keeps working the
  // same way on the server whether or not this script ran.
  function sync() {
    const html = cleanHTML();
    field.value = html;
    renderCount(html);
    area.classList.toggle("is-empty", isBlank());
    scheduleDraft();
    return html;
  }

  const isBlank = () =>
    !area.textContent.trim() && !area.querySelector("img, hr");

  // ================================================================ history (undo / redo)
  // Our own snapshots, because the browser's undo stack breaks as soon as execCommand and
  // direct DOM edits are mixed. Each entry is the clean HTML plus where the caret was.
  const history = [];
  let hIndex = -1;
  let lastKind = null;
  let lastTime = 0;
  const HISTORY_MAX = 200;

  const nodePath = (node) => {
    const path = [];
    while (node && node !== area) {
      const parent = node.parentNode;
      if (!parent) return null;
      path.unshift([...parent.childNodes].indexOf(node));
      node = parent;
    }
    return node === area ? path : null;
  };

  const saveSelection = () => {
    const r = getRange();
    if (!r) return null;
    const s = nodePath(r.startContainer);
    const e = nodePath(r.endContainer);
    return s && e ? { s, so: r.startOffset, e, eo: r.endOffset } : null;
  };

  const resolvePath = (path) => {
    let node = area;
    for (const i of path) {
      if (!node.childNodes[i]) return null;
      node = node.childNodes[i];
    }
    return node;
  };

  const restoreSelection = (saved) => {
    try {
      const s = saved && resolvePath(saved.s);
      const e = saved && resolvePath(saved.e);
      if (s && e) {
        const r = document.createRange();
        r.setStart(s, Math.min(saved.so, s.nodeType === 3 ? s.length : s.childNodes.length));
        r.setEnd(e, Math.min(saved.eo, e.nodeType === 3 ? e.length : e.childNodes.length));
        setRange(r);
        return;
      }
    } catch { /* fall through */ }
    const last = area.lastChild;
    if (last) caretInto(last.nodeType === 1 && last.tagName !== "FIGURE" && last.tagName !== "HR" ? last : area, true);
  };

  // kind "typing" coalesces with the entry before it; anything else starts a new step.
  function record(kind = "command", extra = null) {
    const html = sync();
    const sel = saveSelection();
    const top = history[hIndex];
    const now = Date.now();
    if (top && top.html === html && !extra) {
      top.sel = sel;
      lastKind = kind;
      updateHistoryButtons();
      return;
    }
    if (kind === "typing" && lastKind === "typing" && now - lastTime < 1200 && hIndex === history.length - 1 && hIndex > 0) {
      history[hIndex] = { html, sel };
    } else {
      history.splice(hIndex + 1);
      history.push(Object.assign({ html, sel }, extra || {}));
      if (history.length > HISTORY_MAX) history.shift();
      hIndex = history.length - 1;
    }
    lastKind = kind;
    lastTime = now;
    updateHistoryButtons();
  }

  function applyEntry(entry, titleFrom) {
    closePhoto();
    area.innerHTML = entry.html;
    decorate();
    if (titleFrom && titleFrom.title !== undefined) titleInput.value = titleFrom.title;
    area.focus({ preventScroll: true });
    restoreSelection(entry.sel);
    sync();
    lastKind = "restore";
    updateHistoryButtons();
    updateToolbarState();
  }

  function undo() {
    if (hIndex <= 0) return;
    const from = history[hIndex];
    hIndex--;
    // Crossing a "load draft" step also puts the title back.
    applyEntry(history[hIndex], from.title !== undefined ? history[hIndex] : null);
  }

  function redo() {
    if (hIndex >= history.length - 1) return;
    hIndex++;
    const entry = history[hIndex];
    applyEntry(entry, entry.title !== undefined ? entry : null);
  }

  // ================================================================ commands
  let applying = false; // input events fired by our own execCommand calls are recorded by us

  function exec(cmd, value = null) {
    area.focus({ preventScroll: true });
    applying = true;
    try { document.execCommand(cmd, false, value); } finally { applying = false; }
    decorate();
  }

  function run(fn) {
    return (...args) => {
      const result = fn(...args);
      if (result !== false) record("command");
      updateToolbarState();
    };
  }

  const requireSelection = () => {
    const r = getRange();
    if (!r || r.collapsed) { flash("먼저 글자를 선택해주세요."); return null; }
    if (closestIn(r.commonAncestorContainer, "figure") && !closestIn(r.commonAncestorContainer, "figcaption")) {
      flash("사진에는 글자 서식을 쓸 수 없습니다.");
      return null;
    }
    return r;
  };

  const inlineCommand = (cmd) => run(() => {
    if (!getRange()) area.focus();
    exec(cmd);
  });

  // ---- span styles (size, colour, highlight)
  // Wraps the selection in a span with the property, after taking that property off whatever
  // is inside. An empty value only takes it off, splitting any styled span around the selection,
  // so "보통", "기본" and "없음" really return the text to the body style.
  function styleSelection(prop, value) {
    area.focus({ preventScroll: true });
    const range = requireSelection();
    if (!range) return false;
    if (prop === "font-size" && closestIn(range.commonAncestorContainer, "h2")) {
      flash("소제목 안에서는 글자 크기를 바꿀 수 없습니다.");
      return false;
    }

    // Split spans that carry this property around the selection, so it sits outside them.
    const styledAncestor = () => {
      let n = range.commonAncestorContainer;
      n = n.nodeType === 1 ? n : n.parentElement;
      while (n && n !== area) {
        if (n.tagName === "SPAN" && n.style.getPropertyValue(prop)) return n;
        n = n.parentElement;
      }
      return null;
    };
    for (let host = styledAncestor(), guard = 0; host && guard < 20; host = styledAncestor(), guard++) {
      splitAround(host, range, prop);
    }

    const frag = range.extractContents();
    frag.querySelectorAll("span").forEach((s) => {
      s.style.removeProperty(prop);
      if (!s.getAttribute("style")) s.removeAttribute("style");
      if (!s.attributes.length) s.replaceWith(...s.childNodes);
    });

    let inserted;
    if (value) {
      const span = el("span");
      span.style.setProperty(prop, value);
      span.append(frag);
      inserted = span;
      range.insertNode(span);
    } else {
      const first = frag.firstChild;
      const last = frag.lastChild;
      range.insertNode(frag);
      inserted = first ? { first, last } : null;
    }

    const r = document.createRange();
    if (inserted && inserted.nodeType === 1) r.selectNodeContents(inserted);
    else if (inserted) { r.setStartBefore(inserted.first); r.setEndAfter(inserted.last); }
    setRange(r);
    area.normalize();
    return true;
  }

  // Splits `host` in three: host keeps what is before the range, a clone takes what is after,
  // and the selected middle keeps host's other styles but not `prop`.
  function splitAround(host, range, prop) {
    const after = document.createRange();
    after.setStart(range.endContainer, range.endOffset);
    after.setEnd(host, host.childNodes.length);
    const tail = host.cloneNode(false);
    tail.append(after.extractContents());

    const middle = document.createRange();
    middle.setStart(range.startContainer, range.startOffset);
    middle.setEnd(host, host.childNodes.length);
    const mid = host.cloneNode(false);
    mid.append(middle.extractContents());

    host.after(mid, tail);
    if (!tail.textContent && !tail.querySelector("img, br")) tail.remove();
    if (!host.textContent && !host.querySelector("img, br")) host.remove();
    mid.style.removeProperty(prop);
    if (mid.getAttribute("style")) {
      range.selectNodeContents(mid);
      return;
    }
    const first = mid.firstChild;
    const last = mid.lastChild;
    mid.replaceWith(...mid.childNodes);
    if (first) { range.setStartBefore(first); range.setEndAfter(last); }
  }

  // ---- blocks
  const currentBlock = () => {
    const r = getRange();
    if (!r) return null;
    return closestIn(r.startContainer, "p, h2, h3, li, blockquote, figcaption");
  };

  function setBlock(tag) {
    area.focus({ preventScroll: true });
    const r = getRange();
    if (!r) return false;
    if (closestIn(r.startContainer, "figure")) { flash("사진 설명에는 문단 형식을 쓸 수 없습니다."); return false; }
    const quote = closestIn(r.startContainer, "blockquote");
    if (quote) {
      // Leaving a quote: the quote becomes a block of the chosen kind with the same lines.
      const block = el(tag.toLowerCase());
      block.append(...quote.childNodes);
      if (!block.firstChild) block.append(el("br"));
      quote.replaceWith(block);
      caretInto(block, true);
      return true;
    }
    exec("formatBlock", `<${tag.toLowerCase()}>`);
    return true;
  }

  function alignBlock(value) {
    area.focus({ preventScroll: true });
    const r = getRange();
    if (!r) return false;
    const block = closestIn(r.startContainer, "p, h2, h3, li, blockquote, figcaption");
    if (!block || block.tagName !== "P") {
      // The server keeps text-align only on <p> (sanitize_html.php), so anything else would
      // look aligned here and lose it on save.
      flash(block ? "정렬은 본문 문단에서만 쓸 수 있습니다." : "문단 안에 커서를 두고 눌러주세요.");
      return false;
    }
    if (value === "left") block.style.removeProperty("text-align");
    else block.style.textAlign = value;
    if (!block.getAttribute("style")) block.removeAttribute("style");
    return true;
  }

  function listCommand(cmd) {
    exec(cmd);
    // Chrome may leave the new list inside the paragraph it came from.
    area.querySelectorAll("p > ul, p > ol").forEach((list) => {
      const p = list.parentNode;
      if (p.childNodes.length === 1) p.replaceWith(list);
    });
    return true;
  }

  function insertQuote(cls) {
    area.focus({ preventScroll: true });
    const r = getRange();
    if (!r) { flash("문단 안에 커서를 두고 눌러주세요."); return false; }
    const existing = closestIn(r.startContainer, "blockquote");
    if (existing) {
      if (cls) existing.className = cls; else existing.removeAttribute("class");
      return true;
    }
    // The paragraphs the selection touches become one quote, their lines joined by <br>.
    const first = topBlock(r.startContainer);
    const last = topBlock(r.endContainer) || first;
    if (!first || !["P", "H2", "H3"].includes(first.tagName)) {
      flash("문단 안에 커서를 두고 눌러주세요.");
      return false;
    }
    const blocks = [];
    for (let n = first; n; n = n.nextSibling) {
      if (n.nodeType === 1 && ["P", "H2", "H3"].includes(n.tagName)) blocks.push(n);
      if (n === last) break;
    }
    const quote = el("blockquote", { class: cls || null });
    blocks.forEach((b, i) => {
      if (i > 0) quote.append(el("br"));
      const kids = [...b.childNodes].filter((k) => !(k.nodeName === "BR" && k === b.lastChild && b.childNodes.length > 1));
      quote.append(...kids);
    });
    first.before(quote);
    blocks.forEach((b) => b.remove());
    if (!quote.firstChild) quote.append(el("br"));
    caretInto(quote, true);
    return true;
  }

  function insertRule(cls) {
    area.focus({ preventScroll: true });
    const r = getRange();
    const block = r ? topBlock(r.startContainer) : area.lastChild;
    const hr = el("hr", { class: cls || null });
    const p = emptyParagraph();
    if (block) block.after(hr, p);
    else area.append(hr, p);
    caretInto(p);
    return true;
  }

  // ================================================================ links
  const LINK_RULES = [/^https?:\/\/[^\s"'<>]+$/i, /^mailto:[^\s"'<>]+$/i, /^\/[^\s"'<>]*$/];
  // eslint-disable-next-line no-control-regex
  const validLink = (url) => !/[\x00-\x1F\x7F]/.test(url) && LINK_RULES.some((re) => re.test(url));

  let linkRange = null;
  let linkAnchor = null;
  const linkBox = el("div", { class: "editor-linkbox", role: "dialog", "aria-label": "링크 넣기", hidden: true });
  const linkInput = el("input", {
    type: "text", id: "editor-link-url", placeholder: "https://", inputmode: "url", autocomplete: "off", spellcheck: "false",
  });
  const linkErrorText = el("p", { class: "editor-linkbox__error", hidden: true },
    "https://, http://, mailto: 또는 /로 시작하는 주소만 넣을 수 있습니다.");
  const linkOk = el("button", { type: "button", class: "btn btn--primary btn--small" }, "넣기");
  const linkCancel = el("button", { type: "button", class: "btn btn--small" }, "취소");
  const linkRemove = el("button", { type: "button", class: "btn btn--small", hidden: true }, "링크 빼기");
  linkBox.append(
    el("label", { for: "editor-link-url" }, "링크 주소"), linkInput, linkErrorText,
    el("div", { class: "editor-linkbox__actions" }, linkOk, linkCancel, linkRemove),
  );

  function openLink(button) {
    const r = getRange();
    if (!r || r.collapsed) { flash("링크를 걸 글자를 선택해주세요."); return; }
    closeMenus();
    linkRange = r.cloneRange();
    linkAnchor = closestIn(r.commonAncestorContainer, "a");
    linkInput.value = linkAnchor ? linkAnchor.getAttribute("href") || "" : "";
    linkRemove.hidden = !linkAnchor;
    linkErrorText.hidden = true;
    linkInput.removeAttribute("aria-invalid");
    linkBox.hidden = false;
    linkBox.dataset.opener = button.dataset.cmd;
    placeBelow(linkBox, button);
    linkInput.focus();
  }

  function closeLink(restore = true) {
    if (linkBox.hidden) return;
    linkBox.hidden = true;
    if (restore && linkRange) {
      area.focus({ preventScroll: true });
      setRange(linkRange);
    }
    linkRange = null;
  }

  function applyLink() {
    const url = linkInput.value.trim();
    if (!validLink(url)) {
      linkErrorText.hidden = false;
      linkInput.setAttribute("aria-invalid", "true");
      linkInput.focus();
      return;
    }
    const range = linkRange;
    closeLink(true);
    if (!range) return;
    exec("createLink", url);
    // Chrome may add style or target from the surrounding text; only href is kept on save.
    record("command");
    updateToolbarState();
  }

  function removeLink() {
    const anchor = linkAnchor;
    closeLink(true);
    if (!anchor) return;
    const r = document.createRange();
    r.selectNodeContents(anchor);
    setRange(r);
    exec("unlink");
    record("command");
    updateToolbarState();
  }

  linkOk.addEventListener("click", applyLink);
  linkCancel.addEventListener("click", () => closeLink(true));
  linkRemove.addEventListener("click", removeLink);
  linkInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); applyLink(); }
    if (e.key === "Escape") { e.preventDefault(); closeLink(true); }
  });
  linkInput.addEventListener("input", () => { linkErrorText.hidden = true; linkInput.removeAttribute("aria-invalid"); });

  // ================================================================ toolbar
  const layer = el("div", { class: "editor-layer" });
  root.append(layer);
  layer.append(linkBox);

  const commandButtons = {};

  function toolButton({ cmd, label, title, icon, glyph, cls = "", onClick, pressed = false, showLabel = false }) {
    const b = el("button", {
      type: "button",
      class: "editor-btn " + cls,
      title,
      "aria-label": label,
      "aria-pressed": pressed ? "false" : null,
      "data-cmd": cmd,
    });
    if (icon) b.append(svg(ICONS[icon]));
    if (glyph) b.append(glyph);
    if (showLabel) b.append(el("span", { class: "editor-btn__label", "aria-hidden": "true" }, label));
    // Keep the text selection while a toolbar button is pressed.
    b.addEventListener("mousedown", (e) => e.preventDefault());
    b.addEventListener("click", () => onClick(b));
    commandButtons[cmd] = b;
    return b;
  }

  // ---- dropdown menus
  let openMenu = null;
  let menuRange = null;

  function menuButton({ cmd, label, title, items, onPick, cls = "", icon = null, showLabel = true, block = false }) {
    const b = el("button", {
      type: "button",
      class: "editor-btn editor-btn--menu " + cls,
      title,
      "aria-label": label,
      "aria-haspopup": "menu",
      "aria-expanded": "false",
      "data-cmd": cmd,
    });
    if (icon) b.append(svg(ICONS[icon]));
    const labelNode = el("span", { class: "editor-btn__label", "aria-hidden": "true" }, block ? items[0][0] : label);
    b.append(el("span", { class: "editor-btn__text" }, showLabel ? labelNode : "", svg(ICONS.caret)));
    const menu = el("div", { class: "editor-menu", role: "menu", "aria-label": label, hidden: true });
    items.forEach((item) => {
      const [text, value, extra] = item;
      const mi = el("button", { type: "button", class: "editor-menu__item", role: "menuitem", tabindex: "-1" });
      if (extra && extra.swatch !== undefined) {
        mi.append(el("span", {
          class: "editor-menu__swatch" + (extra.swatch ? "" : " is-none"),
          style: extra.swatch ? `background:${extra.swatch}` : null,
          "aria-hidden": "true",
        }));
      }
      if (extra && extra.hr !== undefined) {
        mi.append(el("span", { class: "editor-menu__preview-hr" + (extra.hr ? " is-short" : ""), "aria-hidden": "true" }));
      }
      mi.append(el("span", { style: extra && extra.style ? extra.style : null }, text));
      mi.addEventListener("mousedown", (e) => e.preventDefault());
      mi.addEventListener("click", () => {
        const range = menuRange;
        closeMenus(false);
        area.focus({ preventScroll: true });
        if (range) setRange(range);
        onPick(value);
      });
      mi.addEventListener("keydown", (e) => menuKeys(e, menu, b));
      menu.append(mi);
    });
    layer.append(menu);
    b.addEventListener("mousedown", (e) => e.preventDefault());
    b.addEventListener("click", () => {
      if (openMenu && openMenu.button === b) { closeMenus(true); return; }
      openMenuFor(b, menu, false);
    });
    b.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") { e.preventDefault(); openMenuFor(b, menu, true); }
    });
    commandButtons[cmd] = b;
    b.labelNode = labelNode;
    return b;
  }

  function openMenuFor(button, menu, focusFirst) {
    closeMenus(false);
    closeLink(false);
    const r = getRange();
    menuRange = r ? r.cloneRange() : menuRange;
    menu.hidden = false;
    button.setAttribute("aria-expanded", "true");
    openMenu = { button, menu };
    placeBelow(menu, button);
    // Keyboard users land on the first item; mouse users keep focus where it was.
    if (focusFirst || document.activeElement === button) menu.querySelector("[role=menuitem]").focus();
  }

  function closeMenus(focusButton = false) {
    if (!openMenu) return;
    const { button, menu } = openMenu;
    menu.hidden = true;
    button.setAttribute("aria-expanded", "false");
    openMenu = null;
    if (focusButton) button.focus();
  }

  function menuKeys(e, menu, button) {
    const items = [...menu.querySelectorAll("[role=menuitem]")];
    const i = items.indexOf(document.activeElement);
    if (e.key === "ArrowDown") { e.preventDefault(); items[(i + 1) % items.length].focus(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
    else if (e.key === "Home") { e.preventDefault(); items[0].focus(); }
    else if (e.key === "End") { e.preventDefault(); items[items.length - 1].focus(); }
    else if (e.key === "Escape") {
      e.preventDefault();
      closeMenus(true);
      if (menuRange) { area.focus({ preventScroll: true }); setRange(menuRange); button.focus(); }
    } else if (e.key === "Tab") closeMenus(false);
  }

  // Positions a pop-up under a button, inside the editor's box and the viewport.
  function placeBelow(pop, button) {
    const base = root.getBoundingClientRect();
    const b = button.getBoundingClientRect();
    pop.style.left = "0px";
    pop.style.top = "0px";
    const w = pop.offsetWidth;
    let left = b.left - base.left;
    const maxLeft = Math.min(base.width, document.documentElement.clientWidth - base.left - 16) - w;
    left = Math.max(Math.min(left, maxLeft), Math.max(0, 16 - base.left));
    pop.style.left = `${Math.round(left)}px`;
    pop.style.top = `${Math.round(b.bottom - base.top + 4)}px`;
  }

  function repositionPopups() {
    if (openMenu) placeBelow(openMenu.menu, openMenu.button);
    if (!linkBox.hidden) {
      const opener = commandButtons[linkBox.dataset.opener];
      if (opener) placeBelow(linkBox, opener);
    }
    positionPhotoUi();
  }

  document.addEventListener("mousedown", (e) => {
    if (openMenu && !openMenu.menu.contains(e.target) && !openMenu.button.contains(e.target)) closeMenus(false);
    if (!linkBox.hidden && !linkBox.contains(e.target) && !(e.target.closest && e.target.closest('[data-cmd="link"]'))) closeLink(false);
    if (selectedPhoto && !photoBar.contains(e.target) && e.target !== selectedPhoto && !selectedPhoto.contains(e.target)) closePhoto();
    if (selectedRule && e.target !== selectedRule) closeRule();
  });
  window.addEventListener("scroll", repositionPopups, { passive: true });
  window.addEventListener("resize", repositionPopups);

  const divider = () => el("span", { class: "editor-divider", "aria-hidden": "true" });

  const insertRow = el("div", { class: "editor-toolbar__insert" },
    toolButton({ cmd: "photo", label: "사진", title: "사진 넣기 (여러 장 선택 가능)", icon: "photo", cls: "editor-btn--insert", showLabel: true,
      onClick: () => { savedInsertRange = getRange() ? getRange().cloneRange() : null; fileInput.click(); } }),
    menuButton({ cmd: "quote", label: "인용구", title: "인용구", icon: "quote", cls: "editor-btn--insert",
      items: QUOTES, onPick: run((v) => insertQuote(v)) }),
    menuButton({ cmd: "rule", label: "구분선", title: "구분선", icon: "rule", cls: "editor-btn--insert",
      items: RULES.map(([t, v]) => [t, v, { hr: v }]), onPick: run((v) => insertRule(v)) }),
    toolButton({ cmd: "link", label: "링크", title: "링크 넣기", icon: "link", cls: "editor-btn--insert", showLabel: true,
      onClick: (b) => openLink(b) }),
    el("div", { class: "editor-toolbar__history" },
      toolButton({ cmd: "undo", label: "실행취소", title: "실행취소 (Ctrl+Z)", icon: "undo", cls: "editor-btn--history", onClick: () => undo() }),
      toolButton({ cmd: "redo", label: "재실행", title: "재실행 (Ctrl+Y, Ctrl+Shift+Z)", icon: "redo", cls: "editor-btn--history", onClick: () => redo() }),
    ),
  );

  const formatRow = el("div", { class: "editor-toolbar__format" },
    menuButton({ cmd: "block", label: "문단 형식", title: "문단 형식", cls: "editor-btn--block", block: true,
      items: [["본문", "P", { style: "font-size:15px" }], ["소제목", "H2", { style: "font-size:18px;font-weight:700" }], ["작은 제목", "H3", { style: "font-size:16px;font-weight:700" }]],
      onPick: run((v) => setBlock(v)) }),
    divider(),
    toolButton({ cmd: "bold", label: "굵게", title: "굵게 (Ctrl+B)", glyph: textGlyph("B", "font-weight:700;font-size:16px"), cls: "editor-btn--icon", pressed: true, onClick: inlineCommand("bold") }),
    toolButton({ cmd: "italic", label: "기울임", title: "기울임 (Ctrl+I)", glyph: textGlyph("I", "font-style:italic;font-family:Georgia,serif;font-size:17px"), cls: "editor-btn--icon", pressed: true, onClick: inlineCommand("italic") }),
    toolButton({ cmd: "underline", label: "밑줄", title: "밑줄 (Ctrl+U)", glyph: textGlyph("U", "text-decoration:underline;font-size:16px"), cls: "editor-btn--icon", pressed: true, onClick: inlineCommand("underline") }),
    toolButton({ cmd: "strikeThrough", label: "취소선", title: "취소선", glyph: textGlyph("S", "text-decoration:line-through;font-size:16px"), cls: "editor-btn--icon", pressed: true, onClick: inlineCommand("strikeThrough") }),
    divider(),
    menuButton({ cmd: "size", label: "크기", title: "글자 크기", items: SIZES, onPick: run((v) => styleSelection("font-size", v)) }),
    menuButton({ cmd: "color", label: "색상", title: "글자 색", items: COLORS.map(([t, v]) => [t, v, { swatch: v }]), onPick: run((v) => styleSelection("color", v)) }),
    menuButton({ cmd: "highlight", label: "음영", title: "배경 음영", items: HIGHLIGHTS.map(([t, v]) => [t, v, { swatch: v }]), onPick: run((v) => styleSelection("background-color", v)) }),
    divider(),
    toolButton({ cmd: "insertUnorderedList", label: "글머리 기호", title: "글머리 기호", icon: "ul", cls: "editor-btn--icon", pressed: true, onClick: run(() => listCommand("insertUnorderedList")) }),
    toolButton({ cmd: "insertOrderedList", label: "번호 매기기", title: "번호 매기기", icon: "ol", cls: "editor-btn--icon", pressed: true, onClick: run(() => listCommand("insertOrderedList")) }),
    divider(),
    toolButton({ cmd: "alignLeft", label: "왼쪽 정렬", title: "왼쪽 정렬", icon: "alignLeft", cls: "editor-btn--icon", pressed: true, onClick: run(() => alignBlock("left")) }),
    toolButton({ cmd: "alignCenter", label: "가운데 정렬", title: "가운데 정렬", icon: "alignCenter", cls: "editor-btn--icon", pressed: true, onClick: run(() => alignBlock("center")) }),
    toolButton({ cmd: "alignRight", label: "오른쪽 정렬", title: "오른쪽 정렬", icon: "alignRight", cls: "editor-btn--icon", pressed: true, onClick: run(() => alignBlock("right")) }),
    divider(),
    toolButton({ cmd: "removeFormat", label: "서식 지우기", title: "선택 영역의 서식 지우기", icon: "clear", cls: "editor-btn--icon", onClick: run(() => {
      if (!requireSelection()) return false;
      exec("removeFormat");
      return true;
    }) }),
  );
  const formatWrap = el("div", { class: "editor-toolbar__format-wrap" }, formatRow);
  toolbar.append(insertRow, formatWrap);

  const updateFade = () => {
    formatWrap.classList.toggle("is-end", formatRow.scrollLeft + formatRow.clientWidth >= formatRow.scrollWidth - 1);
  };
  formatRow.addEventListener("scroll", updateFade, { passive: true });
  window.addEventListener("resize", updateFade);

  function updateHistoryButtons() {
    commandButtons.undo.disabled = hIndex <= 0;
    commandButtons.redo.disabled = hIndex >= history.length - 1;
  }

  function updateToolbarState() {
    const r = getRange();
    if (!r) return;
    const states = ["bold", "italic", "underline", "strikeThrough", "insertUnorderedList", "insertOrderedList"];
    for (const cmd of states) {
      let on = false;
      try { on = document.queryCommandState(cmd); } catch { /* unsupported */ }
      commandButtons[cmd].setAttribute("aria-pressed", String(on));
    }
    const block = currentBlock();
    const tag = block ? block.tagName : "P";
    const blockName = { P: "본문", H2: "소제목", H3: "작은 제목", LI: "목록", BLOCKQUOTE: "인용구", FIGCAPTION: "사진 설명" }[tag] || "본문";
    commandButtons.block.labelNode.textContent = blockName;
    const align = block && block.tagName === "P" ? block.style.textAlign || "left" : "";
    commandButtons.alignLeft.setAttribute("aria-pressed", String(align === "left"));
    commandButtons.alignCenter.setAttribute("aria-pressed", String(align === "center"));
    commandButtons.alignRight.setAttribute("aria-pressed", String(align === "right"));
  }

  // ================================================================ photos: upload
  let savedInsertRange = null;
  let uploading = false;
  const queue = [];
  let batch = null;

  fileInput.addEventListener("change", () => {
    const files = [...(fileInput.files || [])];
    fileInput.value = "";
    if (files.length) addFiles(files, savedInsertRange);
    savedInsertRange = null;
  });

  function addFiles(files, range) {
    const anchor = insertionPoint(range);
    const items = files.map((file) => ({ file, state: "wait", message: "대기", row: null }));
    if (!batch || !uploading) batch = { items: [], anchor };
    else batch.anchor = batch.anchor || anchor;
    items.forEach((it) => {
      batch.items.push(it);
      if (!UPLOAD_TYPES.includes(it.file.type)) fail(it, `${it.file.name}: JPEG, PNG, WEBP 사진만 올릴 수 있습니다.`);
      else if (it.file.size > UPLOAD_MAX) fail(it, `${it.file.name}: 5MB를 넘어 올리지 않았습니다.`);
      else queue.push(it);
    });
    renderUploads();
    if (!uploading) pump();
  }

  function fail(item, message) {
    item.state = "error";
    item.message = message;
  }

  // Where the next photo goes: { after: node } or { replace: emptyParagraph } or { append }.
  function insertionPoint(range) {
    const r = range && inArea(range.startContainer) ? range : null;
    const block = r ? topBlock(r.startContainer) : null;
    if (!block) return { append: true };
    if (block.nodeType === 1 && block.tagName === "P" && !block.textContent.trim() && !block.querySelector("img")) {
      return { replace: block };
    }
    return { after: block };
  }

  async function pump() {
    uploading = true;
    while (queue.length) {
      const item = queue.shift();
      item.state = "busy";
      item.message = "올리는 중";
      renderUploads();
      try {
        const body = new FormData();
        body.append("image", item.file);
        body.append("csrf_token", csrf);
        const res = await fetch(uploadUrl, { method: "POST", body, credentials: "same-origin" });
        let data = null;
        try { data = await res.json(); } catch { data = null; }
        if (!res.ok || !data || !data.path) {
          fail(item, `${item.file.name}: ${(data && data.error) || "사진 업로드에 실패했습니다."}`);
        } else {
          placePhoto(data.path);
          item.state = "done";
          item.message = "넣음";
        }
      } catch {
        fail(item, `${item.file.name}: 연결이 끊겨 올리지 못했습니다. 사진 버튼으로 다시 넣어 주세요.`);
      }
      renderUploads();
    }
    uploading = false;
    finishBatch();
  }

  function placePhoto(path) {
    const figure = el("figure", { class: "post-img-full post-img-center" }, el("img", { src: path, alt: "" }));
    const a = batch.anchor;
    if (a.replace && a.replace.parentNode === area) a.replace.replaceWith(figure);
    else if (a.after && a.after.parentNode === area) a.after.after(figure);
    else area.append(figure);
    batch.anchor = { after: figure }; // the next photo follows this one: selection order is kept
    if (!figure.nextSibling) area.append(emptyParagraph());
    decorate();
    const next = figure.nextSibling;
    if (next && next.nodeType === 1 && next.tagName === "P") {
      area.focus({ preventScroll: true });
      caretInto(next);
    }
    record("command"); // one undo step per photo
  }

  let uploadsTimer = null;
  function renderUploads() {
    if (!batch) return;
    clearTimeout(uploadsTimer);
    const total = batch.items.length;
    const done = batch.items.filter((i) => i.state === "done").length;
    const failed = batch.items.filter((i) => i.state === "error").length;
    const finished = done + failed;
    const active = finished < total;
    let summary;
    if (active) summary = `사진 ${total}장 중 ${finished + 1}장 올리는 중`;
    else if (failed) summary = `사진 ${total}장 중 ${done}장을 넣었습니다. ${failed}장은 올리지 못했습니다.`;
    else summary = total === 1 ? "사진을 넣었습니다." : `사진 ${total}장을 넣었습니다.`;

    const closeBtn = el("button", { type: "button", class: "btn btn--small", hidden: active || !failed ? true : null }, "닫기");
    closeBtn.addEventListener("click", () => { uploadsBox.hidden = true; batch = null; });
    const bar = el("div", { class: "editor-uploads__bar", role: "progressbar", "aria-valuemin": "0", "aria-valuemax": String(total), "aria-valuenow": String(finished), "aria-label": "사진 올리기 진행" },
      el("span", { style: `width:${total ? Math.round((finished / total) * 100) : 0}%` }));
    const list = el("ul", { class: "editor-uploads__list" },
      ...batch.items.map((it) => el("li", { class: "editor-uploads__item" + (it.state === "done" ? " is-done" : it.state === "error" ? " is-error" : "") },
        el("span", { class: "editor-uploads__name", title: it.file.name }, it.file.name),
        el("span", { class: "editor-uploads__state" }, it.state === "error" ? it.message.slice(it.file.name.length + 2) : it.message))));
    uploadsBox.replaceChildren(el("div", { class: "editor-uploads__summary" }, el("p", {}, summary), closeBtn), bar, list);
    uploadsBox.hidden = false;
  }

  function finishBatch() {
    if (!batch) return;
    const total = batch.items.length;
    const done = batch.items.filter((i) => i.state === "done").length;
    const failed = total - done;
    renderUploads();
    if (failed) {
      flash(`사진 ${total}장 중 ${done}장을 넣었습니다. ${failed}장은 올리지 못했습니다.`);
      return;
    }
    flash(total === 1 ? "사진을 넣었습니다." : `사진 ${total}장을 넣었습니다.`, false);
    const finished = batch;
    uploadsTimer = setTimeout(() => {
      if (batch === finished) { uploadsBox.hidden = true; batch = null; }
    }, 3000);
  }

  // ---- drag and drop
  const dropZone = el("div", { class: "editor-drop", hidden: true }, "놓으면 사진을 올립니다. 여러 장을 한 번에 놓아도 됩니다.");
  layer.append(dropZone);
  let dragDepth = 0;
  const hasFiles = (e) => e.dataTransfer && [...e.dataTransfer.types].includes("Files");
  const showDrop = (on) => {
    if (on) {
      const base = root.getBoundingClientRect();
      const a = area.getBoundingClientRect();
      Object.assign(dropZone.style, {
        left: `${a.left - base.left}px`, top: `${a.top - base.top}px`, width: `${a.width}px`, height: `${a.height}px`,
      });
    }
    dropZone.hidden = !on;
  };
  area.addEventListener("dragenter", (e) => { if (!hasFiles(e)) return; e.preventDefault(); dragDepth++; showDrop(true); });
  area.addEventListener("dragover", (e) => { if (!hasFiles(e)) return; e.preventDefault(); e.dataTransfer.dropEffect = "copy"; });
  area.addEventListener("dragleave", () => { dragDepth = Math.max(0, dragDepth - 1); if (!dragDepth) showDrop(false); });
  area.addEventListener("drop", (e) => {
    dragDepth = 0;
    showDrop(false);
    if (!hasFiles(e)) { e.preventDefault(); return; } // dropped text or HTML is not taken
    e.preventDefault();
    let range = null;
    if (document.caretRangeFromPoint) range = document.caretRangeFromPoint(e.clientX, e.clientY);
    else if (document.caretPositionFromPoint) {
      const p = document.caretPositionFromPoint(e.clientX, e.clientY);
      if (p) { range = document.createRange(); range.setStart(p.offsetNode, p.offset); }
    }
    addFiles([...e.dataTransfer.files], range && inArea(range.startContainer) ? range : getRange());
  });
  // Moving a photo inside the text by dragging would scramble the markup and the history.
  area.addEventListener("dragstart", (e) => e.preventDefault());

  // ================================================================ photos: selection bar
  let selectedPhoto = null; // a <figure>, or a legacy <img> with no figure around it
  let selectedRule = null;
  const outline = el("div", { class: "editor-outline", hidden: true });
  const photoBar = el("div", { class: "editor-photobar", role: "toolbar", "aria-label": "사진 편집", hidden: true });
  layer.append(outline, photoBar);

  const photoButtons = {};
  const pb = (key, label, onClick) => {
    const b = el("button", { type: "button", "aria-pressed": key === "delete" ? null : "false" }, label);
    b.addEventListener("mousedown", (e) => e.preventDefault());
    b.addEventListener("click", onClick);
    photoButtons[key] = b;
    return b;
  };
  photoBar.append(
    pb("post-img-small", "작게", () => photoClass(IMG_SIZES, "post-img-small")),
    pb("post-img-medium", "중간", () => photoClass(IMG_SIZES, "post-img-medium")),
    pb("post-img-full", "본문 폭", () => photoClass(IMG_SIZES, "post-img-full")),
    el("span", { class: "editor-photobar__sep", "aria-hidden": "true" }),
    pb("post-img-left", "왼쪽", () => photoClass(IMG_ALIGNS, "post-img-left")),
    pb("post-img-center", "가운데", () => photoClass(IMG_ALIGNS, "post-img-center")),
    el("span", { class: "editor-photobar__sep", "aria-hidden": "true" }),
    pb("caption", "캡션", () => photoCaption()),
    pb("delete", "삭제", () => photoDelete()),
  );
  photoBar.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { e.preventDefault(); const p = selectedPhoto; closePhoto(); afterPhoto(p); }
  });

  function selectPhoto(target) {
    closeRule();
    selectedPhoto = target;
    outline.hidden = false;
    photoBar.hidden = false;
    updatePhotoBar();
    positionPhotoUi();
  }

  function closePhoto() {
    selectedPhoto = null;
    outline.hidden = true;
    photoBar.hidden = true;
  }

  function afterPhoto(photo) {
    if (!photo || !photo.isConnected) return;
    const next = topBlock(photo) && topBlock(photo).nextSibling;
    area.focus({ preventScroll: true });
    if (next && next.nodeType === 1 && !["FIGURE", "HR"].includes(next.tagName)) caretInto(next);
  }

  function updatePhotoBar() {
    const f = selectedPhoto && selectedPhoto.tagName === "FIGURE" ? selectedPhoto : null;
    for (const t of [...IMG_SIZES, ...IMG_ALIGNS]) {
      photoButtons[t].setAttribute("aria-pressed", String(!!f && f.classList.contains(t)));
    }
    photoButtons.caption.setAttribute("aria-pressed", String(!!f && !!f.querySelector("figcaption")));
  }

  function positionPhotoUi() {
    if (selectedRule) {
      const base = root.getBoundingClientRect();
      const r = selectedRule.getBoundingClientRect();
      Object.assign(outline.style, { left: `${r.left - base.left}px`, top: `${r.top - base.top - 6}px`, width: `${r.width}px`, height: `${r.height + 12}px` });
    }
    if (!selectedPhoto) return;
    if (!selectedPhoto.isConnected) { closePhoto(); return; }
    const base = root.getBoundingClientRect();
    const img = selectedPhoto.tagName === "IMG" ? selectedPhoto : selectedPhoto.querySelector("img") || selectedPhoto;
    const r = img.getBoundingClientRect();
    Object.assign(outline.style, {
      left: `${r.left - base.left - 4}px`, top: `${r.top - base.top - 4}px`, width: `${r.width + 8}px`, height: `${r.height + 8}px`,
    });
    const narrow = window.matchMedia("(max-width: 720px)").matches;
    const areaRect = area.getBoundingClientRect();
    if (narrow) {
      const pad = parseFloat(getComputedStyle(area).paddingLeft) || 16;
      photoBar.style.width = `${Math.max(0, areaRect.width - pad * 2)}px`;
      photoBar.style.left = `${areaRect.left - base.left + pad}px`;
      photoBar.style.top = `${r.bottom - base.top + 8}px`;
      return;
    }
    photoBar.style.width = "";
    const w = photoBar.offsetWidth;
    const h = photoBar.offsetHeight;
    let left = r.left - base.left + r.width / 2 - w / 2;
    left = Math.max(areaRect.left - base.left + 8, Math.min(left, areaRect.right - base.left - w - 8));
    let top = r.top - base.top - h - 8;
    const toolbarBottom = toolbar.getBoundingClientRect().bottom;
    if (r.top - h - 8 < toolbarBottom) top = r.bottom - base.top + 8; // would hide under the sticky toolbar
    photoBar.style.left = `${Math.round(left)}px`;
    photoBar.style.top = `${Math.round(top)}px`;
  }

  // A legacy <img> gets its <figure> the first time it is changed, not before.
  function ensureFigure() {
    if (!selectedPhoto) return null;
    if (selectedPhoto.tagName === "FIGURE") return selectedPhoto;
    const img = selectedPhoto;
    const figure = el("figure", { class: "post-img-full post-img-center" });
    const block = topBlock(img);
    if (block === img) {
      img.replaceWith(figure);
      figure.append(img);
    } else {
      // An <img> inside a paragraph: the photo moves out to its own block right after it.
      block.after(figure);
      figure.append(img);
      if (!block.textContent.trim() && !block.querySelector("img")) block.remove();
    }
    if (!figure.nextSibling) area.append(emptyParagraph());
    decorate();
    selectedPhoto = figure;
    return figure;
  }

  function photoClass(group, token) {
    const f = ensureFigure();
    if (!f) return;
    group.forEach((t) => f.classList.remove(t));
    f.classList.add(token);
    // Keep the written order the same as the sanitizer's list (size before alignment).
    const tokens = [...IMG_SIZES, ...IMG_ALIGNS].filter((t) => f.classList.contains(t));
    f.className = tokens.join(" ");
    record("command");
    updatePhotoBar();
    positionPhotoUi();
  }

  function photoCaption() {
    const f = ensureFigure();
    if (!f) return;
    let cap = f.querySelector("figcaption");
    if (!cap) {
      cap = el("figcaption", { contenteditable: "true" });
      f.append(cap);
    }
    record("command");
    closePhoto();
    area.focus({ preventScroll: true });
    cap.focus();
    caretInto(cap, true);
  }

  function photoDelete() {
    if (!selectedPhoto) return;
    const target = selectedPhoto;
    const block = topBlock(target);
    const next = block && block.nextSibling;
    target.remove();
    if (block && block !== target && block.nodeType === 1 && !block.textContent.trim() && !block.querySelector("img")) block.remove();
    closePhoto();
    if (!area.firstChild) area.append(emptyParagraph());
    area.focus({ preventScroll: true });
    if (next && next.isConnected && next.nodeType === 1 && !["FIGURE", "HR"].includes(next.tagName)) caretInto(next);
    else caretInto(area.lastChild.nodeType === 1 ? area.lastChild : area, true);
    record("command");
  }

  function selectRule(hr) {
    closePhoto();
    selectedRule = hr;
    outline.hidden = false;
    positionPhotoUi();
  }
  function closeRule() {
    if (!selectedRule) return;
    selectedRule = null;
    outline.hidden = true;
  }

  area.addEventListener("click", (e) => {
    const img = e.target.closest && e.target.closest("img");
    if (img && area.contains(img)) {
      const f = img.closest("figure");
      selectPhoto(f && area.contains(f) ? f : img);
      return;
    }
    if (e.target.tagName === "HR" && area.contains(e.target)) { selectRule(e.target); return; }
    // Clicking into a caption (or anywhere else) ends the photo selection, so Backspace edits
    // the caption text instead of deleting the photo.
    closePhoto();
    closeRule();
  });

  // ================================================================ keyboard
  area.addEventListener("keydown", (e) => {
    const mod = e.ctrlKey || e.metaKey;
    const key = e.key.toLowerCase();
    if (mod && !e.altKey && key === "z" && !e.shiftKey) { e.preventDefault(); undo(); return; }
    if (mod && !e.altKey && (key === "y" || (key === "z" && e.shiftKey))) { e.preventDefault(); redo(); return; }

    if (selectedPhoto && (e.key === "Delete" || e.key === "Backspace")) { e.preventDefault(); photoDelete(); return; }
    if (selectedRule && (e.key === "Delete" || e.key === "Backspace")) {
      e.preventDefault();
      const hr = selectedRule;
      const next = hr.nextSibling;
      closeRule();
      hr.remove();
      if (next && next.nodeType === 1) caretInto(next);
      record("command");
      return;
    }
    if (e.key === "Escape" && selectedPhoto) { e.preventDefault(); const p = selectedPhoto; closePhoto(); afterPhoto(p); return; }
    if (selectedPhoto && e.key === "Tab" && !e.shiftKey) {
      e.preventDefault();
      photoBar.querySelector("button").focus();
      return;
    }
    if (selectedPhoto && !mod && e.key.length === 1) closePhoto();

    if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
      const r = getRange();
      if (!r) return;
      const caption = closestIn(r.startContainer, "figcaption");
      if (caption) { e.preventDefault(); leaveCaption(caption); return; }
      const quote = closestIn(r.startContainer, "blockquote");
      if (quote) { e.preventDefault(); quoteEnter(quote, r); }
    }
  });

  // Inside a caption, Enter goes to the paragraph after the photo instead of splitting it.
  function leaveCaption(caption) {
    const figure = caption.closest("figure");
    let next = figure.nextSibling;
    if (!next || next.nodeType !== 1 || ["FIGURE", "HR", "UL", "OL", "BLOCKQUOTE"].includes(next.tagName)) {
      next = emptyParagraph();
      figure.after(next);
    }
    area.focus({ preventScroll: true });
    caretInto(next);
    record("command");
  }

  // Inside a quote, Enter is a line break; on an empty last line it leaves the quote.
  function quoteEnter(quote, r) {
    const after = document.createRange();
    after.setStart(r.endContainer, r.endOffset);
    after.setEnd(quote, quote.childNodes.length);
    const before = document.createRange();
    before.setStart(quote, 0);
    before.setEnd(r.startContainer, r.startOffset);
    const beforeFrag = before.cloneContents();
    const lastBr = [...beforeFrag.querySelectorAll("br")].pop();
    let lineText = beforeFrag.textContent;
    if (lastBr) {
      const t = document.createRange();
      t.setStartAfter(lastBr);
      t.setEnd(beforeFrag, beforeFrag.childNodes.length);
      lineText = t.toString();
    }
    const atEnd = !after.toString().trim() && !after.cloneContents().querySelector("img");
    if (atEnd && !lineText.trim() && (lastBr || !quote.textContent.trim())) {
      while (quote.lastChild && (quote.lastChild.nodeName === "BR" || (quote.lastChild.nodeType === 3 && !quote.lastChild.textContent.trim()))) {
        quote.lastChild.remove();
      }
      const p = emptyParagraph();
      if (!quote.textContent.trim()) quote.replaceWith(p);
      else quote.after(p);
      caretInto(p);
      record("command");
      return;
    }
    exec("insertLineBreak");
    record("typing");
  }

  // The browser's own undo (menu, gestures) is routed to ours as well.
  area.addEventListener("beforeinput", (e) => {
    if (e.inputType === "historyUndo") { e.preventDefault(); undo(); }
    else if (e.inputType === "historyRedo") { e.preventDefault(); redo(); }
    else if (e.inputType === "insertFromDrop") e.preventDefault();
  });

  const TYPING = /^(insertText|insertCompositionText|insertReplacementText|deleteContent|deleteWord|deleteSoftLine|deleteHardLine|insertParagraph|insertLineBreak)/;
  area.addEventListener("input", (e) => {
    if (applying) return;
    normalizeTop();
    area.querySelectorAll("figcaption").forEach((c) => {
      if (!c.textContent && c.childNodes.length && !c.querySelector("img")) c.replaceChildren(); // let :empty show the hint
    });
    record(TYPING.test(e.inputType || "") ? "typing" : "command");
    updateToolbarState();
  });

  // Keeps every top-level piece of text inside a block, so Enter and the server see paragraphs.
  function normalizeTop() {
    if (!area.firstChild || area.innerHTML === "<br>") {
      area.replaceChildren(emptyParagraph());
      caretInto(area.firstChild);
      return;
    }
    const r = getRange();
    const top = r && topBlock(r.startContainer);
    if (top && (top.nodeType === 3 || (top.nodeType === 1 && !BLOCK_TAGS.has(top.tagName)))) {
      applying = true;
      try { document.execCommand("formatBlock", false, "<p>"); } finally { applying = false; }
    }
    // Chrome writes <div> for some edits even with the <p> separator; the server unwraps divs.
    area.querySelectorAll(":scope > div").forEach((d) => {
      if (d.querySelector("p, h2, h3, ul, ol, blockquote, figure, hr")) return;
      const p = el("p");
      p.append(...d.childNodes);
      if (d.getAttribute("style")) p.setAttribute("style", d.getAttribute("style"));
      const keep = getRange() && d.contains(getRange().startContainer) ? saveSelection() : null;
      d.replaceWith(p);
      if (keep) restoreSelection(keep);
    });
  }

  document.addEventListener("selectionchange", () => {
    if (getRange()) updateToolbarState();
  });

  // ================================================================ paste
  // Images from the clipboard are uploaded; anything else goes in as plain text, line by line.
  // Pasted Word/web markup is the main source of junk the sanitizer would strip anyway.
  area.addEventListener("paste", (e) => {
    e.preventDefault();
    const data = e.clipboardData || window.clipboardData;
    const images = [...(data.files || [])].filter((f) => f.type.startsWith("image/"));
    if (images.length) {
      addFiles(images, getRange());
      return;
    }
    const text = (data.getData("text/plain") || "").replace(/\r\n?/g, "\n");
    if (!text) return;
    const r = getRange();
    if (r && closestIn(r.startContainer, "figure") && !closestIn(r.startContainer, "figcaption")) return;
    const inQuote = r && closestIn(r.startContainer, "blockquote, figcaption");
    const lines = text.split("\n");
    applying = true;
    try {
      lines.forEach((line, i) => {
        if (i > 0) document.execCommand(inQuote ? "insertLineBreak" : "insertParagraph", false, null);
        if (line) document.execCommand("insertText", false, line);
      });
    } finally { applying = false; }
    decorate();
    record("command");
  });

  // ================================================================ drafts (localStorage)
  let draftTimer = null;
  let draftsPaused = false; // while the "restore?" bar is open nothing new is saved

  function scheduleDraft() {
    if (draftsPaused || !storage || !started) return;
    clearTimeout(draftTimer);
    draftTimer = setTimeout(saveDraft, 800);
  }

  function saveDraft() {
    if (draftsPaused || !storage) return;
    const title = titleInput.value;
    const content = field.value;
    // Nothing written, or back to exactly what the server gave: no draft to keep.
    if ((!title.trim() && isBlank()) || (title === initial.title && content === initial.content)) {
      remove(draftKey);
      lastDraftAt = null;
      renderStatus();
      return;
    }
    const now = Date.now();
    writeJSON(draftKey, { title, content, savedAt: now });
    lastDraftAt = now;
    renderStatus();
  }

  function showDraftBar(draft) {
    const d = new Date(draft.savedAt);
    const when = `${d.getMonth() + 1}월 ${d.getDate()}일 ${timeLabel(draft.savedAt)}`;
    const load = el("button", { type: "button", class: "btn btn--primary btn--small" }, "불러오기");
    const discard = el("button", { type: "button", class: "btn btn--small" }, "버리기");
    draftBar.replaceChildren(
      el("p", { class: "write-draft__text" },
        el("strong", {}, `${when}에 임시저장한 글이 있습니다.`),
        "불러오면 지금 화면의 제목과 본문이 임시 글로 바뀝니다. 고르기 전까지는 새로 쓰는 내용이 임시저장되지 않습니다."),
      el("div", { class: "write-draft__actions" }, load, discard),
    );
    draftBar.hidden = false;
    draftsPaused = true;

    load.addEventListener("click", () => {
      history[hIndex].title = titleInput.value; // undo goes back to this title
      titleInput.value = draft.title || "";
      area.innerHTML = draft.content || "<p><br></p>";
      decorate();
      closeDraftBar();
      area.focus({ preventScroll: true });
      caretInto(area.lastChild && area.lastChild.nodeType === 1 ? area.lastChild : area, true);
      record("command", { title: titleInput.value });
      flash("임시 글을 불러왔습니다.", false);
    });
    discard.addEventListener("click", () => {
      remove(draftKey);
      closeDraftBar();
      flash("임시 글을 버렸습니다.", false);
      scheduleDraft();
    });
  }

  function closeDraftBar() {
    draftBar.hidden = true;
    draftBar.replaceChildren();
    draftsPaused = false;
  }

  titleInput.addEventListener("input", scheduleDraft);

  // ================================================================ submit
  form.addEventListener("submit", (e) => {
    if (uploading) {
      e.preventDefault();
      flash("사진을 다 올린 뒤 다시 눌러 주세요.");
      return;
    }
    sync();
    clearTimeout(draftTimer);
    // Keep the draft until the list page confirms the save (see clearSavedDraft above). If the
    // save fails, the form comes back with the same text and the draft is still here.
    if (!draftsPaused && storage) {
      const title = titleInput.value;
      const content = field.value;
      if (title.trim() || !isBlank()) writeJSON(draftKey, { title, content, savedAt: Date.now() });
    }
    writeJSON(PENDING_KEY, { key: draftKey.slice(DRAFT_PREFIX.length), at: Date.now() });
  });

  // ================================================================ start
  let started = false;
  area.innerHTML = field.value.trim() || "<p><br></p>";
  decorate();
  const initial = { title: titleInput.value, content: cleanHTML() };
  record("command");
  started = true;

  const draft = readJSON(draftKey);
  if (draft && !returnedWithErrors && (draft.title !== initial.title || draft.content !== initial.content)) {
    showDraftBar(draft);
  } else if (draft) {
    lastDraftAt = draft.savedAt; // the text on screen is the draft (e.g. after a failed save)
    renderStatus();
  }

  // Only now does the editor replace the textarea — see the .is-ready rules in admin.css.
  root.classList.add("is-ready");
  updateFade();
  updateHistoryButtons();
})();
