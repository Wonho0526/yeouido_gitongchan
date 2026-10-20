/*!
 * 여의도기통찬의원 관리자 시스템 — 방문통계 Tracker Script
 *
 * 설치:
 *   <script src="https://도메인/admin/tracker.js" data-site-id="SITE_XXXX"></script>
 *
 * 개인정보(실명/전화번호/이메일/IP)는 수집하지 않습니다. visitor_id/session_id는
 * 브라우저에 저장되는 무작위 UUID일 뿐 실제 신원과 연결되지 않습니다.
 */
(function () {
  'use strict';

  var scriptEl = document.currentScript || (function () {
    var scripts = document.getElementsByTagName('script');
    return scripts[scripts.length - 1];
  })();
  var SITE_ID = scriptEl.getAttribute('data-site-id') || '';
  if (!SITE_ID) {
    return; // no site id configured — nothing to do
  }

  // API base is derived from the script's own src origin, so the same file
  // works unmodified once copy-pasted onto any hospital site pointed at this
  // stats server (data-api-base can still override it explicitly).
  var API_BASE = scriptEl.getAttribute('data-api-base') || (function () {
    try {
      var src = new URL(scriptEl.src, location.href);
      return src.origin + src.pathname.replace(/\/tracker\.js$/, '');
    } catch (e) {
      return '';
    }
  })();
  var TRACK_URL = API_BASE + '/api/public/track.php?site_id=' + encodeURIComponent(SITE_ID);

  var IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 min of inactivity starts a new session

  // ---- ids -------------------------------------------------------------

  function uuid() {
    if (window.crypto && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    // Fallback UUIDv4 for older browsers lacking crypto.randomUUID().
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      var v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function storageGet(store, key) {
    try {
      return store.getItem(key);
    } catch (e) {
      return null;
    }
  }
  function storageSet(store, key, value) {
    try {
      store.setItem(key, value);
    } catch (e) {
      /* storage unavailable (private mode etc.) — tracking degrades silently */
    }
  }

  function getVisitorId() {
    var id = storageGet(localStorage, '_gu_vid');
    if (!id) {
      id = uuid();
      storageSet(localStorage, '_gu_vid', id);
    }
    return id;
  }

  // Returns {sessionId, isNew}. Starts a fresh session if none exists yet, or
  // the previous one has been idle past IDLE_TIMEOUT_MS.
  function getSession() {
    var now = Date.now();
    var sessionId = storageGet(sessionStorage, '_gu_sid');
    var lastActive = parseInt(storageGet(sessionStorage, '_gu_last_active') || '0', 10);
    var isNew = false;

    if (!sessionId || !lastActive || now - lastActive > IDLE_TIMEOUT_MS) {
      sessionId = uuid();
      storageSet(sessionStorage, '_gu_sid', sessionId);
      storageSet(sessionStorage, '_gu_seq', '0');
      storageSet(sessionStorage, '_gu_last_url', '');
      isNew = true;
    }
    storageSet(sessionStorage, '_gu_last_active', String(now));
    return { sessionId: sessionId, isNew: isNew };
  }

  function nextSequence() {
    var seq = parseInt(storageGet(sessionStorage, '_gu_seq') || '0', 10) + 1;
    storageSet(sessionStorage, '_gu_seq', String(seq));
    return seq;
  }

  // ---- transport ---------------------------------------------------------

  function send(body) {
    var json = JSON.stringify(body);
    try {
      if (navigator.sendBeacon) {
        var blob = new Blob([json], { type: 'application/json' });
        if (navigator.sendBeacon(TRACK_URL, blob)) {
          return;
        }
      }
    } catch (e) {
      /* fall through to fetch */
    }
    try {
      fetch(TRACK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: json,
        keepalive: true,
        credentials: 'omit',
      }).catch(function () {});
    } catch (e) {
      /* nothing more we can do */
    }
  }

  // ---- UTM parsing ---------------------------------------------------------

  function parseUtm() {
    var params = new URLSearchParams(location.search);
    return {
      utm_source: params.get('utm_source') || '',
      utm_medium: params.get('utm_medium') || '',
      utm_campaign: params.get('utm_campaign') || '',
      utm_term: params.get('utm_term') || '',
      utm_content: params.get('utm_content') || '',
    };
  }

  // ---- page-view lifecycle ---------------------------------------------

  var visitorId = getVisitorId();
  var current = null; // { pageViewId, enteredAtMs, ended }

  function startPageView() {
    var session = getSession();
    var previousUrl = storageGet(sessionStorage, '_gu_last_url') || '';
    var pageViewId = uuid();
    current = { pageViewId: pageViewId, enteredAtMs: Date.now(), ended: false, maxScroll: 0, scrollFired: {} };

    // Session-level fields (landing page, referrer, UTM, device) are sent
    // along with EVERY page view, not just the first, and only take effect
    // server-side on the row that actually creates the session. Two separate
    // requests ("create session" then "create page view") would race across
    // independent HTTP requests with no ordering guarantee; folding them into
    // one request removes that race entirely.
    var payload = {
      action: 'pageview_start',
      visitor_id: visitorId,
      session_id: session.sessionId,
      page_view_id: pageViewId,
      page_url: location.href,
      page_title: document.title,
      previous_page_url: previousUrl || null,
      sequence: nextSequence(),
    };
    if (session.isNew) {
      payload.landing_page = location.href;
      payload.referrer = document.referrer || '';
      payload.user_agent = navigator.userAgent;
      // Selenium/Puppeteer/Playwright 계열 자동화 브라우저 표식. 이런 도구는 UA를
      // 평범한 크롬으로 위장할 수 있어서, 서버의 UA 패턴 검사만으로는 사람과
      // 구별되지 않는다. 봇 판별에 쓰는 별도 신호로 함께 보낸다.
      payload.automation = navigator.webdriver === true;
      payload.screen_width = screen.width;
      payload.screen_height = screen.height;
      var utm = parseUtm();
      for (var k in utm) {
        payload[k] = utm[k];
      }
    }
    send(payload);

    storageSet(sessionStorage, '_gu_last_url', location.href);
  }

  function endPageView() {
    if (!current || current.ended) {
      return;
    }
    current.ended = true;
    var durationSeconds = Math.round((Date.now() - current.enteredAtMs) / 1000);
    var sessionId = storageGet(sessionStorage, '_gu_sid');
    send({
      action: 'pageview_end',
      page_view_id: current.pageViewId,
      session_id: sessionId,
      duration: durationSeconds,
    });
  }

  // visibilitychange (tab hidden / app backgrounded, incl. mobile) and pagehide
  // (navigation, close, bfcache) both fire "leaving" — only the first one wins
  // per page view. beforeunload is intentionally not used (unreliable on mobile
  // Safari and blocks bfcache); this can't guarantee a 100%-accurate exit time,
  // only a best-effort one.
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') {
      endPageView();
    }
  });
  window.addEventListener('pagehide', endPageView);

  // ---- scroll depth ---------------------------------------------------------

  var SCROLL_THRESHOLDS = [25, 50, 75, 90];
  function onScroll() {
    if (!current || current.ended) {
      return;
    }
    var doc = document.documentElement;
    var scrollableHeight = (doc.scrollHeight || document.body.scrollHeight) - window.innerHeight;
    if (scrollableHeight <= 0) {
      return;
    }
    var pct = Math.min(100, Math.round(((window.scrollY || doc.scrollTop) / scrollableHeight) * 100));
    if (pct > current.maxScroll) {
      current.maxScroll = pct;
    }
    for (var i = 0; i < SCROLL_THRESHOLDS.length; i++) {
      var t = SCROLL_THRESHOLDS[i];
      if (pct >= t && !current.scrollFired[t]) {
        current.scrollFired[t] = true;
        trackEvent('스크롤 ' + t + '%', 'scroll', String(t));
      }
    }
  }
  var scrollTimer = null;
  window.addEventListener('scroll', function () {
    if (scrollTimer) {
      return;
    }
    scrollTimer = setTimeout(function () {
      scrollTimer = null;
      onScroll();
    }, 200);
  }, { passive: true });

  // ---- public event API ---------------------------------------------------

  function trackEvent(name, category, value) {
    var sessionId = storageGet(sessionStorage, '_gu_sid');
    if (!sessionId || !name) {
      return;
    }
    send({
      action: 'event',
      visitor_id: visitorId,
      session_id: sessionId,
      event_name: String(name),
      event_category: category ? String(category) : null,
      event_value: value != null ? String(value) : null,
      page_url: location.href,
    });
  }

  // Click tracking by convention: any element with data-track-event="이름"
  // fires an event on click, e.g. <a data-track-event="전화 버튼 클릭">.
  document.addEventListener('click', function (e) {
    var el = e.target && e.target.closest ? e.target.closest('[data-track-event]') : null;
    if (el) {
      trackEvent(
        el.getAttribute('data-track-event'),
        el.getAttribute('data-track-category') || 'click',
        el.getAttribute('data-track-value')
      );
    }
  });

  // ---- SPA support ---------------------------------------------------------
  // Patches pushState/replaceState + listens for popstate so a client-rendered
  // route change is tracked as a new page view without a full reload.

  function onLocationChange() {
    endPageView();
    startPageView();
  }
  ['pushState', 'replaceState'].forEach(function (method) {
    var original = history[method];
    history[method] = function () {
      var result = original.apply(this, arguments);
      onLocationChange();
      return result;
    };
  });
  window.addEventListener('popstate', onLocationChange);

  // ---- boot ---------------------------------------------------------

  window.GUTracker = { trackEvent: trackEvent };
  startPageView();
})();
