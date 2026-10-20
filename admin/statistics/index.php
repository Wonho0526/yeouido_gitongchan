<?php

require __DIR__ . '/../includes/bootstrap.php';
require __DIR__ . '/../includes/layout.php';

// MASTER-only page shell. The actual data is fetched client-side from
// api/statistics/*.php, which independently re-checks require_role_api('MASTER')
// on every call — this page-level guard is a UX convenience, not the real gate.
$admin = require_role('MASTER');

// Inline icon set (feather-style) so the dashboard doesn't depend on any
// external icon font/CDN — this admin runs on plain shared hosting.
function stat_icon(string $name): string
{
    $paths = [
        'users' => '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
        'eye' => '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/>',
        'clock' => '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
        'log-out' => '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
        'user-plus' => '<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="17" y1="11" x2="23" y2="11"/>',
        'repeat' => '<polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>',
        'trend-up' => '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>',
        'link' => '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
        'smartphone' => '<rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>',
        'file-text' => '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
        'monitor' => '<rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>',
        'globe' => '<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
        'target' => '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
        'list' => '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>',
        'globe-2' => '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20Z"/>',
        'filter' => '<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>',
        'bot' => '<path d="M12 8V4H8"/><rect x="4" y="8" width="16" height="12" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/>',
    ];
    $body = $paths[$name] ?? '';
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' . $body . '</svg>';
}

function stat_card(string $icon, string $tone, string $label, string $field): void
{
    echo '<div class="stats-card stats-card--' . h($tone) . '">'
        . '<span class="stats-card__icon">' . stat_icon($icon) . '</span>'
        . '<span class="stats-card__body"><span class="stats-card__label">' . h($label) . '</span>'
        . '<span class="stats-card__value" data-field="' . h($field) . '">-</span></span>'
        . '</div>';
}

function stats_panel_title(string $icon, string $text): void
{
    echo '<h2><span class="stats-panel__icon">' . stat_icon($icon) . '</span>' . h($text) . '</h2>';
}

layout_header('방문통계', $admin);
?>
<div class="stats-toolbar">
  <div class="stats-toolbar__group">
    <span class="stats-toolbar__icon"><?= stat_icon('filter') ?></span>
    <select id="site-select"><option value="all">전체 사이트</option></select>
  </div>
  <div class="stats-toolbar__group">
    <span class="stats-toolbar__icon" title="방문자 유형"><?= stat_icon('bot') ?></span>
    <div class="stats-toolbar__group stats-toolbar__group--segmented" id="visitor-type-buttons">
      <button type="button" class="btn btn--small" data-visitor-type="human">사람</button>
      <button type="button" class="btn btn--small" data-visitor-type="bot">봇</button>
      <button type="button" class="btn btn--small" data-visitor-type="all">전체</button>
    </div>
  </div>
  <div class="stats-toolbar__group stats-toolbar__group--segmented" id="period-buttons">
    <button type="button" class="btn btn--small" data-period="today">오늘</button>
    <button type="button" class="btn btn--small" data-period="yesterday">어제</button>
    <button type="button" class="btn btn--small" data-period="7d">최근 7일</button>
    <button type="button" class="btn btn--small" data-period="30d">최근 30일</button>
    <button type="button" class="btn btn--small" data-period="this_month">이번 달</button>
    <button type="button" class="btn btn--small" data-period="last_month">지난달</button>
    <button type="button" class="btn btn--small" data-period="custom">직접 선택</button>
  </div>
  <div class="stats-toolbar__group" id="custom-range" hidden>
    <input type="date" id="custom-start">
    <span>~</span>
    <input type="date" id="custom-end">
    <button type="button" class="btn btn--small btn--primary" id="custom-apply">적용</button>
  </div>
</div>

<div class="flash flash--error" id="stats-error" hidden></div>

<div class="stats-cards" id="stats-cards">
  <?php
  stat_card('users', 'blue', '방문자', 'visitors');
  stat_card('eye', 'violet', '페이지뷰', 'pageViews');
  stat_card('clock', 'amber', '평균 체류시간', 'avgDuration');
  stat_card('log-out', 'rose', '이탈률', 'bounceRate');
  stat_card('user-plus', 'emerald', '신규 방문자', 'newVisitors');
  stat_card('repeat', 'cyan', '재방문자', 'returningVisitors');
  ?>
</div>

<div class="stats-panel">
  <?php stats_panel_title('trend-up', '방문자 추이') ?>
  <canvas id="trend-chart" height="90"></canvas>
</div>

<div class="stats-grid">
  <div class="stats-panel">
    <?php stats_panel_title('link', '유입경로') ?>
    <div class="bar-list" id="referrers-list"></div>
  </div>
  <div class="stats-panel">
    <?php stats_panel_title('smartphone', '디바이스') ?>
    <div class="bar-list" id="devices-list"></div>
  </div>
</div>

<div class="stats-grid">
  <div class="stats-panel">
    <?php stats_panel_title('monitor', 'OS') ?>
    <div class="bar-list" id="os-list"></div>
  </div>
  <div class="stats-panel">
    <?php stats_panel_title('globe', '브라우저') ?>
    <div class="bar-list" id="browsers-list"></div>
  </div>
</div>

