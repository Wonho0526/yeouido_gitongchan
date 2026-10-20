(function () {
  'use strict';

  var API_BASE = window.STATS_API_BASE;
  var SESSION_URL = window.STATS_SESSION_URL;

  // 상단 툴바(기간/사이트/방문자 유형)는 모든 패널에 공통으로 걸리고,
  // pages/events/sessions는 각 패널이 따로 가진 필터다. 패널 필터를 바꿨을 때는
  // 그 패널만 다시 부른다 — 대시보드 전체를 다시 부르면 화면이 통째로 깜빡인다.
  var state = {
    period: 'today',
    start: '',
    end: '',
    site: 'all',
    visitorType: 'human',
    pages: { q: '', sort: 'views' },
    events: { category: 'all', q: '' },
    sessions: { device: 'all', os: 'all', browser: 'all', referrer: 'all', q: '' },
  };
  // 이벤트 표에서 펼쳐 둔 행(이벤트명 + 구분). 펼친 게 없으면 null.
  var openEvent = null;
  var trendChart = null;

  function apiRaw(name, extraParams) {
    var params = new URLSearchParams({
      period: state.period,
      site: state.site,
      visitor_type: state.visitorType,
    });
    if (state.period === 'custom') {
      params.set('start', state.start);
      params.set('end', state.end);
    }
    if (extraParams) {
      Object.keys(extraParams).forEach(function (k) { params.set(k, extraParams[k]); });
    }
    return fetch(API_BASE + name + '?' + params.toString())
      .then(function (res) {
        if (res.status === 401) {
          location.reload(); // session expired — bounce through login
          throw new Error('unauthorized');
        }
        if (res.status === 403) {
          throw new Error('forbidden');
        }
        return res.json();
      });
  }

  function api(name, extraParams) {
    return apiRaw(name, extraParams).then(function (json) { return json.data; });
  }

  // 어느 패널이든 한 번이라도 실패하면 상단 배너로 알린다. 실패를 조용히 넘기면
  // "데이터가 0건"인지 "서버가 죽었는지" 화면에서 구분할 수 없다.
  function showLoadError() {
    var el = document.getElementById('stats-error');
    el.textContent = '통계 데이터를 일부 불러오지 못했습니다. 잠시 후 새로고침해 주세요.';
    el.hidden = false;
  }

  function clearLoadError() {
    document.getElementById('stats-error').hidden = true;
  }

  // api() 호출 + 실패 시 해당 패널에 사유를 남긴다. 세션 만료(401)는 이미 페이지를
  // 새로고침해 로그인으로 보내므로 배너를 띄우지 않는다.
  function load(endpoint, render, renderFailure) {
    return api(endpoint.name || endpoint, endpoint.params)
      .then(render)
      .catch(function (err) {
        if (err && err.message === 'unauthorized') return;
        console.error('[stats] ' + (endpoint.name || endpoint) + ' 실패', err);
        showLoadError();
        if (renderFailure) renderFailure();
      });
  }

  function failBarList(containerId) {
    return function () {
      document.getElementById(containerId).innerHTML =
        '<p class="hint">불러오지 못했습니다.</p>';
    };
  }

  function failTable(selector, colspan) {
    return function () {
      document.querySelector(selector).innerHTML =
        '<tr><td colspan="' + colspan + '">불러오지 못했습니다.</td></tr>';
    };
  }

  function formatDuration(totalSeconds) {
    var seconds = Math.max(0, Math.round(totalSeconds || 0));
    var m = Math.floor(seconds / 60);
    var s = seconds % 60;
    return m > 0 ? m + '분 ' + s + '초' : s + '초';
  }

  function formatDateTime(value) {
    if (!value) return '-';
    return String(value).replace('T', ' ').slice(0, 16);
  }

  // 속성값에도 그대로 넣을 수 있게 따옴표까지 이스케이프한다. page_url/landing_page는
  // 결국 방문자 브라우저가 보낸 문자열이라 따옴표가 섞여 있을 수 있고, 그대로 href나
  // title에 꽂으면 속성을 빠져나간다.
  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // href에 넣어도 되는 주소인지 확인한다. http(s)만 통과시키고 javascript:, data:
  // 같은 스킴은 링크로 만들지 않는다(수집된 URL은 외부 입력이다).
  function safeUrl(value) {
    var url = String(value == null ? '' : value);
    var lower = url.toLowerCase();
    return lower.indexOf('http://') === 0 || lower.indexOf('https://') === 0 ? url : null;
  }

  // 페이지 주소 칸: 새 창으로 열리는 링크. http(s)가 아니면 링크 없이 글자만 보여준다.
  function pageUrlCell(url) {
    var text = escapeHtml(url);
    var href = safeUrl(url);
    if (!href) {
      return '<td class="truncate" title="' + text + '">' + text + '</td>';
    }
    return '<td class="truncate" title="' + text + '">' +
      '<a href="' + escapeHtml(href) + '" target="_blank" rel="noopener noreferrer">' + text + '</a></td>';
  }

  function debounce(fn, delay) {
    var timer = null;
    return function () {
      if (timer) clearTimeout(timer);
      timer = setTimeout(function () {
        timer = null;
        fn();
      }, delay);
    };
  }

  // ---- renderers ---------------------------------------------------------

  function renderCards(overview) {
    document.querySelector('[data-field="visitors"]').textContent = overview.visitors.toLocaleString();
    document.querySelector('[data-field="pageViews"]').textContent = overview.pageViews.toLocaleString();
    document.querySelector('[data-field="avgDuration"]').textContent = formatDuration(overview.avgDurationSeconds);
    document.querySelector('[data-field="bounceRate"]').textContent = overview.bounceRate + '%';
    document.querySelector('[data-field="newVisitors"]').textContent = overview.newVisitors.toLocaleString();
    document.querySelector('[data-field="returningVisitors"]').textContent = overview.returningVisitors.toLocaleString();
  }

  function renderTrendChart(rows) {
    var ctx = document.getElementById('trend-chart').getContext('2d');
    var labels = rows.map(function (r) { return r.date; });
    var visitors = rows.map(function (r) { return r.visitors; });

    if (trendChart) {
      trendChart.data.labels = labels;
      trendChart.data.datasets[0].data = visitors;
      trendChart.data.datasets[0].pointRadius = labels.length <= 3 ? 4 : 0;
      trendChart.update();
      return;
    }
    // 본문과 같은 서체/색을 쓰도록 Chart.js 기본값을 맞춘다.
    Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;
    Chart.defaults.color = '#6b7280';

    trendChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: '방문자',
          data: visitors,
          borderColor: '#2563eb',
          backgroundColor: 'rgba(37, 99, 235, 0.08)',
          borderWidth: 2,
          tension: 0.35,
          fill: true,
          // 점이 몇 개 없는 기간(2~3일짜리 직접선택 등)에는 선만으로 읽기 어려워 점을 찍는다.
          pointRadius: labels.length <= 3 ? 4 : 0,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: '#2563eb',
          pointHoverBorderColor: '#fff',
          pointHoverBorderWidth: 2,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#111827',
            padding: 10,
            cornerRadius: 8,
            displayColors: false,
            titleFont: { weight: '600' },
          },
        },
        scales: {
          x: { grid: { display: false }, border: { display: false }, ticks: { maxRotation: 0, autoSkipPadding: 16 } },
          y: {
            beginAtZero: true,
            border: { display: false },
            grid: { color: '#eef0f4' },
            ticks: { precision: 0, padding: 8 },
          },
        },
      },
    });
  }

  function renderBarList(containerId, rows) {
    var el = document.getElementById(containerId);
    if (!rows.length) {
      el.innerHTML = '<p class="hint">데이터가 없습니다.</p>';
      return;
    }
    el.innerHTML = rows.map(function (r) {
      return (
        '<div class="bar-list__row">' +
          '<span class="bar-list__label">' + escapeHtml(r.label) + '</span>' +
          '<div class="bar-list__track"><div class="bar-list__fill" style="width:' + r.percent + '%"></div></div>' +
          '<span class="bar-list__value">' + r.sessions.toLocaleString() + ' (' + r.percent + '%)</span>' +
        '</div>'
      );
    }).join('');
  }

  function renderPagesTable(rows) {
    var tbody = document.querySelector('#pages-table tbody');
    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="5">' +
        (state.pages.q ? '검색 결과가 없습니다.' : '데이터가 없습니다.') + '</td></tr>';
      return;
    }
    tbody.innerHTML = rows.map(function (r) {
      var bounce = r.entranceBounceRate == null ? '-' : r.entranceBounceRate + '%';
      return (
        '<tr>' +
          pageUrlCell(r.pageUrl) +
          '<td>' + r.views.toLocaleString() + '</td>' +
          '<td>' + r.uniqueVisitors.toLocaleString() + '</td>' +
          '<td>' + formatDuration(r.avgDurationSeconds) + '</td>' +
          '<td>' + bounce + '</td>' +
        '</tr>'
      );
    }).join('');
  }

  var EVENT_CATEGORY_LABELS = {
    conversion: '전환',
    click: '클릭',
    scroll: '스크롤',
  };

  function renderEventsTable(rows) {
    var tbody = document.querySelector('#events-table tbody');
    if (!rows.length) {
      var filtered = state.events.q !== '' || state.events.category !== 'all';
      tbody.innerHTML = '<tr><td colspan="4">' +
        (filtered ? '조건에 맞는 이벤트가 없습니다.' : '데이터가 없습니다.') + '</td></tr>';
      return;
    }
    tbody.innerHTML = rows.map(function (r) {
      var category = r.eventCategory || '';
      var label = EVENT_CATEGORY_LABELS[category] || category || '-';
      var badge = category === 'conversion' ? 'badge badge--on' : 'badge';
      var isOpen = openEvent && openEvent.name === r.eventName && openEvent.category === category;
      return (
        '<tr class="event-row' + (isOpen ? ' is-open' : '') + '"' +
            ' data-event-name="' + escapeHtml(r.eventName) + '"' +
            ' data-event-category="' + escapeHtml(category) + '">' +
          '<td><span class="row-caret" aria-hidden="true"></span>' + escapeHtml(r.eventName) + '</td>' +
          '<td><span class="' + badge + '">' + escapeHtml(label) + '</span></td>' +
          '<td>' + r.count.toLocaleString() + '</td>' +
          '<td>' + r.visitors.toLocaleString() + '</td>' +
        '</tr>'
      );
    }).join('');
  }

  function renderEventPages(rows) {
    var tbody = document.querySelector('#event-pages-table tbody');
    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="4">해당 이벤트가 발생한 페이지가 없습니다.</td></tr>';
      return;
    }
    tbody.innerHTML = rows.map(function (r) {
      return (
        '<tr>' +
          pageUrlCell(r.pageUrl) +
          '<td>' + r.count.toLocaleString() + '</td>' +
          '<td>' + r.visitors.toLocaleString() + '</td>' +
          '<td>' + formatDateTime(r.lastAt) + '</td>' +
        '</tr>'
      );
    }).join('');
  }

  // 사람/봇 뱃지. 봇이면 판별된 이름(GPTBot·자동화 브라우저 등)을 함께 보여주고,
  // 판별 근거인 원본 User-Agent는 title 툴팁으로 확인할 수 있게 한다.
  function visitorTypeCell(row) {
    var ua = escapeHtml(row.userAgent || '');
    if (!row.isBot) {
      return '<td><span class="badge badge--on" title="' + ua + '">사람</span></td>';
    }
    var name = row.botName ? ' · ' + escapeHtml(row.botName) : '';
    return '<td><span class="badge badge--pending" title="' + ua + '">봇' + name + '</span></td>';
  }

  // 접속 IP 칸. 클릭하면 그 IP로 세션 목록을 거른다 — 같은 곳에서 며칠에 걸쳐
  // 몇 번이나 들어왔는지 바로 보려는 용도. 회선 종류 뱃지는 ip-info.php 응답이
  // 도착한 뒤 enrichIpCells()가 채운다(역DNS 조회가 느릴 수 있어 목록과 분리했다).
  function ipCell(row) {
    if (!row.ipAddress) {
      return '<td class="ip-cell">-</td>';
    }
    var ip = escapeHtml(row.ipAddress);
    return '<td class="ip-cell"><button type="button" class="link-button" data-ip="' + ip +
      '" title="이 IP로 필터">' + ip + '</button><span class="ip-net" data-ip-net="' + ip + '"></span></td>';
  }

  function renderSessionsTable(json) {
    var rows = json.data;
    var meta = json.meta || {};
    var countEl = document.getElementById('sessions-count');
    if (meta.total == null) {
      countEl.textContent = '';
    } else if (meta.total > rows.length) {
      countEl.textContent = '총 ' + meta.total.toLocaleString() + '건 중 최근 ' + rows.length + '건';
    } else {
      countEl.textContent = '총 ' + meta.total.toLocaleString() + '건';
    }

    var tbody = document.querySelector('#sessions-table tbody');
    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="9">조건에 맞는 세션이 없습니다.</td></tr>';
      return;
    }
    tbody.innerHTML = rows.map(function (r) {
      return (
        '<tr class="session-row" data-session-id="' + escapeHtml(r.sessionId) + '">' +
          '<td>' + formatDateTime(r.startedAt) + '</td>' +
          visitorTypeCell(r) +
          '<td>' + escapeHtml(r.referrerSource) + '</td>' +
          '<td>' + escapeHtml(r.device) + '</td>' +
          '<td>' + escapeHtml(r.os) + '</td>' +
          '<td>' + escapeHtml(r.browser) + '</td>' +
          '<td>' + r.pageViewCount + '</td>' +
          ipCell(r) +
          pageUrlCell(r.landingPage) +
        '</tr>'
      );
    }).join('');

    enrichIpCells(rows);
  }

  var IP_NETWORK_HINTS = {
    datacenter: '데이터센터/호스팅 회선입니다. 사람이 브라우저로 들어온 접속이 아닐 가능성이 높습니다.',
    residential: '가정용/일반 ISP 회선입니다.',
    mobile: '이동통신 회선입니다.',
    institution: '기관/학교 회선입니다.',
    unknown: '역DNS 이름이 없어 회선을 알 수 없습니다. 국내 이동통신 등 이름이 없는 대역도 많아, 그 자체로 봇이라는 뜻은 아닙니다.',
  };

  // 세션 표의 IP 칸에 회선 종류 뱃지를 채운다. 표가 그사이 다시 그려졌더라도
  // data-ip-net 값으로 다시 찾아 넣으므로 어긋나지 않는다.
  function enrichIpCells(rows) {
    var ips = [];
    rows.forEach(function (r) {
      if (r.ipAddress && ips.indexOf(r.ipAddress) === -1) ips.push(r.ipAddress);
    });
    if (!ips.length) return;

    api('ip-info.php', { ips: ips.join(',') })
      .then(function (info) {
        Object.keys(info).forEach(function (ip) {
          var row = info[ip];
          document.querySelectorAll('[data-ip-net="' + window.CSS.escape(ip) + '"]').forEach(function (el) {
            el.className = 'ip-net ip-net--' + row.networkCode;
            el.textContent = row.networkLabel;
            var hint = IP_NETWORK_HINTS[row.networkCode] || '';
            el.title = row.hostname ? row.hostname + ' · ' + hint : hint;

            // 응답이 두 번 겹쳐 도착해도 봇 뱃지가 둘로 늘지 않게 먼저 지운다.
            var next = el.nextElementSibling;
            if (next && next.classList.contains('ip-net')) {
              next.remove();
            }
            if (row.botStatus === 'verified') {
              el.insertAdjacentHTML('afterend',
                '<span class="ip-net ip-net--verified" title="역DNS 정방향 확인까지 통과한 진짜 검색엔진 봇입니다.">' +
                escapeHtml(row.botVerified) + ' 확인</span>');
            } else if (row.botStatus === 'unverified') {
              el.insertAdjacentHTML('afterend',
                '<span class="ip-net ip-net--warn" title="' + escapeHtml(row.claimedBot) +
                '을(를) 자처했지만 역DNS로 확인되지 않았습니다. 사칭이거나 서버에서 DNS 조회가 막힌 경우입니다.">' +
                '봇 확인 실패</span>');
            }
          });
        });
      })
      .catch(function (err) {
        if (err && err.message === 'unauthorized') return;
        console.error('[stats] ip-info.php 실패', err); // 뱃지는 부가 정보라 배너는 띄우지 않는다
      });
  }

  // ---- 세션 필터 선택지 ---------------------------------------------------
  // 기기/OS/브라우저/유입경로 선택지는 같은 기간의 집계 패널(devices/os/browsers/
  // referrers)이 이미 받아 온 값으로 만든다. 엔드포인트를 새로 만들지 않아도 되고,
  // 언제나 "그 기간에 실제로 있었던 값"만 선택지에 뜬다.
  function fillFilterSelect(selectId, stateKey, rows) {
    var select = document.getElementById(selectId);
    var current = state.sessions[stateKey];
    var labels = rows.map(function (r) { return r.label; }).filter(Boolean);
    // 지금 걸려 있는 값이 이번 기간 목록에 없어도 선택지에 남겨 둔다. 아니면 필터는
    // 걸린 채로 화면에서만 사라져 왜 0건인지 알 수 없게 된다.
    if (current !== 'all' && labels.indexOf(current) === -1) {
      labels.push(current);
    }
    var head = select.options[0]; // "전체 ..." 항목은 마크업에 있는 것을 그대로 쓴다
    select.innerHTML = '';
    select.appendChild(head);
    labels.forEach(function (label) {
      var opt = document.createElement('option');
      opt.value = label;
      opt.textContent = label;
      select.appendChild(opt);
    });
    select.value = current;
  }

  // ---- 패널별 로딩 --------------------------------------------------------

  function loadPages() {
    return load(
      { name: 'pages.php', params: { q: state.pages.q, sort: state.pages.sort } },
      renderPagesTable,
      failTable('#pages-table tbody', 5)
    );
  }

  function loadEvents() {
    return load(
      { name: 'events.php', params: { category: state.events.category, q: state.events.q } },
      renderEventsTable,
      failTable('#events-table tbody', 4)
    );
  }

  function loadEventPages() {
    if (!openEvent) {
      return Promise.resolve();
    }
    return load(
      {
        name: 'event-pages.php',
        params: {
          event_name: openEvent.name,
          // 이벤트 표는 (이름 + 구분)으로 묶여 있으므로 드릴다운도 같은 기준으로 건다.
          // 구분이 비어 있는 행은 "카테고리 NULL"을 뜻하는 약속된 값으로 보낸다.
          category: openEvent.category === '' ? '__none__' : openEvent.category,
        },
      },
      renderEventPages,
      failTable('#event-pages-table tbody', 4)
    );
  }

  function loadSessions() {
    return apiRaw('sessions.php', {
      pageSize: '20',
      device: state.sessions.device,
      os: state.sessions.os,
      browser: state.sessions.browser,
      referrer: state.sessions.referrer,
      q: state.sessions.q,
    })
      .then(renderSessionsTable)
      .catch(function (err) {
        if (err && err.message === 'unauthorized') return;
        console.error('[stats] sessions.php 실패', err);
        showLoadError();
        failTable('#sessions-table tbody', 9)();
        document.getElementById('sessions-count').textContent = '';
      });
  }

  function refreshAll() {
    clearLoadError();
    load('overview.php', renderCards);
    load('visitors.php', renderTrendChart);
    loadPages();
    load('referrers.php', function (rows) {
      renderBarList('referrers-list', rows);
      fillFilterSelect('sessions-referrer', 'referrer', rows);
    }, failBarList('referrers-list'));
    load('devices.php', function (rows) {
      renderBarList('devices-list', rows);
      fillFilterSelect('sessions-device', 'device', rows);
    }, failBarList('devices-list'));
    load('os.php', function (rows) {
      renderBarList('os-list', rows);
      fillFilterSelect('sessions-os', 'os', rows);
    }, failBarList('os-list'));
    load('browsers.php', function (rows) {
      renderBarList('browsers-list', rows);
      fillFilterSelect('sessions-browser', 'browser', rows);
    }, failBarList('browsers-list'));
    load('bots.php', function (rows) { renderBarList('bots-list', rows); }, failBarList('bots-list'));
    loadEvents();
    loadEventPages();
    loadSessions();
  }

  function loadSites() {
    return api('sites.php').then(function (sites) {
      var select = document.getElementById('site-select');
      sites.forEach(function (s) {
        var opt = document.createElement('option');
        opt.value = String(s.id);
        opt.textContent = s.siteName;
        select.appendChild(opt);
      });
    });
  }

  // ---- 상단 툴바 ----------------------------------------------------------

  document.getElementById('site-select').addEventListener('change', function (e) {
    state.site = e.target.value;
    refreshAll();
  });

  document.getElementById('visitor-type-buttons').addEventListener('click', function (e) {
    var btn = e.target.closest('[data-visitor-type]');
    if (!btn) return;
    document.querySelectorAll('#visitor-type-buttons [data-visitor-type]').forEach(function (b) {
      b.classList.remove('btn--primary');
    });
    btn.classList.add('btn--primary');
    state.visitorType = btn.getAttribute('data-visitor-type');
    refreshAll();
  });

  document.getElementById('period-buttons').addEventListener('click', function (e) {
    var btn = e.target.closest('[data-period]');
    if (!btn) return;
    document.querySelectorAll('#period-buttons [data-period]').forEach(function (b) {
      b.classList.remove('btn--primary');
    });
    btn.classList.add('btn--primary');

    var period = btn.getAttribute('data-period');
    document.getElementById('custom-range').hidden = period !== 'custom';
    if (period === 'custom') {
      return; // wait for the "적용" button
    }
    state.period = period;
    refreshAll();
  });

  document.getElementById('custom-apply').addEventListener('click', function () {
    var start = document.getElementById('custom-start').value;
    var end = document.getElementById('custom-end').value;
    if (!start || !end) return;
    state.period = 'custom';
    state.start = start;
    state.end = end;
    refreshAll();
  });

  // ---- 인기 페이지 패널 ---------------------------------------------------

  var pagesSearchInput = document.getElementById('pages-search');
  var pagesSortSelect = document.getElementById('pages-sort');

  pagesSearchInput.addEventListener('input', debounce(function () {
    state.pages.q = pagesSearchInput.value.trim();
    loadPages();
  }, 350));

  pagesSortSelect.addEventListener('change', function () {
    state.pages.sort = pagesSortSelect.value;
    loadPages();
  });

  document.getElementById('pages-reset').addEventListener('click', function () {
    pagesSearchInput.value = '';
    pagesSortSelect.value = 'views';
    state.pages = { q: '', sort: 'views' };
    loadPages();
  });

  // ---- 이벤트(전환) 패널 --------------------------------------------------

  var eventsSearchInput = document.getElementById('events-search');
  var eventPagesBox = document.getElementById('event-pages');

  function closeEventPages() {
    openEvent = null;
    eventPagesBox.hidden = true;
    document.querySelectorAll('#events-table .event-row.is-open').forEach(function (row) {
      row.classList.remove('is-open');
    });
  }

  function openEventPages(name, category, row) {
    openEvent = { name: name, category: category };
    document.querySelectorAll('#events-table .event-row.is-open').forEach(function (r) {
      r.classList.remove('is-open');
    });
    row.classList.add('is-open');

    var label = EVENT_CATEGORY_LABELS[category] || category;
    document.getElementById('event-pages-title').textContent =
      '‘' + name + '’ 이벤트가 발생한 페이지' + (label ? ' · ' + label : '');
    document.querySelector('#event-pages-table tbody').innerHTML =
      '<tr><td colspan="4">불러오는 중...</td></tr>';
    eventPagesBox.hidden = false;
    loadEventPages();
  }

  document.getElementById('event-category-buttons').addEventListener('click', function (e) {
    var btn = e.target.closest('[data-event-category]');
    if (!btn) return;
    document.querySelectorAll('#event-category-buttons [data-event-category]').forEach(function (b) {
      b.classList.remove('btn--primary');
    });
    btn.classList.add('btn--primary');
    state.events.category = btn.getAttribute('data-event-category');
    closeEventPages();
    loadEvents();
  });

  eventsSearchInput.addEventListener('input', debounce(function () {
    state.events.q = eventsSearchInput.value.trim();
    closeEventPages();
    loadEvents();
  }, 350));

  document.getElementById('events-reset').addEventListener('click', function () {
    eventsSearchInput.value = '';
    state.events = { category: 'all', q: '' };
    document.querySelectorAll('#event-category-buttons [data-event-category]').forEach(function (b) {
      b.classList.toggle('btn--primary', b.getAttribute('data-event-category') === 'all');
    });
    closeEventPages();
    loadEvents();
  });

  // 표 본문은 필터를 바꿀 때마다 새로 그려지므로 tbody에 위임해 한 번만 붙인다.
  document.querySelector('#events-table tbody').addEventListener('click', function (e) {
    var row = e.target.closest('.event-row');
    if (!row) return;
    var name = row.getAttribute('data-event-name');
    var category = row.getAttribute('data-event-category');
    if (openEvent && openEvent.name === name && openEvent.category === category) {
      closeEventPages(); // 같은 행을 다시 누르면 접는다
      return;
    }
    openEventPages(name, category, row);
  });

  document.getElementById('event-pages-close').addEventListener('click', closeEventPages);

  // ---- 최근 방문 세션 패널 ------------------------------------------------

  var sessionsSearchInput = document.getElementById('sessions-search');

  [
    ['sessions-device', 'device'],
    ['sessions-os', 'os'],
    ['sessions-browser', 'browser'],
    ['sessions-referrer', 'referrer'],
  ].forEach(function (pair) {
    document.getElementById(pair[0]).addEventListener('change', function (e) {
      state.sessions[pair[1]] = e.target.value;
      loadSessions();
    });
  });

  sessionsSearchInput.addEventListener('input', debounce(function () {
    state.sessions.q = sessionsSearchInput.value.trim();
    loadSessions();
  }, 350));

  document.getElementById('sessions-reset').addEventListener('click', function () {
    sessionsSearchInput.value = '';
    state.sessions = { device: 'all', os: 'all', browser: 'all', referrer: 'all', q: '' };
    ['sessions-device', 'sessions-os', 'sessions-browser', 'sessions-referrer'].forEach(function (id) {
      document.getElementById(id).value = 'all';
    });
    loadSessions();
  });

  document.querySelector('#sessions-table tbody').addEventListener('click', function (e) {
    var ipButton = e.target.closest('[data-ip]');
    if (ipButton) {
      sessionsSearchInput.value = ipButton.getAttribute('data-ip');
      state.sessions.q = sessionsSearchInput.value;
      loadSessions();
      return;
    }
    // 랜딩 페이지 링크는 새 창으로 열리게 두고, 세션 상세로는 넘어가지 않는다.
    if (e.target.closest('a')) return;

    var row = e.target.closest('.session-row');
    if (!row) return;
    location.href = SESSION_URL + '?session_id=' + encodeURIComponent(row.getAttribute('data-session-id'));
  });

  // default selected buttons — 기간은 '오늘', 방문자 유형은 '사람'(봇 제외),
  // 이벤트 구분은 '전체'
  document.querySelector('#period-buttons [data-period="today"]').classList.add('btn--primary');
  document.querySelector('#visitor-type-buttons [data-visitor-type="human"]').classList.add('btn--primary');
  document.querySelector('#event-category-buttons [data-event-category="all"]').classList.add('btn--primary');

  loadSites().catch(function (err) {
    if (!err || err.message !== 'unauthorized') {
      console.error('[stats] sites.php 실패', err);
      showLoadError();
    }
  }).then(refreshAll);
})();
