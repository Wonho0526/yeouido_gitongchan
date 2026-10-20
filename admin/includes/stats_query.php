<?php

// Shared query-building helpers for the api/statistics/* endpoints:
// resolving the period/site GET params into SQL fragments and bound params.

/** Resolves ?period=&start=&end= into [startDateTime, endDateTimeExclusive] (Y-m-d H:i:s). */
function resolve_stats_period(string $period, string $startParam, string $endParam): array
{
    $today = new DateTimeImmutable('today');

    switch ($period) {
        case 'yesterday':
            $start = $today->modify('-1 day');
            $end = $today;
            break;
        case '7d':
            $start = $today->modify('-6 day');
            $end = $today->modify('+1 day');
            break;
        case '30d':
            $start = $today->modify('-29 day');
            $end = $today->modify('+1 day');
            break;
        case 'this_month':
            $start = $today->modify('first day of this month');
            $end = $today->modify('first day of next month');
            break;
        case 'last_month':
            $start = $today->modify('first day of last month');
            $end = $today->modify('first day of this month');
            break;
        case 'custom':
            $start = DateTimeImmutable::createFromFormat('Y-m-d', $startParam) ?: $today;
            $end = (DateTimeImmutable::createFromFormat('Y-m-d', $endParam) ?: $today)->modify('+1 day');
            break;
        case 'today':
        default:
            $start = $today;
            $end = $today->modify('+1 day');
            break;
    }

    return [$start->format('Y-m-d H:i:s'), $end->format('Y-m-d H:i:s')];
}

/**
 * Resolves ?site=<sites.id>|all into a SQL fragment (e.g. "AND s.site_id = :site_filter")
 * applied against the given column, plus the bind param to merge into execute().
 * Returns ['', []] for "all sites".
 */
function resolve_site_filter(string $siteParam, string $column = 'site_id'): array
{
    if ($siteParam === '' || $siteParam === 'all') {
        return ['', []];
    }
    return ["AND {$column} = :site_filter", ['site_filter' => (int) $siteParam]];
}

/**
 * Resolves ?visitor_type=human|bot|all into a SQL fragment applied against the
 * given is_bot column. Defaults to "human" so every dashboard number means real
 * people unless the viewer deliberately asks to see bot traffic.
 *
 * Returns a bare SQL string (no bind params) because the values are literal
 * 0/1 — nothing here comes from user input except the mode itself, which is
 * matched against a fixed set.
 *
 * $nullable is for queries that LEFT JOIN sessions (events.php): a row whose
 * session is missing counts as human rather than silently disappearing.
 */
function resolve_bot_filter(string $visitorType, string $column = 'is_bot', bool $nullable = false): string
{
    switch ($visitorType) {
        case 'bot':
            return "AND {$column} = 1";
        case 'all':
            return '';
        case 'human':
        default:
            return $nullable ? "AND COALESCE({$column}, 0) = 0" : "AND {$column} = 0";
    }
}

/**
 * Groups sessions in [$start, $end) by a single column (referrer_source, device,
 * os, browser, or bot_name) and returns [{label, sessions, visitors, percent}],
 * sorted descending by session count. Shared by referrers.php/devices.php/
 * os.php/browsers.php/bots.php.
 */
function stats_group_sessions_by(
    string $column,
    string $start,
    string $end,
    string $siteParam,
    string $visitorType = 'human'
): array {
    [$siteSql, $siteParams] = resolve_site_filter($siteParam, 'site_id');
    $botSql = resolve_bot_filter($visitorType);

    $stmt = db()->prepare(
        "SELECT {$column} AS label, COUNT(*) AS sessions, COUNT(DISTINCT visitor_id) AS visitors
         FROM sessions
         WHERE started_at >= :start AND started_at < :end $siteSql $botSql
         GROUP BY {$column}
         ORDER BY sessions DESC"
    );
    $stmt->execute(array_merge(['start' => $start, 'end' => $end], $siteParams));
    $rows = $stmt->fetchAll();

    $total = array_sum(array_map(fn(array $r) => (int) $r['sessions'], $rows));

    return array_map(function (array $r) use ($total): array {
        $sessions = (int) $r['sessions'];
        return [
            'label' => $r['label'],
            'sessions' => $sessions,
            'visitors' => (int) $r['visitors'],
            'percent' => $total > 0 ? round($sessions / $total * 100, 1) : 0.0,
        ];
    }, $rows);
}

/**
 * 사용자가 입력한 검색어를 LIKE 패턴('%...%')으로 만든다. 입력에 들어 있는 %와 _는
 * 와일드카드가 아니라 글자 그대로 찾아야 하므로 백슬래시로 이스케이프한다
 * (MySQL LIKE의 기본 이스케이프 문자가 백슬래시라 ESCAPE 절은 생략).
 */
function stats_like_pattern(string $query): string
{
    return '%' . str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $query) . '%';
}

/**
 * ?q= 검색어를 "AND <컬럼> LIKE :<플레이스홀더>" 조각과 바인드 파라미터로 바꾼다.
 * 검색어가 비어 있으면 ['', []].
 *
 * 플레이스홀더 이름을 호출부에서 정하게 한 이유: db.php가 네이티브 프리페어
 * (EMULATE_PREPARES=false)를 쓰기 때문에 같은 이름을 한 쿼리에서 두 번 쓸 수 없다.
 * 한 쿼리에서 여러 컬럼을 검색할 때는 반드시 서로 다른 이름을 넘겨야 한다.
 */
function resolve_search_filter(string $query, string $column, string $placeholder): array
{
    if ($query === '') {
        return ['', []];
    }
    return ["AND {$column} LIKE :{$placeholder}", [$placeholder => stats_like_pattern($query)]];
}

/**
 * ?device=&os=&browser=&referrer= 같은 "정확히 일치" 필터를 SQL 조각으로 바꾼다.
 * 'all'이나 빈 값이면 필터를 걸지 않는다.
 */
function resolve_exact_filter(string $value, string $column, string $placeholder): array
{
    if ($value === '' || $value === 'all') {
        return ['', []];
    }
    return ["AND {$column} = :{$placeholder}", [$placeholder => $value]];
}
