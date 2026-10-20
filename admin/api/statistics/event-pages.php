<?php

// MASTER-only. GET /api/statistics/event-pages.php?event_name=&category=&period=&start=&end=&site=&visitor_type=
// 이벤트 하나가 "어느 페이지에서" 발생했는지 분해해서 보여준다. 대시보드의
// 이벤트(전환) 표에서 한 행(예: '스크롤 75%')을 펼쳤을 때 호출된다.
//
// ?category=는 이벤트 표의 그룹 기준(event_name + event_category)을 그대로 따라가기
// 위한 것이다. 특별한 값 '__none__'은 "카테고리가 NULL인 행"을 뜻하고, 값을 아예
// 넘기지 않으면 카테고리를 가리지 않는다.

require __DIR__ . '/../../includes/bootstrap.php';
require __DIR__ . '/../../includes/stats_query.php';

require_role_api('MASTER');

$eventName = query_param('event_name');
if ($eventName === '') {
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'event_name이 필요합니다.']], JSON_UNESCAPED_UNICODE);
    exit;
}

[$start, $end] = resolve_stats_period(
    query_param('period', 'today'),
    query_param('start'),
    query_param('end')
);
[$siteSql, $siteParams] = resolve_site_filter(query_param('site', 'all'), 'e.site_id');
// events.php와 같은 이유로 LEFT JOIN + COALESCE (이벤트 행에는 is_bot이 없다).
$botSql = resolve_bot_filter(query_param('visitor_type', 'human'), 's.is_bot', true);

$category = query_param('category');
$categorySql = '';
$categoryParams = [];
if ($category === '__none__') {
    $categorySql = 'AND e.event_category IS NULL';
} elseif ($category !== '') {
    $categorySql = 'AND e.event_category = :category';
    $categoryParams = ['category' => $category];
}

$stmt = db()->prepare(
    "SELECT e.page_url,
            COUNT(*) AS count,
            COUNT(DISTINCT e.visitor_id) AS visitors,
            MAX(e.created_at) AS last_at
     FROM events e
     LEFT JOIN sessions s ON s.session_id = e.session_id
     WHERE e.created_at >= :start AND e.created_at < :end
       AND e.event_name = :event_name $siteSql $botSql $categorySql
     GROUP BY e.page_url
     ORDER BY count DESC
     LIMIT 50"
);
$stmt->execute(array_merge(
    ['start' => $start, 'end' => $end, 'event_name' => $eventName],
    $siteParams,
    $categoryParams
));

$data = array_map(fn(array $r): array => [
    'pageUrl' => $r['page_url'],
    'count' => (int) $r['count'],
    'visitors' => (int) $r['visitors'],
    'lastAt' => $r['last_at'],
], $stmt->fetchAll());

echo json_encode(['data' => $data], JSON_UNESCAPED_UNICODE);
