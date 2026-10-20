<?php

// Public endpoint that tracker.js beacons hit from any registered hospital
// homepage — genuinely cross-origin (a different domain than this admin app),
// unlike the other api/public/* endpoints. So unlike them, this one DOES need
// CORS, and it authorizes by (site_id + calling Origin) rather than a session:
// only an Origin whose host is registered in site_domains for that site_id may
// write data or even receive the Access-Control-Allow-Origin header back.
//
// No form-level PII is collected here: no name/phone/email is ever stored, only
// a client-generated random visitor_id/session_id (see tracker.js). The raw
// User-Agent IS stored on the session row — it's what makes the bot/human
// classification auditable and re-derivable, and it identifies a browser build,
// not a person. The connecting IP is also stored on the session row (added
// 2026-09-08, at the operator's request, for abuse/inquiry tracing); it is
// readable only through the MASTER-only api/statistics/* endpoints.

require __DIR__ . '/../../includes/db.php';
require __DIR__ . '/../../includes/tracking.php';

$siteIdParam = trim((string) ($_GET['site_id'] ?? ''));
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$originHost = $origin !== '' ? parse_url($origin, PHP_URL_HOST) : null;

$siteDbId = null;
if ($siteIdParam !== '' && $originHost !== null) {
    $stmt = db()->prepare('SELECT id FROM sites WHERE site_id = :sid AND is_active = 1');
    $stmt->execute(['sid' => $siteIdParam]);
    $site = $stmt->fetch();

    if ($site) {
        $domStmt = db()->prepare('SELECT domain FROM site_domains WHERE site_id = :id');
        $domStmt->execute(['id' => $site['id']]);
        $allowedDomains = array_map('strtolower', array_column($domStmt->fetchAll(), 'domain'));

        if (in_array(strtolower($originHost), $allowedDomains, true)) {
            $siteDbId = (int) $site['id'];
            header('Access-Control-Allow-Origin: ' . $origin);
            header('Vary: Origin');
            header('Access-Control-Allow-Methods: POST, OPTIONS');
            header('Access-Control-Allow-Headers: Content-Type');
        }
    }
}

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    // Preflight: 204 with the CORS headers above if allowed, otherwise no
    // CORS header at all (the browser blocks the follow-up request itself).
    http_response_code($siteDbId !== null ? 204 : 403);
    exit;
}

// Unregistered site_id / disallowed Origin: accept-and-drop rather than error,
// so a stray or malicious caller can't use the response to probe which
// site_ids or domains are valid.
if ($siteDbId === null) {
    http_response_code(204);
    exit;
}
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    http_response_code(405);
    exit;
}

$raw = file_get_contents('php://input');
if ($raw === false || strlen($raw) > 8192) { // a tracking beacon is always tiny
    http_response_code(413);
    exit;
}
$input = json_decode($raw, true);
if (!is_array($input)) {
    http_response_code(204);
    exit;
}

/** Trims + hard-caps a string field's length before it ever touches the DB. */
function field(array $input, string $key, int $maxLen, string $default = ''): string
{
    $value = trim((string) ($input[$key] ?? $default));
    return mb_substr($value, 0, $maxLen);
}

function is_uuid(string $value): bool
{
    return (bool) preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $value);
}

/**
 * Idempotently ensures the visitor and session rows exist. Called on every
 * pageview_start beacon (not just the session's first) — the session-level
 * fields (landing page, referrer, UTM, device) are only meaningful on the
 * INSERT that actually creates the row; ON DUPLICATE KEY makes every later
 * call in the same session a no-op. Folding this into the same request as
 * the page-view insert (rather than a separate "session_start" call) avoids
 * a race between two independent HTTP requests with no ordering guarantee.
 */
function ensure_visitor_and_session(array $input, int $siteDbId, string $visitorId, string $sessionId): void
{
    $ua = field($input, 'user_agent', 500, $_SERVER['HTTP_USER_AGENT'] ?? '');
    $screenWidth = isset($input['screen_width']) ? max(0, min(9999, (int) $input['screen_width'])) : null;
    $screenHeight = isset($input['screen_height']) ? max(0, min(9999, (int) $input['screen_height'])) : null;
    $referrerUrl = field($input, 'referrer', 500) ?: null;
    // IP는 세션을 만드는 INSERT에서만 쓰인다(ON DUPLICATE KEY는 no-op) — 즉 한 세션에
    // 대해 첫 비콘 시점의 IP 하나만 남고, 도중에 망이 바뀌어도 덮어쓰지 않는다.
    $ipAddress = visitor_ip();

    $pdo = db();
    $pdo->prepare(
        'INSERT INTO visitors (visitor_id, site_id, first_seen_at, last_seen_at)
         VALUES (:vid, :site, NOW(), NOW())
         ON DUPLICATE KEY UPDATE last_seen_at = NOW()'
    )->execute(['vid' => $visitorId, 'site' => $siteDbId]);

    // navigator.webdriver (tracker.js가 보냄) — 자동화 브라우저는 UA만으로는
    // 평범한 크롬과 구별되지 않으므로 UA 패턴과 함께 봇 판별에 쓴다.
    $botName = detect_bot($ua, !empty($input['automation']));

    $pdo->prepare(
        'INSERT INTO sessions
            (session_id, visitor_id, site_id, started_at, ended_at, landing_page, referrer_url, referrer_source,
             utm_source, utm_medium, utm_campaign, utm_term, utm_content, device, os, browser,
             user_agent, ip_address, is_bot, bot_name, screen_width, screen_height)
         VALUES
            (:sid, :vid, :site, NOW(), NOW(), :landing, :referrer, :ref_source,
             :utm_source, :utm_medium, :utm_campaign, :utm_term, :utm_content, :device, :os, :browser,
             :user_agent, :ip_address, :is_bot, :bot_name, :sw, :sh)
         ON DUPLICATE KEY UPDATE session_id = session_id'
    )->execute([
        'sid' => $sessionId,
        'vid' => $visitorId,
        'site' => $siteDbId,
        'landing' => field($input, 'landing_page', 500),
        'referrer' => $referrerUrl,
        'ref_source' => classify_referrer_source($referrerUrl),
        'utm_source' => field($input, 'utm_source', 100) ?: null,
        'utm_medium' => field($input, 'utm_medium', 100) ?: null,
        'utm_campaign' => field($input, 'utm_campaign', 100) ?: null,
        'utm_term' => field($input, 'utm_term', 100) ?: null,
        'utm_content' => field($input, 'utm_content', 100) ?: null,
        'device' => detect_device($ua),
        'os' => detect_os($ua),
        'browser' => detect_browser($ua),
        'user_agent' => $ua !== '' ? $ua : null,
        'ip_address' => $ipAddress,
        'is_bot' => $botName !== null ? 1 : 0,
        'bot_name' => $botName,
        'sw' => $screenWidth,
        'sh' => $screenHeight,
    ]);
}

