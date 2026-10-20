<?php

// MASTER-only. GET /api/statistics/overview.php?period=&start=&end=&site=&visitor_type=
// Returns the headline numbers shown at the top of the dashboard.

require __DIR__ . '/../../includes/bootstrap.php';
require __DIR__ . '/../../includes/stats_query.php';

require_role_api('MASTER'); // ADMIN gets 403, anonymous gets 401 — see includes/auth.php

[$start, $end] = resolve_stats_period(
    query_param('period', 'today'),
    query_param('start'),
    query_param('end')
);
$siteParam = query_param('site', 'all');
$visitorType = query_param('visitor_type', 'human');

[$sessionSiteSql, $sessionSiteParams] = resolve_site_filter($siteParam, 'site_id');
$sessionBotSql = resolve_bot_filter($visitorType);
$sessionParams = array_merge(['start' => $start, 'end' => $end], $sessionSiteParams);

$stmt = db()->prepare(
    "SELECT
        COUNT(DISTINCT visitor_id) AS visitors,
        COUNT(*) AS sessions,
        COALESCE(SUM(page_view_count), 0) AS page_views,
        SUM(CASE WHEN page_view_count <= 1 THEN 1 ELSE 0 END) AS bounced_sessions
     FROM sessions
     WHERE started_at >= :start AND started_at < :end $sessionSiteSql $sessionBotSql"
);
$stmt->execute($sessionParams);
$row = $stmt->fetch();

$sessions = (int) ($row['sessions'] ?? 0);
$bounced = (int) ($row['bounced_sessions'] ?? 0);
$bounceRate = $sessions > 0 ? round($bounced / $sessions * 100, 1) : 0.0;

// 체류시간은 page_views에, 봇 여부는 sessions에만 있어 조인이 필요하다. 세션 행이
// 없는 고아 page_view까지 'all'에서 그대로 세도록 LEFT JOIN + COALESCE로 붙인다.
[$pvSiteSql, $pvSiteParams] = resolve_site_filter($siteParam, 'pv.site_id');
$pvBotSql = resolve_bot_filter($visitorType, 's.is_bot', true);
$durStmt = db()->prepare(
    "SELECT AVG(pv.duration) AS avg_duration
     FROM page_views pv
     LEFT JOIN sessions s ON s.session_id = pv.session_id
     WHERE pv.entered_at >= :start AND pv.entered_at < :end AND pv.duration IS NOT NULL $pvSiteSql $pvBotSql"
);
$durStmt->execute(array_merge(['start' => $start, 'end' => $end], $pvSiteParams));
$avgDuration = (float) ($durStmt->fetch()['avg_duration'] ?? 0);

// A visitor is "new" within the period if their all-time first session also
// falls inside it; everyone else who visited in the period is "returning".
[$newSiteSql, $newSiteParams] = resolve_site_filter($siteParam, 's.site_id');
$newBotSql = resolve_bot_filter($visitorType, 's.is_bot');
$newStmt = db()->prepare(
    "SELECT COUNT(DISTINCT s.visitor_id) AS new_visitors
     FROM sessions s
     JOIN visitors v ON v.visitor_id = s.visitor_id AND v.site_id = s.site_id
     WHERE s.started_at >= :start AND s.started_at < :end $newSiteSql $newBotSql
       AND v.first_seen_at >= :fs_start AND v.first_seen_at < :fs_end"
);
$newStmt->execute(array_merge(
    ['start' => $start, 'end' => $end, 'fs_start' => $start, 'fs_end' => $end],
    $newSiteParams
));
$newVisitors = (int) ($newStmt->fetch()['new_visitors'] ?? 0);
$visitors = (int) ($row['visitors'] ?? 0);

echo json_encode(['data' => [
    'visitors' => $visitors,
    'sessions' => $sessions,
    'pageViews' => (int) ($row['page_views'] ?? 0),
    'avgDurationSeconds' => (int) round($avgDuration),
    'bounceRate' => $bounceRate,
    'newVisitors' => $newVisitors,
    'returningVisitors' => max(0, $visitors - $newVisitors),
]], JSON_UNESCAPED_UNICODE);
