<?php

// MASTER-only. GET /api/statistics/visitors.php?period=&start=&end=&site=&visitor_type=
// Visitor/pageview counts for the trend chart.
//
// 하루짜리 기간(오늘·어제·직접선택 1일)은 날짜로 묶으면 점이 하나뿐이라 선이 그려지지
// 않으므로 시간대별로 묶는다. 그리고 방문이 0인 날짜/시간대는 SQL 결과에서 아예 빠지는데,
// 그대로 그리면 빈 구간이 사라져 x축이 압축된 왜곡된 추이가 나온다. 그래서 기간 전체의
// 버킷을 미리 만들어 두고 조회 결과를 덮어씌운다.

require __DIR__ . '/../../includes/bootstrap.php';
require __DIR__ . '/../../includes/stats_query.php';

require_role_api('MASTER');

[$start, $end] = resolve_stats_period(
    query_param('period', '7d'),
    query_param('start'),
    query_param('end')
);
[$siteSql, $siteParams] = resolve_site_filter(query_param('site', 'all'), 'site_id');
$botSql = resolve_bot_filter(query_param('visitor_type', 'human'));

$startAt = new DateTimeImmutable($start);
$endAt = new DateTimeImmutable($end);
$hourly = ($endAt->getTimestamp() - $startAt->getTimestamp()) <= 86400;

$bucketSql = $hourly ? "DATE_FORMAT(started_at, '%H')" : "DATE(started_at)";

$stmt = db()->prepare(
    "SELECT {$bucketSql} AS bucket, COUNT(DISTINCT visitor_id) AS visitors, COALESCE(SUM(page_view_count), 0) AS page_views
     FROM sessions
     WHERE started_at >= :start AND started_at < :end $siteSql $botSql
     GROUP BY bucket
     ORDER BY bucket ASC"
);
$stmt->execute(array_merge(['start' => $start, 'end' => $end], $siteParams));

$counts = [];
foreach ($stmt->fetchAll() as $row) {
    $counts[(string) $row['bucket']] = [(int) $row['visitors'], (int) $row['page_views']];
}

// 기간 전체의 빈 버킷을 만든 뒤 조회 결과를 채워 넣는다.
$data = [];
if ($hourly) {
    for ($h = 0; $h < 24; $h++) {
        $key = sprintf('%02d', $h);
        $data[] = ['key' => $key, 'label' => $key . '시'];
    }
} else {
    for ($d = $startAt; $d < $endAt; $d = $d->modify('+1 day')) {
        $key = $d->format('Y-m-d');
        $data[] = ['key' => $key, 'label' => $key];
    }
}

$data = array_map(function (array $b) use ($counts): array {
    [$visitors, $pageViews] = $counts[$b['key']] ?? [0, 0];
    return ['date' => $b['label'], 'visitors' => $visitors, 'pageViews' => $pageViews];
}, $data);

echo json_encode(['data' => $data], JSON_UNESCAPED_UNICODE);
