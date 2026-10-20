<?php

// MASTER-only. GET /api/statistics/browsers.php?period=&start=&end=&site=&visitor_type=
// Sessions grouped by browser (Chrome/Safari/Edge/Samsung Internet/Firefox/기타).

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
        'browser', $start, $end, query_param('site', 'all'), query_param('visitor_type', 'human')
    )],
    JSON_UNESCAPED_UNICODE
);