<div class="stats-panel">
  <?php stats_panel_title('file-text', '인기 페이지') ?>
  <div class="stats-panel__filters">
    <input type="search" id="pages-search" placeholder="페이지 주소 검색" autocomplete="off">
    <select id="pages-sort" aria-label="인기 페이지 정렬 기준">
      <option value="views">조회수순</option>
      <option value="visitors">순방문자순</option>
      <option value="duration">평균 체류시간순</option>
      <option value="bounce">이탈률순</option>
    </select>
    <button type="button" class="btn btn--small" id="pages-reset">초기화</button>
  </div>
  <div class="table-scroll">
    <table id="pages-table">
      <thead><tr><th>페이지</th><th>조회수</th><th>순방문자</th><th>평균 체류시간</th><th>이탈률</th></tr></thead>
      <tbody></tbody>
    </table>
  </div>
  <p class="hint">페이지 주소를 클릭하면 새 창에서 그 화면이 열립니다.</p>
</div>

<div class="stats-panel">
  <?php stats_panel_title('bot', '봇 접속') ?>
  <div class="bar-list" id="bots-list"></div>
  <p class="hint">
    위 방문자 유형과 무관하게 항상 봇 접속만 집계합니다.
    자바스크립트를 실행하지 않는 크롤러(GPTBot·ClaudeBot 등)는 여기에 잡히지 않습니다.
  </p>
</div>

<div class="stats-panel">
  <?php stats_panel_title('target', '이벤트 (전환)') ?>
  <div class="stats-panel__filters">
    <div class="stats-toolbar__group stats-toolbar__group--segmented" id="event-category-buttons">
      <button type="button" class="btn btn--small" data-event-category="all">전체</button>
      <button type="button" class="btn btn--small" data-event-category="conversion">전환</button>
      <button type="button" class="btn btn--small" data-event-category="click">클릭</button>
      <button type="button" class="btn btn--small" data-event-category="scroll">스크롤</button>
    </div>
    <input type="search" id="events-search" placeholder="이벤트명 검색" autocomplete="off">
    <button type="button" class="btn btn--small" id="events-reset">초기화</button>
  </div>
  <div class="table-scroll">
    <table id="events-table">
      <thead><tr><th>이벤트</th><th>구분</th><th>발생 수</th><th>방문자 수</th></tr></thead>
      <tbody></tbody>
    </table>
  </div>
  <p class="hint">이벤트 행을 클릭하면 그 이벤트가 발생한 페이지 목록이 아래에 열립니다.</p>

  <div class="stats-drilldown" id="event-pages" hidden>
    <div class="stats-drilldown__head">
      <h3 id="event-pages-title"></h3>
      <button type="button" class="btn btn--small" id="event-pages-close">닫기</button>
    </div>
    <div class="table-scroll">
      <table id="event-pages-table">
        <thead><tr><th>페이지</th><th>발생 수</th><th>방문자 수</th><th>마지막 발생</th></tr></thead>
        <tbody></tbody>
      </table>
    </div>
  </div>
</div>

<div class="stats-panel">
  <?php stats_panel_title('list', '최근 방문 세션') ?>
  <div class="stats-panel__filters">
    <select id="sessions-device" aria-label="기기 필터"><option value="all">전체 기기</option></select>
    <select id="sessions-os" aria-label="OS 필터"><option value="all">전체 OS</option></select>
    <select id="sessions-browser" aria-label="브라우저 필터"><option value="all">전체 브라우저</option></select>
    <select id="sessions-referrer" aria-label="유입경로 필터"><option value="all">전체 유입경로</option></select>
    <input type="search" id="sessions-search" placeholder="랜딩 페이지 · IP 검색" autocomplete="off">
    <button type="button" class="btn btn--small" id="sessions-reset">초기화</button>
    <span class="stats-panel__count" id="sessions-count"></span>
  </div>
  <div class="table-scroll">
    <table id="sessions-table">
      <thead><tr><th>시작 시각</th><th>유형</th><th>유입경로</th><th>기기</th><th>OS</th><th>브라우저</th><th>페이지뷰</th><th>접속 IP</th><th>랜딩 페이지</th></tr></thead>
      <tbody></tbody>
    </table>
  </div>
  <p class="hint">
    행을 클릭하면 세션 상세(페이지 이동 경로)로 이동합니다.
    랜딩 페이지 주소는 새 창에서 열리고, 접속 IP를 클릭하면 그 IP로 목록을 걸러 봅니다.
    IP 옆에 <strong>회선 종류</strong> 뱃지(<em>가정용/일반 ISP</em>, <em>데이터센터/호스팅</em> 등)가 뜨면
    역DNS로 판단한 결과입니다. <em>데이터센터/호스팅</em>은 사람이 브라우저로 들어온 접속이 아닐
    가능성이 높다는 뜻입니다. 뱃지가 하나도 뜨지 않는다면 <strong>서버에서 역DNS 조회가 막혀 있는 것</strong>이며
    (현재 카페24 호스팅이 그렇습니다), 이 경우 회선 판별과 검색봇 진위 확인은 동작하지 않습니다.
  </p>
</div>

<script>
  window.STATS_API_BASE = <?= json_encode(admin_url('api/statistics/'), JSON_UNESCAPED_SLASHES) ?>;
  window.STATS_SESSION_URL = <?= json_encode(admin_url('statistics/session.php'), JSON_UNESCAPED_SLASHES) ?>;
</script>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
<script src="<?= h(admin_url('assets/statistics.js?v=20260908')) ?>"></script>
<?php
layout_footer();
