<?php

// MASTER-only. GET /api/statistics/session-detail.php?session_id=
// Full page-view path + events for one session (drill-down from sessions.php).

require __DIR__ . '/../../includes/bootstrap.php';

require_role_api('MASTER');

$sessionId = query_param('session_id');
if ($sessionId === '') {
    http_response_code(400);
    echo json_encode(['error' => ['message' => 'session_id가 필요합니다.']], JSON_UNESCAPED_UNICODE);
    exit;
}

$stmt = db()->prepare(
    "SELECT s.*, si.site_name
     FROM sessions s
     JOIN sites si ON si.id = s.site_id
     WHERE s.session_id = :sid"
);
$stmt->execute(['sid' => $sessionId]);
$session = $stmt->fetch();

if (!$session) {
    http_response_code(404);
    echo json_encode(['error' => ['message' => '세션을 찾을 수 없습니다.']], JSON_UNESCAPED_UNICODE);
    exit;
}

$pvStmt = db()->prepare(
    'SELECT page_url, page_title, sequence, entered_at, left_at, duration
     FROM page_views WHERE session_id = :sid ORDER BY sequence ASC'
);
$pvStmt->execute(['sid' => $sessionId]);

$evStmt = db()->prepare(
    'SELECT event_name, event_category, event_value, page_url, created_at
     FROM events WHERE session_id = :sid ORDER BY created_at ASC'
);
$evStmt->execute(['sid' => $sessionId]);

echo json_encode(['data' => [
    'session' => [
        'sessionId' => $session['session_id'],
        'siteName' => $session['site_name'],
        'startedAt' => $session['started_at'],
        'endedAt' => $session['ended_at'],
        'landingPage' => $session['landing_page'],
        'referrerUrl' => $session['referrer_url'],
        'referrerSource' => $session['referrer_source'],
        'utmSource' => $session['utm_source'],
        'utmMedium' => $session['utm_medium'],
        'utmCampaign' => $session['utm_campaign'],
        'utmTerm' => $session['utm_term'],
        'utmContent' => $session['utm_content'],
        'device' => $session['device'],
        'os' => $session['os'],
        'browser' => $session['browser'],
        'isBot' => (bool) $session['is_bot'],
        'botName' => $session['bot_name'],
        'userAgent' => $session['user_agent'],
        'ipAddress' => $session['ip_address'],
    ],
    'pageViews' => $pvStmt->fetchAll(),
    'events' => $evStmt->fetchAll(),
]], JSON_UNESCAPED_UNICODE);
