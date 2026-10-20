<?php

// MASTER-only. GET /api/statistics/sessions.php?period=&start=&end=&site=&visitor_type=&page=&pageSize=
//                                              &device=&os=&browser=&referrer=&q=
// Recent-sessions list for the dashboard's bottom table; click-through target
// for statistics/session.php (session detail / page path).

require __DIR__ . '/../../includes/bootstrap.php';
require __DIR__ . '/../../includes/stats_query.php';

require_role_api('MASTER');

[$start, $end] = resolve_stats_period(
    query_param('period', 'today'),
    query_param('start'),
    query_param('end')
);
[$siteSql, $siteParams] = resolve_site_filter(query_param('site', 'all'), 'site_id');
$botSql = resolve_bot_filter(query_param('visitor_type', 'human'));

// 패널 자체 필터. 기기/OS/브라우저/유입경로는 정확히 일치, ?q=는 랜딩 페이지와 IP를
// 함께 훑는 검색어다. 두 컬럼을 OR로 묶을 때 플레이스홀더 이름을 반드시 다르게 둔다 —
// db.php가 네이티브 프리페어를 쓰므로 같은 이름을 두 번 쓰면 운영에서만 조용히 깨진다.
$filterSql = '';
$filterParams = [];
foreach ([
    ['device', 'device', 'f_device'],
    ['os', 'os', 'f_os'],
    ['browser', 'browser', 'f_browser'],
    ['referrer', 'referrer_source', 'f_referrer'],
] as [$param, $column, $placeholder]) {
    [$sql, $params] = resolve_exact_filter(query_param($param, 'all'), $column, $placeholder);
    $filterSql .= ' ' . $sql;
    $filterParams = array_merge($filterParams, $params);
}

$search = query_param('q');
$searchSql = '';
$searchParams = [];
if ($search !== '') {
    $searchSql = 'AND (landing_page LIKE :q_landing OR ip_address LIKE :q_ip)';
    $pattern = stats_like_pattern($search);
    $searchParams = ['q_landing' => $pattern, 'q_ip' => $pattern];
}

$page = max(1, (int) query_param('page', '1'));
$pageSize = min(50, max(1, (int) query_param('pageSize', '20')));
$offset = ($page - 1) * $pageSize;

$baseParams = array_merge(['start' => $start, 'end' => $end], $siteParams, $filterParams, $searchParams);

$countStmt = db()->prepare(
    "SELECT COUNT(*) FROM sessions
     WHERE started_at >= :start AND started_at < :end $siteSql $botSql $filterSql $searchSql"
);
$countStmt->execute($baseParams);
$total = (int) $countStmt->fetchColumn();

$listStmt = db()->prepare(
    "SELECT session_id, started_at, ended_at, landing_page, referrer_source, device, os, browser,
            page_view_count, is_bot, bot_name, user_agent, ip_address
     FROM sessions
     WHERE started_at >= :start AND started_at < :end $siteSql $botSql $filterSql $searchSql
     ORDER BY started_at DESC
     LIMIT :limit OFFSET :offset"
);
foreach ($baseParams as $key => $value) {
    $listStmt->bindValue(':' . $key, $value);
}
$listStmt->bindValue(':limit', $pageSize, PDO::PARAM_INT);
$listStmt->bindValue(':offset', $offset, PDO::PARAM_INT);
$listStmt->execute();

$data = array_map(function (array $r): array {
    $duration = null;
    if ($r['ended_at']) {
        $duration = max(0, strtotime($r['ended_at']) - strtotime($r['started_at']));
    }
    return [
        'sessionId' => $r['session_id'],
        'startedAt' => $r['started_at'],
        'durationSeconds' => $duration,
        'landingPage' => $r['landing_page'],
        'referrerSource' => $r['referrer_source'],
        'device' => $r['device'],
        'os' => $r['os'],
        'browser' => $r['browser'],
        'pageViewCount' => (int) $r['page_view_count'],
        'isBot' => (bool) $r['is_bot'],
        'botName' => $r['bot_name'],
        'userAgent' => $r['user_agent'],
        'ipAddress' => $r['ip_address'],
    ];
}, $listStmt->fetchAll());

echo json_encode([
    'data' => $data,
    'meta' => ['total' => $total, 'page' => $page, 'pageSize' => $pageSize],
], JSON_UNESCAPED_UNICODE);
