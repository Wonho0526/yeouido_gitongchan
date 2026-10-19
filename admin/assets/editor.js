// 건강정보 본문 에디터.
//
// A contenteditable surface with a toolbar, kept deliberately small: no external library,
// matching how the rest of the site vendors its scripts locally. The editor only has to be
// convenient — sanitize_html.php on the server decides what actually gets stored, so a
// broken or bypassed toolbar cannot widen what a post is allowed to contain.
(() => {
  const root = document.querySelector("[data-editor]");
  if (!root) return;

  const area = root.querySelector("[data-editor-area]");
  const field = document.querySelector("#content");
  const fileInput = root.querySelector("[data-editor-file]");
  const form = root.closest("form");
  const uploadUrl = root.dataset.uploadUrl;
  const csrf = form.querySelector('[name="csrf_token"]').value;

  // Sizes and colours are offered as presets so posts stay on-brand. The sanitizer accepts
  // any value in range, so these are a guide rather than a limit.
  const SIZES = [["작게", "14px"], ["보통", "16px"], ["크게", "20px"], ["아주 크게", "26px"]];
  const COLORS = [
    ["기본", "#222222"], ["브랜드", "#1b4b8f"], ["강조", "#c8102e"],
    ["회색", "#6b7280"], ["초록", "#15803d"],
  ];
  const HIGHLIGHTS = [
    ["노랑", "#fff3b0"], ["파랑", "#dbeafe"], ["초록", "#dcfce7"],
    ["분홍", "#fce7f3"], ["없음", ""],
  ];

  const exec = (cmd, value = null) => {
    area.focus();
    document.execCommand(cmd, false, value);
    sync();
  };

  // execCommand writes <font size> and inline styles we do not want; wrapping the selection
  // in a styled <span> ourselves keeps the output inside the sanitizer's allowlist.
  const wrapSelection = (styleProp, styleValue) => {
    area.focus();
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) {
      flash("먼저 글자를 선택해주세요.");
      return;
    }
    const range = sel.getRangeAt(0);
    const span = document.createElement("span");
    if (styleValue) span.style.setProperty(styleProp, styleValue);
    try {
      range.surroundContents(span);
    } catch {
      // surroundContents throws when the selection crosses element boundaries.
      span.appendChild(range.extractContents());
      range.insertNode(span);
    }
    if (!styleValue) {
      // "없음" — drop the wrapper and keep the text.
      span.replaceWith(...span.childNodes);
    }
    sel.removeAllRanges();
    sync();
  };

  const button = (label, title, onClick, extraClass = "") => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "editor-btn " + extraClass;
    b.title = title;
    b.innerHTML = label;
    b.addEventListener("mousedown", (e) => e.preventDefault()); // keep the selection
    b.addEventListener("click", onClick);
    return b;
  };

  const select = (label, options, onPick) => {
    const wrap = document.createElement("label");
    wrap.className = "editor-select";
    wrap.append(document.createTextNode(label));
    const sel = document.createElement("select");
    options.forEach(([text, value]) => {
      const o = document.createElement("option");
      o.textContent = text;
      o.value = value;
      sel.append(o);
    });
    sel.addEventListener("change", () => { onPick(sel.value); sel.selectedIndex = 0; });
    wrap.append(sel);
    return wrap;
  };

  const toolbar = root.querySelector("[data-editor-toolbar]");
  toolbar.append(
    button("<b>B</b>", "굵게", () => exec("bold")),
    button("<i>I</i>", "기울임", () => exec("italic")),
    button("<u>U</u>", "밑줄", () => exec("underline")),
    button("<s>S</s>", "취소선", () => exec("strikeThrough")),
    divider(),
    button("H2", "소제목", () => exec("formatBlock", "<h2>")),
    button("H3", "작은 제목", () => exec("formatBlock", "<h3>")),
    button("본문", "일반 문단", () => exec("formatBlock", "<p>")),
    divider(),
    select("크기", [["크기", ""], ...SIZES], (v) => v && wrapSelection("font-size", v)),
    select("색상", [["색상", ""], ...COLORS], (v) => v && wrapSelection("color", v)),
    select("음영", [["음영", ""], ...HIGHLIGHTS.map(([t, v]) => [t, v || "none"])],
      (v) => v && wrapSelection("background-color", v === "none" ? "" : v)),
    divider(),
    button("• 목록", "글머리 기호", () => exec("insertUnorderedList")),
    button("1. 목록", "번호 매기기", () => exec("insertOrderedList")),
    divider(),
    button("왼쪽", "왼쪽 정렬", () => alignBlock("left")),
    button("가운데", "가운데 정렬", () => alignBlock("center")),
    button("오른쪽", "오른쪽 정렬", () => alignBlock("right")),
    divider(),
    button("🔗 링크", "링크 넣기", insertLink),
    button("🖼 사진", "사진 넣기", () => fileInput.click()),
    divider(),
    button("서식 지우기", "선택 영역의 서식 제거", () => exec("removeFormat")),
  );

  function divider() {
    const d = document.createElement("span");
    d.className = "editor-divider";
    return d;
  }

  // text-align belongs on the block, and justifyCenter would set it on whatever element
  // happens to hold the caret — so walk up to the nearest block we allow it on.
  function alignBlock(value) {
    area.focus();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    let node = sel.getRangeAt(0).startContainer;
    if (node.nodeType === 3) node = node.parentNode;
    while (node && node !== area && !["P", "H2", "H3", "LI"].includes(node.nodeName)) {
      node = node.parentNode;
    }
    if (!node || node === area) { flash("문단 안에 커서를 두고 눌러주세요."); return; }
    node.style.textAlign = value;
    sync();
  }

  function insertLink() {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) { flash("링크를 걸 글자를 선택해주세요."); return; }
    const url = window.prompt("링크 주소를 입력하세요 (https:// 로 시작)", "https://");
    if (!url) return;
    if (!/^https?:\/\//i.test(url) && !/^mailto:/i.test(url) && !url.startsWith("/")) {
      flash("https:// 로 시작하는 주소만 넣을 수 있습니다.");
      return;
    }
    exec("createLink", url);
  }

  fileInput.addEventListener("change", async () => {
    const file = fileInput.files && fileInput.files[0];
    fileInput.value = "";
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { flash("이미지는 5MB 이하만 올릴 수 있습니다."); return; }

    flash("사진 올리는 중…", false);
    const body = new FormData();
    body.append("image", file);
    body.append("csrf_token", csrf);
    try {
      const res = await fetch(uploadUrl, { method: "POST", body });
      const data = await res.json();
      if (!res.ok) { flash(data.error || "사진 업로드에 실패했습니다."); return; }
      area.focus();
      document.execCommand("insertHTML", false,
        '<img src="' + data.path + '" alt=""><p><br></p>');
      sync();
      flash("사진을 넣었습니다.", false);
    } catch {
      flash("사진 업로드 중 오류가 생겼습니다.");
    }
  });

  const notice = root.querySelector("[data-editor-notice]");
  let noticeTimer = null;
  function flash(message, isError = true) {
    notice.textContent = message;
    notice.classList.toggle("is-error", isError);
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => { notice.textContent = ""; }, 4000);
  }

  // The textarea stays the thing that is actually submitted, so the form keeps working
  // the same way on the server whether or not this script ran.
  function sync() {
    field.value = area.innerHTML;
  }

  area.addEventListener("input", sync);
  area.addEventListener("blur", sync);
  form.addEventListener("submit", sync);

  // Paste as plain text: pasted Word/web markup is the main source of junk the sanitizer
  // would strip anyway, and stripping it here keeps what the admin sees honest.
  area.addEventListener("paste", (e) => {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData("text/plain");
    document.execCommand("insertText", false, text);
  });

  area.innerHTML = field.value.trim() || "<p><br></p>";
  sync();

  // Only now does the editor replace the textarea — see the .is-ready rules in admin.css.
  root.classList.add("is-ready");
})();
