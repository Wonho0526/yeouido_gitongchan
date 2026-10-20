<?php

// MASTER-only. GET /api/statistics/bots.php?period=&start=&end=&site=
// Bot/automation sessions grouped by bot_name (GPTBot/구글봇/자동화 브라우저 등).
// visitor_type과 무관하게 항상 봇만 집계한다 — 대시보드의 '봇 접속' 패널은
// 사람 통계를 보는 중에도 "봇이 얼마나, 어떤 봇이 왔는지"를 함께 보여준다.

require __DIR__ . '/../../includes/bootstrap.php';
require __DIR__ . '/../../includes/stats_query.php';

require_role_api('MASTER');

[$start, $end] = resolve_stats_period(
    query_param('period', 'today'),
    query_param('start'),
    query_param('end')
);

echo json_encode(
    ['data' => stats_group_sessions_by('bot_name', $start, $end, query_param('site', 'all'), 'bot')],
    JSON_UNESCAPED_UNICODE
);
