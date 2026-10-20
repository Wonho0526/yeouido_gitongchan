<?php

// MASTER-only. GET /api/statistics/referrers.php?period=&start=&end=&site=&visitor_type=
// Sessions grouped by referrer_source (네이버/구글/다음/직접접속/SNS/기타 등).

require __DIR__ . '/../../includes/bootstrap.php';
require __DIR__ . '/../../includes/stats_query.php';

require_role_api('MASTER');

[$start, $end] = resolve_stats_period(
    query_param('period', 'today'),
    query_param('start'),
    query_param('end')
);

echo json_encode(
    ['data' => stats_group_sessions_by(
        'referrer_source', $start, $end, query_param('site', 'all'), query_param('visitor_type', 'human')
    )],
    JSON_UNESCAPED_UNICODE
);
