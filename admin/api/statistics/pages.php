<?php

// MASTER-only. GET /api/statistics/pages.php?period=&start=&end=&site=&visitor_type=&q=&sort=
// Per-page view counts, unique visitors, avg duration, entrance bounce rate.
// ?q=는 페이지 URL 부분 일치 검색, ?sort=는 정렬 기준(views|visitors|duration|bounce).

require __DIR__ . '/../../includes/bootstrap.php';
require __DIR__ . '/../../includes/stats_query.php';

require_role_api('MASTER');

[$start, $end] = resolve_stats_period(
    query_param('period', 'today'),
    query_param('start'),
    query_param('end')
);
[$siteSql, $siteParams] = resolve_site_filter(query_param('site', 'all'), 'pv.site_id');
$botSql = resolve_bot_filter(query_param('visitor_type', 'human'), 's.is_bot');
[$searchSql, $searchParams] = resolve_search_filter(query_param('q'), 'pv.page_url', 'q_page');

// 정렬 기준은 고정 목록에서만 고른다 — ORDER BY는 바인드할 수 없으므로 사용자 입력을
// 그대로 SQL에 넣으면 그대로 인젝션이 된다.
$sortColumns = [
    'views' => 'views DESC',
    'visitors' => 'unique_visitors DESC',
    'duration' => 'avg_duration DESC',
    'bounce' => 'entrance_bounces / NULLIF(entrances, 0) DESC, views DESC',
];
$orderBy = $sortColumns[query_param('sort', 'views')] ?? $sortColumns['views'];

$stmt = db()->prepare(
    "SELECT
        pv.page_url,
        COUNT(*) AS views,
        COUNT(DISTINCT pv.visitor_id) AS unique_visitors,
        AVG(pv.duration) AS avg_duration,
        SUM(CASE WHEN pv.sequence = 1 THEN 1 ELSE 0 END) AS entrances,
        SUM(CASE WHEN pv.sequence = 1 AND s.page_view_count <= 1 THEN 1 ELSE 0 END) AS entrance_bounces
     FROM page_views pv
     JOIN sessions s ON s.session_id = pv.session_id
     WHERE pv.entered_at >= :start AND pv.entered_at < :end $siteSql $botSql $searchSql
     GROUP BY pv.page_url
     ORDER BY $orderBy
     LIMIT 50"
);
$stmt->execute(array_merge(['start' => $start, 'end' => $end], $siteParams, $searchParams));

$data = array_map(function (array $r): array {
    $entrances = (int) $r['entrances'];
    return [
        'pageUrl' => $r['page_url'],
        'views' => (int) $r['views'],
        'uniqueVisitors' => (int) $r['unique_visitors'],
        'avgDurationSeconds' => (int) round((float) $r['avg_duration']),
        'entrances' => $entrances,
        'entranceBounceRate' => $entrances > 0 ? round(((int) $r['entrance_bounces']) / $entrances * 100, 1) : null,
    ];
}, $stmt->fetchAll());

echo json_encode(['data' => $data], JSON_UNESCAPED_UNICODE);
