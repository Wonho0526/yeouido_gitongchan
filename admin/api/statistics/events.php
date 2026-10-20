<?php

// MASTER-only. GET /api/statistics/events.php?period=&start=&end=&site=&visitor_type=&category=&q=
// Event counts (전화 버튼 클릭, 예약 버튼 클릭, 스크롤 25% 등) for conversion analysis.
// ?category=conversion|click|scroll로 구분을, ?q=로 이벤트명 부분 일치를 거른다.

require __DIR__ . '/../../includes/bootstrap.php';
require __DIR__ . '/../../includes/stats_query.php';

require_role_api('MASTER');

[$start, $end] = resolve_stats_period(
    query_param('period', 'today'),
    query_param('start'),
    query_param('end')
);
[$siteSql, $siteParams] = resolve_site_filter(query_param('site', 'all'), 'e.site_id');
// 이벤트에는 봇 여부가 없어 세션과 조인한다. 클릭 이벤트가 세션 INSERT보다 먼저
// 도착하는 드문 경우에도 행이 사라지지 않도록 LEFT JOIN + COALESCE를 쓴다.
$botSql = resolve_bot_filter(query_param('visitor_type', 'human'), 's.is_bot', true);
[$categorySql, $categoryParams] = resolve_exact_filter(query_param('category', 'all'), 'e.event_category', 'category');
[$searchSql, $searchParams] = resolve_search_filter(query_param('q'), 'e.event_name', 'q_event');

$stmt = db()->prepare(
    "SELECT e.event_name, e.event_category, COUNT(*) AS count, COUNT(DISTINCT e.visitor_id) AS visitors
     FROM events e
     LEFT JOIN sessions s ON s.session_id = e.session_id
     WHERE e.created_at >= :start AND e.created_at < :end $siteSql $botSql $categorySql $searchSql
     GROUP BY e.event_name, e.event_category
     -- 스크롤 뎁스는 세션마다 여러 건씩 쌓여 발생 수 상위를 독식하므로 뒤로 민다.
     -- 이 패널의 목적은 전화·카톡·상담신청 같은 전환을 먼저 보여주는 것이다.
     ORDER BY (e.event_category = 'scroll') ASC, count DESC
     LIMIT 100"
);
$stmt->execute(array_merge(['start' => $start, 'end' => $end], $siteParams, $categoryParams, $searchParams));

$data = array_map(fn(array $r): array => [
    'eventName' => $r['event_name'],
    'eventCategory' => $r['event_category'],
    'count' => (int) $r['count'],
    'visitors' => (int) $r['visitors'],
], $stmt->fetchAll());

echo json_encode(['data' => $data], JSON_UNESCAPED_UNICODE);