function handle_pageview_start(array $input, int $siteDbId): void
{
    $pvId = field($input, 'page_view_id', 36);
    $sessionId = field($input, 'session_id', 36);
    $visitorId = field($input, 'visitor_id', 36);
    $pageUrl = field($input, 'page_url', 500);
    if (!is_uuid($pvId) || !is_uuid($sessionId) || !is_uuid($visitorId) || $pageUrl === '') {
        return;
    }

    ensure_visitor_and_session($input, $siteDbId, $visitorId, $sessionId);

    $pdo = db();
    $pdo->prepare(
        'INSERT INTO page_views
            (page_view_id, session_id, visitor_id, site_id, page_url, page_title, previous_page_url, sequence, entered_at)
         VALUES (:pv, :sid, :vid, :site, :url, :title, :prev, :seq, NOW())
         ON DUPLICATE KEY UPDATE page_view_id = page_view_id'
    )->execute([
        'pv' => $pvId,
        'sid' => $sessionId,
        'vid' => $visitorId,
        'site' => $siteDbId,
        'url' => $pageUrl,
        'title' => field($input, 'page_title', 255) ?: null,
        'prev' => field($input, 'previous_page_url', 500) ?: null,
        'seq' => max(1, min(9999, (int) ($input['sequence'] ?? 1))),
    ]);

    $pdo->prepare(
        'UPDATE sessions SET page_view_count = page_view_count + 1, ended_at = NOW() WHERE session_id = :sid'
    )->execute(['sid' => $sessionId]);
    $pdo->prepare(
        'UPDATE visitors SET last_seen_at = NOW() WHERE visitor_id = :vid AND site_id = :site'
    )->execute(['vid' => $visitorId, 'site' => $siteDbId]);
}

function handle_pageview_end(array $input, int $siteDbId): void
{
    $pvId = field($input, 'page_view_id', 36);
    if (!is_uuid($pvId)) {
        return;
    }
    $duration = max(0, min(24 * 3600, (int) ($input['duration'] ?? 0))); // clamp to <= 1 day

    $pdo = db();
    $pdo->prepare(
        'UPDATE page_views SET left_at = NOW(), duration = :dur
         WHERE page_view_id = :pv AND site_id = :site AND left_at IS NULL'
    )->execute(['dur' => $duration, 'pv' => $pvId, 'site' => $siteDbId]);

    $sessionId = field($input, 'session_id', 36);
    if (is_uuid($sessionId)) {
        $pdo->prepare('UPDATE sessions SET ended_at = NOW() WHERE session_id = :sid')->execute(['sid' => $sessionId]);
    }
}

function handle_event(array $input, int $siteDbId): void
{
    $sessionId = field($input, 'session_id', 36);
    $visitorId = field($input, 'visitor_id', 36);
    $eventName = field($input, 'event_name', 100);
    if (!is_uuid($sessionId) || !is_uuid($visitorId) || $eventName === '') {
        return;
    }

    db()->prepare(
        'INSERT INTO events (session_id, visitor_id, site_id, event_name, event_category, event_value, page_url, created_at)
         VALUES (:sid, :vid, :site, :name, :cat, :val, :url, NOW())'
    )->execute([
        'sid' => $sessionId,
        'vid' => $visitorId,
        'site' => $siteDbId,
        'name' => $eventName,
        'cat' => field($input, 'event_category', 50) ?: null,
        'val' => field($input, 'event_value', 255) ?: null,
        'url' => field($input, 'page_url', 500),
    ]);
}

switch ((string) ($input['action'] ?? '')) {
    case 'pageview_start':
        handle_pageview_start($input, $siteDbId);
        break;
    case 'pageview_end':
        handle_pageview_end($input, $siteDbId);
        break;
    case 'event':
        handle_event($input, $siteDbId);
        break;
}

http_response_code(204);
